"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Search,
  Boxes,
  History,
  ArrowDownToLine,
  RefreshCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStockLevel,
} from "@/hooks/useInventory";
import type { StockLevelRow, StockStatusFilter } from "@/hooks/useInventory";
import { StockLevelTable } from "./_components/StockLevelTable";
import { ImportStockDialog } from "./_components/ImportStockDialog";

// Lazy-load kệ 3D — bundle three.js chỉ tải khi người dùng bật chế độ 3D
const ShelfViewer3D = dynamic(() => import("./_components/ShelfViewer3D"), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

// ── Hook phát hiện màn hình desktop ──────────────────────────────────────────
function useIsDesktop(breakpoint = 768): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isDesktop;
}

function InventoryPageInner() {
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop(768);

  // ── State ──
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<StockStatusFilter>("all");
  const [shelfMode, setShelfMode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importProductId, setImportProductId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [focusProductId, setFocusProductId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  // Debounce cho ô tìm kiếm (tránh fetch/lọc lại từng phím)
  const debouncedSearch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setSearch(value), 300);
    };
  }, []);

  // ── Query ──
  const { data: allRows = [], isLoading, refetch, isFetching } = useStockLevel();

  // ?highlight=<id> từ dashboard (LowStockWidget) → chọn + scroll tới sản phẩm
  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setSelectedProductId(highlight);
      setFocusProductId(highlight);
    }
  }, [searchParams]);

  // Mobile: không cho bật kệ 3D (trang render nặng nhất hệ thống)
  useEffect(() => {
    if (!isDesktop && shelfMode) setShelfMode(false);
  }, [isDesktop, shelfMode]);

  // ── Lọc dữ liệu ──
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allRows) {
      if (r.categoryId && r.categoryName)
        map.set(r.categoryId, r.categoryName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q),
      );
    }
    if (categoryId !== "all") rows = rows.filter((r) => r.categoryId === categoryId);
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    return rows;
  }, [allRows, search, categoryId, status]);

  // Kệ 3D lọc theo danh mục VÀ trạng thái — đồng bộ với bảng 2D
  const shelfRows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (categoryId === "all" || r.categoryId === categoryId) &&
          (status === "all" || r.status === status),
      ),
    [allRows, categoryId, status],
  );

  // ── Handlers ──
  const handleOpenImport = (product: StockLevelRow | null) => {
    setImportProductId(product ? product.productId : null);
    setImportOpen(true);
  };

  const handleRowFocus = (row: StockLevelRow) => {
    setSelectedProductId(row.productId);
    setFocusProductId(row.productId);
    setFocusNonce((n) => n + 1);
  };

  const handleCellClick = (productId: string) => {
    setSelectedProductId(productId);
    setImportProductId(productId);
    setImportOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Kho hàng
          </h1>
          <p className="mt-1 text-muted-foreground">
            Theo dõi tồn kho, nhập hàng và lịch sử xuất nhập.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => handleOpenImport(null)}
            className="bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Nhập kho
          </Button>
          <Button asChild variant="outline">
            <Link href="/inventory/transactions">
              <History className="h-4 w-4" />
              Lịch sử nhập/xuất
            </Link>
          </Button>
          {/* Toggle kệ 3D — chỉ hiện trên màn hình >= md, mặc định tắt */}
          {isDesktop && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={shelfMode ? "default" : "outline"}
                  onClick={() => setShelfMode((v) => !v)}
                  aria-pressed={shelfMode}
                  className={shelfMode ? "bg-blue-600 text-white hover:bg-blue-500" : ""}
                >
                  <Boxes className="h-4 w-4" />
                  Kệ hàng 3D
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Xem kho dạng kệ hàng 3D (tải nặng — khuyến nghị dùng trên máy
                tính). Bảng số liệu luôn hiển thị bên cạnh.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch(e.target.value);
            }}
            placeholder="Tìm theo tên hoặc mã sản phẩm..."
            className="pl-9"
            aria-label="Tìm kiếm sản phẩm trong kho"
          />
        </div>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[190px]" id="inv-category-filter">
            <SelectValue placeholder="Lọc danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as StockStatusFilter)}>
          <SelectTrigger className="w-[150px]" id="inv-status-filter">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="in_stock">Còn hàng</SelectItem>
            <SelectItem value="low_stock">Sắp hết</SelectItem>
            <SelectItem value="out_of_stock">Hết hàng</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Tải lại"
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── Nội dung: BẢNG 2D (mặc định) hoặc KỆ 3D + bảng thu gọn ── */}
      {shelfMode && isDesktop ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
          {/* Cột trái: Canvas 3D ~65% */}
          <div className="relative h-[520px] overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-900/5 to-transparent">
            {isLoading ? (
              <Skeleton className="absolute inset-0 rounded-none" />
            ) : (
              <ShelfViewer3D
                items={shelfRows}
                searchQuery={searchInput}
                selectedProductId={selectedProductId}
                focusProductId={focusProductId}
                focusNonce={focusNonce}
                onCellClick={handleCellClick}
              />
            )}

            {/* Chú giải màu (luôn hiển thị — accessibility) */}
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border bg-background/90 px-3 py-2 text-xs backdrop-blur">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  Ổn định (&gt;50% tồn)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                  Cảnh báo (10–50%)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                  Thiếu (&lt;10%) — nhấp nháy
                </div>
              </div>
            </div>

            {/* Hướng dẫn thao tác */}
            <div className="pointer-events-none absolute right-3 top-3 rounded-lg border bg-background/85 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
              Kéo để xoay · lăn để zoom · bấm ô kệ để nhập kho
            </div>
          </div>

          {/* Cột phải: bảng thu gọn ~35% */}
          <div className="flex h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm">
            <div className="flex-1 overflow-auto">
              <StockLevelTable
                rows={filteredRows}
                isLoading={isLoading}
                selectedProductId={selectedProductId}
                onImport={handleOpenImport}
                onSelectRow={handleRowFocus}
                compact
              />
            </div>
          </div>
        </div>
      ) : (
        /* Layout bảng 2D thuần — mặc định, an toàn trên thiết bị yếu */
        <div className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <StockLevelTable
            rows={filteredRows}
            isLoading={isLoading}
            selectedProductId={selectedProductId}
            onImport={handleOpenImport}
            onSelectRow={handleRowFocus}
          />
        </div>
      )}

      {/* ── Dialog nhập kho ── */}
      <ImportStockDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        preselectedProductId={importProductId}
      />
    </motion.div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={<div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-24" /><Skeleton className="h-[400px]" /></div>}
    >
      <InventoryPageInner />
    </Suspense>
  );
}