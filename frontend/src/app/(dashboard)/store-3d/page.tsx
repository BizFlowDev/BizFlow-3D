"use client";

import { useState, useMemo, useCallback, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Search,
  CreditCard,
  X,
  LayoutDashboard,
  Loader2,
  Package,
  Store,
  Sparkles,
  Receipt,
} from "lucide-react";
import { useProductList, type Product } from "@/hooks/useProducts";
import { useOrderList, type Order } from "@/hooks/useOrders";
import { useStockLevel } from "@/hooks/useInventory";
import { useQueryClient } from "@tanstack/react-query";
import type { ShelfProduct } from "@/components/3d/ProductShelf";
import type { CameraPreset } from "@/components/3d/CameraController";
import {
  ProductDetailModal3D,
  type CartItem3D,
} from "./_components/ProductDetailModal3D";
import { OrderSuccessModal } from "./_components/OrderSuccessModal";
import { CameraPresetsBar } from "./_components/CameraPresetsBar";

// ── Lazy load 3D components ───────────────────────────────────────────────────

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
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#090d16]">
      <div className="relative">
        <Store className="h-16 w-16 text-indigo-400 animate-pulse" />
        <Loader2 className="absolute -right-2 -top-2 h-6 w-6 text-white animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-300">
        Đang khởi tạo Showroom 3D...
      </p>
      <div className="h-1.5 w-52 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full animate-[loading_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-pink-500" />
      </div>
    </div>
  );
}

// ── Store3DPage (main) ────────────────────────────────────────────────────────

export default function Store3DPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<string[]>([]);

  // Camera preset & Chế độ màn hình POS 3D
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("overview");
  const [isPOSActive, setIsPOSActive] = useState(false);

  // Order Lines State (Các mặt hàng trong đơn)
  const [orderLines, setOrderLines] = useState<CartItem3D[]>([]);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<
    (Product & { stock: number; categoryName?: string | null }) | null
  >(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // ── Data hooks ─────────────────────────────────────────────
  const { data: productsData, isLoading: productsLoading } = useProductList({
    limit: 40,
    status: "all",
  });
  const { data: stockData } = useStockLevel();
  const { data: ordersData } = useOrderList({ limit: 12 });

  // Map số lượng tồn kho thực tế từ useStockLevel
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    if (stockData && Array.isArray(stockData)) {
      stockData.forEach((row) => {
        map.set(row.productId, row.currentStock);
      });
    }
    return map;
  }, [stockData]);

  // Làm giàu sản phẩm kèm tồn kho thật
  const enrichedProducts = useMemo(() => {
    if (!productsData?.items) return [];
    return productsData.items.map((p) => {
      const realStock = stockMap.has(p.id) ? stockMap.get(p.id)! : 15;
      return {
        ...p,
        stock: realStock,
        price: p.units?.[0]?.price ?? 0,
        categoryName: null,
      };
    });
  }, [productsData, stockMap]);

  // Format ShelfProduct[] cho 3D render
  const shelfProducts: ShelfProduct[] = useMemo(() => {
    return enrichedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      categoryName: p.categoryName,
      code: p.code,
      imageUrl: p.imageUrl,
    }));
  }, [enrichedProducts]);

  // Lọc sản phẩm theo từ khoá
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return shelfProducts;
    const q = searchQuery.toLowerCase();
    return shelfProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q)),
    );
  }, [shelfProducts, searchQuery]);

  // Chia sản phẩm cho Kệ A (Trái) và Kệ B (Phải)
  const shelfAProducts = useMemo(() => {
    return filteredProducts.slice(0, 20);
  }, [filteredProducts]);

  const shelfBProducts = useMemo(() => {
    return filteredProducts.slice(20, 40).length > 0
      ? filteredProducts.slice(20, 40)
      : filteredProducts.slice(5, 25);
  }, [filteredProducts]);

  // Số đơn chờ duyệt (draft)
  const pendingCount = useMemo(() => {
    if (!ordersData?.items) return 0;
    return ordersData.items.filter((o) => o.status === "draft").length;
  }, [ordersData]);

  // Tổng doanh thu hôm nay
  const todayRevenue = useMemo(() => {
    if (!ordersData?.items) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return ordersData.items
      .filter((o) => o.status === "confirmed" && o.createdAt.slice(0, 10) === today)
      .reduce((sum, o) => sum + o.finalAmount, 0);
  }, [ordersData]);

  // Tổng số lượng mặt hàng trong đơn
  const totalOrderCount = useMemo(() => {
    return orderLines.reduce((s, it) => s + it.quantity, 0);
  }, [orderLines]);

  // ── Callbacks Mua Sắm & Tương Tác ──────────────────────────

  const handleSelectProduct = useCallback(
    (productId: string) => {
      const fullProduct = enrichedProducts.find((p) => p.id === productId);
      if (fullProduct) {
        setSelectedProductForDetail(fullProduct);
      }
    },
    [enrichedProducts],
  );

  const handleAddToOrder = useCallback((item: CartItem3D) => {
    setOrderLines((prev) => {
      const idx = prev.findIndex(
        (it) => it.productId === item.productId && it.unitId === item.unitId,
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + item.quantity,
        };
        return updated;
      }
      return [...prev, item];
    });

    setNotifications((prev) => [
      `🛒 Đã thêm ${item.quantity}x ${item.productName} vào đơn hàng`,
      ...prev.slice(0, 2),
    ]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(0, -1));
    }, 3500);
  }, []);

  // Khi click Tạo đơn & Thanh toán ngay từ modal sản phẩm kệ:
  // Thêm vào đơn và bay thẳng camera vào màn hình máy tính POS để thanh toán
  const handleBuyNow = useCallback(
    (item: CartItem3D) => {
      handleAddToOrder(item);
      setSelectedProductForDetail(null);
      setCameraPreset("posScreen");
      setIsPOSActive(true);
    },
    [handleAddToOrder],
  );

  const handleUpdateQuantity = useCallback(
    (productId: string, unitId: string, quantity: number) => {
      setOrderLines((prev) =>
        prev.map((it) =>
          it.productId === productId && it.unitId === unitId
            ? { ...it, quantity }
            : it,
        ),
      );
    },
    [],
  );

  const handleRemoveOrderItem = useCallback(
    (productId: string, unitId: string) => {
      setOrderLines((prev) =>
        prev.filter(
          (it) => !(it.productId === productId && it.unitId === unitId),
        ),
      );
    },
    [],
  );

  const handleClearOrder = useCallback(() => {
    setOrderLines([]);
  }, []);

  const handleOrderSuccess = useCallback((order: Order) => {
    setCreatedOrder(order);
    setOrderLines([]);
  }, []);

  const handleToggle2D = useCallback(() => {
    router.push("/");
  }, [router]);

  // ── Mở & Đóng Màn Hình Máy Tính POS ─────────────────────────
  const handleOpenPOS = useCallback(() => {
    setCameraPreset("posScreen");
    setIsPOSActive(true);
  }, []);

  const handleExitPOS = useCallback(() => {
    setCameraPreset("overview");
    setIsPOSActive(false);
  }, []);

  const handleSelectPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
    if (preset === "posScreen") {
      setIsPOSActive(true);
    } else {
      setIsPOSActive(false);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      {/* Animation loading CSS */}
      <style jsx global>{`
        @keyframes loading {
          0% {
            width: 0%;
            margin-left: 0;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-40 bg-[#090d16]">
        {/* ── 3D Scene ──────────────────────────────────── */}
        <Suspense fallback={<SceneLoading />}>
          <StoreViewer
            height="100vh"
            currentPreset={cameraPreset}
          >
            {/* Kệ hàng A — bên trái tường sau */}
            <ProductShelf
              products={shelfAProducts}
              onSelectProduct={handleSelectProduct}
              position={[-3.5, 0, -4.5]}
              title="KỆ HÀNG A • NỔI BẬT"
            />

            {/* Kệ hàng B — bên phải tường sau */}
            <ProductShelf
              products={shelfBProducts}
              onSelectProduct={handleSelectProduct}
              position={[3.5, 0, -4.5]}
              title="KỆ HÀNG B • BÁCH HÓA"
            />

            {/* Quầy tính tiền — phía trước. Màn hình máy tính chứa giao diện POS nhúng trực tiếp */}
            <Counter
              pendingCount={pendingCount}
              recentTotal={todayRevenue}
              onOpenPOS={handleOpenPOS}
              onOpenOrders={handleOpenPOS}
              queryClient={queryClient}
              isPOSActive={isPOSActive}
              onExitPOS={handleExitPOS}
              orderLines={orderLines}
              onAddProduct={handleAddToOrder}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveOrderItem}
              onClearOrder={handleClearOrder}
              onOrderSuccess={handleOrderSuccess}
              recentOrders={ordersData?.items ?? []}
              position={[0, 0, 2]}
            />

            {/* Trợ lý AI Robot — cạnh quầy */}
            <Avatar3D
              isProcessing={false}
              message={
                pendingCount > 0
                  ? `Có ${pendingCount} đơn hàng chờ duyệt tại quầy!`
                  : null
              }
              position={[2.5, 0, 2.5]}
              rotation={[0, -0.35, 0]}
              onClick={() => setCameraPreset("avatar")}
            />
          </StoreViewer>
        </Suspense>

        {/* ── Overlay UI ────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
          {/* Top bar */}
          <div className="pointer-events-auto flex items-center justify-between gap-3">
            {/* Thanh tìm kiếm sản phẩm 3D */}
            <div className="relative w-64 sm:w-80">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm trên kệ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-slate-900/80 py-2.5 pl-10 pr-9 text-xs text-white placeholder-slate-400 shadow-2xl backdrop-blur-xl transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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

            {/* Right Controls Header */}
            <div className="flex items-center gap-2">
              {/* Nút Tạo Đơn Hàng (Zoom camera vào màn hình máy tính quầy POS) */}
              <button
                type="button"
                onClick={handleOpenPOS}
                className="relative flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-emerald-500/25 backdrop-blur-xl transition-all hover:scale-105"
              >
                <CreditCard className="h-4 w-4 text-white" />
                <span>Tạo Đơn Hàng</span>
                {totalOrderCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-black text-emerald-800 shadow-md animate-pulse">
                    {totalOrderCount}
                  </span>
                )}
              </button>

              {/* Lịch sử đơn hàng (chuyển góc nhìn đến màn hình máy tính tab lịch sử) */}
              <button
                type="button"
                onClick={handleOpenPOS}
                title="Lịch sử đơn hàng"
                className="relative rounded-2xl border border-white/15 bg-slate-900/80 p-2.5 text-white shadow-2xl backdrop-blur-xl transition-all hover:bg-white/10"
              >
                <Receipt className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Nút Chuyển về Dashboard 2D */}
              <button
                type="button"
                onClick={handleToggle2D}
                className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-900/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 shadow-2xl backdrop-blur-xl transition-all hover:bg-white/10 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4 text-indigo-400" />
                <span className="hidden sm:inline">Dashboard 2D</span>
              </button>
            </div>
          </div>

          {/* Toast notifications */}
          <div className="pointer-events-none absolute right-4 top-18 flex flex-col gap-2 z-50">
            {notifications.map((msg, i) => (
              <div
                key={`${msg}-${i}`}
                className="animate-in slide-in-from-right pointer-events-auto rounded-2xl border border-indigo-400/30 bg-slate-900/90 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl flex items-center gap-2"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                {msg}
              </div>
            ))}
          </div>

          {/* Bottom Control Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            {/* Camera Presets Bar (Bao gồm nút Màn Hình POS) */}
            <CameraPresetsBar
              currentPreset={cameraPreset}
              onSelectPreset={handleSelectPreset}
            />

            {/* Thông tin số lượng & Hướng dẫn điều khiển */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/80 px-4 py-2 text-xs text-slate-300 shadow-2xl backdrop-blur-xl">
              <Package className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {productsLoading
                  ? "Đang tải sản phẩm..."
                  : `${filteredProducts.length} sản phẩm`}
              </span>
              <span className="hidden lg:inline text-slate-500">•</span>
              <span className="hidden lg:inline text-slate-400">
                {isPOSActive
                  ? "🖥️ Đang tương tác trên Màn Hình POS [ESC để rời quầy]"
                  : "🖱️ Click màn hình máy tính để lên đơn như ngoài đời thực"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Product Detail Modal 3D ─────────────────────── */}
        <ProductDetailModal3D
          product={selectedProductForDetail}
          isOpen={!!selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onAddToCart={handleAddToOrder}
          onBuyNow={handleBuyNow}
        />

        {/* ── Order Success Modal (In Hoá Đơn PDF Dự Phòng) ─ */}
        <OrderSuccessModal
          order={createdOrder}
          isOpen={!!createdOrder && !isPOSActive}
          onClose={() => setCreatedOrder(null)}
        />
      </div>
    </>
  );
}
