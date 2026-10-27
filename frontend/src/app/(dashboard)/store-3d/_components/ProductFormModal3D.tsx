"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Package,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Sparkles,
  Layers,
  Coins,
  Barcode,
  Image as ImageIcon,
  StickyNote,
} from "lucide-react";
import { Modal3DCard } from "./Modal3DCard";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategoryList,
  type Product,
  type ProductCategory,
} from "@/hooks/useProducts";
import { ImageUpload } from "@/components/ui/image-upload";
import { useQueryClient } from "@tanstack/react-query";

interface ProductFormModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

const optionalPositiveNumberSchema = (errorMsg: string) =>
  z.union([z.number().positive(errorMsg), z.nan()]).optional();

const unitSchema = z.object({
  id: z.string().optional(),
  unitName: z.string().max(50, "Tên đơn vị không quá 50 ký tự").optional(),
  conversionFactor: optionalPositiveNumberSchema("Hệ số quy đổi phải lớn hơn 0"),
  price: optionalPositiveNumberSchema("Giá phải lớn hơn 0"),
  isDefault: z.boolean().optional(),
});

const productFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Tên sản phẩm không được để trống")
      .max(255, "Tên sản phẩm không quá 255 ký tự"),
    code: z
      .string()
      .min(1, "Mã SKU không được để trống")
      .max(100, "Mã SKU không quá 100 ký tự"),
    categoryId: z.string().optional(),
    description: z.string().max(1000, "Mô tả không quá 1000 ký tự").optional(),
    imageUrl: z.string().nullish().or(z.literal("")),
    hasMultipleUnits: z.boolean(),
    singlePrice: optionalPositiveNumberSchema("Giá phải lớn hơn 0"),
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
            message: "Tên đơn vị không để trống",
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
            message: "Hệ số phải > 0",
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
            message: "Giá phải > 0",
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
          message: "Giá niêm yết phải > 0",
        });
      }
    }
  });

type ProductFormValues = z.infer<typeof productFormSchema>;

const EMPTY_CATEGORIES: ProductCategory[] = [];

export function ProductFormModal3D({
  isOpen,
  onClose,
  product,
}: ProductFormModal3DProps) {
  const isEdit = !!product;
  const queryClient = useQueryClient();
  const { data: categories = EMPTY_CATEGORIES } = useCategoryList();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      code: "",
      categoryId: undefined,
      description: "",
      imageUrl: "",
      hasMultipleUnits: false,
      singlePrice: 100000,
      units: [{ unitName: "Cái", conversionFactor: 1, price: 100000, isDefault: true }],
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;

  const hasMultipleUnits = watch("hasMultipleUnits");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "units",
  });

  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      const units = product.units || [];
      const isMulti = units.length > 1;
      const defaultUnit = units.find((u) => u.isDefault) || units[0];

      reset({
        name: product.name,
        code: product.code,
        categoryId: product.categoryId || undefined,
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        hasMultipleUnits: isMulti,
        singlePrice: defaultUnit?.price ? Number(defaultUnit.price) : 100000,
        units: isMulti
          ? units.map((u) => ({
              id: u.id,
              unitName: u.unitName,
              conversionFactor: Number(u.conversionFactor),
              price: Number(u.price),
              isDefault: u.isDefault,
            }))
          : [{ unitName: "Cái", conversionFactor: 1, price: 100000, isDefault: true }],
      });
    } else {
      reset({
        name: "",
        code: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        categoryId: categories.length > 0 ? categories[0].id : undefined,
        description: "",
        imageUrl: "",
        hasMultipleUnits: false,
        singlePrice: 100000,
        units: [{ unitName: "Cái", conversionFactor: 1, price: 100000, isDefault: true }],
      });
    }
    setShowSuccess(false);
  }, [isOpen, product, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const units = values.hasMultipleUnits
        ? (values.units || []).map((u) => ({
            id: u.id || undefined,
            unitName: u.unitName || "Đơn vị",
            conversionFactor: Number(u.conversionFactor) || 1,
            price: Number(u.price) || 0,
            isDefault: u.isDefault ?? false,
          }))
        : [
            {
              id: values.units?.[0]?.id || undefined,
              unitName: values.units?.[0]?.unitName || "Cái",
              conversionFactor: 1,
              price: Number(values.singlePrice) || 0,
              isDefault: true,
            },
          ];

      if (isEdit && product) {
        await updateProduct.mutateAsync({
          id: product.id,
          data: {
            name: values.name,
            code: values.code,
            categoryId: values.categoryId || undefined,
            description: values.description || undefined,
            imageUrl: values.imageUrl || null,
            hasMultipleUnits: values.hasMultipleUnits,
            units,
          },
        });
        setSuccessMsg(`Đã cập nhật thông số "${values.name}"`);
      } else {
        await createProduct.mutateAsync({
          name: values.name,
          code: values.code,
          categoryId: values.categoryId || undefined,
          description: values.description || undefined,
          imageUrl: values.imageUrl || null,
          hasMultipleUnits: values.hasMultipleUnits,
          units,
        });
        setSuccessMsg(`Đã lưu sản phẩm mới "${values.name}" vào WMS 3D`);
      }

      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch {
      // error handled by react-query
    }
  };

  if (!isOpen) return null;

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:justify-end sm:pr-10 md:pr-14 p-4 overflow-hidden animate-in fade-in duration-300">
      <div
        className="pointer-events-auto fixed inset-0 -z-10 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-auto w-full max-w-xl">
        <Modal3DCard
          className="w-full my-auto border-sky-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.22)]"
          accentGlowColor="rgba(56, 189, 248, 0.45)"
          isFloating={true}
          showTechCorners={true}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-sky-400/20 bg-slate-950/85 px-5 py-3 text-[11px]"
            style={{ transform: "translateZ(30px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider uppercase text-sky-400 text-[11px]">
                  {isEdit ? "CẬP NHẬT THÔNG SỐ VẬT TƯ 3D" : "THIẾT LẬP SẢN PHẨM MỚI 3D"}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Trạm Bàn Kiểm Hàng &bull; Soát Mã WMS
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Đóng bàn kiểm hàng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form Content */}
          <div
            className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-sky-500/40 bg-sky-950/40 backdrop-blur-md animate-in zoom-in-95 duration-200">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-sky-500/30 blur-lg animate-pulse" />
                  <CheckCircle2 className="relative h-14 w-14 text-sky-400" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">Thao Tác Thành Công!</h3>
                <p className="text-xs text-sky-200/80 mt-1">{successMsg}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-sky-300 bg-sky-900/60 px-3 py-1 rounded-full border border-sky-500/30">
                  <Package className="h-3.5 w-3.5" />
                  <span>Dữ liệu đã đồng bộ lên kệ 3D realtime</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Tên & Mã SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-sky-400" />
                      <span>Tên sản phẩm / Kiện hàng:</span>
                    </label>
                    <input
                      type="text"
                      {...form.register("name")}
                      placeholder="VD: Cà phê Rang Xay Cầu Đất..."
                      className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                    />
                    {errors.name && (
                      <p className="text-[10px] text-red-400">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Barcode className="h-3.5 w-3.5 text-sky-400" />
                      <span>Mã SKU / Barcode:</span>
                    </label>
                    <input
                      type="text"
                      {...form.register("code")}
                      placeholder="SKU-XXXX"
                      className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-mono font-semibold text-sky-300 focus:border-sky-400 focus:outline-none uppercase"
                    />
                    {errors.code && (
                      <p className="text-[10px] text-red-400">{errors.code.message}</p>
                    )}
                  </div>
                </div>

                {/* Danh mục & Ảnh sản phẩm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-sky-400" />
                      <span>Phân loại danh mục:</span>
                    </label>
                    <select
                      {...form.register("categoryId")}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                    >
                      <option value="" className="bg-slate-900 text-slate-400">
                        -- Chưa phân loại --
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
                      <span>Hình ảnh kiện hàng:</span>
                    </label>
                    <Controller
                      name="imageUrl"
                      control={control}
                      render={({ field }) => (
                        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2">
                          <ImageUpload
                            value={field.value || undefined}
                            onChange={(url) => field.onChange(url)}
                            onRemove={() => field.onChange("")}
                          />
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Đơn vị tính & Giá niêm yết */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-sky-400" />
                      <span className="text-xs font-bold text-white">Cấu hình Đơn vị tính & Đơn giá</span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={hasMultipleUnits}
                        onChange={(e) => setValue("hasMultipleUnits", e.target.checked)}
                        className="rounded border-white/20 bg-slate-800 text-sky-500 focus:ring-sky-400"
                      />
                      <span>Đa đơn vị (Thùng/Hộp/Kiện)</span>
                    </label>
                  </div>

                  {!hasMultipleUnits ? (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Đơn vị cơ sở:</label>
                        <input
                          type="text"
                          value="Cái"
                          disabled
                          className="w-full rounded-xl border border-white/5 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-400 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400">Đơn giá bán (VNĐ):</label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          {...form.register("singlePrice", { valueAsNumber: true })}
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono font-bold focus:border-sky-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/70 p-2"
                        >
                          <input
                            type="text"
                            placeholder="Tên đơn vị (Hộp, Thùng)"
                            {...form.register(`units.${index}.unitName`)}
                            className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white focus:border-sky-400 focus:outline-none"
                          />
                          <div className="flex items-center gap-1 w-28">
                            <span className="text-[10px] text-slate-400">x</span>
                            <input
                              type="number"
                              min={1}
                              placeholder="Hệ số"
                              {...form.register(`units.${index}.conversionFactor`, {
                                valueAsNumber: true,
                              })}
                              className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs font-mono text-white text-center focus:border-sky-400 focus:outline-none"
                            />
                          </div>
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            placeholder="Giá (VNĐ)"
                            {...form.register(`units.${index}.price`, {
                              valueAsNumber: true,
                            })}
                            className="w-32 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs font-mono text-right text-sky-300 font-semibold focus:border-sky-400 focus:outline-none"
                          />
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          append({ unitName: "", conversionFactor: 10, price: 500000, isDefault: false })
                        }
                        className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 pt-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Thêm quy cách đơn vị mới</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Mô tả / Quy cách */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <StickyNote className="h-3.5 w-3.5 text-sky-400" />
                    <span>Mô tả thông số kỹ thuật / Vị trí bảo quản:</span>
                  </label>
                  <textarea
                    rows={2}
                    {...form.register("description")}
                    placeholder="VD: Bảo quản nơi khô ráo, chịu tải kệ hàng tối đa 100 kiện..."
                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 p-3 text-center font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-2">
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>Đang đồng bộ hóa kho 3D...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-white" />
                        <span>{isEdit ? "CẬP NHẬT KIỆN HÀNG 3D" : "LƯU SẢN PHẨM MỚI VÀO KHO 3D"}</span>
                      </>
                    )}
                  </div>
                </button>
              </form>
            )}
          </div>
        </Modal3DCard>
      </div>
    </div>
  );
}
