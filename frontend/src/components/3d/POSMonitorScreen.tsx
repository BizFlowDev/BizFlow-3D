"use client";

import { Modal3DCard } from "@/app/(dashboard)/store-3d/_components/Modal3DCard";
import { remainingSpatialStock } from "./spatialCart";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomerList, type Customer } from "@/hooks/useCustomers";
import { useProductCatalog, useCategoryList, type Product } from "@/hooks/useProducts";
import { useStockLevel } from "@/hooks/useInventory";
import {
  useCreateOrder,
  getOrderCode,
  useCreateOrderStripeSession,
  useOrderStripeSessionStatus,
  useCancelOrderStripeSession,
  type Order,
  type OrderStripeSessionData,
} from "@/hooks/useOrders";
import {
  StripeCountdownTimer,
  StripeExpiredOverlay,
} from "@/components/shared/StripeCountdownTimer";
import { useCurrentStore } from "@/hooks/useStore";
import { QRCodeSVG } from "qrcode.react";
import { printInvoice } from "@/lib/invoice";
import type { CartItem3D } from "@/app/(dashboard)/store-3d/_components/ProductDetailModal3D";

interface POSMonitorScreenProps {
  screenWidth?: number;
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
        <div className="pos-screen flex h-full w-full flex-col justify-between rounded-2xl bg-slate-950 p-8 text-white border border-red-500/50">
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
  screenWidth = 1200,
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

  const { data: productData, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useProductCatalog();
  const allProducts = useMemo(() => productData?.items.filter(product => product.isActive) ?? [], [productData]);
  const { data: stockData, isLoading: stockLoading, isError: stockError, refetch: refetchStock } = useStockLevel();
  const stockMap = useMemo(() => new Map(stockData?.map(item => [item.productId, item.currentStock])), [stockData]);

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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "stripe" | "debt">("cash");
  const [cashGivenInput, setCashGivenInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeSession, setStripeSession] = useState<OrderStripeSessionData | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeExpired, setIsStripeExpired] = useState(false);

  const createStripeSessionMutation = useCreateOrderStripeSession();
  const cancelStripeSessionMutation = useCancelOrderStripeSession();

  // Tra cứu trạng thái thanh toán tự động qua Stripe
  const {
    data: stripeStatus,
    refetch: refetchStripeStatus,
    isFetching: isCheckingStripe,
  } = useOrderStripeSessionStatus(
    stripeSession?.sessionId,
    (stripeModalOpen || paymentMethod === "stripe") && !isStripeExpired,
  );

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

  // ── Phân trang sản phẩm ──
  const ITEMS_PER_PAGE = 9;
  const [productPage, setProductPage] = useState(1);

  // Tự động quay về trang 1 khi tìm kiếm hoặc đổi danh mục
  useEffect(() => {
    setProductPage(1);
  }, [productSearch, selectedCategory]);

  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, productPage]);

  // ── Phân trang lịch sử đơn hàng ──
  const ORDERS_PER_PAGE = 8;
  const [historyPage, setHistoryPage] = useState(1);
  const totalHistoryPages = Math.max(1, Math.ceil(recentOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (historyPage - 1) * ORDERS_PER_PAGE;
    return recentOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [recentOrders, historyPage]);

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
  const stockIssue = useMemo(() => {
    if (!orderLines.length) return null;
    if (stockError || !stockData) return "Chưa xác định được tồn kho. Vui lòng tải lại tồn kho trước khi thanh toán.";
    const quantities = new Map<string, number>();
    for (const item of orderLines) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.conversionFactor <= 0) return "Số lượng hoặc đơn vị mua không hợp lệ.";
      const quantity = (quantities.get(item.productId) ?? 0) + item.quantity * item.conversionFactor;
      quantities.set(item.productId, quantity);
      const stock = stockMap.get(item.productId);
      if (stock === undefined || quantity > stock) return `Không đủ tồn kho đã xác nhận cho ${item.productName}. Vui lòng kiểm tra số lượng và đơn vị.`;
    }
    return null;
  }, [orderLines, stockData, stockError, stockMap]);

  // Mở modal thanh toán Stripe và sinh phiên checkout
  const handleOpenStripeModal = useCallback(() => {
    if (orderLines.length === 0) return;
    if (stockIssue) { setErrorMessage(stockIssue); return; }
    hasAutoSubmittedStripeRef.current = false;
    setStripeError(null);
    setIsStripeExpired(false);
    setStripeModalOpen(true);

    createStripeSessionMutation.mutate(
      {
        amount: finalAmount,
        customerName: selectedCustomer?.name || undefined,
        items: orderLines.map((it) => ({
          name: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      },
      {
        onSuccess: (data) => {
          setStripeSession(data);
          setStripeError(null);
          setIsStripeExpired(false);
        },
        onError: (err: any) => {
          const msg = err?.message || "Không thể khởi tạo cổng Stripe";
          setStripeError(msg);
        },
      },
    );
  }, [orderLines, finalAmount, selectedCustomer, createStripeSessionMutation, stockIssue]);

  // Hủy phiên Stripe sau 15 phút
  const handleStripeExpire = useCallback(() => {
    setIsStripeExpired(true);
    if (stripeSession?.sessionId) {
      cancelStripeSessionMutation.mutate(stripeSession.sessionId);
    }
  }, [stripeSession?.sessionId, cancelStripeSessionMutation]);

  // Lắng nghe trạng thái hết hạn từ server
  useEffect(() => {
    if (stripeStatus?.isExpired || stripeStatus?.status === "expired") {
      setIsStripeExpired(true);
    }
  }, [stripeStatus?.isExpired, stripeStatus?.status]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Thêm nhanh từ grid
  const handleAddProductCard = (p: Product) => {
    const defaultUnit = p.units?.find((u) => u.isDefault) || p.units?.[0];
    const stock = stockMap.get(p.id);
    const reserved = orderLines.filter(item => item.productId === p.id).reduce((sum, item) => sum + item.quantity * item.conversionFactor, 0);
    if (stockError || stock === undefined || !defaultUnit || stock - reserved < defaultUnit.conversionFactor) {
      setErrorMessage(stockError || stock === undefined ? "Chưa xác định được tồn kho. Vui lòng tải lại tồn kho trước khi bán." : "Không đủ tồn kho cho đơn vị đã chọn.");
      return;
    }
    setErrorMessage(null);
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
      availableStock: stock,
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

    const otherLines = orderLines.filter(line => line !== currentItem);
    if (stockError || !Number.isFinite(newUnit.conversionFactor) || newUnit.conversionFactor <= 0 ||
        currentItem.quantity * newUnit.conversionFactor > remainingSpatialStock(otherLines, productId, stockMap.get(productId))) {
      setErrorMessage("Không đủ tồn kho đã xác nhận cho đơn vị đã chọn. Giỏ hàng được giữ nguyên.");
      return;
    }
    setErrorMessage(null);

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
    if (stockIssue) { setErrorMessage(stockIssue); return; }
    if (orderLines.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất một sản phẩm vào đơn hàng.");
      return;
    }

    if (paymentMethod === "debt") {
      if (!selectedCustomerId || !selectedCustomer) {
        setErrorMessage("Hình thức Ghi nợ bắt buộc phải chọn Khách hàng cụ thể.");
        return;
      }
      if (selectedCustomer.creditLimit > 0) {
        const currentDebt = selectedCustomer.debtBalance || 0;
        if (currentDebt + finalAmount > selectedCustomer.creditLimit) {
          const excess = currentDebt + finalAmount - selectedCustomer.creditLimit;
          setErrorMessage(
            `Vượt hạn mức ghi nợ! Khách hàng "${selectedCustomer.name}" có hạn mức ${formatVND(selectedCustomer.creditLimit)}, hiện đang nợ ${formatVND(currentDebt)}. Đơn này nợ thêm ${formatVND(finalAmount)} vượt hạn mức ${formatVND(excess)}.`
          );
          return;
        }
      }
    }

    // Double Guard: Không cho phép tạo đơn Stripe khi chưa hoàn tất thanh toán
    if (paymentMethod === "stripe" && !stripeStatus?.isPaid) {
      setErrorMessage("Khách hàng chưa hoàn tất thanh toán Stripe. Vui lòng thanh toán trước khi xác nhận đơn!");
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
        setStripeModalOpen(false);
        setStripeSession(null);
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

  // Tự động hoàn tất đơn hàng khi khách thanh toán thành công qua Stripe
  const hasAutoSubmittedStripeRef = useRef(false);
  useEffect(() => {
    if (paymentMethod === "stripe" && stripeStatus?.isPaid && !isStripeExpired && !hasAutoSubmittedStripeRef.current) {
      hasAutoSubmittedStripeRef.current = true;
      handleCheckout();
    }
  }, [paymentMethod, stripeStatus?.isPaid, isStripeExpired]);

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
      role="region"
      aria-label="Bán hàng POS"
      style={{ width: screenWidth, height: screenWidth * 0.625 }}
      className="pos-screen flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl select-none border border-slate-700/60"
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
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/40">
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pos-screen">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-sky-400" />
                Các đơn hàng gần nhất
              </h3>
              <span className="text-xs text-slate-400">
                Tổng cộng: <span className="font-bold text-white">{recentOrders.length}</span> đơn
              </span>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Chưa có đơn hàng nào được ghi nhận.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {paginatedOrders.map((ord) => (
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

          {/* Phân trang tab Lịch sử */}
          {recentOrders.length > ORDERS_PER_PAGE && (
            <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/80 px-4 py-2 shrink-0 text-xs">
              <div className="text-[11px] text-slate-400">
                Hiển thị <span className="font-bold text-white">{(historyPage - 1) * ORDERS_PER_PAGE + 1}</span> -{" "}
                <span className="font-bold text-white">
                  {Math.min(historyPage * ORDERS_PER_PAGE, recentOrders.length)}
                </span>{" "}
                / <span className="font-bold text-sky-400">{recentOrders.length}</span> đơn
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="font-mono text-[11px] font-bold text-sky-400 px-1">
                  {historyPage} / {totalHistoryPages}
                </span>

                <button
                  type="button"
                  disabled={historyPage >= totalHistoryPages}
                  onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Trang tiếp theo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
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
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ── CỘT TRÁI: DANH MỤC & TÌM KIẾM SẢN PHẨM (50%) ─────────── */}
          <div className="flex min-h-0 min-w-0 w-[50%] flex-col border-r border-white/10 bg-slate-900/40">
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
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 text-[11px] pos-screen">
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

            {stockError && <p role="alert" className="px-3 py-2 text-xs text-amber-300">Không tải được tồn kho. <button type="button" onClick={() => refetchStock()} className="underline">Tải lại tồn kho</button></p>}
            {/* Grid sản phẩm */}
            <div className="flex-1 overflow-y-auto p-3 pos-screen">
              {productsError ? (
                <div role="alert" className="p-4 text-sm text-amber-300">Không tải được danh mục. <button onClick={() => refetchProducts()} className="underline">Thử lại</button></div>
              ) : productsLoading ? (
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
                  {paginatedProducts.map((p) => {
                    const defaultUnit = p.units?.find((u) => u.isDefault) || p.units?.[0];
                    const price = defaultUnit?.price ?? 0;
                    const knownStock = !stockError && stockMap.has(p.id);
                    const stock = stockMap.get(p.id) ?? 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => { if (knownStock && stock > 0) handleAddProductCard(p); }}
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

                        <p className={`mb-1 text-[10px] ${!knownStock ? "text-slate-400" : stock <= 0 ? "text-red-300" : "text-emerald-300"}`}>{!knownStock ? stockLoading ? "Đang tải tồn kho…" : "Chưa xác định tồn kho" : stock <= 0 ? "Hết hàng" : `Tồn: ${stock}`}</p>
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
                          aria-label={`Thêm ${p.name}`}
                          disabled={!knownStock || !defaultUnit || stock < defaultUnit.conversionFactor}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600/20 py-1 text-[11px] font-semibold text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow disabled:cursor-not-allowed disabled:opacity-40"
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

            {/* ── Thanh Phân Trang Cố Định Ở Đáy Cột Sản Phẩm ── */}
            {filteredProducts.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/80 px-3 py-2 shrink-0 text-xs">
                <div className="text-[11px] text-slate-400">
                  Hiển thị <span className="font-bold text-white">{(productPage - 1) * ITEMS_PER_PAGE + 1}</span> -{" "}
                  <span className="font-bold text-white">
                    {Math.min(productPage * ITEMS_PER_PAGE, filteredProducts.length)}
                  </span>{" "}
                  / <span className="font-bold text-sky-400">{filteredProducts.length}</span> món
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={productPage <= 1}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Trang trước"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  <span className="font-mono text-[11px] font-bold text-sky-400 px-1">
                    {productPage} / {totalProductPages}
                  </span>

                  <button
                    type="button"
                    disabled={productPage >= totalProductPages}
                    onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Trang tiếp theo"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
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
                            aria-label={`Đơn vị ${it.productName}`}
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
                          aria-label={`Giảm ${it.productName}`}
                          disabled={it.quantity <= 1}
                          onClick={() => {
                            setErrorMessage(null);
                            onUpdateQuantity(
                              it.productId,
                              it.unitId,
                              Math.max(1, it.quantity - 1),
                            );
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-bold font-mono text-[11px]">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Tăng ${it.productName}`}
                          disabled={stockError || remainingSpatialStock(orderLines, it.productId, stockMap.get(it.productId)) < it.conversionFactor}
                          onClick={() => {
                            setErrorMessage(null);
                            onUpdateQuantity(
                              it.productId,
                              it.unitId,
                              it.quantity + 1,
                            );
                          }}
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
                        aria-label={`Xóa ${it.productName}`}
                        onClick={() => { setErrorMessage(null); onRemoveItem(it.productId, it.unitId); }}
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
                  onClick={() => {
                    setPaymentMethod("stripe");
                    if (!stripeSession && orderLines.length > 0) {
                      handleOpenStripeModal();
                    }
                  }}
                  className={`flex items-center justify-center gap-1 py-1 rounded font-bold transition-all ${paymentMethod === "stripe"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                >
                  <CreditCard className="h-3 w-3" /> Cổng Stripe
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

              {paymentMethod === "stripe" && (
                <div className="rounded-xl border border-indigo-500/20 bg-slate-800/80 p-2 flex flex-col gap-1.5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 font-bold text-white">
                      <CreditCard className="h-3 w-3 text-indigo-400" />
                      <span>Cổng Stripe Checkout</span>
                    </div>
                    <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold border border-emerald-500/30">
                      Bảo mật PCI-DSS
                    </span>
                  </div>

                  {/* Trạng thái real-time */}
                  <div className="flex items-center justify-between rounded bg-slate-900/80 p-1.5 text-[9px]">
                    <span className="text-slate-400">Trạng thái:</span>
                    {stripeStatus?.isPaid ? (
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Đã thanh toán
                      </span>
                    ) : isStripeExpired ? (
                      <span className="flex items-center gap-1 font-bold text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        Hết hạn 15p
                      </span>
                    ) : createStripeSessionMutation.isPending ? (
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Đang tạo phiên...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Clock className="h-3 w-3 animate-pulse" />
                        Chờ khách thanh toán
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={handleOpenStripeModal}
                      disabled={orderLines.length === 0}
                      className={cn(
                        "flex-1 rounded-lg py-1 px-2 text-center text-[10px] font-bold text-white flex items-center justify-center gap-1 transition-all disabled:opacity-50",
                        isStripeExpired
                          ? "bg-red-600 hover:bg-red-500"
                          : "bg-indigo-600 hover:bg-indigo-500"
                      )}
                    >
                      <QrCode className="h-3 w-3" />
                      {isStripeExpired ? "Tạo lại mã QR" : stripeSession ? "Xem mã QR Stripe" : "Mở mã QR Stripe"}
                    </button>
                    {stripeSession?.checkoutUrl && !isStripeExpired && (
                      <a
                        href={stripeSession.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 flex items-center justify-center text-slate-300 transition-colors"
                        title="Mở trang Checkout"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === "debt" && (
                <div className={cn(
                  "rounded-lg border p-1.5 text-[10px]",
                  selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit
                    ? "border-red-500/40 bg-red-500/20 text-red-200"
                    : "border-purple-500/30 bg-purple-500/10 text-purple-200"
                )}>
                  {selectedCustomer ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span>Ghi nợ: <strong>{selectedCustomer.name}</strong></span>
                        {selectedCustomer.creditLimit > 0 && (
                          <span className="font-mono bg-white/10 px-1 rounded text-[9px]">
                            HM: {formatVND(selectedCustomer.creditLimit)}
                          </span>
                        )}
                      </div>
                      {selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit ? (
                        <p className="text-red-300 font-semibold">
                          ⚠️ VƯỢT HẠN MỨC GHI NỢ (+{formatVND((selectedCustomer.debtBalance || 0) + finalAmount - selectedCustomer.creditLimit)})
                        </p>
                      ) : (
                        <p className="text-slate-300 text-[9px]">
                          Cộng thêm {formatVND(finalAmount)} vào công nợ (hiện tại: {formatVND(selectedCustomer.debtBalance || 0)}).
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-300">⚠️ Vui lòng chọn Khách hàng cụ thể bên trên để ghi nợ.</span>
                  )}
                </div>
              )}

              {/* Lỗi nếu có */}
              {(errorMessage || stockIssue) && (
                <div className="rounded bg-red-500/20 border border-red-500/30 p-1 text-[10px] text-red-300">
                  {errorMessage || stockIssue}
                </div>
              )}

              {/* Nút Xác nhận thanh toán */}
              <button
                type="button"
                onClick={
                  paymentMethod === "stripe" && !stripeStatus?.isPaid
                    ? handleOpenStripeModal
                    : handleCheckout
                }
                disabled={
                  orderLines.length === 0 ||
                  !!stockIssue ||
                  createOrderMutation.isPending ||
                  (paymentMethod === "debt" && !selectedCustomerId) ||
                  (paymentMethod === "debt" && !!selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit) ||
                  (paymentMethod === "stripe" && stripeModalOpen && !stripeStatus?.isPaid)
                }
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                  paymentMethod === "debt" && selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit
                    ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                    : paymentMethod === "stripe"
                      ? stripeStatus?.isPaid
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20"
                        : "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/20"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20"
                )}
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý đơn hàng...
                  </>
                ) : paymentMethod === "debt" && selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-white" />
                    Vượt hạn mức nợ (+{formatVND((selectedCustomer.debtBalance || 0) + finalAmount - selectedCustomer.creditLimit)})
                  </>
                ) : paymentMethod === "stripe" ? (
                  stripeStatus?.isPaid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Đã nhận tiền Stripe · Hoàn tất đơn ({formatVND(finalAmount)})
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Mở Cổng Stripe &amp; Quét Mã QR ({formatVND(finalAmount)})
                    </>
                  )
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

      {/* ── Modal Thanh Toán Stripe Cao Cấp (Màn Hình Quầy POS 3D) ── */}
      {stripeModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px] p-6 animate-in fade-in duration-150">
          <Modal3DCard className="mx-auto max-w-md"><div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thanh toán qua Cổng Stripe</h3>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    Quét mã QR bằng điện thoại hoặc quẹt thẻ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStripeModalOpen(false)}
                className="rounded-full bg-white/10 p-1.5 text-slate-400 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createStripeSessionMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="font-semibold text-xs text-white">Đang khởi tạo cổng Stripe...</p>
                <p className="text-[10px] text-slate-400">Sinh phiên checkout và mã QR thời gian thực</p>
              </div>
            ) : stripeError ? (
              <div className="space-y-3 py-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-xs text-red-300">Khởi tạo thất bại</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">{stripeError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenStripeModal}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-[10px] font-bold text-white shadow transition-all"
                >
                  Thử lại
                </button>
              </div>
            ) : stripeSession ? (
              <>
                {/* Bộ đếm thời gian 15 phút chuyên nghiệp */}
                <StripeCountdownTimer
                  expiresAt={stripeSession.expiresAt}
                  onExpire={handleStripeExpire}
                  isExpiredState={isStripeExpired}
                />

                {/* QR Image */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-slate-950 p-4 text-center">
                  <div className="relative rounded-xl bg-white p-2.5 shadow-lg ring-2 ring-indigo-500/20 overflow-hidden">
                    {stripeSession.qrCodeUrl ? (
                      <img
                        src={stripeSession.qrCodeUrl}
                        alt="Stripe Checkout QR"
                        className="h-48 w-48 object-contain rounded"
                      />
                    ) : (
                      <QRCodeSVG
                        value={stripeSession.checkoutUrl}
                        size={192}
                        level="M"
                        className="rounded"
                      />
                    )}

                    {/* Lớp phủ khi hết hạn 15 phút */}
                    {isStripeExpired && (
                      <StripeExpiredOverlay
                        onRefresh={handleOpenStripeModal}
                        isRefreshing={createStripeSessionMutation.isPending}
                      />
                    )}
                  </div>
                  {/* Trạng thái real-time */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold">
                    {stripeStatus?.isPaid ? (
                      <div className="flex items-center gap-1 text-emerald-400 animate-pulse">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Đã nhận thanh toán! Đang hoàn tất đơn...</span>
                      </div>
                    ) : isStripeExpired ? (
                      <div className="flex items-center gap-1 text-red-400 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Mã thanh toán đã hết hạn (15 phút)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-indigo-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Đang chờ khách thanh toán trên điện thoại...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chi tiết thanh toán */}
                <div className="space-y-1.5 rounded-xl border border-white/10 bg-slate-800/60 p-3 text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Cổng thanh toán:</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      Stripe Checkout
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded">
                        Bảo mật 100%
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Phương thức hỗ trợ:</span>
                    <span className="text-slate-200">Visa, Master, Apple Pay, Google Pay</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400">Số tiền:</span>
                    <span className="font-mono font-extrabold text-indigo-400 text-sm">
                      {formatVND(finalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Liên kết thanh toán:</span>
                    {isStripeExpired ? (
                      <span className="text-[11px] text-slate-500 line-through">Liên kết đã hết hạn</span>
                    ) : (
                      <a
                        href={stripeSession.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
                      >
                        <span>Mở trang Checkout</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Nút thao tác */}
                <div className="grid gap-2 pt-1">
                  {/* Nút xác nhận: KHÓA KHI CHƯA THANH TOÁN HOẶC ĐÃ HẾT HẠN */}
                  <button
                    type="button"
                    onClick={() => handleCheckout()}
                    disabled={!stripeStatus?.isPaid || createOrderMutation.isPending || isStripeExpired}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-xs shadow-lg transition-all",
                      stripeStatus?.isPaid
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25 cursor-pointer"
                        : "bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed opacity-80"
                    )}
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Đang hoàn tất đơn hàng...
                      </>
                    ) : stripeStatus?.isPaid ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1 text-white" />
                        Đã nhận thanh toán · Hoàn tất đơn ngay
                      </>
                    ) : isStripeExpired ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-1 text-red-400" />
                        Mã đã hết hạn (Vui lòng tạo lại)
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-1 text-amber-400 animate-pulse" />
                        Chưa thanh toán (Không thể xác nhận)
                      </>
                    )}
                  </button>

                  <div className="flex gap-2">
                    {isStripeExpired ? (
                      <button
                        type="button"
                        onClick={handleOpenStripeModal}
                        disabled={createStripeSessionMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 py-1.5 text-[11px] font-semibold text-white shadow transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-3 w-3", createStripeSessionMutation.isPending && "animate-spin")} />
                        Tạo lại mã QR mới
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => refetchStripeStatus()}
                        disabled={isCheckingStripe || stripeStatus?.isPaid}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-3 w-3", isCheckingStripe && "animate-spin")} />
                        Kiểm tra trạng thái
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStripeModalOpen(false)}
                      className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div></Modal3DCard>
        </div>
      )}
    </div>
  );
}
