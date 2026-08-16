"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  Store as StoreIcon,
  MapPin,
  Phone,
  Mail,
  FileText,
  User,
  Lock,
  Crown,
  Zap,
  Star,
  Loader2,
  CheckCircle2,
  PlusCircle,
  DollarSign,
  Gift,
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStore, useSubscriptionPlans } from "@/hooks/useAdmin";

// ── Icon Mapper ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Zap,
  Star: Star as React.ComponentType<{ className?: string }>,
};

function getPlanIcon(iconName: string | null) {
  return ICON_MAP[iconName ?? "Zap"] ?? Zap;
}

// ── Zod Schema ────────────────────────────────────────────────────────────────

const phoneRegex = /^(03|05|07|08|09)\d{8}$/;

const storeSchema = z.object({
  name: z
    .string()
    .min(1, "Tên cửa hàng không được để trống")
    .max(255, "Tên cửa hàng không quá 255 ký tự"),
  address: z.string().max(500, "Địa chỉ không quá 500 ký tự").optional(),
  phone: z.string().max(20, "Số điện thoại không quá 20 ký tự").optional(),
  email: z
    .string()
    .email("Email không đúng định dạng")
    .or(z.literal(""))
    .optional(),
  taxCode: z.string().max(50, "Mã số thuế không quá 50 ký tự").optional(),
  ownerFullName: z
    .string()
    .min(1, "Họ tên chủ sở hữu không được để trống")
    .max(255, "Họ tên không quá 255 ký tự"),
  ownerEmail: z
    .string()
    .min(1, "Email chủ sở hữu không được để trống")
    .email("Email không đúng định dạng"),
  ownerPhone: z
    .string()
    .regex(phoneRegex, "Số điện thoại không hợp lệ (VD: 0901234567)")
    .or(z.literal(""))
    .optional(),
  ownerPassword: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(128, "Mật khẩu không quá 128 ký tự"),
  subscriptionPlan: z
    .string()
    .min(1, "Vui lòng chọn gói dịch vụ"),
  subscriptionStatus: z.enum(["active", "expired", "trial"]),
  durationMonths: z.number().int().min(1, "Thời hạn ít nhất 1 tháng"),
});

type StoreFormValues = z.infer<typeof storeSchema>;

// ── Duration Options (giống phần đổi gói) ─────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 1, label: "1 tháng" },
  { value: 3, label: "3 tháng", discount: 10 },
  { value: 6, label: "6 tháng", discount: 15 },
  { value: 12, label: "12 tháng", discount: 20 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StoreFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StoreFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: StoreFormDialogProps) {
  const createMutation = useCreateStore();
  const { data: planData } = useSubscriptionPlans();
  const plans = planData ?? [];
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      taxCode: "",
      ownerFullName: "",
      ownerEmail: "",
      ownerPhone: "",
      ownerPassword: "",
      subscriptionPlan: "basic",
      subscriptionStatus: "active",
      durationMonths: 1,
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset({
        name: "",
        address: "",
        phone: "",
        email: "",
        taxCode: "",
        ownerFullName: "",
        ownerEmail: "",
        ownerPhone: "",
        ownerPassword: "",
        subscriptionPlan: "basic",
        subscriptionStatus: "active",
        durationMonths: 1,
      });
      setShowSuccess(false);
    }
  }, [open, reset]);

  const isLoading = createMutation.isPending || isSubmitting;

  const watchedPlan = watch("subscriptionPlan");
  const watchedDuration = watch("durationMonths");
  const selectedPlanObj = plans.find((p) => p.slug === watchedPlan);
  const planPrice = Number(selectedPlanObj?.price ?? 0);
  const durationOption = DURATION_OPTIONS.find(
    (d) => d.value === watchedDuration
  );
  const durationDiscount = durationOption?.discount ?? 0;
  // Miễn phí tháng đầu tiên cho cửa hàng mới chọn gói Basic
  const isBasic = watchedPlan === "basic";
  const payableMonths = Math.max(watchedDuration - (isBasic ? 1 : 0), 0);
  const totalPrice = planPrice * payableMonths * (1 - durationDiscount / 100);

  const onSubmit = async (data: StoreFormValues) => {
    try {
      await createMutation.mutateAsync({
        name: data.name,
        address: data.address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        taxCode: data.taxCode || undefined,
        ownerFullName: data.ownerFullName,
        ownerEmail: data.ownerEmail,
        ownerPhone: data.ownerPhone || undefined,
        ownerPassword: data.ownerPassword,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: data.subscriptionStatus,
        durationMonths: data.durationMonths,
      });
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
        onSuccess?.();
      }, 1200);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
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
                Tạo cửa hàng thành công!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-1 text-sm text-muted-foreground"
              >
                Tài khoản chủ sở hữu đã được tạo.
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
                  <PlusCircle className="h-5 w-5 text-violet-500" />
                  Thêm cửa hàng mới
                </DialogTitle>
                <DialogDescription>
                  Tạo cửa hàng mới cùng tài khoản chủ sở hữu trên nền tảng.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-6"
              >
                {/* ── Store Info ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-violet-100 p-1.5 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                      <StoreIcon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">
                      Thông tin cửa hàng
                    </h3>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="store-name" className="text-sm font-medium">
                      Tên cửa hàng <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <StoreIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="store-name"
                        placeholder="VD: Tạp hóa Bình Minh"
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

                  {/* Address */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="store-address"
                      className="text-sm font-medium"
                    >
                      Địa chỉ
                    </Label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="store-address"
                        placeholder="Số nhà, đường, phường/xã, quận/huyện"
                        className="pl-9"
                        {...register("address")}
                        aria-invalid={errors.address ? "true" : "false"}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.address.message}
                      </p>
                    )}
                  </div>

                  {/* Phone + Email */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="store-phone"
                        className="text-sm font-medium"
                      >
                        Số điện thoại
                      </Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="store-phone"
                          placeholder="0901234567"
                          className="pl-9"
                          {...register("phone")}
                          aria-invalid={errors.phone ? "true" : "false"}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="store-email"
                        className="text-sm font-medium"
                      >
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="store-email"
                          type="email"
                          placeholder="store@bizflow.com"
                          className="pl-9"
                          {...register("email")}
                          aria-invalid={errors.email ? "true" : "false"}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tax code */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="store-taxcode"
                      className="text-sm font-medium"
                    >
                      Mã số thuế
                    </Label>
                    <div className="relative">
                      <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="store-taxcode"
                        placeholder="0301234567"
                        className="pl-9"
                        {...register("taxCode")}
                        aria-invalid={errors.taxCode ? "true" : "false"}
                      />
                    </div>
                    {errors.taxCode && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.taxCode.message}
                      </p>
                    )}
                  </div>
                </section>

                <Separator />

                {/* ── Owner Info ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 p-1.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <User className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">Chủ sở hữu</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="owner-fullname"
                        className="text-sm font-medium"
                      >
                        Họ tên <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="owner-fullname"
                          placeholder="Nguyễn Văn A"
                          className="pl-9"
                          {...register("ownerFullName")}
                          aria-invalid={errors.ownerFullName ? "true" : "false"}
                        />
                      </div>
                      {errors.ownerFullName && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.ownerFullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="owner-email"
                        className="text-sm font-medium"
                      >
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="owner-email"
                          type="email"
                          placeholder="chu@bizflow.com"
                          className="pl-9"
                          {...register("ownerEmail")}
                          aria-invalid={errors.ownerEmail ? "true" : "false"}
                        />
                      </div>
                      {errors.ownerEmail && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.ownerEmail.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="owner-phone"
                        className="text-sm font-medium"
                      >
                        Số điện thoại
                      </Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="owner-phone"
                          placeholder="0901234567"
                          className="pl-9"
                          {...register("ownerPhone")}
                          aria-invalid={errors.ownerPhone ? "true" : "false"}
                        />
                      </div>
                      {errors.ownerPhone && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.ownerPhone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="owner-password"
                        className="text-sm font-medium"
                      >
                        Mật khẩu <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="owner-password"
                          type="password"
                          placeholder="Tối thiểu 6 ký tự"
                          className="pl-9"
                          {...register("ownerPassword")}
                          aria-invalid={errors.ownerPassword ? "true" : "false"}
                        />
                      </div>
                      {errors.ownerPassword && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.ownerPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <Separator />

                {/* ── Subscription ── */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-100 p-1.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <Zap className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold">Gói dịch vụ</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Plan */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gói</Label>
                      <Controller
                        control={control}
                        name="subscriptionPlan"
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn gói" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => {
                                const PlanIcon = getPlanIcon(plan.icon);
                                return (
                                  <SelectItem
                                    key={plan.id}
                                    value={plan.slug}
                                    disabled={!plan.isActive}
                                  >
                                    <span className="flex items-center gap-2">
                                      <PlanIcon className="h-3.5 w-3.5 text-amber-500" />
                                      {plan.name}
                                      {!plan.isActive && " (tạm dừng)"}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Trạng thái</Label>
                      <Controller
                        control={control}
                        name="subscriptionStatus"
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">
                                Đang hoạt động
                              </SelectItem>
                              <SelectItem value="trial">Dùng thử</SelectItem>
                              <SelectItem value="expired">Hết hạn</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Thời hạn đăng ký
                    </Label>
                    <Controller
                      control={control}
                      name="durationMonths"
                      render={({ field }) => (
                        <div className="grid grid-cols-4 gap-2">
                          {DURATION_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => field.onChange(opt.value)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                                field.value === opt.value
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              {opt.label}
                              {opt.discount && (
                                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                                  -{opt.discount}%
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                    {errors.durationMonths && (
                      <p className="text-xs text-red-500" role="alert">
                        {errors.durationMonths.message}
                      </p>
                    )}
                  </div>

                  {/* Cost Summary */}
                  {planPrice > 0 && (
                    <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          {selectedPlanObj?.name ?? watchedPlan} × {payableMonths}{" "}
                          tháng
                          {isBasic && watchedDuration > 1 && (
                            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              1 tháng miễn phí
                            </span>
                          )}
                        </span>
                        {durationDiscount > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Giảm {durationDiscount}%
                          </Badge>
                        )}
                      </div>

                      {isBasic && (
                        <p className="mb-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                          <Gift className="h-3.5 w-3.5" />
                          Miễn phí tháng đầu tiên cho cửa hàng mới với gói Basic
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Tổng thanh toán</span>
                        <span className="text-xl font-bold tabular-nums bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                          <DollarSign className="mr-1 inline h-4 w-4" />
                          {totalPrice === 0
                            ? "Miễn phí (0đ)"
                            : formatCurrency(totalPrice)}
                        </span>
                      </div>
                    </div>
                  )}
                </section>

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
                    className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-purple-600 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4" />
                        Tạo cửa hàng
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