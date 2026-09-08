"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Tag,
  Layers,
  StickyNote,
  Image as ImageIcon,
  Coins,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  PackagePlus,
  Pencil,
  AlertCircle,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategoryList,
  useCreateCategory,
} from "@/hooks/useProducts";
import type { Product } from "@/hooks/useProducts";
import { ImageUpload } from "@/components/ui/image-upload";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const unitSchema = z.object({
  unitName: z
    .string()
    .max(50, "Tên đơn vị không quá 50 ký tự")
    .optional(),
  conversionFactor: z
    .number({ error: "Hệ số quy đổi phải lớn hơn 0" })
    .positive("Hệ số quy đổi phải lớn hơn 0")
    .optional(),
  price: z
    .number({ error: "Giá phải lớn hơn 0" })
    .positive("Giá phải lớn hơn 0")
    .optional(),
});

const productFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Tên sản phẩm không được để trống")
      .max(255, "Tên sản phẩm không quá 255 ký tự"),
    code: z
      .string()
      .min(1, "Mã sản phẩm không được để trống")
      .max(100, "Mã sản phẩm không quá 100 ký tự"),
    categoryId: z.string().optional(),
    description: z.string().max(1000, "Mô tả không quá 1000 ký tự").optional(),
    imageUrl: z
      .string()
      .nullish()
      .or(z.literal("")),
    hasMultipleUnits: z.boolean(),
    singlePrice: z
      .number({ error: "Giá phải lớn hơn 0" })
      .positive("Giá phải lớn hơn 0")
      .optional(),
    units: z.array(unitSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasMultipleUnits) {
      if (!data.units || data.units.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["units"],
          message: "Phải có ít nhất 1 đơn vị tính",
        });
      }
      data.units?.forEach((u, index) => {
        if (!u.unitName || !u.unitName.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["units", index, "unitName"],
            message: "Tên đơn vị không được để trống",
          });
        }
        if (
          u.conversionFactor === undefined ||
          u.conversionFactor === null ||
          isNaN(u.conversionFactor) ||
          u.conversionFactor <= 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["units", index, "conversionFactor"],
            message: "Hệ số quy đổi phải lớn hơn 0",
          });
        }
        if (
          u.price === undefined ||
          u.price === null ||
          isNaN(u.price) ||
          u.price <= 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["units", index, "price"],
            message: "Giá phải lớn hơn 0",
          });
        }
      });
    } else {
      if (
        data.singlePrice === undefined ||
        data.singlePrice === null ||
        isNaN(data.singlePrice) ||
        data.singlePrice <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["singlePrice"],
          message: "Giá phải lớn hơn 0",
        });
      }
    }
  });

type ProductFormValues = z.infer<typeof productFormSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null; // null = create mode, Product = edit mode
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: ProductFormDialogProps) {
  const isEdit = !!product;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: categories = [] } = useCategoryList();
  const createCategoryMutation = useCreateCategory();
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Quick Category Add State
  const [quickCatOpen, setQuickCatOpen] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");
  const [quickCatDesc, setQuickCatDesc] = useState("");
  const [quickCatLoading, setQuickCatLoading] = useState(false);
  const [quickCatError, setQuickCatError] = useState("");

  const handleQuickCreateCategory = async () => {
    const trimmed = quickCatName.trim();
    if (!trimmed) {
      setQuickCatError("Vui lòng nhập tên danh mục");
      return;
    }

    setQuickCatLoading(true);
    setQuickCatError("");
    try {
      const newCat = await createCategoryMutation.mutateAsync({
        name: trimmed,
        description: quickCatDesc.trim() || undefined,
      });
      setValue("categoryId", newCat.id);
      setQuickCatOpen(false);
      setQuickCatName("");
      setQuickCatDesc("");
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Không thể tạo danh mục";
      setQuickCatError(msg);
    } finally {
      setQuickCatLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      code: "",
      categoryId: "all",
      description: "",
      imageUrl: "",
      hasMultipleUnits: false,
      singlePrice: undefined,
      units: [{ unitName: "", conversionFactor: 1, price: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "units",
  });

  const hasMultipleUnits = watch("hasMultipleUnits");

  // Populate form when editing / reset when closed
  useEffect(() => {
    if (product && open) {
      const baseUnit = product.units?.[0];
      reset({
        name: product.name,
        code: product.code,
        categoryId: product.categoryId || "all",
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        hasMultipleUnits: product.hasMultipleUnits,
        singlePrice: baseUnit?.price,
        units: (product.units ?? []).map((u) => ({
          unitName: u.unitName,
          conversionFactor: u.conversionFactor,
          price: u.price,
        })),
      });
      setSubmitError(null);
    } else if (!open) {
      reset({
        name: "",
        code: "",
        categoryId: "all",
        description: "",
        imageUrl: "",
        hasMultipleUnits: false,
        singlePrice: undefined,
        units: [{ unitName: "", conversionFactor: 1, price: undefined }],
      });
      setShowSuccess(false);
      setSubmitError(null);
    }
  }, [product, open, reset]);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onInvalid = (formErrors: unknown) => {
    console.warn("[ProductFormDialog] Validation failed:", formErrors);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setSubmitError(null);
    const units = data.hasMultipleUnits
      ? (data.units ?? []).map((u, i) => ({
          unitName: u.unitName || "Đơn vị",
          conversionFactor: u.conversionFactor ?? 1,
          price: u.price ?? 0,
          isDefault: i === 0,
        }))
      : [
          {
            unitName: "Cái",
            conversionFactor: 1,
            price: data.singlePrice ?? 0,
            isDefault: true,
          },
        ];

    const payload = {
      name: data.name,
      code: data.code,
      categoryId: data.categoryId === "all" ? undefined : data.categoryId,
      description: data.description || undefined,
      imageUrl: data.imageUrl || null,
      units,
    };

    try {
      if (isEdit && product) {
        await updateMutation.mutateAsync({ id: product.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1200);
    } catch (err: unknown) {
      console.error("[ProductFormDialog] Submit error:", err);
      let message = "Có lỗi xảy ra khi lưu sản phẩm. Vui lòng thử lại.";
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
      ) {
        message = (err as { response: { data: { message: string } } }).response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setSubmitError(message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
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
                {isEdit
                  ? "Cập nhật thành công!"
                  : "Tạo sản phẩm thành công!"}
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
                  {isEdit ? (
                    <>
                      <Pencil className="h-5 w-5 text-blue-500" />
                      Chỉnh sửa sản phẩm
                    </>
                  ) : (
                    <>
                      <PackagePlus className="h-5 w-5 text-blue-500" />
                      Thêm sản phẩm
                    </>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {isEdit
                    ? "Cập nhật thông tin sản phẩm."
                    : "Tạo sản phẩm mới trong cửa hàng."}
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit, onInvalid)}
                className="mt-6 space-y-5"
              >
                {/* Name + Code */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="product-name" className="text-sm font-medium">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="product-name"
                        placeholder="Áo thun cotton"
                        className="pl-9"
                        {...register("name")}
                        aria-invalid={errors.name ? "true" : "false"}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Code / SKU */}
                  <div className="space-y-2">
                    <Label htmlFor="product-code" className="text-sm font-medium">
                      Mã sản phẩm (SKU) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="product-code"
                        placeholder="SP-001"
                        className="pl-9"
                        {...register("code")}
                        aria-invalid={errors.code ? "true" : "false"}
                      />
                    </div>
                    {errors.code && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.code.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="product-category" className="text-sm font-medium">
                      Danh mục
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCatError("");
                        setQuickCatName("");
                        setQuickCatDesc("");
                        setQuickCatOpen(true);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm danh mục mới
                    </button>
                  </div>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="product-category" className="w-full">
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Không có danh mục</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2 w-full min-w-0">
                  <Label className="text-sm font-medium">
                    Hình ảnh sản phẩm
                  </Label>
                  <Controller
                    control={control}
                    name="imageUrl"
                    render={({ field }) => (
                      <ImageUpload
                        value={field.value}
                        onChange={(url) => field.onChange(url)}
                        onRemove={() => field.onChange("")}
                        disabled={isLoading}
                      />
                    )}
                  />
                  {errors.imageUrl && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.imageUrl.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="product-desc" className="text-sm font-medium">
                    Mô tả
                  </Label>
                  <div className="relative">
                    <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="product-desc"
                      placeholder="Mô tả sản phẩm..."
                      className="min-h-[70px] pl-9 resize-none"
                      {...register("description")}
                    />
                  </div>
                </div>

                {/* Multiple units toggle */}
                <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Nhiều đơn vị tính
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ví dụ: Cái, Lố (10 cái), Thùng (20 cái)
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="product-multi-units"
                    checked={hasMultipleUnits}
                    onCheckedChange={(val) => {
                      setValue("hasMultipleUnits", val, {
                        shouldValidate: true,
                      });
                    }}
                  />
                </div>

                {/* Price section */}
                {hasMultipleUnits ? (
                  /* ── Dynamic unit rows ── */
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Đơn vị tính & giá <span className="text-red-500">*</span>
                    </Label>
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <motion.div
                          key={field.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <div className="space-y-1.5">
                            <Label
                              htmlFor={`unit-name-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              Tên đơn vị
                            </Label>
                            <Input
                              id={`unit-name-${index}`}
                              placeholder="Cái"
                              className="h-8"
                              {...register(`units.${index}.unitName`)}
                              aria-invalid={
                                errors.units?.[index]?.unitName
                                  ? "true"
                                  : "false"
                              }
                            />
                            {errors.units?.[index]?.unitName && (
                              <p
                                className="text-xs text-red-500"
                                role="alert"
                              >
                                {errors.units[index].unitName.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor={`unit-factor-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              Hệ số quy đổi
                            </Label>
                            <Input
                              id={`unit-factor-${index}`}
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="1"
                              className="h-8"
                              {...register(`units.${index}.conversionFactor`, {
                                valueAsNumber: true,
                              })}
                              aria-invalid={
                                errors.units?.[index]?.conversionFactor
                                  ? "true"
                                  : "false"
                              }
                            />
                            {errors.units?.[index]?.conversionFactor && (
                              <p
                                className="text-xs text-red-500"
                                role="alert"
                              >
                                {errors.units[index].conversionFactor.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor={`unit-price-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              Giá (VNĐ)
                            </Label>
                            <Input
                              id={`unit-price-${index}`}
                              type="number"
                              min="1"
                              placeholder="150000"
                              className="h-8"
                              {...register(`units.${index}.price`, {
                                valueAsNumber: true,
                              })}
                              aria-invalid={
                                errors.units?.[index]?.price ? "true" : "false"
                              }
                            />
                            {errors.units?.[index]?.price && (
                              <p
                                className="text-xs text-red-500"
                                role="alert"
                              >
                                {errors.units[index].price.message}
                              </p>
                            )}
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => remove(index)}
                              disabled={fields.length <= 1}
                              aria-label="Xóa đơn vị"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {errors.units && typeof errors.units.message === "string" && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.units.message}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          unitName: "",
                          conversionFactor: 1,
                          price: undefined,
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Thêm đơn vị
                    </Button>
                  </div>
                ) : (
                  /* ── Single price ── */
                  <div className="space-y-2">
                    <Label htmlFor="product-price" className="text-sm font-medium">
                      Giá bán <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="product-price"
                        type="number"
                        min="1"
                        placeholder="150000"
                        className="pl-9 pr-12"
                        {...register("singlePrice", {
                          valueAsNumber: true,
                        })}
                        aria-invalid={
                          errors.singlePrice ? "true" : "false"
                        }
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        VNĐ
                      </span>
                    </div>
                    {errors.singlePrice && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.singlePrice.message}
                      </p>
                    )}
                  </div>
                )}

                {submitError && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

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
                    className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : isEdit ? (
                      "Cập nhật"
                    ) : (
                      "Lưu sản phẩm"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
      </Dialog>

      {/* ── Quick Add Category Modal ── */}
      <Dialog open={quickCatOpen} onOpenChange={setQuickCatOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Tag className="h-4 w-4 text-blue-500" />
              Thêm danh mục mới
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tạo danh mục mới để gán ngay cho sản phẩm này.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Tên danh mục <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="VD: Cà phê, Nước ngọt..."
                value={quickCatName}
                onChange={(e) => {
                  setQuickCatName(e.target.value);
                  if (quickCatError) setQuickCatError("");
                }}
                autoFocus
              />
              {quickCatError && (
                <p className="text-xs text-red-500">{quickCatError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mô tả (tùy chọn)</Label>
              <Input
                placeholder="Mô tả danh mục..."
                value={quickCatDesc}
                onChange={(e) => setQuickCatDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setQuickCatOpen(false)}
              disabled={quickCatLoading}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={quickCatLoading}
              onClick={handleQuickCreateCategory}
              className="gap-1.5"
            >
              {quickCatLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tạo & Chọn luôn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
