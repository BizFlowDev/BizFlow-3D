"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Search,
  PackagePlus,
  RefreshCcw,
  Download,
  FolderTree,
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
  useProductList,
  useCategoryList,
} from "@/hooks/useProducts";
import type {
  Product,
  ProductListParams,
  ProductStatusFilter,
} from "@/hooks/useProducts";
import { ProductTable } from "./_components/ProductTable";
import { ProductFormDialog } from "./_components/ProductFormDialog";
import { CategoryManageDialog } from "./_components/CategoryManageDialog";

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
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

export default function ProductsPage() {
  // ── State ──
  const [params, setParams] = useState<ProductListParams>({
    search: "",
    categoryId: "all",
    status: "all",
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [categoryManageOpen, setCategoryManageOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Debounced search
  const debouncedSearch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setParams((p) => ({ ...p, search: value, page: 1 }));
      }, 300);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // ── Queries ──
  const { data, isLoading, refetch, isFetching } = useProductList(params);
  const { data: categories = [] } = useCategoryList();
  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  // ── Handlers ──
  const handleCategoryChange = (value: string) => {
    setParams((p) => ({ ...p, categoryId: value, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setParams((p) => ({
      ...p,
      status: value as ProductStatusFilter,
      page: 1,
    }));
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setParams((p) => ({ ...p, page: newPage }));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Sản phẩm
          </h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý danh mục sản phẩm, đơn vị tính và giá bán.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setCategoryManageOpen(true)}
            variant="outline"
            size="lg"
            className="gap-2 border-border/80 hover:bg-accent font-medium shadow-sm"
          >
            <FolderTree className="h-4 w-4 text-blue-500" />
            Quản lý danh mục
          </Button>

          <Button
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
            className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
            size="lg"
            id="add-product-btn"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 hover:translate-x-full" />
            <PackagePlus className="h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </div>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="product-search"
            placeholder="Tìm theo tên hoặc mã SKU..."
            className="pl-9"
            value={searchInput}
            onChange={handleSearchChange}
            aria-label="Tìm kiếm sản phẩm"
          />
        </div>

        {/* Category filter */}
        <Select
          value={params.categoryId}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[180px]" id="category-filter">
            <SelectValue placeholder="Lọc danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={params.status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[160px]" id="status-filter">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="inactive">Ngừng</SelectItem>
          </SelectContent>
        </Select>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Tải lại"
            id="refresh-btn"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Xuất Excel"
            id="export-btn"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        <ProductTable
          products={products}
          categories={categories}
          isLoading={isLoading}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
        />
      </motion.div>

      {/* ── Dialogs ── */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />

      <CategoryManageDialog
        open={categoryManageOpen}
        onOpenChange={setCategoryManageOpen}
      />
    </motion.div>
  );
}
