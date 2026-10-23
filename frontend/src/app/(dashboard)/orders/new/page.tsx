"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  BadgePercent,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useProductList,
  useCategoryList,
  type Product,
} from "@/hooks/useProducts";
import { useCustomerList, type Customer } from "@/hooks/useCustomers";
import {
  useCreateOrder,
  useCreateOrderStripeSession,
  useOrderStripeSessionStatus,
  getOrderCode,
  type Order,
  type OrderStatus,
  type OrderStripeSessionData,
} from "@/hooks/useOrders";
import { useToast, ToastViewport } from "@/components/ui/toast";
import { printInvoice } from "@/lib/invoice";
import { QRCodeSVG } from "qrcode.react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartLine {
  productId: string;
  productUnitId: string;
  productName: string;
  unitName: string;
  price: number;
  quantity: number;
}

type PaymentMethodType = "cash" | "stripe" | "debt";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getDefaultPrice(product: Product): number {
  const unit = product.units?.find((u) => u.isDefault) ?? product.units?.[0];
  return unit?.price ?? 0;
}

function getDefaultUnitName(product: Product): string {
  const unit = product.units?.find((u) => u.isDefault) ?? product.units?.[0];
  return unit?.unitName ?? "Cái";
}

function getDefaultUnitId(product: Product): string | null {
  const unit = product.units?.find((u) => u.isDefault) ?? product.units?.[0];
  return unit?.id ?? null;
}

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
} as const;

const CASH_PRESETS = [10000, 20000, 50000, 100000, 200000, 500000];

// ── Page Component ────────────────────────────────────────────────────────────

export default function NewOrderPage() {
  const router = useRouter();
  const { toasts, showToast, dismiss } = useToast();

  // ── State: tìm kiếm / danh mục ──
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── State: giỏ hàng & đơn ──
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [note, setNote] = useState("");

  // ── State: Phương thức thanh toán ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [cashGivenInput, setCashGivenInput] = useState<string>("");
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeSession, setStripeSession] = useState<OrderStripeSessionData | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const createStripeSessionMutation = useCreateOrderStripeSession();

  // Tra cứu trạng thái thanh toán tự động qua cổng Stripe
  const {
    data: stripeStatus,
    refetch: refetchStripeStatus,
    isFetching: isCheckingStripe,
  } = useOrderStripeSessionStatus(
    stripeSession?.sessionId,
    stripeModalOpen,
  );

  // ── State: sau khi tạo đơn ──
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // ── Queries ──
  const { data: productData, isLoading: productsLoading } = useProductList({
    status: "active",
    limit: 200,
  });
  const { data: categories = [] } = useCategoryList();
  const { data: customerData } = useCustomerList({ limit: 100 });
  const customers = customerData?.items ?? [];

  const createMutation = useCreateOrder();

  // ── Lọc sản phẩm phía client ──
  const allProducts = productData?.items ?? [];
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => {
      const matchCategory =
        activeCategory === "all" || p.categoryId === activeCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [allProducts, activeCategory, search]);

  // ── Lọc khách hàng cho selector ──
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)),
    );
  }, [customers, customerSearch]);

  // ── Tính toán số tiền ──
  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = useMemo(() => {
    const rawVal = parseFloat(discountInput) || 0;
    if (rawVal <= 0) return 0;
    if (discountType === "percent") {
      const pct = Math.min(100, Math.max(0, rawVal));
      return Math.round((subtotal * pct) / 100);
    }
    return Math.min(subtotal, Math.max(0, rawVal));
  }, [subtotal, discountInput, discountType]);
  const finalAmount = Math.max(0, subtotal - discount);
  const totalQty = cart.reduce((s, l) => s + l.quantity, 0);

  // ── Tính tiền thừa tiền mặt ──
  const cashGiven = cashGivenInput ? Math.max(0, parseFloat(cashGivenInput) || 0) : finalAmount;
  const changeAmount = Math.max(0, cashGiven - finalAmount);

  // ── Tính toán Công nợ & Kiểm tra Vượt Hạn Mức ──
  const orderDebtAmount = useMemo(() => {
    if (paymentMethod === "debt") return finalAmount;
    if (paymentMethod === "cash") {
      const actualCash = cashGivenInput ? parseFloat(cashGivenInput) || 0 : finalAmount;
      return Math.max(0, finalAmount - actualCash);
    }
    return 0;
  }, [paymentMethod, finalAmount, cashGivenInput]);

  const customerCreditLimit = customer?.creditLimit ?? 0;
  const customerDebtBalance = customer?.debtBalance ?? 0;

  const isDebtExceeded = useMemo(() => {
    if (!customer || customerCreditLimit <= 0 || orderDebtAmount <= 0) return false;
    return (customerDebtBalance + orderDebtAmount) > customerCreditLimit;
  }, [customer, customerCreditLimit, customerDebtBalance, orderDebtAmount]);

  const excessAmount = useMemo(() => {
    if (!isDebtExceeded || !customer) return 0;
    return (customerDebtBalance + orderDebtAmount) - customerCreditLimit;
  }, [isDebtExceeded, customer, customerDebtBalance, orderDebtAmount, customerCreditLimit]);

  // ── Cart operations ──
  const addToCart = useCallback((product: Product) => {
    const unitId = getDefaultUnitId(product);
    if (!unitId) return;
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productUnitId: unitId,
          productName: product.name,
          unitName: getDefaultUnitName(product),
          price: getDefaultPrice(product),
          quantity: 1,
        },
      ];
    });
  }, []);

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.max(1, l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountInput("");
    setDiscountType("amount");
    setCashGivenInput("");
    setNote("");
    setCustomer(null);
    setCustomerSearch("");
    setPaymentMethod("cash");
  }, []);

  // ── Copy to clipboard helper ──
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
    showToast("info", `Đã sao chép ${label}`);
  };

  // ── Submit đơn ──
  const handleSubmit = useCallback(
    (status: OrderStatus, customPaymentMethod?: PaymentMethodType) => {
      if (cart.length === 0) {
        showToast("error", "Giỏ hàng trống", "Thêm ít nhất 1 sản phẩm trước khi tạo đơn.");
        return;
      }

      const activeMethod = customPaymentMethod || paymentMethod;

      // Determine amounts based on method
      let debtAmount = 0;
      let paidAmount = 0;
      let calculatedChange = 0;

      if (activeMethod === "cash") {
        const actualCash = cashGivenInput ? parseFloat(cashGivenInput) || 0 : finalAmount;
        paidAmount = Math.min(actualCash, finalAmount);
        calculatedChange = Math.max(0, actualCash - finalAmount);
        debtAmount = Math.max(0, finalAmount - actualCash);
      } else if (activeMethod === "stripe" || (activeMethod as string) === "qr_code") {
        paidAmount = finalAmount;
        calculatedChange = 0;
        debtAmount = 0;
      } else if (activeMethod === "debt") {
        paidAmount = 0;
        calculatedChange = 0;
        debtAmount = finalAmount;
      }

      // Kiểm tra trạng thái thanh toán Stripe khi tạo đơn xác nhận
      if (activeMethod === "stripe" && status === "confirmed" && !stripeStatus?.isPaid) {
        showToast(
          "error",
          "Chưa nhận được thanh toán",
          "Khách hàng chưa hoàn tất thanh toán Stripe. Vui lòng kiểm tra lại trước khi xác nhận.",
        );
        return;
      }

      // Validation for debt & credit limit
      if (debtAmount > 0 && !customer) {
        showToast("error", "Cần chọn khách hàng", "Đơn hàng có phát sinh nợ. Vui lòng chọn khách hàng để ghi nợ.");
        return;
      }

      if (debtAmount > 0 && customer && customerCreditLimit > 0 && (customerDebtBalance + debtAmount) > customerCreditLimit) {
        const excess = (customerDebtBalance + debtAmount) - customerCreditLimit;
        showToast(
          "error",
          "Vượt hạn mức ghi nợ!",
          `Không thể ghi nợ! Khách hàng "${customer.name}" có hạn mức ${formatCurrency(customerCreditLimit)}, hiện đang nợ ${formatCurrency(customerDebtBalance)}. Đơn này nợ thêm ${formatCurrency(debtAmount)} vượt hạn mức ${formatCurrency(excess)}.`
        );
        return;
      }

      createMutation.mutate(
        {
          status,
          customerId: customer?.id,
          orderType: "counter",
          paymentMethod: activeMethod,
          paidAmount,
          changeAmount: calculatedChange,
          note: note.trim() || undefined,
          discountAmount: discount,
          debtAmount,
          items: cart.map((l) => ({
            productId: l.productId,
            productUnitId: l.productUnitId,
            quantity: l.quantity,
            unitPrice: l.price,
          })),
        },
        {
          onSuccess: (order) => {
            setStripeModalOpen(false);
            setStripeSession(null);
            setCart([]);
            setDiscountInput("");
            setCashGivenInput("");
            setNote("");
            setCustomer(null);
            setCustomerSearch("");
            setPaymentMethod("cash");
            setLastOrder(order);
            showToast(
              status === "draft" ? "info" : "success",
              status === "draft" ? "Đã lưu nháp" : "Tạo đơn thành công",
              `Mã đơn: ${getOrderCode(order)} · ${formatCurrency(order.finalAmount)}`,
            );
            setSuccessOpen(true);
          },
          onError: (err: Error) => {
            showToast("error", "Tạo đơn thất bại", err.message || "Vui lòng thử lại.");
          },
        },
      );
    },
    [cart, customer, customerCreditLimit, customerDebtBalance, paymentMethod, discount, finalAmount, cashGivenInput, note, createMutation, showToast, stripeStatus],
  );

  // ── Mở phiên thanh toán Stripe ──
  const handleOpenStripeModal = useCallback(() => {
    if (cart.length === 0) {
      showToast("error", "Giỏ hàng trống", "Thêm ít nhất 1 sản phẩm trước khi tạo đơn.");
      return;
    }
    hasAutoSubmittedStripeRef.current = false;
    setStripeError(null);
    setStripeSession(null);
    setStripeModalOpen(true);

    createStripeSessionMutation.mutate(
      {
        amount: finalAmount,
        customerName: customer?.name || undefined,
        items: cart.map((c) => ({
          name: c.productName,
          quantity: c.quantity,
          unitPrice: c.price,
        })),
      },
      {
        onSuccess: (data) => {
          setStripeSession(data);
          setStripeError(null);
        },
        onError: (err: any) => {
          const msg = err?.message || "Không thể khởi tạo cổng Stripe";
          setStripeError(msg);
          showToast("error", msg);
        },
      },
    );
  }, [cart, finalAmount, customer, createStripeSessionMutation, showToast]);

  // Tự động hoàn tất đơn hàng khi khách thanh toán thành công qua Stripe
  const hasAutoSubmittedStripeRef = useRef(false);
  useEffect(() => {
    if (stripeModalOpen && stripeStatus?.isPaid && !hasAutoSubmittedStripeRef.current) {
      hasAutoSubmittedStripeRef.current = true;
      showToast("success", "Thanh toán Stripe thành công!", "Đang tự động xác nhận và hoàn tất đơn hàng...");
      handleSubmit("confirmed", "stripe");
    }
  }, [stripeModalOpen, stripeStatus?.isPaid, handleSubmit, showToast]);

  // ── Phím tắt ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+F: focus search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      // Ctrl+Enter: submit order
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!successOpen && !stripeModalOpen && !createMutation.isPending) {
          if (paymentMethod === "stripe") {
            handleOpenStripeModal();
          } else {
            handleSubmit("confirmed");
          }
        }
        return;
      }
      // Enter: thêm sản phẩm đang focus vào giỏ
      if (e.key === "Enter") {
        const target = e.target as HTMLElement;
        const el = target.closest?.("[data-product-id]");
        if (el) {
          e.preventDefault();
          const id = el.getAttribute("data-product-id");
          const product = allProducts.find((p) => p.id === id);
          if (product) addToCart(product);
        }
        return;
      }
      // Escape: đóng menu khách hàng
      if (e.key === "Escape") {
        setCustomerMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allProducts, addToCart, handleSubmit, handleOpenStripeModal, successOpen, stripeModalOpen, createMutation.isPending, paymentMethod]);

  const handlePrintInvoice = useCallback(async () => {
    if (!lastOrder) return;
    setSuccessOpen(false);
    await printInvoice(lastOrder);
  }, [lastOrder]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-[1600px] space-y-5"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Tạo đơn hàng POS
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Bán hàng tại quầy — Tiền mặt, Cổng thanh toán trực tuyến Stripe và Ghi nợ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Kbd>Ctrl+F</Kbd> tìm kiếm
          <span className="text-muted-foreground/40">·</span>
          <Kbd>Ctrl+Enter</Kbd> thanh toán
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* ══ CỘT TRÁI: DANH SÁCH SẢN PHẨM ══ */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              id="pos-search"
              placeholder="Tìm theo tên hoặc mã sản phẩm... (Ctrl + F)"
              className="pl-9 h-11 text-sm bg-background/80"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm sản phẩm"
            />
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <CategoryTab
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            >
              Tất cả
            </CategoryTab>
            {categories.map((c) => (
              <CategoryTab
                key={c.id}
                active={activeCategory === c.id}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.name}
              </CategoryTab>
            ))}
          </div>

          {/* Product grid */}
          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border bg-card/60"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border bg-card/40 py-16">
              <Package className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Không tìm thấy sản phẩm</p>
              <p className="text-xs text-muted-foreground">
                Thử từ khóa khác hoặc chọn danh mục khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  focused={focusedProductId === p.id}
                  onFocus={() => setFocusedProductId(p.id)}
                  onAdd={() => addToCart(p)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* ══ CỘT PHẢI: GIỎ HÀNG & CỤM THANH TOÁN POS ══ */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col gap-3.5 rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm lg:sticky lg:top-20">
            {/* Header giỏ hàng */}
            <div className="flex items-center justify-between pb-1 border-b">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ReceiptText className="h-4 w-4 text-blue-600" />
                Đơn hàng hiện tại
                {totalQty > 0 && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                    {totalQty} món
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500"
                  onClick={clearCart}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Xóa hết
                </Button>
              )}
            </div>

            {/* Danh sách món trong giỏ */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 bg-muted/20">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Chưa có sản phẩm trong giỏ
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Nhấp vào sản phẩm ở bên trái để thêm vào đơn
                </p>
              </div>
            ) : (
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {cart.map((line) => (
                  <div
                    key={line.productId}
                    className="flex items-start gap-2 rounded-xl border bg-background/50 p-2.5 shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold leading-tight">
                        {line.productName}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {line.unitName} · {formatCurrency(line.price)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-5 w-5 rounded-md"
                          onClick={() => changeQty(line.productId, -1)}
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">
                          {line.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-5 w-5 rounded-md"
                          onClick={() => changeQty(line.productId, 1)}
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs font-bold tabular-nums text-foreground">
                        {formatCurrency(line.price * line.quantity)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-red-500"
                        onClick={() => removeLine(line.productId)}
                        aria-label="Xóa sản phẩm"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chọn khách hàng */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium text-muted-foreground">Khách hàng</Label>
                {customer && (
                  <div className="flex items-center gap-2 text-[11px]">
                    {customer.debtBalance > 0 && (
                      <span className="text-red-500 font-semibold">
                        Đang nợ: {formatCurrency(customer.debtBalance)}
                      </span>
                    )}
                    {customer.creditLimit > 0 && (
                      <span className="text-muted-foreground font-medium">
                        HM: {formatCurrency(customer.creditLimit)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {customer ? (
                <div className="flex items-center justify-between rounded-lg border bg-blue-500/5 border-blue-500/20 p-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-[10px] font-bold text-white">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{customer.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {customer.code} {customer.phone ? `· ${customer.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                    onClick={() => setCustomer(null)}
                    aria-label="Bỏ chọn khách hàng"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onFocus={() => setCustomerMenuOpen(true)}
                      placeholder="Tìm khách hàng theo tên hoặc SĐT..."
                      aria-label="Tìm khách hàng"
                      className="h-9 text-xs pr-8"
                    />
                    <ChevronDown
                      className={cn(
                        "pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-transform",
                        customerMenuOpen && "rotate-180",
                      )}
                    />
                  </div>
                  {customerMenuOpen && (
                    <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover shadow-xl">
                      {filteredCustomers.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">
                          Không tìm thấy khách hàng
                        </p>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCustomer(c);
                              setCustomerSearch("");
                              setCustomerMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-muted text-[9px] font-bold text-muted-foreground">
                                {getInitials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {c.name}
                            </span>
                            {c.debtBalance > 0 && (
                              <span className="text-[11px] font-semibold text-red-500">
                                {formatCurrency(c.debtBalance)}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Giảm giá + Ghi chú */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-medium text-muted-foreground">Giảm giá</Label>
                  <div className="flex items-center rounded-md border bg-muted/60 p-0.5 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("amount");
                        setDiscountInput("");
                      }}
                      className={cn(
                        "rounded px-1.5 py-0.5 transition-colors",
                        discountType === "amount"
                          ? "bg-background text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      VNĐ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("percent");
                        setDiscountInput("");
                      }}
                      className={cn(
                        "rounded px-1.5 py-0.5 transition-colors",
                        discountType === "percent"
                          ? "bg-blue-600 text-white shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <BadgePercent className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    max={discountType === "percent" ? 100 : undefined}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="h-8 pl-8 pr-8 text-xs font-mono"
                    placeholder={discountType === "percent" ? "0 %" : "0 đ"}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                    {discountType === "percent" ? "%" : "đ"}
                  </span>
                </div>
                {/* Nút chọn nhanh */}
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {discountType === "percent" ? (
                    [5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDiscountInput(String(pct))}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      >
                        {pct}%
                      </button>
                    ))
                  ) : (
                    [20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDiscountInput(String(amt))}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      >
                        {amt / 1000}k
                      </button>
                    ))
                  )}
                  {discountInput && (
                    <button
                      type="button"
                      onClick={() => setDiscountInput("")}
                      className="ml-auto text-[10px] text-muted-foreground hover:text-red-500"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Ghi chú</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú đơn..."
                  className="h-8 mt-1 text-xs"
                />
              </div>
            </div>

            {/* BẢNG TÍNH TIỀN */}
            <div className="space-y-1 rounded-xl border bg-muted/40 p-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tạm tính</span>
                <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Giảm giá {discountType === "percent" && discountInput ? `(${discountInput}%)` : ""}
                  </span>
                  <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    −{formatCurrency(discount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-1.5 mt-1 font-bold">
                <span className="text-sm">Tổng cần thanh toán</span>
                <span className="text-base font-extrabold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {formatCurrency(finalAmount)}
                </span>
              </div>
            </div>

            {/* ── BỘ CHỌN PHƯƠNG THỨC THANH TOÁN (3 TABS) ── */}
            <div className="space-y-2 pt-1 border-t">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Phương thức thanh toán
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {/* Tab Tiền mặt */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all",
                    paymentMethod === "cash"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-xs"
                      : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tiền mặt</span>
                </button>

                {/* Tab Cổng Stripe */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("stripe")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all",
                    paymentMethod === "stripe"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 shadow-xs"
                      : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Cổng Stripe</span>
                </button>

                {/* Tab Ghi nợ */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("debt")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all",
                    paymentMethod === "debt"
                      ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-xs"
                      : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Ghi nợ</span>
                </button>
              </div>

              {/* ── CHI TIẾT THEO PHƯƠNG THỨC ── */}
              <div className="mt-2.5">
                {/* 1. KHUNG TIỀN MẶT */}
                {paymentMethod === "cash" && (
                  <div className="space-y-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                          Tiền khách đưa:
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Phải trả: <strong className="text-foreground">{formatCurrency(finalAmount)}</strong>
                        </span>
                      </div>
                      <div className="relative">
                        <Banknote className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                        <Input
                          type="number"
                          min={0}
                          value={cashGivenInput}
                          onChange={(e) => setCashGivenInput(e.target.value)}
                          placeholder={finalAmount.toString()}
                          className="h-9 pl-9 font-mono font-bold text-sm bg-background"
                        />
                      </div>
                    </div>

                    {/* Dãy nút mệnh giá nhanh */}
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Chọn nhanh mệnh giá:</span>
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCashGivenInput(finalAmount.toString())}
                          className="h-7 text-[11px] font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        >
                          Đủ tiền
                        </Button>
                        {CASH_PRESETS.map((preset) => (
                          <Button
                            key={preset}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCashGivenInput(preset.toString())}
                            className={cn(
                              "h-7 text-[11px] font-mono",
                              cashGiven === preset && "border-emerald-500 bg-emerald-500/10 font-bold",
                            )}
                          >
                            {preset >= 1000 ? `${preset / 1000}k` : preset}
                          </Button>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCashGivenInput("")}
                          className="h-7 text-[11px] text-muted-foreground"
                        >
                          Xóa
                        </Button>
                      </div>
                    </div>

                    {/* Hiển thị tiền thừa thối lại hoặc nợ thiếu */}
                    <div className="flex items-center justify-between rounded-lg bg-background p-2 border border-emerald-500/20 font-bold">
                      <span className="text-muted-foreground">Tiền thừa trả khách:</span>
                      <span className={cn(
                        "text-sm font-mono tabular-nums",
                        cashGiven >= finalAmount ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                      )}>
                        {cashGiven >= finalAmount
                          ? formatCurrency(changeAmount)
                          : `Thiếu ${formatCurrency(finalAmount - cashGiven)}`}
                      </span>
                    </div>

                    {/* Cảnh báo ghi nợ phát sinh do trả thiếu tiền mặt */}
                    {cashGiven < finalAmount && (
                      <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs">
                        <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-medium">
                          <span>Số tiền còn thiếu ghi nợ:</span>
                          <span className="font-mono font-bold">{formatCurrency(finalAmount - cashGiven)}</span>
                        </div>
                        {!customer ? (
                          <div className="flex items-center gap-1.5 text-red-500 font-medium">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Vui lòng chọn khách hàng để ghi nợ số tiền thiếu này.</span>
                          </div>
                        ) : isDebtExceeded ? (
                          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-600 dark:text-red-400 space-y-1">
                            <div className="flex items-center gap-1 font-semibold">
                              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                              <span>Vượt hạn mức nợ (+{formatCurrency(excessAmount)})</span>
                            </div>
                            <p className="text-muted-foreground">
                              Khách &quot;{customer.name}&quot; có hạn mức {formatCurrency(customerCreditLimit)}, nợ hiện tại {formatCurrency(customerDebtBalance)}.
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Số tiền thiếu sẽ tự động ghi nợ vào tài khoản của <strong>{customer.name}</strong>.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. KHUNG CỔNG THANH TOÁN STRIPE */}
                {paymentMethod === "stripe" && (
                  <div className="space-y-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <span>Cổng thanh toán Stripe</span>
                          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] py-0 px-1.5 font-semibold">
                            Tự động xác nhận
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Quét mã QR Stripe, Thẻ quốc tế (Visa, Mastercard), Apple Pay, Google Pay.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-indigo-500/15 pt-2 text-[11px]">
                      <span className="text-muted-foreground">Số tiền thanh toán:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                        {formatCurrency(finalAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. KHUNG GHI NỢ */}
                {paymentMethod === "debt" && (
                  <div className={cn(
                    "space-y-2 rounded-xl border p-3 text-xs transition-colors",
                    isDebtExceeded
                      ? "border-red-500/40 bg-red-500/10 dark:border-red-500/30 dark:bg-red-950/30"
                      : "border-amber-500/20 bg-amber-500/5"
                  )}>
                    {customer ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={cn(
                            "flex items-center gap-2 font-semibold",
                            isDebtExceeded ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-300"
                          )}>
                            {isDebtExceeded ? (
                              <>
                                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 animate-pulse" />
                                <span>VƯỢT HẠN MỨC GHI NỢ!</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>Ghi nợ 100% cho khách hàng</span>
                              </>
                            )}
                          </div>
                          {customerCreditLimit > 0 && (
                            <span className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold",
                              isDebtExceeded
                                ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                : "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                            )}>
                              Hạn mức: {formatCurrency(customerCreditLimit)}
                            </span>
                          )}
                        </div>

                        {isDebtExceeded ? (
                          <div className="space-y-1.5 text-[11px] border-t border-red-500/20 pt-2">
                            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                              <span>Nợ hiện tại:</span>
                              <span className="font-mono text-right font-medium text-foreground">{formatCurrency(customerDebtBalance)}</span>
                              <span>Đơn hàng này:</span>
                              <span className="font-mono text-right font-medium text-red-600">+{formatCurrency(finalAmount)}</span>
                              <span>Tổng nợ sau đơn:</span>
                              <span className="font-mono text-right font-bold text-red-600">{formatCurrency(customerDebtBalance + finalAmount)}</span>
                              <span className="font-bold text-red-600">Vượt hạn mức:</span>
                              <span className="font-mono text-right font-black text-red-600 text-xs">+{formatCurrency(excessAmount)}</span>
                            </div>
                            <p className="text-red-600 dark:text-red-400 pt-1 font-medium leading-relaxed">
                              Hệ thống không cho phép tạo đơn vượt hạn mức. Vui lòng yêu cầu khách thanh toán bớt nợ cũ hoặc chọn phương thức khác!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-muted-foreground leading-relaxed">
                              Toàn bộ số tiền <strong className="text-foreground">{formatCurrency(finalAmount)}</strong> sẽ được cộng dồn vào công nợ của <strong>{customer.name}</strong>.
                            </p>
                            {customerCreditLimit > 0 && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Khả dụng còn lại sau đơn: {formatCurrency(Math.max(0, customerCreditLimit - customerDebtBalance - finalAmount))}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Vui lòng chọn khách hàng ở trên để kích hoạt tính năng ghi nợ.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS BUTTONS */}
            <div className="grid gap-2 pt-1">
              {paymentMethod === "stripe" ? (
                <Button
                  onClick={handleOpenStripeModal}
                  disabled={cart.length === 0 || createMutation.isPending}
                  className="h-11 relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  Mở cổng Stripe & Thanh toán
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmit("confirmed")}
                  disabled={
                    cart.length === 0 ||
                    createMutation.isPending ||
                    (orderDebtAmount > 0 && !customer) ||
                    isDebtExceeded
                  }
                  className={cn(
                    "h-11 relative overflow-hidden font-bold text-white shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]",
                    isDebtExceeded
                      ? "bg-red-600 hover:bg-red-700 shadow-red-500/25 cursor-not-allowed opacity-90"
                      : paymentMethod === "cash"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-400"
                        : "bg-gradient-to-r from-amber-600 to-orange-500 shadow-amber-500/25 hover:from-amber-500 hover:to-orange-400",
                  )}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : isDebtExceeded ? (
                    <ShieldAlert className="h-4 w-4 mr-1.5 text-white" />
                  ) : (
                    <Check className="h-4 w-4 mr-1.5" />
                  )}
                  {isDebtExceeded
                    ? `Vượt hạn mức nợ (+${formatCurrency(excessAmount)})`
                    : (orderDebtAmount > 0 && !customer)
                      ? "Cần chọn khách hàng để ghi nợ"
                      : paymentMethod === "cash"
                        ? "Thanh toán Tiền mặt"
                        : "Xác nhận Ghi nợ"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => handleSubmit("draft")}
                disabled={
                  cart.length === 0 ||
                  createMutation.isPending ||
                  (orderDebtAmount > 0 && !customer) ||
                  isDebtExceeded
                }
                className={cn(
                  "font-semibold h-9 text-xs",
                  isDebtExceeded && "opacity-50 cursor-not-allowed text-red-500 border-red-500/30"
                )}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {isDebtExceeded ? "Không thể lưu (Vượt hạn mức)" : "Lưu đơn nháp"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── MODAL THANH TOÁN STRIPE CHUYÊN NGHIỆP ── */}
      <Dialog open={stripeModalOpen} onOpenChange={setStripeModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Thanh toán qua Cổng Stripe</DialogTitle>
                <DialogDescription className="text-xs">
                  Quét mã QR qua điện thoại hoặc thanh toán bằng thẻ quốc tế / ví điện tử
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {createStripeSessionMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
              <p className="font-semibold text-sm text-foreground">Đang khởi tạo cổng thanh toán Stripe...</p>
              <p className="text-xs text-muted-foreground">Tạo phiên checkout và mã QR thời gian thực</p>
            </div>
          ) : stripeError ? (
            <div className="space-y-4 py-6 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Không thể kết nối cổng Stripe</p>
              <p className="text-xs text-muted-foreground">{stripeError}</p>
              <Button onClick={handleOpenStripeModal} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Thử lại
              </Button>
            </div>
          ) : stripeSession ? (
            <div className="space-y-4 pt-2">
              {/* Khung ảnh QR Code nét cao của Stripe */}
              <div className="flex flex-col items-center justify-center rounded-2xl border bg-muted/20 p-4 text-center">
                <div className="relative rounded-xl bg-white p-3 shadow-md">
                  {stripeSession.qrCodeUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={stripeSession.qrCodeUrl}
                      alt="Mã QR thanh toán Stripe"
                      className="max-h-[220px] w-auto rounded object-contain"
                    />
                  ) : (
                    <QRCodeSVG
                      value={stripeSession.checkoutUrl}
                      size={200}
                      level="M"
                      className="rounded"
                    />
                  )}
                </div>

                {/* Trạng thái thanh toán real-time */}
                <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold">
                  {stripeStatus?.isPaid ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 animate-pulse">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Đã nhận thanh toán! Đang hoàn tất đơn...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang chờ khách thanh toán trên điện thoại...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin đơn thanh toán Stripe */}
              <div className="space-y-2 rounded-xl border bg-background p-3 text-xs">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Cổng thanh toán:</span>
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <span>Stripe Checkout</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 text-emerald-600">
                      Bảo mật 100%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Phương thức hỗ trợ:</span>
                  <span className="font-medium text-foreground">Visa, MasterCard, Apple Pay, Google Pay</span>
                </div>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-muted-foreground">Số tiền thanh toán:</span>
                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Liên kết thanh toán:</span>
                  <a
                    href={stripeSession.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline underline-offset-2"
                  >
                    <span>Mở trang Checkout</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="grid gap-2 pt-1">
                <Button
                  onClick={() => handleSubmit("confirmed", "stripe")}
                  disabled={!stripeStatus?.isPaid || createMutation.isPending}
                  className={cn(
                    "h-11 font-bold text-white transition-all shadow-lg",
                    stripeStatus?.isPaid
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-border cursor-not-allowed shadow-none opacity-80 hover:bg-slate-200 dark:hover:bg-slate-800",
                  )}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : stripeStatus?.isPaid ? (
                    <CheckCircle2 className="h-4 w-4 mr-2 text-white" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400 animate-pulse" />
                  )}
                  {createMutation.isPending
                    ? "Đang hoàn tất đơn hàng..."
                    : stripeStatus?.isPaid
                      ? "Đã nhận thanh toán · Hoàn tất đơn ngay"
                      : "Chưa thanh toán (Không thể xác nhận)"}
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetchStripeStatus()}
                    disabled={isCheckingStripe || stripeStatus?.isPaid}
                    className="flex-1 text-xs gap-1.5 h-9 font-medium"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isCheckingStripe && "animate-spin")} />
                    Kiểm tra trạng thái
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStripeModalOpen(false)}
                    className="flex-1 text-xs text-muted-foreground h-9"
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG THÀNH CÔNG SAU KHI TẠO ĐƠN ── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {lastOrder?.status === "draft"
                ? "Đã lưu đơn nháp"
                : "Tạo đơn hàng thành công"}
            </DialogTitle>
            <DialogDescription>
              {lastOrder?.status === "draft"
                ? "Đơn nháp đã được lưu vào hệ thống."
                : "Đơn hàng đã được ghi nhận thành công."}
            </DialogDescription>
          </DialogHeader>

          {lastOrder && (
            <div className="space-y-1 text-left rounded-lg bg-muted/30 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã đơn hàng:</span>
                <span className="font-bold text-foreground font-mono">{getOrderCode(lastOrder)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng tiền:</span>
                <span className="font-bold text-blue-600 font-mono">{formatCurrency(lastOrder.finalAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-muted-foreground">Hình thức thanh toán:</span>
                <Badge variant="outline" className="text-[11px] font-semibold">
                  {lastOrder.paymentMethod === "cash" && "💵 Tiền mặt"}
                  {lastOrder.paymentMethod === "stripe" && "💳 Cổng Stripe"}
                  {lastOrder.paymentMethod === "qr_code" && "📱 Quét mã QR"}
                  {lastOrder.paymentMethod === "debt" && "📋 Ghi nợ"}
                </Badge>
              </div>
            </div>
          )}
          <div className="grid gap-2 pt-2">
            <Button
              onClick={handlePrintInvoice}
              className="bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              In hóa đơn bán lẻ
            </Button>
            <Button variant="outline" onClick={() => router.push("/orders")}>
              <ListChecks className="h-4 w-4 mr-2" />
              Xem danh sách đơn hàng
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSuccessOpen(false);
                searchRef.current?.focus();
              }}
            >
              Tạo đơn mới
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Giỏ hàng nhanh (mobile/tablet) ── */}
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <Button
          onClick={() => setCartOpen(true)}
          className="relative h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 shadow-xl shadow-blue-500/30 transition-transform hover:scale-105 active:scale-95"
          aria-label="Mở giỏ hàng"
        >
          <ShoppingCart className="h-6 w-6 text-white" />
          {totalQty > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
              {totalQty}
            </span>
          )}
        </Button>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Giỏ hàng ({totalQty} món)
            </SheetTitle>
          </SheetHeader>
          {cart.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Tổng cộng:</span>
                <span className="text-blue-600 font-mono text-base">{formatCurrency(finalAmount)}</span>
              </div>
              <Button
                onClick={() => {
                  setCartOpen(false);
                  if (paymentMethod === "stripe") {
                    handleOpenStripeModal();
                  } else {
                    handleSubmit("confirmed");
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 font-bold text-white"
              >
                Tiến hành thanh toán
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

function CategoryTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/25"
          : "border-border bg-background/50 text-muted-foreground hover:border-blue-300 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ProductCard({
  product,
  focused,
  onFocus,
  onAdd,
}: {
  product: Product;
  focused: boolean;
  onFocus: () => void;
  onAdd: () => void;
}) {
  const price = getDefaultPrice(product);
  return (
    <button
      type="button"
      data-product-id={product.id}
      onFocus={onFocus}
      onClick={onAdd}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card/60 text-left transition-all hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        focused &&
        "border-blue-400 ring-2 ring-blue-400/30 hover:shadow-blue-500/20",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full p-1.5 text-white shadow-sm transition-all",
            "bg-blue-600/90 opacity-0 group-hover:opacity-100",
            focused && "opacity-100",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-1 p-2.5">
        <p className="line-clamp-2 text-xs font-medium leading-snug">
          {product.name}
        </p>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {formatCurrency(price)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {getDefaultUnitName(product)}
          </p>
        </div>
      </div>
    </button>
  );
}
