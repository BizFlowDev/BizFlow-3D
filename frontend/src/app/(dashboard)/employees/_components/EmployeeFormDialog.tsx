"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  CheckCircle2,
  UserPlus,
  Send,
  AlertTriangle,
  Crown,
  ShieldAlert,
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
import { useCreateEmployee } from "@/hooks/useEmployees";
import { useCurrentStore, useStoreSubscriptionPlans } from "@/hooks/useStore";
import { useToast } from "@/components/ui/toast";
import { UpgradePlanModal } from "@/components/shared/UpgradePlanModal";
import { cn } from "@/lib/utils";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const employeeSchema = z.object({
  fullName: z
    .string()
    .min(1, "Họ tên không được để trống")
    .max(255, "Họ tên không được vượt quá 255 ký tự"),
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không đúng định dạng"),
  phone: z
    .string()
    .regex(
      /^(03|05|07|08|09)\d{8}$/,
      "Số điện thoại không hợp lệ (VD: 0901234567)"
    )
    .or(z.literal(""))
    .optional(),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .max(128, "Mật khẩu không quá 128 ký tự"),
  sendEmail: z.boolean().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmployeeCount?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmployeeFormDialog({
  open,
  onOpenChange,
  currentEmployeeCount,
}: EmployeeFormDialogProps) {
  const createMutation = useCreateEmployee();
  const { data: store } = useCurrentStore();
  const { data: plans } = useStoreSubscriptionPlans();
  const { showToast } = useToast();

  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Tính toán giới hạn nhân viên theo gói dịch vụ
  const currentPlan = plans?.find((p) => p.slug === store?.subscriptionPlan);
  const maxEmployees = currentPlan?.maxEmployees ?? 1;
  const isLimitReached =
    currentEmployeeCount !== undefined && currentEmployeeCount >= maxEmployees;
  const isExpired =
    store?.subscriptionStatus === "expired" ||
    Boolean(
      store?.subscriptionExpiresAt &&
      new Date(store.subscriptionExpiresAt) < new Date()
    );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      sendEmail: false,
    },
  });

  const sendEmail = watch("sendEmail");

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset({ fullName: "", email: "", phone: "", password: "", sendEmail: false });
      setShowSuccess(false);
      setErrorMessage(null);
    }
  }, [open, reset]);

  const isLoading = createMutation.isPending;

  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      setErrorMessage(null);
      await createMutation.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        sendEmail: data.sendEmail,
      });
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Có lỗi xảy ra khi tạo nhân viên";
      setErrorMessage(msg);
      showToast("error", "Không thể tạo nhân viên", msg);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
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
                  Tạo nhân viên thành công!
                </motion.p>
                {sendEmail && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    Email thông báo đã được gửi đi.
                  </motion.p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                      Thêm nhân viên
                    </DialogTitle>
                    {currentEmployeeCount !== undefined && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 text-xs font-mono font-semibold px-2.5 py-1 border shadow-xs transition-colors",
                          isLimitReached
                            ? "border-red-500/40 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                            : "border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        )}
                      >
                        <span>
                          {currentEmployeeCount}/{maxEmployees} người
                        </span>
                        {isLimitReached && (
                          <span className="rounded bg-red-200/80 px-1 py-0.2 text-[10px] font-bold text-red-800 dark:bg-red-900/80 dark:text-red-200 uppercase">
                            Đầy
                          </span>
                        )}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription>
                    Tạo tài khoản nhân viên mới cho cửa hàng theo hạn mức gói dịch vụ.
                  </DialogDescription>
                </DialogHeader>

                {/* Cảnh báo gói hết hạn */}
                {isExpired && (
                  <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Gói dịch vụ đã hết hạn</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Vui lòng nâng cấp hoặc gia hạn gói dịch vụ để tiếp tục thêm nhân viên mới.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setUpgradeModalOpen(true)}
                      className="shrink-0 h-7 gap-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      Gia hạn ngay
                    </Button>
                  </div>
                )}

                {/* Cảnh báo đã đạt giới hạn nhân viên */}
                {!isExpired && isLimitReached && (
                  <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <p className="font-semibold">Đã đạt giới hạn nhân viên ({currentEmployeeCount}/{maxEmployees})</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Gói <strong>{currentPlan?.name || store?.subscriptionPlan || "Basic"}</strong> chỉ cho phép tối đa {maxEmployees} nhân viên.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setUpgradeModalOpen(true)}
                      className="shrink-0 h-7 gap-1 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      Nâng cấp gói
                    </Button>
                  </div>
                )}

                {/* Thông báo lỗi từ server */}
                {errorMessage && (
                  <div className="mt-4 space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="font-medium leading-relaxed">{errorMessage}</div>
                    </div>
                    {(errorMessage.toLowerCase().includes("gói") ||
                      errorMessage.toLowerCase().includes("nâng cấp")) && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setUpgradeModalOpen(true)}
                          className="w-full gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-xs"
                        >
                          <Crown className="h-3.5 w-3.5" />
                          Nâng cấp gói ngay
                        </Button>
                      )}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-5 space-y-5"
                >
                  {/* Two-column grid for name + email */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="emp-fullname" className="text-sm font-medium">
                        Họ tên <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="emp-fullname"
                          placeholder="Nguyễn Văn A"
                          className="pl-9"
                          disabled={isLimitReached || isExpired}
                          {...register("fullName")}
                          aria-invalid={errors.fullName ? "true" : "false"}
                        />
                      </div>
                      {errors.fullName && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.fullName.message}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="emp-email" className="text-sm font-medium">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="emp-email"
                          type="email"
                          placeholder="nhanvien@bizflow.com"
                          className="pl-9"
                          disabled={isLimitReached || isExpired}
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

                  {/* Two-column grid for phone + password */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="emp-phone" className="text-sm font-medium">
                        Số điện thoại
                      </Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="emp-phone"
                          placeholder="0901234567"
                          className="pl-9"
                          disabled={isLimitReached || isExpired}
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

                    {/* Password */}
                    <div className="space-y-2">
                      <Label htmlFor="emp-password" className="text-sm font-medium">
                        Mật khẩu tạm thời <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="emp-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          disabled={isLimitReached || isExpired}
                          {...register("password")}
                          aria-invalid={errors.password ? "true" : "false"}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-xs text-red-500" role="alert">
                          {errors.password.message}
                        </p>
                      )}
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
                      disabled={isLoading || isLimitReached || isExpired}
                      className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tạo...
                        </>
                      ) : (
                        "Tạo nhân viên"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Modal Nâng cấp gói dịch vụ */}
      <UpgradePlanModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </>
  );
}
