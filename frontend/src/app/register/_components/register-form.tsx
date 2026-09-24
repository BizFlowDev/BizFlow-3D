"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  Mail,
  Lock,
  User,
  Store,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type { AxiosError } from "axios";
import type { ApiResponseData } from "@/lib/api-client";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    // Chủ sở hữu
    ownerFullName: z
      .string()
      .min(2, "Họ và tên tối thiểu 2 ký tự")
      .max(255, "Họ và tên quá dài"),
    ownerEmail: z
      .string()
      .min(1, "Email không được để trống")
      .email("Email không đúng định dạng"),
    ownerPhone: z
      .string()
      .max(20, "Số điện thoại không hợp lệ")
      .optional()
      .or(z.literal("")),
    ownerPassword: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .max(128, "Mật khẩu quá dài"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),

    // Cửa hàng
    storeName: z
      .string()
      .min(2, "Tên cửa hàng tối thiểu 2 ký tự")
      .max(255, "Tên cửa hàng quá dài"),
    storePhone: z
      .string()
      .max(20, "Số điện thoại không hợp lệ")
      .optional()
      .or(z.literal("")),
    storeAddress: z
      .string()
      .max(500, "Địa chỉ quá dài")
      .optional()
      .or(z.literal("")),
    taxCode: z
      .string()
      .max(50, "Mã số thuế không hợp lệ")
      .optional()
      .or(z.literal("")),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "Bạn cần đồng ý với điều khoản sử dụng",
    }),
  })
  .refine((data) => data.ownerPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Password Strength Calculator ──────────────────────────────────────────────

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Rất yếu", color: "bg-red-500" };
  if (score === 2) return { score: 2, label: "Trung bình", color: "bg-amber-500" };
  if (score === 3) return { score: 3, label: "Khá", color: "bg-blue-500" };
  return { score: 4, label: "Mạnh", color: "bg-emerald-500" };
}

// ── Animations ────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
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

export function RegisterForm() {
  const { registerStore, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      ownerFullName: "",
      ownerEmail: "",
      ownerPhone: "",
      ownerPassword: "",
      confirmPassword: "",
      storeName: "",
      storePhone: "",
      storeAddress: "",
      taxCode: "",
      termsAccepted: true,
    },
  });

  const watchedPassword = watch("ownerPassword", "");
  const strength = useMemo(
    () => getPasswordStrength(watchedPassword),
    [watchedPassword]
  );

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);
    setSuccessMessage(null);

    try {
      await registerStore({
        ownerFullName: values.ownerFullName.trim(),
        ownerEmail: values.ownerEmail.trim().toLowerCase(),
        ownerPhone: values.ownerPhone ? values.ownerPhone.trim() : null,
        ownerPassword: values.ownerPassword,
        storeName: values.storeName.trim(),
        storePhone: values.storePhone ? values.storePhone.trim() : null,
        storeAddress: values.storeAddress ? values.storeAddress.trim() : null,
        taxCode: values.taxCode ? values.taxCode.trim() : null,
      });

      setSuccessMessage("Đăng ký thành công! Đang chuyển hướng vào hệ thống...");
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<ApiResponseData<null>>;
      const msg =
        axiosErr.response?.data?.message ||
        "Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.";
      setApiError(msg);
    }
  };

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-xl"
      >
        {/* Glow halo */}
        <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-cyan-500/20 opacity-70 blur-xl" />

        {/* Card Body */}
        <div className="relative rounded-2xl border border-white/10 bg-slate-950/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center sm:text-left mb-6">
            <div className="flex items-center justify-center sm:justify-start gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <UserPlus className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Đăng ký tài khoản</h2>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Kích hoạt ngay cửa hàng số với đầy đủ tính năng trong 14 ngày dùng thử miễn phí.
            </p>
          </motion.div>

          {/* Success Banner */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2.5"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner */}
          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-center gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1">
                  <span>{apiError}</span>
                  {apiError.toLowerCase().includes("email") && (
                    <Link
                      href="/login"
                      className="ml-2 font-semibold underline text-blue-400 hover:text-blue-300"
                    >
                      Đăng nhập ngay
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Section 1: Thông tin chủ sở hữu */}
            <motion.div variants={itemVariants} className="space-y-3.5">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1.5">
                <User className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  1. Tài khoản chủ sở hữu
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Họ tên */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Họ và tên <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("ownerFullName")}
                      placeholder="Nguyễn Văn A"
                      className="h-10 pl-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.ownerFullName && (
                    <p className="text-[11px] text-red-400">{errors.ownerFullName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Email đăng nhập <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("ownerEmail")}
                      type="email"
                      placeholder="shop@example.com"
                      className="h-10 pl-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.ownerEmail && (
                    <p className="text-[11px] text-red-400">{errors.ownerEmail.message}</p>
                  )}
                </div>
              </div>

              {/* Mật khẩu & Nhập lại mật khẩu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mật khẩu */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Mật khẩu <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("ownerPassword")}
                      type={showPassword ? "text" : "password"}
                      placeholder="Tối thiểu 6 ký tự"
                      className="h-10 pl-9 pr-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.ownerPassword && (
                    <p className="text-[11px] text-red-400">{errors.ownerPassword.message}</p>
                  )}
                </div>

                {/* Nhập lại mật khẩu */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Xác nhận mật khẩu <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Khớp mật khẩu trên"
                      className="h-10 pl-9 pr-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {/* Password strength meter */}
              {watchedPassword && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Độ an toàn mật khẩu:</span>
                    <span className="font-semibold text-slate-300">{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          strength.score >= step
                            ? strength.color
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Section 2: Thông tin cửa hàng */}
            <motion.div variants={itemVariants} className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1.5">
                <Store className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  2. Thông tin cửa hàng / Hộ kinh doanh
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tên cửa hàng */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Tên cửa hàng <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("storeName")}
                      placeholder="Cửa hàng bách hóa An Nhiên"
                      className="h-10 pl-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.storeName && (
                    <p className="text-[11px] text-red-400">{errors.storeName.message}</p>
                  )}
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Số điện thoại liên hệ
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("storePhone")}
                      placeholder="0987 654 321"
                      className="h-10 pl-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                  {errors.storePhone && (
                    <p className="text-[11px] text-red-400">{errors.storePhone.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Địa chỉ */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Địa chỉ kinh doanh
                  </Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("storeAddress")}
                      placeholder="123 Đường Nguyễn Huệ, Q.1, TP.HCM"
                      className="h-10 pl-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Mã số thuế */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">
                    Mã số thuế / Đăng ký KD
                  </Label>
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      {...register("taxCode")}
                      placeholder="8001234567 (không bắt buộc)"
                      className="h-10 pl-9 border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Terms checkbox */}
            <motion.div variants={itemVariants} className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-400">
                <input
                  type="checkbox"
                  {...register("termsAccepted")}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  Tôi đồng ý với{" "}
                  <span className="text-blue-400 hover:underline">Điều khoản dịch vụ</span> và{" "}
                  <span className="text-blue-400 hover:underline">Chính sách bảo mật</span> của BizFlow 3D.
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="mt-1 text-[11px] text-red-400">{errors.termsAccepted.message}</p>
              )}
            </motion.div>

            {/* Submit button */}
            <motion.div variants={itemVariants} className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="relative h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-blue-500/40 active:scale-[0.99] disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang khởi tạo cửa hàng...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Đăng ký & Bắt đầu dùng thử 14 ngày
                    </>
                  )}
                </span>
              </Button>
            </motion.div>

            {/* Back to Login link */}
            <motion.div variants={itemVariants} className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
