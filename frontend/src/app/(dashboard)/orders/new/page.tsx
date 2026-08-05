"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BadgePercent,
  Check,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  getOrderCode,
  type Order,
  type OrderStatus,
} from "@/hooks/useOrders";
import { useToast, ToastViewport } from "@/components/ui/toast";
import { printInvoice } from "@/lib/invoice";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartLine {
  productId: string;
  productUnitId: string;
  productName: string;
  unitName: string;
  price: number;
  quantity: number;
}

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
  const [isDebt, setIsDebt] = useState(false);
  const [note, setNote] = useState("");

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

  // ── Lọc sản phẩm phía client (auto-filter theo từng ký tự) ──
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

  // ── Tính tổng ──
  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = Math.max(0, parseFloat(discountInput) || 0);
  const finalAmount = Math.max(0, subtotal - discount);
  const totalQty = cart.reduce((s, l) => s + l.quantity, 0);

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
    setNote("");
    setCustomer(null);
    setCustomerSearch("");
    setIsDebt(false);
  }, []);

  // ── Submit đơn ──
  const handleSubmit = useCallback(
    (status: OrderStatus) => {
      if (cart.length === 0) {
        showToast(
          "error",
          "Giỏ hàng trống",
          "Thêm ít nhất 1 sản phẩm trước khi tạo đơn.",
        );
        return;
      }
      createMutation.mutate(
        {
          status,
          customerId: customer?.id,
          orderType: "counter",
          note: note.trim() || undefined,
          discountAmount: discount,
          debtAmount: isDebt && customer ? finalAmount : 0,
          items: cart.map((l) => ({
            productId: l.productId,
            productUnitId: l.productUnitId,
            quantity: l.quantity,
            unitPrice: l.price,
          })),
        },
        {
          onSuccess: (order) => {
            setCart([]);
            setDiscountInput("");
            setNote("");
            setCustomer(null);
            setCustomerSearch("");
            setIsDebt(false);
            setLastOrder(order);
            showToast(
              status === "draft" ? "info" : "success",
              status === "draft" ? "Đã lưu nháp" : "Tạo đơn thành công",
              `Mã đơn: ${getOrderCode(order)} · ${formatCurrency(order.finalAmount)}`,
            );
            setSuccessOpen(true);
          },
          onError: () => {
            showToast("error", "Tạo đơn thất bại", "Vui lòng thử lại.");
          },
        },
      );
    },
    [cart, customer, isDebt, discount, finalAmount, note, createMutation, showToast],
  );

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
        if (!successOpen && createMutation.isPending) return;
        if (!successOpen) handleSubmit("confirmed");
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
      // Escape: đóng menu khách hàng (dialog do Radix xử lý)
      if (e.key === "Escape") {
        setCustomerMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allProducts, addToCart, handleSubmit, successOpen, createMutation.isPending]);

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
            Tạo đơn hàng
          </h1>
          <p className="mt-1 text-muted-foreground">
            Bán tại quầy — chọn sản phẩm, xác nhận thanh toán.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Kbd>Ctrl+F</Kbd> tìm kiếm
          <span className="text-muted-foreground/40">·</span>
          <Kbd>Enter</Kbd> thêm sản phẩm
          <span className="text-muted-foreground/40">·</span>
          <Kbd>Ctrl+Enter</Kbd> tạo đơn
          <span className="text-muted-foreground/40">·</span>
          <Kbd>Esc</Kbd> đóng
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ══ Left: sản phẩm ══ */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              id="pos-search"
              placeholder="Tìm theo tên hoặc mã sản phẩm..."
              className="pl-9"
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

        {/* ══ Right: giỏ hàng ══ */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card/50 p-4 shadow-sm backdrop-blur-sm lg:sticky lg:top-0 lg:max-h-[calc(100vh+6.5rem)] lg:overflow-hidden">
            {/* Cart header */}
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ReceiptText className="h-4 w-4 text-blue-600" />
                Giỏ hàng
                {totalQty > 0 && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                    {totalQty}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={clearCart}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa hết
                </Button>
              )}
            </div>

            {/* Cart items */}
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
                <Package className="h-8 w-8 text-muted-foreground/60" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Chưa có sản phẩm trong giỏ
                </p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {cart.map((line) => (
                  <div
                    key={line.productId}
                    className="flex items-start gap-2 rounded-xl border bg-background/40 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {line.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {line.unitName} · {formatCurrency(line.price)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => changeQty(line.productId, -1)}
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => changeQty(line.productId, 1)}
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(line.price * line.quantity)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-red-500"
                        onClick={() => removeLine(line.productId)}
                        aria-label="Xóa sản phẩm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customer selector */}
            <div className="relative">
              <Label>Khách hàng</Label>
              {customer ? (
                <div className="mt-1.5 flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-[10px] font-bold text-white">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.code}
                        {customer.phone ? ` · ${customer.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => setCustomer(null)}
                    aria-label="Bỏ chọn khách hàng"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative mt-1.5">
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onFocus={() => setCustomerMenuOpen(true)}
                      placeholder="Tìm theo tên hoặc SĐT..."
                      aria-label="Tìm khách hàng"
                      className="pr-8"
                    />
                    <ChevronDown
                      className={cn(
                        "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform",
                        customerMenuOpen && "rotate-180",
                      )}
                    />
                  </div>
                  {customerMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                      {filteredCustomers.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
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
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-muted text-[10px] font-bold text-muted-foreground">
                                {getInitials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {c.name}
                            </span>
                            {c.debtBalance > 0 && (
                              <span className="text-xs font-semibold text-red-500">
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

            {/* Discount + Ghi nợ + Note */}
            <div className="space-y-3">
              <div>
                <Label>Giảm giá</Label>
                <div className="relative mt-1.5">
                  <BadgePercent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="pl-9"
                    placeholder="0"
                    aria-label="Giảm giá"
                  />
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border p-2.5",
                  !customer && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4",
                      isDebt ? "text-red-500" : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">Ghi nợ</p>
                    <p className="text-xs text-muted-foreground">
                      {customer
                        ? "Trừ vào công nợ của khách hàng"
                        : "Cần chọn khách hàng để ghi nợ"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDebt}
                  disabled={!customer}
                  onCheckedChange={(v) => setIsDebt(customer ? v : false)}
                  aria-label="Ghi nợ"
                />
              </div>

              <div>
                <Label>Ghi chú</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú cho đơn hàng..."
                  className="mt-1.5 min-h-[64px]"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Tạm tính</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Giảm giá</span>
                <span className="tabular-nums">
                  −{formatCurrency(discount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-lg font-bold tabular-nums text-blue-600">
                  {formatCurrency(finalAmount)}
                </span>
              </div>
              {isDebt && customer && (
                <p className="text-xs text-red-500">
                  Khách còn nợ{" "}
                  <span className="font-semibold">
                    {formatCurrency(finalAmount)}
                  </span>{" "}
                  cho đơn này.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="grid gap-2">
              <Button
                onClick={() => handleSubmit("confirmed")}
                disabled={cart.length === 0 || createMutation.isPending}
                className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99]"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Tạo đơn hàng
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSubmit("draft")}
                disabled={cart.length === 0 || createMutation.isPending}
                className="font-semibold"
              >
                <Save className="h-4 w-4" />
                Lưu nháp
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Dialog sau khi tạo đơn ── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {lastOrder?.status === "draft"
                ? "Đã lưu nháp"
                : "Tạo đơn hàng thành công"}
            </DialogTitle>
            <DialogDescription>
              {lastOrder && (
                <>
                  Mã đơn:{" "}
                  <span className="font-semibold text-foreground">
                    {getOrderCode(lastOrder)}
                  </span>{" "}
                  · Tổng tiền:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(lastOrder.finalAmount)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 pt-1">
            <Button
              onClick={handlePrintInvoice}
              className="bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white"
            >
              <Printer className="h-4 w-4" />
              In hóa đơn
            </Button>
            <Button variant="outline" onClick={() => router.push("/orders")}>
              <ListChecks className="h-4 w-4" />
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

      {/* ── Nút giỏ hàng nổi (mobile/tablet — panel chỉ hiện ở lg+) ── */}
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

      {/* ── Giỏ hàng nhanh (mobile/tablet) ── */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Giỏ hàng
              {totalQty > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                  {totalQty}
                </span>
              )}
            </SheetTitle>
            <SheetDescription>
              Xem sản phẩm đã chọn và tạo đơn hàng.
            </SheetDescription>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10">
              <Package className="h-8 w-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có sản phẩm trong giỏ
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-start gap-2 rounded-xl border bg-background/40 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {line.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.unitName} · {formatCurrency(line.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => changeQty(line.productId, -1)}
                        aria-label="Giảm số lượng"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => changeQty(line.productId, 1)}
                        aria-label="Tăng số lượng"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(line.price * line.quantity)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-red-500"
                      onClick={() => removeLine(line.productId)}
                      aria-label="Xóa sản phẩm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính</span>
                  <span className="tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Giảm giá</span>
                    <span className="tabular-nums">
                      −{formatCurrency(discount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Tổng cộng</span>
                  <span className="text-lg font-bold tabular-nums text-blue-600">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setCartOpen(false);
                  handleSubmit("confirmed");
                }}
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Tạo đơn hàng
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
        "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
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
          <p className="text-sm font-bold tabular-nums text-blue-600">
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
