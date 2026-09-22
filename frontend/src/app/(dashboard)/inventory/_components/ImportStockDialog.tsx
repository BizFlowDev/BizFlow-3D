"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Search,
  X,
  StickyNote,
  Layers,
  CheckCircle2,
  Loader2,
  ArrowDownToLine,
  Receipt,
  Coins,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventoryCatalog, useImportStock } from "@/hooks/useInventory";
import type { InventoryProduct } from "@/hooks/useInventory";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Zod Schema ────────────────────────────────────────────────────────────────

const importStockSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm"),
  productUnitId: z.string().min(1, "Vui lòng chọn đơn vị tính"),
  quantity: z
    .number({ error: "Số lượng phải lớn hơn 0" })
    .positive("Số lượng phải lớn hơn 0"),
  unitCost: z
    .number({ error: "Đơn giá nhập không hợp lệ" })
    .min(0, "Đơn giá nhập không được âm")
    .optional(),
  note: z.string().max(500, "Ghi chú không quá 500 ký tự").optional(),
});

type ImportStockFormValues = z.infer<typeof importStockSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface ImportStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sản phẩm điền sẵn (từ click ô kệ 3D) */
  preselectedProductId?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportStockDialog({
  open,
  onOpenChange,
  preselectedProductId,
}: ImportStockDialogProps) {
  const { data: catalog = [] } = useInventoryCatalog();
  const importMutation = useImportStock();
  const [productQuery, setProductQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<ImportStockFormValues>({
    resolver: zodResolver(importStockSchema),
    defaultValues: {
      productId: "",
      productUnitId: "",
      quantity: undefined,
      unitCost: undefined,
      note: "",
    },
  });

  const selectedProductId = watch("productId");
  const selectedUnitId = watch("productUnitId");
  const quantity = watch("quantity");
  const unitCost = watch("unitCost");

  const selectedProduct = useMemo(
    () => catalog.find((p) => p.id === selectedProductId) ?? null,
    [catalog, selectedProductId],
  );

  const selectedUnit = useMemo(() => {
    if (!selectedProduct) return null;
    return (
      selectedProduct.units.find((u) => u.id === selectedUnitId) ??
      selectedProduct.units[0]
    );
  }, [selectedProduct, selectedUnitId]);

  const totalAmount = useMemo(() => {
    const q =
      typeof quantity === "number" && !isNaN(quantity) && quantity > 0
        ? quantity
        : 0;
    const c =
      typeof unitCost === "number" && !isNaN(unitCost) && unitCost >= 0
        ? unitCost
        : 0;
    return q * c;
  }, [quantity, unitCost]);

  // Điền sẵn sản phẩm khi mở dialog (đặc biệt từ click ô kệ 3D)
  useEffect(() => {
    if (open) {
      setProductQuery("");
      if (preselectedProductId) {
        const product = catalog.find((p) => p.id === preselectedProductId);
        if (product) {
          const defaultUnit =
            product.units.find((u) => u.isDefault) ?? product.units[0];
          setValue("productId", product.id);
          setValue("productUnitId", defaultUnit?.id ?? "");
          setValue("unitCost", defaultUnit?.price ?? 0);
        }
      }
    }
  }, [open, preselectedProductId, catalog, setValue]);

  // Reset khi đóng
  useEffect(() => {
    if (!open) {
      reset({
        productId: preselectedProductId ?? "",
        productUnitId: "",
        quantity: undefined,
        unitCost: undefined,
        note: "",
      });
      setShowSuccess(false);
      setProductQuery("");
    }
  }, [open, preselectedProductId, reset]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return catalog.slice(0, 8);
    return catalog
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [catalog, productQuery]);

  const handleSelectProduct = (product: InventoryProduct) => {
    const defaultUnit =
      product.units.find((u) => u.isDefault) ?? product.units[0];
    setValue("productId", product.id);
    setValue("productUnitId", defaultUnit?.id ?? "");
    setValue("unitCost", defaultUnit?.price ?? 0);
    setProductQuery("");
    setListOpen(false);
    void trigger(["productId", "productUnitId", "unitCost"]);
  };

  const handleClearProduct = () => {
    setValue("productId", "");
    setValue("productUnitId", "");
    setValue("unitCost", undefined);
  };

  const onSubmit = async (data: ImportStockFormValues) => {
    try {
      await importMutation.mutateAsync({
        productId: data.productId,
        productUnitId: data.productUnitId,
        quantity: data.quantity,
        unitCost: data.unitCost,
        note: data.note || undefined,
      });
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1100);
    } catch {
      // lỗi do mutation
    }
  };

  const isLoading = importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-lg font-semibold"
              >
                Nhập kho thành công!
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <ArrowDownToLine className="h-5 w-5 text-blue-500" />
                  Nhập kho
                </DialogTitle>
                <DialogDescription>
                  Ghi nhận lượng hàng nhập thêm vào kho.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-5"
              >
                {/* Chọn sản phẩm */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Sản phẩm <span className="text-red-500">*</span>
                  </Label>
                  {selectedProduct ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background">
                          <Package className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {selectedProduct.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-muted-foreground">
                              {selectedProduct.code}
                            </p>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className={`text-xs font-medium ${
                              selectedProduct.currentStock <= 0
                                ? "text-red-500"
                                : selectedProduct.currentStock < 10
                                ? "text-amber-500"
                                : "text-emerald-500"
                            }`}>
                              Tồn: {selectedProduct.currentStock}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={handleClearProduct}
                        aria-label="Bỏ chọn sản phẩm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={productQuery}
                          onChange={(e) => {
                            setProductQuery(e.target.value);
                            setListOpen(true);
                          }}
                          onFocus={() => setListOpen(true)}
                          onBlur={() =>
                            setTimeout(() => setListOpen(false), 150)
                          }
                          placeholder="Tìm theo tên hoặc mã sản phẩm..."
                          className="pl-9"
                          aria-label="Tìm sản phẩm để nhập kho"
                          aria-invalid={errors.productId ? "true" : "false"}
                        />
                      </div>
                      {listOpen && filteredProducts.length > 0 && (
                        <ul className="mt-2 max-h-52 overflow-auto rounded-md border bg-popover p-1 shadow-lg">
                          {filteredProducts.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSelectProduct(p)}
                                className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left hover:bg-accent"
                              >
                                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {p.name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p className="font-mono text-xs text-muted-foreground">
                                      {p.code}
                                    </p>
                                    <span className="text-xs text-muted-foreground">·</span>
                                    <span className={`text-xs font-medium ${
                                      p.currentStock <= 0
                                        ? "text-red-500"
                                        : p.currentStock < 10
                                        ? "text-amber-500"
                                        : "text-emerald-500"
                                    }`}>
                                      Tồn: {p.currentStock}
                                    </span>
                                  </div>
                                </div>
                                {p.units.length > 1 && (
                                  <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    {p.units.length} đơn vị
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {listOpen && productQuery && filteredProducts.length === 0 && (
                        <div className="mt-2 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                          Không tìm thấy sản phẩm phù hợp
                        </div>
                      )}
                      {listOpen && !productQuery && filteredProducts.length === 0 && (
                        <div className="mt-2 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                          <p>Chưa có sản phẩm nào.</p>
                          <p className="mt-1">
                            Vui lòng tạo sản phẩm tại trang{" "}
                            <a href="/products" className="text-blue-500 underline hover:text-blue-600">
                              Quản lý sản phẩm
                            </a>
                          </p>
                        </div>
                      )}
                      {errors.productId && (
                        <p className="mt-1 text-xs text-red-500" role="alert">
                          {errors.productId.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Đơn vị tính & Đơn giá nhập */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Đơn vị tính */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Đơn vị tính <span className="text-red-500">*</span>
                    </Label>
                    {selectedProduct && selectedProduct.units.length > 1 ? (
                      <Select
                        value={selectedUnitId || undefined}
                        onValueChange={(v) => {
                          setValue("productUnitId", v);
                          const unit = selectedProduct.units.find((u) => u.id === v);
                          if (unit) {
                            setValue("unitCost", unit.price);
                          }
                          void trigger(["productUnitId", "unitCost"]);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn đơn vị" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProduct.units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <span>{u.unitName}</span>
                                {!u.isDefault && (
                                  <span className="text-xs text-muted-foreground">
                                    (x{u.conversionFactor})
                                  </span>
                                )}
                                {u.isDefault && (
                                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/20 px-3">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {selectedProduct?.units[0]?.unitName ?? "Cái"}
                        </span>
                      </div>
                    )}
                    {errors.productUnitId && (
                      <p className="mt-1 text-xs text-red-500" role="alert">
                        {errors.productUnitId.message}
                      </p>
                    )}
                  </div>

                  {/* Đơn giá nhập */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="import-unit-cost" className="text-sm font-medium">
                        Giá nhập ({selectedUnit?.unitName ?? "đơn vị"})
                      </Label>
                      {typeof unitCost === "number" && unitCost > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(unitCost)}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="import-unit-cost"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Nhập giá nhập..."
                        className="pl-9 tabular-nums"
                        {...register("unitCost", { valueAsNumber: true })}
                        aria-invalid={errors.unitCost ? "true" : "false"}
                      />
                    </div>
                    {errors.unitCost && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.unitCost.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Số lượng */}
                <div className="space-y-2">
                  <Label htmlFor="import-quantity" className="text-sm font-medium">
                    Số lượng nhập <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="import-quantity"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Nhập số lượng..."
                    className="tabular-nums"
                    {...register("quantity", { valueAsNumber: true })}
                    aria-invalid={errors.quantity ? "true" : "false"}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>

                {/* Card Tổng tiền thanh toán */}
                <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-primary/5 to-cyan-500/10 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Receipt className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Tổng tiền thanh toán
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-blue-500/30 bg-blue-500/10 text-[11px] font-normal text-blue-600 dark:text-blue-400"
                    >
                      Hạch toán Nợ 156 / Có 331
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between border-t border-border/40 pt-2.5">
                    <span className="text-xs text-muted-foreground">
                      {quantity && quantity > 0
                        ? `${quantity} ${selectedUnit?.unitName ?? "đơn vị"}`
                        : "0 đơn vị"}{" "}
                      × {formatCurrency(unitCost || 0)}
                    </span>
                    <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Ghi chú */}
                <div className="space-y-2">
                  <Label htmlFor="import-note" className="text-sm font-medium">
                    Ghi chú
                  </Label>
                  <div className="relative">
                    <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="import-note"
                      placeholder="Ghi chú lô hàng, nhà cung cấp..."
                      className="min-h-[64px] pl-9 resize-none"
                      {...register("note")}
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="h-4 w-4" />
                        Nhập kho
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}