"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Boxes,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToggleProductStatus, useDeleteProduct } from "@/hooks/useProducts";
import type { Product, ProductCategory } from "@/hooks/useProducts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function categoryName(
  product: Product,
  categories: ProductCategory[]
): string {
  const cat = categories.find((c) => c.id === product.categoryId);
  return cat?.name ?? "—";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProductTableProps {
  products: Product[];
  categories: ProductCategory[];
  isLoading: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (product: Product) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductTable({
  products,
  categories,
  isLoading,
  total,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
}: ProductTableProps) {
  const toggleMutation = useToggleProductStatus();
  const deleteMutation = useDeleteProduct();
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    try {
      await toggleMutation.mutateAsync(toggleTarget.id);
      setToggleTarget(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
      <div className="overflow-hidden">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="rounded-full bg-muted p-6 mb-6"
            >
              <Boxes className="h-12 w-12 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold">Không có sản phẩm</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại. Hãy thử điều
              chỉnh tìm kiếm hoặc thêm sản phẩm mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="sticky top-0 w-[40px] text-center">
                    #
                  </TableHead>
                  <TableHead className="sticky top-0 w-[70px]">Ảnh</TableHead>
                  <TableHead className="sticky top-0 min-w-[180px]">
                    Tên sản phẩm
                  </TableHead>
                  <TableHead className="sticky top-0 min-w-[110px]">
                    Mã / SKU
                  </TableHead>
                  <TableHead className="sticky top-0 min-w-[130px]">
                    Danh mục
                  </TableHead>
                  <TableHead className="sticky top-0 min-w-[200px]">
                    Đơn vị & giá
                  </TableHead>
                  <TableHead className="sticky top-0 text-center min-w-[100px]">
                    Trạng thái
                  </TableHead>
                  <TableHead className="sticky top-0 text-center w-[80px]">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => {
                  const rowNumber =
                    (currentPage - 1) * 10 + index + 1;
                  const baseUnit = product.units?.find((u) => u.isDefault);
                  const priceUnits =
                    product.units && product.units.length > 0
                      ? product.units
                      : baseUnit
                        ? [baseUnit]
                        : [];

                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group border-b transition-colors hover:bg-muted/40"
                    >
                      {/* # */}
                      <TableCell className="text-center text-muted-foreground">
                        {rowNumber}
                      </TableCell>

                      {/* Image */}
                      <TableCell>
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-9 w-9 rounded-md object-cover border bg-muted"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/40">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                      </TableCell>

                      {/* Code / SKU */}
                      <TableCell>
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-medium">
                          {product.code}
                        </span>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-sm text-muted-foreground">
                        {categoryName(product, categories)}
                      </TableCell>

                      {/* Units & Prices */}
                      <TableCell>
                        {priceUnits.length > 1 ? (
                          <div className="space-y-1">
                            {priceUnits.slice(0, 2).map((u) => (
                              <p
                                key={u.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="text-muted-foreground">
                                  {u.unitName}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(u.price)}
                                </span>
                              </p>
                            ))}
                            {priceUnits.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{priceUnits.length - 2} đơn vị khác
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm">
                            <span className="text-muted-foreground">
                              {priceUnits[0]?.unitName ?? "Cái"} ·{" "}
                            </span>
                            <span className="font-medium">
                              {priceUnits[0]
                                ? formatCurrency(priceUnits[0].price)
                                : "—"}
                            </span>
                          </p>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                          className={
                            product.isActive
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {product.isActive ? "Hoạt động" : "Ngừng"}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Thao tác"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onEdit(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={
                                product.isActive
                                  ? "text-destructive focus:text-destructive"
                                  : "focus:text-emerald-600"
                              }
                              onClick={() => setToggleTarget(product)}
                            >
                              {product.isActive ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Ngưng hoạt động
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Kích hoạt
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(product)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa sản phẩm
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Hiển thị <span className="font-medium">{products.length}</span> /{" "}
          <span className="font-medium">{total}</span> sản phẩm
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
          <span className="px-3 text-sm font-medium">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Confirm Toggle Dialog ── */}
      <AnimatePresence>
        {toggleTarget && (
          <Dialog
            open={!!toggleTarget}
            onOpenChange={(open) => !open && setToggleTarget(null)}
          >
            <DialogContent className="sm:max-w-[400px] overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      toggleTarget.isActive
                        ? "text-amber-500"
                        : "text-emerald-500"
                    }`}
                  />
                  Xác nhận {toggleTarget.isActive ? "ngưng" : "kích hoạt"} sản
                  phẩm
                </DialogTitle>
                <DialogDescription>
                  {toggleTarget.isActive
                    ? `Bạn có chắc muốn ngưng hoạt động sản phẩm "${toggleTarget.name}"? Sản phẩm sẽ không còn được bán.`
                    : `Bạn có chắc muốn kích hoạt lại sản phẩm "${toggleTarget.name}"?`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setToggleTarget(null)}
                  disabled={toggleMutation.isPending}
                >
                  Hủy
                </Button>
                <Button
                  variant={
                    toggleTarget.isActive ? "destructive" : "default"
                  }
                  className={
                    toggleTarget.isActive
                      ? "text-black"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }
                  onClick={handleConfirmToggle}
                  disabled={toggleMutation.isPending}
                >
                  {toggleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : toggleTarget.isActive ? (
                    "Ngưng hoạt động"
                  ) : (
                    "Kích hoạt"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Dialog ── */}
      <AnimatePresence>
        {deleteTarget && (
          <Dialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
          >
            <DialogContent className="sm:max-w-[400px] overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  Xác nhận xóa sản phẩm
                </DialogTitle>
                <DialogDescription>
                  Bạn có chắc muốn xóa vĩnh viễn sản phẩm{" "}
                  <strong>&quot;{deleteTarget.name}&quot;</strong>? Hành động
                  này sẽ xóa toàn bộ dữ liệu sản phẩm và ảnh liên quan trên hệ
                  thống. Thao tác này không thể hoàn tác.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    "Xóa sản phẩm"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
