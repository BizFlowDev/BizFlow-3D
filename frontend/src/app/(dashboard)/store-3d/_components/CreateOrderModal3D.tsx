"use client";

import { useSpatialModalClose } from "./useSpatialModalClose";
import { Modal3DCard } from "./Modal3DCard";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import {
  X,
  CreditCard,
  ShoppingCart,
  Receipt,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Crown,
  Loader2,
  AlertCircle,
  Banknote,
  QrCode,
  User,
  Package,
  Search,
  ExternalLink,
  Store,
  Tag,
  Copy,
  Check,
  Percent,
  Maximize2,
  Sparkles,
  ShieldAlert,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomerList, type Customer } from "@/hooks/useCustomers";
import { useProductList, useCategoryList, type Product } from "@/hooks/useProducts";
import {
  useCreateOrder,
  useOrderList,
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
import type { CartItem3D } from "./ProductDetailModal3D";
import { UpgradePlanModal } from "@/components/shared/UpgradePlanModal";

interface CreateOrderModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  orderLines: CartItem3D[];
  onAddProduct: (item: CartItem3D) => void;
  onUpdateQuantity: (productId: string, unitId: string, delta: number) => void;
  onRemoveItem: (productId: string, unitId: string) => void;
  onClearOrder: () => void;
  onOrderSuccess: (order: Order) => void;
  activeOrdersCount?: number;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

const CASH_PRESETS = [10000, 20000, 50000, 100000, 200000, 500000];

export function CreateOrderModal3D({
  isOpen,
  onClose: requestClose,
  orderLines,
  onAddProduct,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onOrderSuccess,
  activeOrdersCount = 0,
}: CreateOrderModal3DProps) {
  const { close: onClose, closing } = useSpatialModalClose(isOpen, requestClose);
  // Tabs: 'create' hoặc 'history'
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");

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
  const { data: orderData } = useOrderList({ limit: 20 });
  const recentOrders = orderData?.items ?? [];

  // ── State Tìm Kiếm Sản Phẩm & Lọc ──
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ── State Khách Hàng & Đơn Hàng ──
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [orderNote, setOrderNote] = useState("");

  // ── State Thanh Toán ──
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "stripe" | "debt">("cash");
  const [cashGivenInput, setCashGivenInput] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeSession, setStripeSession] = useState<OrderStripeSessionData | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeExpired, setIsStripeExpired] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { data: store } = useCurrentStore();

  const createStripeSessionMutation = useCreateOrderStripeSession();
  const cancelStripeSessionMutation = useCancelOrderStripeSession();

  // Tra cứu trạng thái thanh toán tự động qua cổng Stripe
  const {
    data: stripeStatus,
    refetch: refetchStripeStatus,
    isFetching: isCheckingStripe,
  } = useOrderStripeSessionStatus(
    stripeSession?.sessionId,
    (stripeModalOpen || paymentMethod === "stripe") && !isStripeExpired,
  );

  // Khách hàng hiện tại được chọn
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Lọc danh sách khách hàng
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)),
    );
  }, [customers, customerSearch]);

  // Lọc sản phẩm hiển thị bên trái
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

  // ── Tính Toán Tài Chính ──
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

  // Tiền mặt đưa & tiền thừa
  const cashGiven = cashGivenInput
    ? Math.max(0, parseFloat(cashGivenInput) || 0)
    : finalAmount;
  const changeAmount = Math.max(0, cashGiven - finalAmount);

  // Copy helper
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Thêm nhanh sản phẩm từ danh mục bên trái vào đơn
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

  // Đổi đơn vị tính của một dòng hàng
  const handleChangeUnit = (productId: string, oldUnitId: string, newUnitId: string) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product || !product.units) return;
    const newUnit = product.units.find((u) => u.id === newUnitId);
    if (!newUnit) return;

    onRemoveItem(productId, oldUnitId);
    onAddProduct({
      productId: product.id,
      productName: product.name,
      code: product.code,
      imageUrl: product.imageUrl,
      unitId: newUnit.id,
      unitName: newUnit.unitName,
      conversionFactor: newUnit.conversionFactor,
      unitPrice: newUnit.price,
      quantity: 1,
      availableStock: 50,
    });
  };

  // Mở modal thanh toán Stripe và sinh phiên checkout
  const handleOpenStripeModal = useCallback(() => {
    if (orderLines.length === 0) return;
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
  }, [orderLines, finalAmount, selectedCustomer, createStripeSessionMutation]);

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

  // Xử lý tạo đơn hàng
  const handleCreateOrder = async () => {
    if (orderLines.length === 0) return;
    setErrorMessage(null);

    // Ghi nợ yêu cầu chọn khách hàng và kiểm tra hạn mức
    if (paymentMethod === "debt") {
      if (!selectedCustomerId || !selectedCustomer) {
        setErrorMessage("Vui lòng chọn khách hàng cụ thể khi thanh toán hình thức Ghi nợ!");
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

    // Double Guard: Không cho phép xác nhận tạo đơn Stripe khi chưa thanh toán
    if (paymentMethod === "stripe" && !stripeStatus?.isPaid) {
      setErrorMessage("Khách hàng chưa hoàn tất thanh toán Stripe. Vui lòng thanh toán trước khi xác nhận đơn!");
      return;
    }

    try {
      const orderPayload = {
        customerId: selectedCustomerId || undefined,
        orderType: "counter" as const,
        status: "confirmed" as const,
        paymentMethod,
        discountAmount,
        debtAmount: paymentMethod === "debt" ? finalAmount : 0,
        paidAmount: paymentMethod === "cash" ? cashGiven : paymentMethod === "debt" ? 0 : finalAmount,
        changeAmount: paymentMethod === "cash" ? changeAmount : 0,
        note: orderNote || "Đơn hàng quầy thu ngân Showroom 3D",
        items: orderLines.map((line) => ({
          productId: line.productId,
          productUnitId: line.unitId !== "default" ? line.unitId : undefined,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      };

      const result = await createOrderMutation.mutateAsync(orderPayload);
      setStripeModalOpen(false);
      setStripeSession(null);
      onClearOrder();
      onClose();
      onOrderSuccess(result);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!",
      );
    }
  };

  // Tự động hoàn tất đơn hàng khi khách thanh toán thành công qua Stripe
  const hasAutoSubmittedStripeRef = useRef(false);
  useEffect(() => {
    if (paymentMethod === "stripe" && stripeStatus?.isPaid && !isStripeExpired && !hasAutoSubmittedStripeRef.current) {
      hasAutoSubmittedStripeRef.current = true;
      handleCreateOrder();
    }
  }, [paymentMethod, stripeStatus?.isPaid, isStripeExpired]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-3 sm:p-5 backdrop-blur-[2px] animate-in fade-in duration-200">
      <Modal3DCard closing={closing} className="mx-auto max-w-6xl"><div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900 text-white shadow-2xl backdrop-blur-2xl">
        {/* ── Header Terminal POS ──────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/90 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  BizFlow POS — Màn Hình Bán Hàng Tại Quầy
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live 3D Showroom
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tạo đơn hàng, quản lý dòng sản phẩm, chiết khấu và thanh toán đa phương thức
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch */}
            <div className="flex rounded-xl bg-slate-800 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "create"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Tạo Đơn Hàng ({orderLines.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                Đơn Gần Đây ({recentOrders.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Nội Dung Chính ──────────────────────────────────── */}
        {activeTab === "create" ? (
          <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
            {/* ── Cột Trái: Danh Mục & Chọn Sản Phẩm (45%) ──────── */}
            <div className="flex flex-1 flex-col border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-900/60 p-4 min-w-0 max-w-full lg:max-w-[48%]">
              {/* Search & Filter bar */}
              <div className="space-y-3 mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-800 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Danh mục pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`rounded-xl px-3 py-1 font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    Tất cả ({allProducts.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`rounded-xl px-3 py-1 font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Sản Phẩm */}
              <div className="flex-1 overflow-y-auto pr-1">
                {productsLoading ? (
                  <div className="flex h-48 items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang tải danh mục sản phẩm...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-slate-500">
                    <Package className="h-8 w-8 mb-2" />
                    Không tìm thấy sản phẩm phù hợp
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {filteredProducts.map((p) => {
                      const defaultUnit = p.units?.[0];
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleAddProductCard(p)}
                          className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-800/60 p-3 hover:bg-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:scale-[1.02]"
                        >
                          <div className="relative h-20 w-full mb-2 overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-slate-600" />
                            )}
                          </div>

                          <div>
                            <div className="font-bold text-xs text-white line-clamp-1 group-hover:text-sky-300">
                              {p.name}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-extrabold text-xs text-emerald-400">
                                {formatVND(defaultUnit?.price || 0)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                /{defaultUnit?.unitName || "Cái"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-white/5 py-1 text-[10px] font-semibold text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Plus className="h-3 w-3" /> Chọn vào đơn
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Cột Phải: Quản Lý Đơn Hàng & POS Checkout (55%) ── */}
            <div className="flex flex-1 flex-col bg-slate-900 p-5 overflow-y-auto space-y-4">
              {/* Chọn khách hàng & Công nợ */}
              <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <User className="h-3.5 w-3.5 text-indigo-400" />
                    Khách Hàng
                  </label>
                  {selectedCustomer && (
                    <span className="text-xs text-slate-400">
                      SĐT: {selectedCustomer.phone || "Chưa có"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Khách lẻ (Khách vãng lai)</option>
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>

                  {selectedCustomer && selectedCustomer.debtBalance > 0 && (
                    <span className="rounded-xl bg-red-500/20 border border-red-500/30 px-2.5 py-1.5 text-[11px] font-bold text-red-400">
                      Nợ: {formatVND(selectedCustomer.debtBalance)}
                    </span>
                  )}
                </div>
              </div>

              {/* Danh sách mặt hàng trong đơn */}
              <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Mặt hàng đã chọn ({orderLines.length})
                  </span>
                  {orderLines.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearOrder}
                      className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {orderLines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 text-xs">
                    <ShoppingCart className="h-8 w-8 mb-1.5 opacity-40" />
                    Chưa có món hàng nào. Hãy chọn từ danh mục bên trái hoặc trên kệ 3D.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {orderLines.map((line) => {
                      const fullProd = allProducts.find((p) => p.id === line.productId);
                      const hasUnits = fullProd && fullProd.units && fullProd.units.length > 1;

                      return (
                        <div
                          key={`${line.productId}-${line.unitId}`}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/80 p-2.5 text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-bold text-white truncate">
                              {line.productName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {hasUnits ? (
                                <select
                                  value={line.unitId}
                                  onChange={(e) =>
                                    handleChangeUnit(line.productId, line.unitId, e.target.value)
                                  }
                                  className="rounded-md border border-white/10 bg-slate-900 px-1.5 py-0.5 text-[11px] text-sky-300 focus:outline-none"
                                >
                                  {fullProd?.units?.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.unitName} ({formatVND(u.price)})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  {line.unitName}
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-emerald-400">
                                {formatVND(line.unitPrice)}
                              </span>
                            </div>
                          </div>

                          {/* Bộ tăng giảm số lượng */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-lg border border-white/10 bg-slate-900">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    line.productId,
                                    line.unitId,
                                    Math.max(1, line.quantity - 1),
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-white tabular-nums">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQuantity(
                                    line.productId,
                                    line.unitId,
                                    line.quantity + 1,
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="w-20 text-right font-bold text-emerald-400 tabular-nums">
                              {formatVND(line.unitPrice * line.quantity)}
                            </span>

                            <button
                              type="button"
                              onClick={() => onRemoveItem(line.productId, line.unitId)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chiết khấu & Tính toán */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-300">
                      <Percent className="h-3.5 w-3.5 text-indigo-400" />
                      Giảm giá
                    </label>
                    <div className="flex items-center rounded-lg border border-white/10 bg-slate-900/80 p-0.5 text-[10px] font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType("amount");
                          setDiscountInput("");
                        }}
                        className={`rounded px-1.5 py-0.5 transition-colors ${
                          discountType === "amount"
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
                        className={`rounded px-1.5 py-0.5 transition-colors ${
                          discountType === "percent"
                            ? "bg-indigo-600 text-white font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={discountType === "percent" ? 100 : undefined}
                      placeholder={discountType === "percent" ? "0 %" : "0 đ"}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 pr-8 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {discountType === "percent" ? "%" : "đ"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {discountType === "percent" ? (
                      [5, 10, 15, 20].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setDiscountInput(String(v))}
                          className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-white/10"
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
                          className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-white/10"
                        >
                          +{v / 1000}k
                        </button>
                      ))
                    )}
                    {discountInput && (
                      <button
                        type="button"
                        onClick={() => setDiscountInput("")}
                        className="ml-auto rounded-lg bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 hover:text-red-400"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                  {discountAmount > 0 && (
                    <div className="mt-1 text-[10px] font-semibold text-emerald-400">
                      Đã giảm: {formatVND(discountAmount)} {discountType === "percent" && `(${discountInput}%)`}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ghi chú đơn hàng
                  </label>
                  <input
                    type="text"
                    placeholder="Ghi chú (giao hàng, đóng gói...)..."
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Gói dịch vụ & Nâng cấp gói */}
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-200 font-medium">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span>Gói dịch vụ: <strong className="capitalize text-white">{store?.subscriptionPlan || "Basic"}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeModalOpen(true)}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline"
                >
                  Nâng cấp gói
                </button>
              </div>

              {/* Phương thức thanh toán */}
              <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-3.5 space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cash", label: "Tiền mặt", icon: Banknote },
                    { id: "stripe", label: "Cổng Stripe", icon: CreditCard },
                    { id: "debt", label: "Ghi nợ", icon: Tag },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSel = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id as any);
                          if (m.id === "stripe" && !stripeSession && orderLines.length > 0) {
                            handleOpenStripeModal();
                          }
                        }}
                        className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                          isSel
                            ? "border-emerald-500 bg-emerald-600/20 text-emerald-300 font-bold"
                            : "border-white/10 bg-slate-800/60 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        <span className="text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Chi tiết cho từng phương thức */}
                {paymentMethod === "cash" && (
                  <div className="rounded-xl bg-slate-800/60 p-3 space-y-2 border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tiền khách đưa:</span>
                      <input
                        type="number"
                        placeholder={String(finalAmount)}
                        value={cashGivenInput}
                        onChange={(e) => setCashGivenInput(e.target.value)}
                        className="w-32 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-right text-xs font-bold text-white focus:outline-none"
                      />
                    </div>
                    {/* Nút tiền nhanh */}
                    <div className="flex flex-wrap gap-1">
                      {CASH_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashGivenInput(String(amt))}
                          className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/20"
                        >
                          {amt / 1000}k
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCashGivenInput(String(finalAmount))}
                        className="rounded-lg bg-emerald-600/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
                      >
                        Đủ tiền
                      </button>
                    </div>
                    {cashGiven > finalAmount && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                        <span className="text-slate-400">Tiền thừa trả khách:</span>
                        <span className="font-bold text-sky-400">
                          {formatVND(changeAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "stripe" && (
                  <div className="rounded-xl bg-slate-800/60 p-3 space-y-2.5 border border-indigo-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                          <CreditCard className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white">Cổng Thanh Toán Stripe</span>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        Bảo mật PCI-DSS
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Hỗ trợ thẻ quốc tế Visa, MasterCard, Apple Pay, Google Pay &amp; quét mã QR thanh toán trên điện thoại.
                    </p>

                    {/* Trạng thái thanh toán real-time */}
                    <div className="rounded-lg bg-slate-900/80 p-2.5 border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Trạng thái:</span>
                      {stripeStatus?.isPaid ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Đã thanh toán thành công
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

                    <div className="flex gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleOpenStripeModal}
                        disabled={orderLines.length === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 py-2 px-3 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        {stripeSession ? "Xem mã QR & Thanh toán" : "Khởi tạo mã QR Stripe"}
                      </button>
                      {stripeSession?.checkoutUrl && (
                        <a
                          href={stripeSession.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-2.5 py-2 text-xs font-semibold text-slate-200 transition-colors"
                          title="Mở trang Checkout trực tiếp"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === "debt" && (
                  <div className={cn(
                    "rounded-xl border p-2.5 text-xs transition-colors",
                    selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit
                      ? "bg-red-500/20 border-red-500/40 text-red-300"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                  )}>
                    {selectedCustomer ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center font-bold">
                          <span>Ghi nợ: {selectedCustomer.name}</span>
                          {selectedCustomer.creditLimit > 0 && (
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                              Hạn mức: {formatVND(selectedCustomer.creditLimit)}
                            </span>
                          )}
                        </div>
                        {selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit ? (
                          <div className="text-[11px] text-red-300 space-y-0.5">
                            <p className="font-semibold text-red-400">
                              ⚠️ VƯỢT HẠN MỨC GHI NỢ (+{formatVND((selectedCustomer.debtBalance || 0) + finalAmount - selectedCustomer.creditLimit)})
                            </p>
                            <p className="text-slate-300">
                              Hiện đang nợ: {formatVND(selectedCustomer.debtBalance || 0)} · Hạn mức: {formatVND(selectedCustomer.creditLimit)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-300 text-[11px]">
                            Đơn hàng {formatVND(finalAmount)} sẽ được cộng dồn vào công nợ (hiện tại: {formatVND(selectedCustomer.debtBalance || 0)}).
                          </p>
                        )}
                      </div>
                    ) : (
                      <span>Vui lòng chọn khách hàng để ghi nợ đơn hàng này.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Thông báo lỗi nếu có */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ── Tổng Kết & Nút Đặt Hàng ── */}
              <div className="border-t border-white/10 pt-3 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-semibold text-slate-200">{formatVND(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Chiết khấu:</span>
                      <span>-{formatVND(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="font-bold text-slate-200">Khách cần thanh toán:</span>
                    <span className="text-2xl font-black text-emerald-400 tabular-nums">
                      {formatVND(finalAmount)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    paymentMethod === "stripe" && !stripeStatus?.isPaid
                      ? handleOpenStripeModal
                      : handleCreateOrder
                  }
                  disabled={
                    orderLines.length === 0 ||
                    createOrderMutation.isPending ||
                    (paymentMethod === "debt" && !selectedCustomerId) ||
                    (paymentMethod === "debt" && !!selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit) ||
                    (paymentMethod === "stripe" && stripeModalOpen && !stripeStatus?.isPaid)
                  }
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm text-white shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                    paymentMethod === "debt" && selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit
                      ? "bg-red-600 hover:bg-red-700 shadow-red-500/25"
                      : paymentMethod === "stripe"
                        ? stripeStatus?.isPaid
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25"
                          : "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-500/25"
                        : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25"
                  )}
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang xử lý tạo đơn hàng...
                    </>
                  ) : paymentMethod === "debt" && selectedCustomer && selectedCustomer.creditLimit > 0 && ((selectedCustomer.debtBalance || 0) + finalAmount) > selectedCustomer.creditLimit ? (
                    <>
                      <ShieldAlert className="h-5 w-5 text-white" />
                      Vượt hạn mức nợ (+{formatVND((selectedCustomer.debtBalance || 0) + finalAmount - selectedCustomer.creditLimit)})
                    </>
                  ) : paymentMethod === "stripe" ? (
                    stripeStatus?.isPaid ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Đã nhận tiền Stripe · Hoàn tất đơn ({formatVND(finalAmount)})
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Mở Cổng Stripe &amp; Quét Mã QR ({formatVND(finalAmount)})
                      </>
                    )
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Xác Nhận Đặt Hàng &amp; Thanh Toán ({formatVND(finalAmount)})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Tab Lịch Sử Đơn Hàng Gần Đây ──────────────────── */
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {recentOrders.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-500 text-sm">
                <Receipt className="h-10 w-10 mb-2 opacity-30" />
                Chưa có đơn hàng nào
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 transition-colors hover:bg-slate-800/70"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {order.customerName || "Khách lẻ"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold">
                      {order.status === "confirmed" ? "Đã xác nhận" : order.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-400 text-xs">
                      {order.items?.length ?? 0} sản phẩm • {order.paymentMethod || "Tiền mặt"}
                    </span>
                    <span className="font-bold tabular-nums text-emerald-400">
                      {formatVND(order.finalAmount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div></Modal3DCard>

      {/* ── Modal Thanh Toán Stripe Cao Cấp (Showroom 3D) ── */}
      {stripeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
          <Modal3DCard className="mx-auto max-w-md"><div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Thanh toán qua Cổng Stripe</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    Quét mã QR bằng điện thoại hoặc quẹt thẻ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStripeModalOpen(false)}
                className="rounded-full bg-white/10 p-2 text-slate-400 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createStripeSessionMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <Loader2 className="h-9 w-9 animate-spin text-indigo-400" />
                <p className="font-semibold text-sm text-white">Đang khởi tạo cổng Stripe...</p>
                <p className="text-xs text-slate-400">Sinh phiên checkout và mã QR thời gian thực</p>
              </div>
            ) : stripeError ? (
              <div className="space-y-4 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-red-300">Khởi tạo thất bại</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">{stripeError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenStripeModal}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow transition-all"
                >
                  Thử lại
                </button>
              </div>
            ) : stripeSession ? (
              <>
                {/* Thanh đếm ngược 15 phút chuyên nghiệp */}
                <StripeCountdownTimer
                  expiresAt={stripeSession.expiresAt}
                  onExpire={handleStripeExpire}
                  isExpiredState={isStripeExpired}
                />

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950 p-5 text-center shadow-inner">
                  <div className="relative rounded-2xl bg-white p-3 shadow-xl ring-4 ring-indigo-500/20 overflow-hidden">
                    {stripeSession.qrCodeUrl ? (
                      <img
                        src={stripeSession.qrCodeUrl}
                        alt="Stripe Checkout QR"
                        className="h-56 w-56 object-contain rounded-lg"
                      />
                    ) : (
                      <QRCodeSVG
                        value={stripeSession.checkoutUrl}
                        size={224}
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
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
                    {stripeStatus?.isPaid ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 animate-pulse">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Đã nhận thanh toán! Đang hoàn tất đơn...</span>
                      </div>
                    ) : isStripeExpired ? (
                      <div className="flex items-center gap-1.5 text-red-400 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        <span>Mã thanh toán đã hết hạn (15 phút)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-indigo-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Đang chờ khách thanh toán trên điện thoại...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông tin đơn thanh toán */}
                <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-800/60 p-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Cổng thanh toán:</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      Stripe Checkout
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        Bảo mật 100%
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Phương thức hỗ trợ:</span>
                    <span className="text-slate-200 font-medium">Visa, Master, Apple Pay, Google Pay</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Số tiền:</span>
                    <span className="font-mono font-black text-indigo-400 text-sm">
                      {formatVND(finalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Liên kết thanh toán:</span>
                    {isStripeExpired ? (
                      <span className="text-xs text-slate-500 line-through">Liên kết đã hết hạn</span>
                    ) : (
                      <a
                        href={stripeSession.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
                      >
                        <span>Mở trang Checkout</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="grid gap-2 pt-1">
                  {/* Nút xác nhận: KHÓA KHI CHƯA THANH TOÁN HOẶC ĐÃ HẾT HẠN */}
                  <button
                    type="button"
                    onClick={() => handleCreateOrder()}
                    disabled={!stripeStatus?.isPaid || createOrderMutation.isPending || isStripeExpired}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm shadow-xl transition-all",
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
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-semibold text-white shadow transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", createStripeSessionMutation.isPending && "animate-spin")} />
                        Tạo lại mã QR mới
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => refetchStripeStatus()}
                        disabled={isCheckingStripe || stripeStatus?.isPaid}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-2 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", isCheckingStripe && "animate-spin")} />
                        Kiểm tra trạng thái
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStripeModalOpen(false)}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
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
      {/* Modal Nâng cấp gói dịch vụ với tích hợp thanh toán Stripe */}
      <UpgradePlanModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
    </div>
  );
}
