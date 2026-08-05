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

// ── Zod Schema ────────────────────────────────────────────────────────────────

const importStockSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm"),
  productUnitId: z.string().min(1, "Vui lòng chọn đơn vị tính"),
  quantity: z
    .number({ error: "Số lượng phải lớn hơn 0" })
    .positive("Số lượng phải lớn hơn 0"),
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
      note: "",
    },
  });

  const selectedProductId = watch("productId");
  const selectedUnitId = watch("productUnitId");
  const selectedProduct = useMemo(
    () => catalog.find((p) => p.id === selectedProductId) ?? null,
    [catalog, selectedProductId],
  );

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
    setProductQuery("");
    setListOpen(false);
    void trigger(["productId", "productUnitId"]);
  };

  const handleClearProduct = () => {
    setValue("productId", "");
    setValue("productUnitId", "");
  };

  const onSubmit = async (data: ImportStockFormValues) => {
    try {
      await importMutation.mutateAsync({
        productId: data.productId,
        productUnitId: data.productUnitId,
        quantity: data.quantity,
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
                          <p className="font-mono text-xs text-muted-foreground">
                            {selectedProduct.code}
                          </p>
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
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {p.name}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {p.code}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {errors.productId && (
                        <p className="mt-1 text-xs text-red-500" role="alert">
                          {errors.productId.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>

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
                        void trigger("productUnitId");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn đơn vị" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct.units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.unitName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
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