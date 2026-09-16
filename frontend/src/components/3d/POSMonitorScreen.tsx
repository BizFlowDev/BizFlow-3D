"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Banknote,
  QrCode,
  User,
  Package,
  ArrowLeft,
  Printer,
  Sparkles,
  RotateCcw,
  History,
  Store,
  Receipt,
  Tag,
  Copy,
  Check,
  Percent,
  Maximize2,
  X,
} from "lucide-react";
import { useCustomerList, type Customer } from "@/hooks/useCustomers";
import { useProductList, useCategoryList, type Product } from "@/hooks/useProducts";
import { useCreateOrder, getOrderCode, type Order } from "@/hooks/useOrders";
import { useCurrentStore } from "@/hooks/useStore";
import { generateVietQRUrl, getBankByCode, formatPaymentMemo } from "@/lib/vietqr";
import { printInvoice } from "@/lib/invoice";
import type { CartItem3D } from "@/app/(dashboard)/store-3d/_components/ProductDetailModal3D";

interface POSMonitorScreenProps {
  isActive: boolean;
  onActivate: () => void;
  onExit: () => void;
  orderLines: CartItem3D[];
  onAddProduct: (item: CartItem3D) => void;
  onUpdateQuantity: (productId: string, unitId: string, quantity: number) => void;
  onRemoveItem: (productId: string, unitId: string) => void;
  onClearOrder: () => void;
  onOrderSuccess: (order: Order) => void;
  recentOrders: Order[];
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

const CASH_PRESETS = [10000, 20000, 50000, 100000, 200000, 500000];

class ScreenErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ScreenErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[750px] w-[1200px] flex-col justify-between rounded-2xl bg-slate-950 p-8 text-white border border-red-500/50">
          <div className="text-red-400 font-bold text-sm">
            ⚠️ Giao diện POS đang gặp sự cố:
          </div>
          <pre className="text-xs text-red-200 bg-red-950/40 p-3 rounded font-mono overflow-auto max-h-60">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="self-start px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-white"
          >
            Tải lại màn hình POS
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function POSMonitorScreen(props: POSMonitorScreenProps) {
  return (
    <ScreenErrorBoundary>
      <POSMonitorScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}

function POSMonitorScreenInner({
  isActive,
  onActivate,
  onExit,
  orderLines,
  onAddProduct,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onOrderSuccess,
  recentOrders,
}: POSMonitorScreenProps) {
  // ── Đồng hồ thời gian thực ──
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Phím nóng ESC để rời quầy ──
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onExit]);

  // ── Tab & Navigation ──
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // ── Queries ──
  const { data: storeInfo } = useCurrentStore();
  const { data: customerData } = useCustomerList({ limit: 100 });
  const customers = customerData?.items ?? [];

  const { data: productData, isLoading: productsLoading } = useProductList({
    status: "active",
    limit: 100,
  });
  const allProducts = productData?.items ?? [];

  const { data: categories = [] } = useCategoryList();
  const createOrderMutation = useCreateOrder();

  // ── State Tìm Kiếm & Lọc ──
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ── State Khách Hàng & Giảm Giá ──
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [orderNote, setOrderNote] = useState("");

  // ── State Thanh Toán ──
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr_code" | "debt">("cash");
  const [cashGivenInput, setCashGivenInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isQrZoomed, setIsQrZoomed] = useState(false);

  // Khách hàng hiện tại
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)),
    );
  }, [customers, customerSearch]);

  // Lọc sản phẩm
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return allProducts.filter((p) => {
      const matchCategory =
        selectedCategory === "all" || p.categoryId === selectedCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [allProducts, selectedCategory, productSearch]);

  // Tài chính
  const subtotal = useMemo(() => {
    return orderLines.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  }, [orderLines]);

  const discountAmount = useMemo(() => {
    const rawVal = parseFloat(discountInput) || 0;
    if (rawVal <= 0) return 0;
    if (discountType === "percent") {
      const pct = Math.min(100, Math.max(0, rawVal));
      return Math.round((subtotal * pct) / 100);
    }
    return Math.min(subtotal, Math.max(0, rawVal));
  }, [subtotal, discountInput, discountType]);

  const finalAmount = Math.max(0, subtotal - discountAmount);

  const cashGiven = cashGivenInput
    ? Math.max(0, parseFloat(cashGivenInput) || 0)
    : finalAmount;
  const changeAmount = Math.max(0, cashGiven - finalAmount);

  // VietQR
  const hasStoreBank = Boolean(storeInfo?.bankCode && storeInfo?.bankAccountNumber);
  const storeBank = useMemo(() => {
    return storeInfo?.bankCode ? getBankByCode(storeInfo.bankCode) : undefined;
  }, [storeInfo?.bankCode]);
  const tempOrderMemo = useMemo(() => {
    return formatPaymentMemo(Math.random().toString(36).substring(2, 8));
  }, [orderLines, finalAmount]);

  const vietQrUrl = useMemo(() => {
    if (!hasStoreBank || !storeInfo?.bankCode || !storeInfo?.bankAccountNumber) {
      return "";
    }
    return generateVietQRUrl({
      bankCode: storeInfo.bankCode,
      accountNumber: storeInfo.bankAccountNumber,
      accountName: storeInfo.bankAccountHolder || "",
      amount: finalAmount,
      memo: tempOrderMemo,
      template: "compact2",
    });
  }, [hasStoreBank, storeInfo, finalAmount, tempOrderMemo]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Thêm nhanh từ grid
  const handleAddProductCard = (p: Product) => {
    const defaultUnit = p.units?.find((u) => u.isDefault) || p.units?.[0];
    const item: CartItem3D = {
      productId: p.id,
      productName: p.name,
      code: p.code,
      imageUrl: p.imageUrl,
      unitId: defaultUnit?.id || "default",
      unitName: defaultUnit?.unitName || "Cái",
      conversionFactor: defaultUnit?.conversionFactor || 1,
      unitPrice: defaultUnit?.price || 0,
      quantity: 1,
      availableStock: 50,
    };
    onAddProduct(item);
  };

  // Đổi đơn vị
  const handleChangeUnit = (productId: string, oldUnitId: string, newUnitId: string) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product || !product.units) return;
    const newUnit = product.units.find((u) => u.id === newUnitId);
    if (!newUnit) return;

    const currentItem = orderLines.find(
      (it) => it.productId === productId && it.unitId === oldUnitId,
    );
    if (!currentItem) return;

    onRemoveItem(productId, oldUnitId);
    onAddProduct({
      ...currentItem,
      unitId: newUnit.id,
      unitName: newUnit.unitName,
      conversionFactor: newUnit.conversionFactor,
      unitPrice: newUnit.price,
    });
  };

  // Submit thanh toán
  const handleCheckout = async () => {
    if (orderLines.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một sản phẩm vào đơn hàng.");
      return;
    }

    if (paymentMethod === "debt" && !selectedCustomerId) {
      setErrorMessage("Hình thức Ghi nợ bắt buộc phải chọn Khách hàng cụ thể.");
      return;
    }

    setErrorMessage(null);

    const payload = {
      customerId: selectedCustomerId || undefined,
      orderType: "counter" as const,
      status: "confirmed" as const,
      paymentMethod,
      discountAmount,
      debtAmount: paymentMethod === "debt" ? finalAmount : 0,
      paidAmount:
        paymentMethod === "cash"
          ? cashGiven
          : paymentMethod === "debt"
            ? 0
            : finalAmount,
      changeAmount: paymentMethod === "cash" ? changeAmount : 0,
      note: orderNote.trim() || undefined,
      items: orderLines.map((it) => ({
        productId: it.productId,
        productUnitId: it.unitId !== "default" ? it.unitId : undefined,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    };

    createOrderMutation.mutate(payload, {
      onSuccess: (order) => {
        setCompletedOrder(order);
        onOrderSuccess(order);
      },
      onError: (err: any) => {
        setErrorMessage(
          err?.response?.data?.message ||
          "Không thể tạo đơn hàng. Vui lòng kiểm tra lại tồn kho!",
        );
      },
    });
  };

  const handlePrint = async (order: Order) => {
    try {
      await printInvoice(order);
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CHẾ ĐỘ 1: STANDBY TRONG KHÔNG GIAN 3D (KHI NGƯỜI DÙNG ĐANG ĐỨNG XA)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isActive) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        className="flex h-[750px] w-[1200px] cursor-pointer flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-[#090d16] p-10 text-white shadow-2xl select-none transition-all hover:ring-4 hover:ring-sky-400/50"
      >
        {/* Thanh trạng thái Standby */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
            </span>
            <div className="font-mono text-sm font-bold tracking-wider text-sky-400">
              BIZFLOW POS TERMINAL • TRẠM #01
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-400">
            <Store className="h-4 w-4 text-slate-400" />
            SHOWROOM 3D
          </div>
        </div>

        {/* Nội dung chính màn hình chờ */}
        <div className="my-auto flex flex-col items-center justify-center text-center">
          <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 text-white shadow-2xl shadow-sky-500/30">
            <CreditCard className="h-12 w-12" />
          </div>

          <div className="font-mono text-3xl font-black tracking-widest text-slate-100">
            {currentTime || "12:00:00"}
          </div>

          <h2 className="mt-3 text-2xl font-black text-white">
            MÀN HÌNH BÁN HÀNG POS
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-400">
            Sẵn sàng kết nối máy quét mã vạch & máy in hóa đơn nhiệt
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 hover:from-emerald-400 hover:to-teal-400"
            >
              <Sparkles className="h-5 w-5 animate-spin" />
              CHẠM VÀO ĐÂY ĐỂ LÊN ĐƠN BÁN HÀNG
            </button>
          </div>
        </div>

        {/* Chân màn hình chờ */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>Bizflow</span>
          <span className="font-mono text-emerald-400">STATUS: READY (OK)</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHẾ ĐỘ 2: ỨNG DỤNG BÁN HÀNG POS ĐẦY ĐỦ TRONG MÀN HÌNH MÁY TÍNH
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex h-[750px] w-[1200px] flex-col overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl select-none border border-slate-700/60"
    >
      {/* ── 1. Top Bar của Hệ Thống POS ─────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/90 px-6">
        {/* Nút Rời Quầy [ESC] */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Rời Quầy [ESC]
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-xs tracking-wide text-sky-400">
              BizFlow POS Trạm #01
            </span>
          </div>
        </div>

        {/* Tab & Đồng hồ */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("pos")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-bold transition-all ${activeTab === "pos"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Bán Hàng ({orderLines.reduce((s, it) => s + it.quantity, 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-bold transition-all ${activeTab === "history"
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <History className="h-3.5 w-3.5" />
              Lịch Sử Đơn ({recentOrders.length})
            </button>
          </div>

          <div className="font-mono text-xs font-semibold text-slate-300">
            {currentTime}
          </div>
        </div>
      </div>

      {/* ── 2. Nội dung Tab Lịch Sử ────────────────────────────────────── */}
      {activeTab === "history" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-900/40">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-sky-400" />
              Các đơn hàng gần nhất
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab("pos")}
              className="text-xs text-sky-400 hover:underline"
            >
              Quay lại màn hình bán hàng →
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Chưa có đơn hàng nào được ghi nhận.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-xl border border-white/10 bg-slate-800/60 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-400">
                      {getOrderCode(ord)}
                    </span>
                    <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                      {ord.status === "confirmed" ? "Hoàn thành" : ord.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{ord.customerName || "Khách lẻ"}</span>
                    <span>{ord.items?.length ?? 0} mặt hàng</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 font-bold">
                    <span className="text-slate-300">Tổng:</span>
                    <span className="text-emerald-400">{formatVND(ord.finalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : completedOrder ? (
        /* ── 3. Màn hình Hoàn Tất Đơn Hàng Thành Công ─────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-900/60">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 animate-bounce">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h3 className="mt-3 text-xl font-black text-white">
            ĐÃ THANH TOÁN THÀNH CÔNG!
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Hóa đơn đã được lưu và trừ kho tự động
          </p>

          <div className="mt-4 w-80 rounded-xl border border-white/10 bg-slate-800/80 p-3.5 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Mã đơn:</span>
              <span className="font-mono font-bold text-sky-400">
                {getOrderCode(completedOrder)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Khách hàng:</span>
              <span className="font-bold text-white">
                {completedOrder.customerName || "Khách lẻ"}
              </span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-bold">
              <span className="text-slate-300">Tổng tiền:</span>
              <span className="text-emerald-400">
                {formatVND(completedOrder.finalAmount)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePrint(completedOrder)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-white shadow hover:scale-105 transition-all"
            >
              <Printer className="h-4 w-4" />
              In Hóa Đơn (PDF)
            </button>
            <button
              type="button"
              onClick={() => setCompletedOrder(null)}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              Tạo Đơn Hàng Mới
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Rời quầy
            </button>
          </div>
        </div>
      ) : (
        /* ── 4. Giao diện Bán Hàng POS Chia 2 Cột Chuẩn Mực ───────────── */
        <div className="flex flex-1 overflow-hidden">
          {/* ── CỘT TRÁI: DANH MỤC & TÌM KIẾM SẢN PHẨM (50%) ─────────── */}
          <div className="flex w-[50%] flex-col border-r border-white/10 bg-slate-900/40">
            {/* Thanh tìm kiếm & lọc danh mục */}
            <div className="border-b border-white/10 p-3 space-y-2 bg-slate-900/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã SKU sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Chips danh mục cuộn ngang */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 text-[11px] scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`shrink-0 rounded-lg px-2.5 py-1 font-semibold transition-all ${selectedCategory === "all"
                    ? "bg-sky-600 text-white shadow"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                >
                  Tất cả ({allProducts.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 font-semibold transition-all ${selectedCategory === c.id
                      ? "bg-sky-600 text-white shadow"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid sản phẩm */}
            <div className="flex-1 overflow-y-auto p-3">
              {productsLoading ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-400 mr-2" />
                  Đang tải danh mục sản phẩm...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy sản phẩm nào phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredProducts.map((p) => {
                    const defaultUnit = p.units?.find((u) => u.isDefault) || p.units?.[0];
                    const price = defaultUnit?.price ?? 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleAddProductCard(p)}
                        className="group flex flex-col justify-between rounded-xl border border-white/10 bg-slate-800/60 p-2.5 text-left hover:border-emerald-500/50 hover:bg-slate-800 transition-all hover:scale-[1.02] cursor-pointer shadow-sm"
                      >
                        <div className="relative h-18 w-full shrink-0 overflow-hidden rounded-lg bg-slate-700/60 flex items-center justify-center mb-1.5">
                          {p.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <Package className="h-7 w-7 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {p.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {p.code}
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-emerald-400 tabular-nums">
                              {formatVND(price)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              /{defaultUnit?.unitName || "Cái"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600/20 py-1 text-[11px] font-semibold text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm món</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── CỘT PHẢI: HÓA ĐƠN BÁN HÀNG & THANH TOÁN (50%) ───────── */}
          <div className="flex w-[50%] flex-col bg-slate-950/60">
            {/* Chọn khách hàng & Công nợ */}
            <div className="border-b border-white/10 p-2.5 bg-slate-900/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-sky-400" /> Khách hàng
                </span>
                {selectedCustomer && selectedCustomer.debtBalance > 0 && (
                  <span className="rounded-md bg-red-500/20 text-red-300 px-2 py-0.5 text-[10px] font-bold border border-red-500/30">
                    Nợ: {formatVND(selectedCustomer.debtBalance)}
                  </span>
                )}
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 py-1.5 px-2.5 text-xs text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="">Khách lẻ (Khách vãng lai)</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Danh sách các dòng hàng trong đơn */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 border-b border-white/10">
              {orderLines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-500">
                  <CreditCard className="h-8 w-8 mb-1.5 opacity-30" />
                  Chưa có sản phẩm nào trong đơn.
                  <span className="text-[10px] text-slate-400 mt-1">
                    Nhấp vào sản phẩm bên trái để thêm món.
                  </span>
                </div>
              ) : (
                orderLines.map((it) => {
                  const pDetail = allProducts.find((p) => p.id === it.productId);
                  return (
                    <div
                      key={`${it.productId}-${it.unitId}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-900/60 p-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-white text-[11px]">
                          {it.productName}
                        </div>

                        {/* Dropdown đơn vị tính */}
                        {pDetail?.units && pDetail.units.length > 1 ? (
                          <select
                            value={it.unitId}
                            onChange={(e) =>
                              handleChangeUnit(it.productId, it.unitId, e.target.value)
                            }
                            className="mt-0.5 rounded border border-white/10 bg-slate-800 px-1 py-0.5 text-[10px] text-sky-400 focus:outline-none"
                          >
                            {pDetail.units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.unitName} ({formatVND(u.price)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {it.unitName} • {formatVND(it.unitPrice)}
                          </span>
                        )}
                      </div>

                      {/* Tăng giảm số lượng */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              it.productId,
                              it.unitId,
                              Math.max(1, it.quantity - 1),
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-bold font-mono text-[11px]">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              it.productId,
                              it.unitId,
                              it.quantity + 1,
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Thành tiền & Nút xóa */}
                      <div className="text-right min-w-16">
                        <div className="font-bold text-emerald-400 text-[11px] tabular-nums">
                          {formatVND(it.unitPrice * it.quantity)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(it.productId, it.unitId)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Khối tính toán & Phương thức thanh toán */}
            <div className="p-2.5 bg-slate-900/70 space-y-2">
              {/* Giảm giá */}
              <div className="space-y-1.5 rounded-lg border border-white/5 bg-slate-800/40 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 font-semibold">
                    <Percent className="h-3 w-3 text-amber-400" /> Giảm giá:
                  </span>
                  <div className="flex items-center rounded border border-white/10 bg-slate-900 p-0.5 text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("amount");
                        setDiscountInput("");
                      }}
                      className={`rounded px-1.5 py-0.5 transition-colors ${discountType === "amount"
                          ? "bg-slate-700 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                        }`}
                    >
                      VNĐ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("percent");
                        setDiscountInput("");
                      }}
                      className={`rounded px-1.5 py-0.5 transition-colors ${discountType === "percent"
                          ? "bg-indigo-600 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                        }`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={discountType === "percent" ? 100 : undefined}
                      placeholder={discountType === "percent" ? "0 %" : "0 đ"}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-full rounded border border-white/10 bg-slate-800 py-1 px-2 pr-6 text-right font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      {discountType === "percent" ? "%" : "đ"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {discountType === "percent" ? (
                    [5, 10, 15, 20].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDiscountInput(String(v))}
                        className="rounded bg-white/5 hover:bg-white/10 px-1.5 py-0.5 text-[10px] text-amber-300"
                      >
                        {v}%
                      </button>
                    ))
                  ) : (
                    [10000, 20000, 50000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDiscountInput(String(v))}
                        className="rounded bg-white/5 hover:bg-white/10 px-1.5 py-0.5 text-[10px] text-amber-300"
                      >
                        +{v / 1000}k
                      </button>
                    ))
                  )}
                  {discountInput && (
                    <button
                      type="button"
                      onClick={() => setDiscountInput("")}
                      className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-red-400"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {discountAmount > 0 && (
                  <div className="text-[10px] font-semibold text-emerald-400">
                    Đã giảm: {formatVND(discountAmount)} {discountType === "percent" && `(${discountInput}%)`}
                  </div>
                )}
              </div>

              {/* Tổng tiền thanh toán */}
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                <span className="text-xs font-bold text-slate-200">TỔNG CỘNG:</span>
                <span className="text-xl font-black text-emerald-400 tabular-nums">
                  {formatVND(finalAmount)}
                </span>
              </div>

              {/* Tab phương thức thanh toán */}
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex items-center justify-center gap-1 py-1 rounded font-bold transition-all ${paymentMethod === "cash"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                >
                  <Banknote className="h-3 w-3" /> Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("qr_code")}
                  className={`flex items-center justify-center gap-1 py-1 rounded font-bold transition-all ${paymentMethod === "qr_code"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                >
                  <QrCode className="h-3 w-3" /> VietQR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("debt")}
                  className={`flex items-center justify-center gap-1 py-1 rounded font-bold transition-all ${paymentMethod === "debt"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                >
                  <Tag className="h-3 w-3" /> Ghi nợ
                </button>
              </div>

              {/* Chi tiết theo phương thức */}
              {paymentMethod === "cash" && (
                <div className="space-y-1.5 pt-0.5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Khách đưa:</span>
                    <input
                      type="number"
                      placeholder={String(finalAmount)}
                      value={cashGivenInput}
                      onChange={(e) => setCashGivenInput(e.target.value)}
                      className="w-28 rounded border border-white/10 bg-slate-800 py-0.5 px-2 text-right font-mono text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-400">Tiền thối lại:</span>
                    <span className="text-amber-400 font-mono">
                      {formatVND(changeAmount)}
                    </span>
                  </div>
                  <div className="flex gap-1 justify-end">
                    {CASH_PRESETS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashGivenInput(String(amt))}
                        className="rounded bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300"
                      >
                        {amt / 1000}k
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashGivenInput(String(finalAmount))}
                      className="rounded bg-emerald-700 hover:bg-emerald-600 px-1.5 py-0.5 text-[9px] text-white font-bold"
                    >
                      Đủ
                    </button>
                  </div>
                </div>
              )}

              {paymentMethod === "qr_code" && (
                <div className="rounded-xl border border-white/10 bg-slate-800/80 p-2 flex flex-col gap-1.5 text-[10px]">
                  <div className="flex items-center gap-2.5">
                    {vietQrUrl ? (
                      <div
                        onClick={() => setIsQrZoomed(true)}
                        className="group relative h-14 w-14 shrink-0 rounded bg-white p-0.5 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all shadow"
                        title="Bấm để phóng to mã QR cho khách quét"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vietQrUrl}
                          alt="VietQR"
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                          <Maximize2 className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded bg-slate-700 flex items-center justify-center">
                        <QrCode className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="truncate font-bold text-sky-400">
                        {storeBank?.shortName || storeInfo?.bankCode || "Ngân hàng"} • {storeInfo?.bankAccountNumber || "Chưa cài"}
                      </div>
                      <div className="truncate text-slate-400 text-[9px]">
                        {storeInfo?.bankAccountHolder || "Chủ tài khoản"}
                      </div>
                      <div className="text-emerald-400 font-bold tabular-nums">
                        {formatVND(finalAmount)}
                      </div>
                    </div>
                  </div>

                  {vietQrUrl && (
                    <button
                      type="button"
                      onClick={() => setIsQrZoomed(true)}
                      className="w-full rounded-lg bg-sky-600/30 border border-sky-500/40 py-1 px-2 text-center text-[10px] font-semibold text-sky-300 hover:bg-sky-600/50 flex items-center justify-center gap-1 transition-all"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Phóng to mã QR
                    </button>
                  )}
                </div>
              )}

              {paymentMethod === "debt" && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-1.5 text-[10px] text-purple-200">
                  {selectedCustomer ? (
                    <span>Ghi nhận công nợ vào tài khoản: <strong>{selectedCustomer.name}</strong></span>
                  ) : (
                    <span className="text-amber-300">⚠️ Vui lòng chọn Khách hàng cụ thể bên trên để ghi nợ.</span>
                  )}
                </div>
              )}

              {/* Lỗi nếu có */}
              {errorMessage && (
                <div className="rounded bg-red-500/20 border border-red-500/30 p-1 text-[10px] text-red-300">
                  {errorMessage}
                </div>
              )}

              {/* Nút Xác nhận thanh toán */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={orderLines.length === 0 || createOrderMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-3 font-bold text-sm text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý đơn hàng...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Xác Nhận &amp; Thanh Toán ({formatVND(finalAmount)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Phóng To VietQR Đẹp Mắt ── */}
      {isQrZoomed && vietQrUrl && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-6 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thanh toán qua mã VietQR</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-sky-400" />
                    Quét qua App ngân hàng / MoMo / ZaloPay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="rounded-full bg-white/10 p-1.5 text-slate-400 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Image */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-950 p-4 text-center">
              <div className="relative rounded-xl bg-white p-2.5 shadow-lg ring-2 ring-indigo-500/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vietQrUrl}
                  alt="Mã VietQR Phóng To"
                  className="h-52 w-52 object-contain rounded"
                />
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold">
                <Sparkles className="h-3 w-3" />
                Napas247 · Chuyển khoản tức thì 24/7
              </div>
            </div>

            {/* Chi tiết chuyển khoản */}
            <div className="space-y-1.5 rounded-xl border border-white/10 bg-slate-800/60 p-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Ngân hàng:</span>
                <span className="font-bold text-white">
                  {storeBank?.shortName || storeInfo?.bankCode || "Chưa thiết lập"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">
                    {storeInfo?.bankAccountNumber || "N/A"}
                  </span>
                  {storeInfo?.bankAccountNumber && (
                    <button
                      type="button"
                      onClick={() => handleCopy(storeInfo.bankAccountNumber!, "acc_pos_zoom")}
                      className="rounded bg-white/10 p-1 text-slate-300 hover:text-white transition-colors"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === "acc_pos_zoom" ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Chủ tài khoản:</span>
                <span className="font-bold uppercase text-white">
                  {storeInfo?.bankAccountHolder || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Số tiền:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-emerald-400 text-sm">
                    {formatVND(finalAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(finalAmount), "amt_pos_zoom")}
                    className="rounded bg-white/10 p-1 text-slate-300 hover:text-white transition-colors"
                    title="Sao chép số tiền"
                  >
                    {copiedField === "amt_pos_zoom" ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nội dung CK:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-200">
                    {tempOrderMemo}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(tempOrderMemo, "memo_pos_zoom")}
                    className="rounded bg-white/10 p-1 text-slate-300 hover:text-white transition-colors"
                    title="Sao chép nội dung"
                  >
                    {copiedField === "memo_pos_zoom" ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Nút thao tác */}
            <div className="grid gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsQrZoomed(false);
                  handleCheckout();
                }}
                disabled={orderLines.length === 0 || createOrderMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-3 font-bold text-xs text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Đang hoàn tất đơn hàng...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Xác nhận đã nhận tiền & Hoàn tất đơn ({formatVND(finalAmount)})
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsQrZoomed(false)}
                className="w-full rounded-lg py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Đóng phóng to
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
