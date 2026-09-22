"use client";

import { useState, useMemo, useCallback, Suspense, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
  Layers,
  Filter,
} from "lucide-react";
import { useProductList, useCategoryList, type Product } from "@/hooks/useProducts";
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

  // Camera preset & Chế độ màn hình POS 3D
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("overview");
  const [isPOSActive, setIsPOSActive] = useState(false);
  // Trạng thái thu gọn các nút điều khiển (tự động bật khi vào màn hình máy tính POS)
  const [isHUDCollapsed, setIsHUDCollapsed] = useState(false);

  // Order Lines State (Các mặt hàng trong đơn)
  const [orderLines, setOrderLines] = useState<CartItem3D[]>([]);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<
    (Product & { stock: number; categoryName?: string | null }) | null
  >(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // ── Data hooks ─────────────────────────────────────────────
  const { data: productsData, isLoading: productsLoading } = useProductList({
    limit: 200,
    status: "all",
  });
  const { data: stockData } = useStockLevel();
  const { data: ordersData } = useOrderList({ limit: 12 });
  const { data: categoriesData = [] } = useCategoryList();

  // ── State Danh Mục & Lọc ─────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categoriesData.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categoriesData]);

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    if (stockData && Array.isArray(stockData)) {
      stockData.forEach((item) => {
        map.set(item.productId, item.currentStock);
      });
    }
    return map;
  }, [stockData]);

  // Làm giàu sản phẩm kèm tồn kho thật & danh mục
  const enrichedProducts = useMemo(() => {
    if (!productsData?.items) return [];
    return productsData.items.map((p) => {
      const realStock = stockMap.has(p.id) ? stockMap.get(p.id)! : 15;
      return {
        ...p,
        stock: realStock,
        price: p.units?.[0]?.price ?? 0,
        categoryName: p.categoryId ? (categoryMap.get(p.categoryId) ?? null) : null,
      };
    });
  }, [productsData, stockMap, categoryMap]);

  // ── Chế độ Test Phân Trang (Dữ liệu mẫu 160 sản phẩm theo 6 danh mục) ─────────
  const [isDemoMode, setIsDemoMode] = useState(false);

  const DEMO_CATEGORIES = useMemo(
    () => [
      { id: "demo-cat-drinks", name: "☕ Đồ Uống" },
      { id: "demo-cat-snacks", name: "🍪 Bánh Kẹo" },
      { id: "demo-cat-cosmetics", name: "🧴 Mỹ Phẩm" },
      { id: "demo-cat-home", name: "🏠 Gia Dụng" },
      { id: "demo-cat-fashion", name: "👕 Thời Trang" },
      { id: "demo-cat-tech", name: "🎧 Thiết Bị Số" },
    ],
    [],
  );

  const availableCategories = useMemo(() => {
    if (isDemoMode) {
      return DEMO_CATEGORIES;
    }
    return categoriesData.map((c) => ({ id: c.id, name: c.name }));
  }, [categoriesData, isDemoMode, DEMO_CATEGORIES]);

  // Phân chia danh mục: 3 danh mục chính hiển thị mặc định, các danh mục còn lại hiển thị khi người dùng thao tác
  const mainCategories = useMemo(
    () => availableCategories.slice(0, 3),
    [availableCategories],
  );
  const extraCategories = useMemo(
    () => availableCategories.slice(3),
    [availableCategories],
  );
  const [isExtraCategoriesOpen, setIsExtraCategoriesOpen] = useState(false);
  const extraCategoriesRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown danh mục khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        extraCategoriesRef.current &&
        !extraCategoriesRef.current.contains(event.target as Node)
      ) {
        setIsExtraCategoriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Danh mục phụ đang được chọn (nếu có)
  const activeExtraCategory = useMemo(
    () => extraCategories.find((c) => c.id === selectedCategory),
    [extraCategories, selectedCategory],
  );

  // Format ShelfProduct[] cho 3D render (hỗ trợ phân nhóm 160 sản phẩm / 6 danh mục)
  const shelfProducts: ShelfProduct[] = useMemo(() => {
    const base: ShelfProduct[] = enrichedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      code: p.code,
      imageUrl: p.imageUrl,
    }));

    if (!isDemoMode) return base;

    // Dữ liệu hạt giống cho 6 danh mục Demo (tổng cộng đúng 160 sản phẩm)
    const demoCatalog = [
      {
        catId: "demo-cat-drinks",
        catName: "☕ Đồ Uống",
        prefix: "CF",
        count: 32,
        items: [
          "Cà phê Robusta Đậm Vị",
          "Trà Xanh Thái Nguyên Thượng Hạng",
          "Nước Ép Cam Tự Nhiên 1L",
          "Trà Sữa Ô Long Trân Châu",
          "Nước Khoáng Tinh Khiết 500ml",
          "Cà phê Espresso Lon 240ml",
        ],
        basePrice: 25000,
      },
      {
        catId: "demo-cat-snacks",
        catName: "🍪 Bánh Kẹo",
        prefix: "SN",
        count: 28,
        items: [
          "Bánh Quy Bơ Pháp Cao Cấp",
          "Kẹo Dẻo Trái Cây Đa Vị",
          "Hạt Điều Rang Muối Vỏ Lụa",
          "Bim Bim Khoai Tây Giòn",
          "Socola Đen Hạnh Nhân 85%",
          "Bánh Bông Lan Trứng Muối",
        ],
        basePrice: 35000,
      },
      {
        catId: "demo-cat-cosmetics",
        catName: "🧴 Mỹ Phẩm",
        prefix: "CS",
        count: 26,
        items: [
          "Dầu Gội Bồ Kết Thiên Nhiên",
          "Sữa Tắm Dưỡng Ẩm Hương Hoa",
          "Nước Lau Sàn Sả Chanh 1L",
          "Kem Đánh Răng Trắng Sáng",
          "Nước Giặt Xả Cao Cấp 3.6kg",
          "Nước Rửa Tay Sát Khuẩn",
        ],
        basePrice: 55000,
      },
      {
        catId: "demo-cat-home",
        catName: "🏠 Gia Dụng",
        prefix: "HM",
        count: 26,
        items: [
          "Bình Giữ Nhiệt Inox 500ml",
          "Bộ Hộp Nhựa Bảo Quản Thức Ăn",
          "Chảo Chống Dính Vân Đá 26cm",
          "Đèn Bàn LED Chống Cận",
          "Khăn Lau Bếp Microfiber",
          "Thớt Gỗ Tự Nhiên Kháng Khuẩn",
        ],
        basePrice: 75000,
      },
      {
        catId: "demo-cat-fashion",
        catName: "👕 Thời Trang",
        prefix: "FS",
        count: 24,
        items: [
          "Áo Thun Cotton Organic Unisex",
          "Quần Jean Slimfit Co Giãn",
          "Áo Khoác Bomber Chống Gió",
          "Mũ Lưỡi Trai Phong Cách Streetwear",
          "Tất Cổ Ngắn Cotton Kháng Khuẩn",
          "Thắt Lưng Da Bò Cao Cấp",
        ],
        basePrice: 120000,
      },
      {
        catId: "demo-cat-tech",
        catName: "🎧 Thiết Bị Số",
        prefix: "TC",
        count: 24,
        items: [
          "Tai Nghe True Wireless Chống Ồn",
          "Cáp Sạc Nhanh Type-C 65W Bọc Dù",
          "Pin Sạc Dự Phòng 10.000mAh Siêu Mỏng",
          "Chuột Không Dây Silent Click Đa Năng",
          "Giá Đỡ Điện Thoại Hợp Kim Nhôm",
          "Loa Bluetooth Mini Bass Sâu 10W",
        ],
        basePrice: 180000,
      },
    ];

    const demoItems: ShelfProduct[] = [];
    demoCatalog.forEach((catGroup) => {
      for (let i = 0; i < catGroup.count; i++) {
        const templateName = catGroup.items[i % catGroup.items.length];
        const num = i + 1;
        demoItems.push({
          id: `demo-${catGroup.prefix}-${num}`,
          name: `${templateName} #${num}`,
          code: `${catGroup.prefix}-${String(num).padStart(3, "0")}`,
          price: catGroup.basePrice + ((i % 5) * 5000),
          stock: 15 + (i % 20),
          categoryId: catGroup.catId,
          categoryName: catGroup.catName,
          imageUrl: null,
        });
      }
    });

    return demoItems;
  }, [enrichedProducts, isDemoMode]);

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

  // ── Phân trang & Phân bổ Kệ hàng (Kết hợp Phương án B & C) ──────
  const ITEMS_PER_PAGE = 80;
  const [currentPage, setCurrentPage] = useState(1);

  // Phân trang cục bộ cho từng kệ khi ở chế độ "Tất cả" (Phương án B)
  const [shelfAPage, setShelfAPage] = useState(1);
  const [shelfBPage, setShelfBPage] = useState(1);
  const [shelfCPage, setShelfCPage] = useState(1);
  const [shelfDPage, setShelfDPage] = useState(1);

  // Phân nhóm danh mục cho Showroom khi có > 4 danh mục (chế độ "Tất cả danh mục")
  const [categoryGroupPage, setCategoryGroupPage] = useState(1);

  // Chuyển nhóm kệ và reset trang các kệ con
  const handleCategoryGroupChange = (newPage: number) => {
    setCategoryGroupPage(newPage);
    setShelfAPage(1);
    setShelfBPage(1);
    setShelfCPage(1);
    setShelfDPage(1);
  };

  // Reset trang các kệ khi từ khoá hoặc danh mục thay đổi
  useEffect(() => {
    setCurrentPage(1);
    setCategoryGroupPage(1);
    setShelfAPage(1);
    setShelfBPage(1);
    setShelfCPage(1);
    setShelfDPage(1);
  }, [searchQuery, selectedCategory]);

  // Phân bổ dữ liệu sản phẩm và tiêu đề cho 4 kệ
  const {
    shelfAData,
    shelfBData,
    shelfCData,
    shelfDData,
    totalPages,
    totalCategoryGroups,
    activeShelfCategoryIds,
    totalVisibleCount,
  } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searchFiltered = !q
      ? shelfProducts
      : shelfProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)),
      );

    // ── KỊCH BẢN C: Khi đã chọn 1 danh mục cụ thể ──
    if (selectedCategory !== "all") {
      const catProducts = searchFiltered.filter(
        (p) => p.categoryId === selectedCategory,
      );
      const catObj = availableCategories.find((c) => c.id === selectedCategory);
      const catTitle = catObj?.name.toUpperCase() || "DANH MỤC";

      // Phân trang toàn Showroom 80 món / lượt (4 kệ x 20)
      const totalP = Math.max(1, Math.ceil(catProducts.length / ITEMS_PER_PAGE));
      const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
      const visibleCat = catProducts.slice(pageStart, pageStart + ITEMS_PER_PAGE);

      // Kệ A: hiển thị 20 sản phẩm đầu của trang showroom hiện tại.
      // Nếu danh mục có > 20 sản phẩm, Kệ A cho phép lật trang độc lập bằng label nổi
      const totalPagesA = Math.max(1, Math.ceil(catProducts.length / 20));
      const pageStartA = (shelfAPage - 1) * 20;
      const prodsA = shelfAPage === 1
        ? visibleCat.slice(0, 20)
        : catProducts.slice(pageStartA, pageStartA + 20);

      return {
        shelfAData: {
          products: prodsA,
          title: `${catTitle} • DÃY 1`,
          currentPage: totalPagesA > 1 ? shelfAPage : 1,
          totalPages: totalPagesA > 1 ? totalPagesA : 1,
        },
        shelfBData: {
          products: visibleCat.slice(20, 40),
          title: visibleCat.length > 20 ? `${catTitle} • DÃY 2` : `${catTitle} • DÃY 2 (TRỐNG)`,
          currentPage: 1,
          totalPages: 1,
        },
        shelfCData: {
          products: visibleCat.slice(40, 60),
          title: visibleCat.length > 40 ? `${catTitle} • DÃY 3` : `${catTitle} • DÃY 3 (TRỐNG)`,
          currentPage: 1,
          totalPages: 1,
        },
        shelfDData: {
          products: visibleCat.slice(60, 80),
          title: visibleCat.length > 60 ? `${catTitle} • DÃY 4` : `${catTitle} • DÃY 4 (TRỐNG)`,
          currentPage: 1,
          totalPages: 1,
        },
        totalPages: totalP,
        totalCategoryGroups: 1,
        activeShelfCategoryIds: new Set([selectedCategory]),
        totalVisibleCount: catProducts.length,
      };
    }

    // ── KỊCH BẢN B: Khi ở chế độ "Tất cả danh mục" ──
    // Hệ thống tự động phân loại theo danh mục và chia thành các nhóm kệ (tối đa 4 danh mục / nhóm)
    const catCountMap = new Map<string, number>();
    const prodsByCatMap = new Map<string, ShelfProduct[]>();

    searchFiltered.forEach((p) => {
      const catId = p.categoryId || "uncategorized";
      catCountMap.set(catId, (catCountMap.get(catId) || 0) + 1);
      if (!prodsByCatMap.has(catId)) {
        prodsByCatMap.set(catId, []);
      }
      prodsByCatMap.get(catId)!.push(p);
    });

    // Sắp xếp các danh mục theo số lượng sản phẩm GIẢM DẦN (nhiều sản phẩm nhất lên đầu)
    const rankedCategories = [...availableCategories]
      .map((cat) => ({
        ...cat,
        count: catCountMap.get(cat.id) || 0,
        products: prodsByCatMap.get(cat.id) || [],
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    // Nếu có sản phẩm chưa phân loại, bổ sung vào danh sách xét duyệt
    const uncategorized = prodsByCatMap.get("uncategorized") || [];
    if (uncategorized.length > 0) {
      rankedCategories.push({
        id: "uncategorized",
        name: "Bách Hóa Khác",
        count: uncategorized.length,
        products: uncategorized,
      });
      rankedCategories.sort((a, b) => b.count - a.count);
    }

    // Phân nhóm danh mục (tối đa 4 danh mục / nhóm kệ showroom)
    const totalCatGroups = Math.max(1, Math.ceil(rankedCategories.length / 4));
    const safeGroupPage = Math.min(categoryGroupPage, totalCatGroups);
    const groupStart = (safeGroupPage - 1) * 4;

    const catA = rankedCategories[groupStart + 0] || null;
    const catB = rankedCategories[groupStart + 1] || null;
    const catC = rankedCategories[groupStart + 2] || null;
    const catD = rankedCategories[groupStart + 3] || null;

    const prodsA = catA?.products || [];
    const prodsB = catB?.products || [];
    // Nếu kệ C hoặc D không có danh mục riêng trong nhóm này (ví dụ Nhóm 2 chỉ có 2 danh mục Thời Trang & Thiết Bị Số),
    // hiển thị các sản phẩm nổi bật / bán chạy từ showroom để kệ luôn sinh động
    const prodsC = catC ? catC.products : searchFiltered.slice(0, 20);
    const prodsD = catD ? catD.products : searchFiltered.slice(20, 40);

    const titleA = catA ? `${catA.name.toUpperCase()}` : "KỆ HÀNG A";
    const titleB = catB ? `${catB.name.toUpperCase()}` : "KỆ HÀNG B";
    const titleC = catC ? `${catC.name.toUpperCase()}` : "🌟 SẢN PHẨM NỔI BẬT";
    const titleD = catD ? `${catD.name.toUpperCase()}` : "🔥 SẢN PHẨM BÁN CHẠY";

    const totalPagesA = Math.max(1, Math.ceil(prodsA.length / 20));
    const totalPagesB = Math.max(1, Math.ceil(prodsB.length / 20));
    const totalPagesC = Math.max(1, Math.ceil(prodsC.length / 20));
    const totalPagesD = Math.max(1, Math.ceil(prodsD.length / 20));

    const activeCatIds = new Set<string>();
    if (catA) activeCatIds.add(catA.id);
    if (catB) activeCatIds.add(catB.id);
    if (catC) activeCatIds.add(catC.id);
    if (catD) activeCatIds.add(catD.id);

    return {
      shelfAData: {
        products: prodsA.slice((shelfAPage - 1) * 20, shelfAPage * 20),
        title: titleA,
        currentPage: shelfAPage,
        totalPages: totalPagesA,
      },
      shelfBData: {
        products: prodsB.slice((shelfBPage - 1) * 20, shelfBPage * 20),
        title: titleB,
        currentPage: shelfBPage,
        totalPages: totalPagesB,
      },
      shelfCData: {
        products: prodsC.slice((shelfCPage - 1) * 20, shelfCPage * 20),
        title: titleC,
        currentPage: shelfCPage,
        totalPages: totalPagesC,
      },
      shelfDData: {
        products: prodsD.slice((shelfDPage - 1) * 20, shelfDPage * 20),
        title: titleD,
        currentPage: shelfDPage,
        totalPages: totalPagesD,
      },
      totalPages: 1, // Ở chế độ Tất cả, phân trang do từng kệ tự đảm nhiệm
      totalCategoryGroups: totalCatGroups,
      activeShelfCategoryIds: activeCatIds,
      totalVisibleCount: searchFiltered.length,
    };
  }, [
    searchQuery,
    shelfProducts,
    selectedCategory,
    availableCategories,
    currentPage,
    shelfAPage,
    shelfBPage,
    shelfCPage,
    shelfDPage,
    categoryGroupPage,
  ]);

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
      } else if (isDemoMode) {
        const demoItem = shelfProducts.find((p) => p.id === productId);
        if (demoItem) {
          setSelectedProductForDetail({
            id: demoItem.id,
            name: demoItem.name,
            code: demoItem.code || "DEMO-01",
            stock: demoItem.stock,
            categoryId: null,
            categoryName: "Dữ Liệu Mẫu Test",
            imageUrl: demoItem.imageUrl || null,
            description: null,
            hasMultipleUnits: false,
            isActive: true,
            storeId: "store-demo",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            units: [
              {
                id: `unit-${demoItem.id}`,
                productId: demoItem.id,
                unitName: "Cái",
                conversionFactor: 1,
                price: demoItem.price,
                isDefault: true,
                createdAt: new Date().toISOString(),
              },
            ],
          });
        }
      }
    },
    [enrichedProducts, isDemoMode, shelfProducts],
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
  }, []);

  // Khi click Tạo đơn & Thanh toán ngay từ modal sản phẩm kệ:
  // Thêm vào đơn và bay thẳng camera vào màn hình máy tính POS để thanh toán
  const handleBuyNow = useCallback(
    (item: CartItem3D) => {
      handleAddToOrder(item);
      setSelectedProductForDetail(null);
      setCameraPreset("posScreen");
      setIsPOSActive(true);
      setIsHUDCollapsed(true);
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
    setIsHUDCollapsed(true);
  }, []);

  const handleExitPOS = useCallback(() => {
    setCameraPreset("overview");
    setIsPOSActive(false);
    setIsHUDCollapsed(false);
  }, []);

  const handleSelectPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
    if (preset === "posScreen") {
      setIsPOSActive(true);
      setIsHUDCollapsed(true);
    } else {
      setIsPOSActive(false);
      setIsHUDCollapsed(false);
    }
  }, []);

  const isViewingShelf = [
    "shelfLeft",
    "shelfRight",
    "shelfSideLeft",
    "shelfSideRight",
  ].includes(cameraPreset);

  // Phím tắt ESC để thoát quầy POS, thoát góc nhìn xem kệ hoặc mở lại HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPOSActive) {
          handleExitPOS();
        } else if (isViewingShelf) {
          handleSelectPreset("overview");
        } else if (isHUDCollapsed) {
          setIsHUDCollapsed(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPOSActive, isViewingShelf, isHUDCollapsed, handleExitPOS, handleSelectPreset]);

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
            isPOSActive={isPOSActive}
          >
            {/* Kệ hàng A — bên trái tường sau */}
            <ProductShelf
              products={shelfAData.products}
              onSelectProduct={handleSelectProduct}
              position={[-3.5, 0, -4.5]}
              title={shelfAData.title}
              shelfCurrentPage={shelfAData.currentPage}
              shelfTotalPages={shelfAData.totalPages}
              isFocused={cameraPreset === "shelfLeft"}
              onClickShelf={() => handleSelectPreset("shelfLeft")}
              onPrevShelfPage={() => setShelfAPage((p) => Math.max(1, p - 1))}
              onNextShelfPage={() =>
                setShelfAPage((p) => Math.min(shelfAData.totalPages || 1, p + 1))
              }
            />

            {/* Kệ hàng B — bên phải tường sau */}
            <ProductShelf
              products={shelfBData.products}
              onSelectProduct={handleSelectProduct}
              position={[3.5, 0, -4.5]}
              title={shelfBData.title}
              shelfCurrentPage={shelfBData.currentPage}
              shelfTotalPages={shelfBData.totalPages}
              isFocused={cameraPreset === "shelfRight"}
              onClickShelf={() => handleSelectPreset("shelfRight")}
              onPrevShelfPage={() => setShelfBPage((p) => Math.max(1, p - 1))}
              onNextShelfPage={() =>
                setShelfBPage((p) => Math.min(shelfBData.totalPages || 1, p + 1))
              }
            />

            {/* Kệ hàng C — bên hông trái */}
            <ProductShelf
              products={shelfCData.products}
              onSelectProduct={handleSelectProduct}
              position={[-7.0, 0, -0.5]}
              rotation={[0, Math.PI / 2, 0]}
              title={shelfCData.title}
              shelfCurrentPage={shelfCData.currentPage}
              shelfTotalPages={shelfCData.totalPages}
              isFocused={cameraPreset === "shelfSideLeft"}
              onClickShelf={() => handleSelectPreset("shelfSideLeft")}
              onPrevShelfPage={() => setShelfCPage((p) => Math.max(1, p - 1))}
              onNextShelfPage={() =>
                setShelfCPage((p) => Math.min(shelfCData.totalPages || 1, p + 1))
              }
            />

            {/* Kệ hàng D — bên hông phải */}
            <ProductShelf
              products={shelfDData.products}
              onSelectProduct={handleSelectProduct}
              position={[7.0, 0, -0.5]}
              rotation={[0, -Math.PI / 2, 0]}
              title={shelfDData.title}
              shelfCurrentPage={shelfDData.currentPage}
              shelfTotalPages={shelfDData.totalPages}
              isFocused={cameraPreset === "shelfSideRight"}
              onClickShelf={() => handleSelectPreset("shelfSideRight")}
              onPrevShelfPage={() => setShelfDPage((p) => Math.max(1, p - 1))}
              onNextShelfPage={() =>
                setShelfDPage((p) => Math.min(shelfDData.totalPages || 1, p + 1))
              }
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

            {/* Trợ lý AI Robot — cạnh quầy (ẩn bong bóng thoại khi mở Modal hoặc Màn hình POS) */}
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
              hideBubble={
                !!selectedProductForDetail ||
                (!!createdOrder && !isPOSActive) ||
                isPOSActive
              }
            />
          </StoreViewer>
        </Suspense>

        {/* ── Overlay UI (HUD layer chuẩn z-30) ─────────── */}
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4 overflow-hidden">
          {/* Thanh công cụ tinh gọn khi ở Chế độ Màn hình POS hoặc khi thu gọn HUD */}
          {isHUDCollapsed && (
            <div className="pointer-events-auto fixed top-3.5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-slate-950/90 px-3.5 py-2 shadow-2xl shadow-black/60 backdrop-blur-2xl animate-in fade-in slide-in-from-top-3 duration-300 ring-1 ring-white/10">
              {/* Nút Rời Quầy / Toàn cảnh */}
              <button
                type="button"
                onClick={handleExitPOS}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-600/30 to-pink-600/30 hover:from-rose-600/50 hover:to-pink-600/50 px-3.5 py-1.5 text-xs font-bold text-rose-200 shadow-md backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                title="Rời khỏi quầy POS hoặc nhấn phím ESC"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{isPOSActive ? "Rời Quầy [ESC]" : "Toàn Cảnh [ESC]"}</span>
              </button>

              <div className="h-4 w-px bg-white/15" />

              {/* Status Badge */}
              <div className="flex items-center gap-2 px-1 text-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="font-bold text-slate-200 hidden sm:inline">
                  {isPOSActive ? "Màn Hình POS • Trạm #01" : "Showroom 3D"}
                </span>
                {totalOrderCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                    🛒 {totalOrderCount} món
                  </span>
                )}
              </div>

              <div className="h-4 w-px bg-white/15" />

              {/* Nút Hiện lại thanh công cụ đầy đủ */}
              <button
                type="button"
                onClick={() => setIsHUDCollapsed(false)}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-md transition-all hover:text-white"
                title="Mở rộng lại thanh tìm kiếm, danh mục và các góc nhìn"
              >
                <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden md:inline">Hiện công cụ</span>
              </button>
            </div>
          )}

          {/* Top bar (Cụm điều khiển trên cùng) */}
          <div
            className={`pointer-events-auto flex flex-col gap-2.5 transition-all duration-300 ease-in-out ${isHUDCollapsed
              ? "-translate-y-[130%] opacity-0 pointer-events-none absolute top-4 left-4 right-4"
              : "translate-y-0 opacity-100 relative"
              }`}
          >
            {/* Hàng 1: Search + Test Button + [Chính Giữa: Điều hướng Phân Trang] + Right Controls */}
            <div className="relative flex items-center justify-between gap-3">
              {/* Cụm Bên Trái: Tìm kiếm sản phẩm & Nút bật Chế độ Test Phân Trang */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-56 sm:w-72">
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

                {/* Nút Bật/Tắt Chế Độ Test Phân Trang (Demo 160 sản phẩm / 6 danh mục) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDemoMode((prev) => !prev);
                    setSelectedCategory("all");
                    handleSelectPreset("overview");
                  }}
                  className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-bold transition-all shadow-xl backdrop-blur-xl ${isDemoMode
                    ? "border-amber-400/60 bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 ring-2 ring-amber-500/40"
                    : "border-white/15 bg-slate-900/80 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  title="Bật/Tắt dữ liệu giả lập 160 sản phẩm & 6 danh mục để test phân trang"
                >
                  <Sparkles
                    className={`h-3.5 w-3.5 ${isDemoMode ? "text-amber-400 animate-spin" : "text-slate-400"
                      }`}
                  />
                  <span className="hidden md:inline">
                    {isDemoMode ? "Đang Test (160 sp / 6 danh mục)" : "Test Phân Trang (160 sp)"}
                  </span>
                </button>
              </div>

              {/* Chính giữa: Thanh điều hướng phân trang (ngang hàng với thanh tìm kiếm) */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center">
                {/* Khi ở chế độ Tất cả danh mục: Điều hướng Nhóm Kệ */}
                {selectedCategory === "all" && totalCategoryGroups > 1 && (
                  <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-amber-500/40 bg-slate-900/90 p-1 text-xs text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      disabled={categoryGroupPage <= 1}
                      onClick={() =>
                        handleCategoryGroupChange(
                          Math.max(1, categoryGroupPage - 1),
                        )
                      }
                      className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-semibold text-amber-200 transition-all hover:bg-amber-500/20 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed"
                      title="Nhóm danh mục trước"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Nhóm trước</span>
                    </button>

                    <div className="flex items-center gap-1.5 px-2.5 font-bold text-[11px]">
                      <Layers className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-slate-300">Nhóm Kệ</span>
                      <span className="text-amber-400 font-extrabold text-xs">
                        {categoryGroupPage}
                      </span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-300">{totalCategoryGroups}</span>
                    </div>

                    <button
                      type="button"
                      disabled={categoryGroupPage >= totalCategoryGroups}
                      onClick={() =>
                        handleCategoryGroupChange(
                          Math.min(totalCategoryGroups, categoryGroupPage + 1),
                        )
                      }
                      className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-semibold text-amber-200 transition-all hover:bg-amber-500/20 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed"
                      title="Nhóm danh mục sau"
                    >
                      <span className="hidden md:inline">Nhóm sau</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Khi ở chế độ 1 danh mục cụ thể: Điều hướng Phân Trang Danh Mục */}
                {selectedCategory !== "all" && totalPages > 1 && (
                  <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-indigo-500/40 bg-slate-900/90 p-1 text-xs text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed"
                      title="Trang trước"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Trước</span>
                    </button>

                    <div className="flex items-center gap-1.5 px-2.5 font-bold text-[11px]">
                      <Layers className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-slate-300">Trang</span>
                      <span className="text-indigo-400 font-extrabold text-xs">
                        {currentPage}
                      </span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-300">{totalPages}</span>
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed"
                      title="Trang sau"
                    >
                      <span className="hidden md:inline">Sau</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Cụm Bên Phải: Right Controls Header */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Nút thoát nhanh quầy POS khi đang trong góc nhìn POS */}
                {isPOSActive && (
                  <button
                    type="button"
                    onClick={handleExitPOS}
                    className="flex items-center gap-1.5 rounded-2xl border border-rose-500/40 bg-rose-600/30 hover:bg-rose-600/50 px-3 py-2.5 text-xs font-bold text-rose-200 shadow-xl backdrop-blur-xl transition-all"
                    title="Rời khỏi quầy POS hoặc nhấn phím ESC"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Rời Quầy POS [ESC]</span>
                  </button>
                )}

                {/* Nút trở về toàn cảnh khi đang xem 1 kệ hàng */}
                {isViewingShelf && !isPOSActive && (
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("overview")}
                    className="flex items-center gap-1.5 rounded-2xl border border-sky-500/40 bg-sky-600/30 hover:bg-sky-600/50 px-3 py-2.5 text-xs font-bold text-sky-200 shadow-xl backdrop-blur-xl transition-all animate-in fade-in"
                    title="Quay lại toàn cảnh showroom hoặc nhấn phím ESC"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Toàn cảnh [ESC]</span>
                  </button>
                )}

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

                {/* Lịch sử đơn hàng */}
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

                {/* Nút Thu gọn giao diện */}
                <button
                  type="button"
                  onClick={() => setIsHUDCollapsed(true)}
                  className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-900/80 hover:bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-200 shadow-2xl backdrop-blur-xl transition-all hover:text-white"
                  title="Thu gọn các nút điều khiển để mở rộng tầm nhìn Showroom"
                >
                  <ChevronUp className="h-4 w-4 text-indigo-400" />
                  <span className="hidden xl:inline">Thu gọn</span>
                </button>
              </div>
            </div>

            {/* Hàng 2: Thanh Tab Danh Mục Sản Phẩm (Hiển thị Tất Cả + 3 Danh Mục Chính + Dropdown Danh Mục Khác) */}
            <div className="flex items-center gap-1.5 overflow-visible py-0.5 max-w-full">
              {/* Nút Tất Cả Danh Mục */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  handleSelectPreset("overview");
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-md backdrop-blur-xl ${selectedCategory === "all"
                  ? "bg-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-400/40"
                  : "border border-white/10 bg-slate-900/80 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Tất cả danh mục</span>
              </button>

              {/* 3 Danh Mục Chính */}
              {mainCategories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const isOnShelf =
                  selectedCategory === "all" &&
                  activeShelfCategoryIds.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleSelectPreset("shelfLeft");
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-md backdrop-blur-xl ${isActive
                      ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sky-500/25 ring-2 ring-sky-400/40 scale-105"
                      : isOnShelf
                        ? "border border-amber-400/40 bg-slate-900/90 text-amber-300 ring-1 ring-amber-400/30 hover:bg-white/10"
                        : "border border-white/10 bg-slate-900/80 text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <span>{cat.name}</span>
                    {isOnShelf && (
                      <span
                        className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"
                        title="Đang được trưng bày trên kệ"
                      />
                    )}
                  </button>
                );
              })}

              {/* Các Danh Mục Còn Lại (chỉ hiển thị khi người dùng thao tác) */}
              {extraCategories.length > 0 && (
                <div className="relative shrink-0" ref={extraCategoriesRef}>
                  <button
                    type="button"
                    onClick={() => setIsExtraCategoriesOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-md backdrop-blur-xl ${activeExtraCategory
                      ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sky-500/25 ring-2 ring-sky-400/40 scale-105"
                      : isExtraCategoriesOpen
                        ? "border border-white/30 bg-white/15 text-white"
                        : "border border-white/10 bg-slate-900/80 text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    title="Nhấn để chọn các danh mục còn lại"
                  >
                    <span className="max-w-[130px] truncate text-left">
                      {activeExtraCategory
                        ? activeExtraCategory.name
                        : `+${extraCategories.length} Danh mục khác`}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${isExtraCategoriesOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {/* Dropdown Menu xổ xuống */}
                  {isExtraCategoriesOpen && (
                    <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-white/15 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between shrink-0">
                        <span>Danh mục khác</span>
                        <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300 font-bold">
                          {extraCategories.length}
                        </span>
                      </div>
                      <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-0.5">
                        {extraCategories.map((cat) => {
                          const isCatActive = selectedCategory === cat.id;
                          const isOnShelf =
                            selectedCategory === "all" &&
                            activeShelfCategoryIds.has(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                handleSelectPreset("shelfLeft");
                                setIsExtraCategoriesOpen(false);
                              }}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left ${isCatActive
                                ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{cat.name}</span>
                                {isOnShelf && (
                                  <span
                                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse"
                                    title="Đang trên kệ"
                                  />
                                )}
                              </span>
                              {isCatActive && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 transition-all duration-300 ease-in-out ${isHUDCollapsed
              ? "translate-y-[150%] opacity-0 pointer-events-none absolute bottom-4 left-4 right-4"
              : "translate-y-0 opacity-100 relative"
              }`}
          >
            {/* Camera Presets Bar (Bao gồm các góc nhìn kệ và Màn Hình POS) */}
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
                  : `${totalVisibleCount} sản phẩm`}
              </span>
              {selectedCategory !== "all" ? (
                <span className="hidden sm:inline font-semibold text-sky-400">
                  ({availableCategories.find((c) => c.id === selectedCategory)?.name || "Danh mục"})
                </span>
              ) : (
                <span className="hidden sm:inline font-semibold text-amber-300">
                  (Nhóm Kệ {categoryGroupPage}/{totalCategoryGroups})
                </span>
              )}
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
