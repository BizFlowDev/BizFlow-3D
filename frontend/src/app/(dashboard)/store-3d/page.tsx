"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  X,
  LayoutDashboard,
  Bell,
  Loader2,
  Package,
  Store,
} from "lucide-react";
import { useProductList } from "@/hooks/useProducts";
import { useOrderList } from "@/hooks/useOrders";
import type { ShelfProduct } from "@/components/3d/ProductShelf";
import type { Order } from "@/hooks/useOrders";

// ── Lazy load 3D components (toàn bộ three.js chỉ load khi vào trang) ────────

const StoreViewer = dynamic(() => import("@/components/3d/StoreViewer"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

const ProductShelf = dynamic(() => import("@/components/3d/ProductShelf"), {
  ssr: false,
});

const Counter = dynamic(() => import("@/components/3d/Counter"), {
  ssr: false,
});

const Avatar3D = dynamic(() => import("@/components/3d/Avatar3D"), {
  ssr: false,
});

// ── Loading fallback ──────────────────────────────────────────────────────────

function SceneLoading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#1a1a2e]">
      <div className="relative">
        <Store className="h-16 w-16 text-indigo-400 animate-pulse" />
        <Loader2 className="absolute -right-2 -top-2 h-6 w-6 text-white animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-300">
        Đang tải cửa hàng 3D...
      </p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full animate-[loading_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      </div>
    </div>
  );
}

// ── Format VND ────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Order Summary Modal ───────────────────────────────────────────────────────

function OrderSummaryOverlay({
  orders,
  onClose,
}: {
  orders: Order[];
  onClose: () => void;
}) {
  const statusLabels: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Đã xác nhận", color: "bg-emerald-100 text-emerald-700" },
    draft: { label: "Nháp", color: "bg-amber-100 text-amber-700" },
    cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Đơn hàng gần đây
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Order list */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có đơn hàng nào
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {order.customerName || "Khách lẻ"}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        statusLabels[order.status]?.color ?? ""
                      }`}
                    >
                      {statusLabels[order.status]?.label ?? order.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {order.items?.length ?? 0} sản phẩm
                    </span>
                    <span className="font-bold tabular-nums text-emerald-600">
                      {formatVND(order.finalAmount)}
                    </span>
                  </div>
                  {order.debtAmount > 0 && (
                    <div className="mt-1 text-xs text-red-500">
                      Nợ: {formatVND(order.debtAmount)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Store3DPage (main) ────────────────────────────────────────────────────────

/**
 * Store 3D Page — Full-screen 3D view của cửa hàng.
 *
 * - Lazy load three.js via next/dynamic (ssr: false)
 * - Overlay UI: search bar, mini cart badge, notifications, toggle 2D/3D
 * - Data: useProductList + useOrderList hooks
 */
export default function Store3DPage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrders, setShowOrders] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  // ── Data hooks ─────────────────────────────────────────────
  const { data: productsData, isLoading: productsLoading } = useProductList({
    limit: 20,
    status: "all",
  });
  const { data: ordersData, isLoading: ordersLoading } = useOrderList({
    limit: 10,
  });

  // ── Computed ───────────────────────────────────────────────

  // Chuyển đổi products thành ShelfProduct[]
  const shelfProducts: ShelfProduct[] = useMemo(() => {
    if (!productsData?.items) return [];
    return productsData.items.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.units?.[0]?.price ?? 0,
      stock: Math.floor(Math.random() * 50), // Mock stock (API chưa trả stock riêng)
      categoryName: null,
    }));
  }, [productsData]);

  // Filter sản phẩm theo search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return shelfProducts;
    const q = searchQuery.toLowerCase();
    return shelfProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [shelfProducts, searchQuery]);

  // Số đơn nháp (pending)
  const pendingCount = useMemo(() => {
    if (!ordersData?.items) return 0;
    return ordersData.items.filter((o) => o.status === "draft").length;
  }, [ordersData]);

  // Tổng doanh thu hôm nay
  const todayRevenue = useMemo(() => {
    if (!ordersData?.items) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return ordersData.items
      .filter(
        (o) =>
          o.status === "confirmed" &&
          o.createdAt.slice(0, 10) === today,
      )
      .reduce((sum, o) => sum + o.finalAmount, 0);
  }, [ordersData]);

  // ── Callbacks ──────────────────────────────────────────────

  const handleSelectProduct = useCallback((productId: string) => {
    const product = shelfProducts.find((p) => p.id === productId);
    if (product) {
      setNotifications((prev) => [
        `📦 Đã chọn: ${product.name}`,
        ...prev.slice(0, 2),
      ]);
      // Auto-clear notification after 3s
      setTimeout(() => {
        setNotifications((prev) => prev.slice(0, -1));
      }, 3000);
    }
  }, [shelfProducts]);

  const handleOpenOrders = useCallback(() => {
    setShowOrders(true);
  }, []);

  const handleToggle2D = useCallback(() => {
    router.push("/");
  }, [router]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      {/* CSS cho loading animation */}
      <style jsx global>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>

      <div className="fixed inset-0 z-40">
        {/* ── 3D Scene ──────────────────────────────────── */}
        <Suspense fallback={<SceneLoading />}>
          <StoreViewer height="100vh">
            {/* Kệ hàng — bên trái tường sau */}
            <ProductShelf
              products={filteredProducts}
              onSelectProduct={handleSelectProduct}
              position={[-3.5, 0, -4.5]}
            />

            {/* Kệ hàng 2 — bên phải tường sau */}
            <ProductShelf
              products={filteredProducts.slice(5)}
              onSelectProduct={handleSelectProduct}
              position={[3.5, 0, -4.5]}
            />

            {/* Quầy tính tiền — phía trước */}
            <Counter
              pendingCount={pendingCount}
              recentTotal={todayRevenue}
              onOpenOrders={handleOpenOrders}
              position={[0, 0, 2]}
            />

            {/* Avatar AI — cạnh quầy */}
            <Avatar3D
              isProcessing={false}
              message={pendingCount > 0 ? `Có ${pendingCount} đơn chờ duyệt!` : null}
              position={[2.5, 0, 2.5]}
              rotation={[0, -0.3, 0]}
            />
          </StoreViewer>
        </Suspense>

        {/* ── Overlay UI ────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {/* Top bar */}
          <div className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3">
            {/* Search bar */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 shadow-xl backdrop-blur-md transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Mini cart badge */}
              <button
                onClick={() => setShowOrders(true)}
                className="relative rounded-xl border border-white/10 bg-black/50 p-2.5 text-white shadow-xl backdrop-blur-md transition-colors hover:bg-white/10"
              >
                <ShoppingCart className="h-5 w-5" />
                {pendingCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Notifications bell */}
              <button className="relative rounded-xl border border-white/10 bg-black/50 p-2.5 text-white shadow-xl backdrop-blur-md transition-colors hover:bg-white/10">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Toggle 2D view */}
              <button
                onClick={handleToggle2D}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm font-medium text-white shadow-xl backdrop-blur-md transition-colors hover:bg-white/10"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard 2D
              </button>
            </div>
          </div>

          {/* Bottom info bar */}
          <div className="pointer-events-auto absolute bottom-4 left-4 right-4 flex items-center justify-between">
            {/* Product count */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white shadow-xl backdrop-blur-md">
              <Package className="h-4 w-4 text-emerald-400" />
              <span>
                {productsLoading
                  ? "Đang tải..."
                  : `${filteredProducts.length} sản phẩm`}
              </span>
              {searchQuery && (
                <span className="text-slate-400">
                  (tìm: &quot;{searchQuery}&quot;)
                </span>
              )}
            </div>

            {/* Controls hint */}
            <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-xs text-slate-400 shadow-xl backdrop-blur-md">
              🖱️ Kéo để xoay • Cuộn để zoom • Click sản phẩm để xem chi tiết
            </div>
          </div>

          {/* Notifications toast stack */}
          <div className="pointer-events-none absolute right-4 top-16 flex flex-col gap-2">
            {notifications.map((msg, i) => (
              <div
                key={`${msg}-${i}`}
                className="animate-in slide-in-from-right pointer-events-auto rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white shadow-xl backdrop-blur-md"
              >
                {msg}
              </div>
            ))}
          </div>
        </div>

        {/* ── Order summary modal ───────────────────────── */}
        {showOrders && (
          <OrderSummaryOverlay
            orders={ordersData?.items ?? []}
            onClose={() => setShowOrders(false)}
          />
        )}
      </div>
    </>
  );
}
