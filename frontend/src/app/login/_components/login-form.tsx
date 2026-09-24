"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Mail,
  Lock,
  Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import type { AxiosError } from "axios";
import type { ApiResponseData } from "@/lib/api-client";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email không được để trống")
    .email("Email không đúng định dạng"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Stagger Animation Variants ────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
} as const;

// ── Google Icon SVG ───────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ── Login Form Component ──────────────────────────────────────────────────────

export function LoginForm() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lang, setLang] = useState<"vi" | "en">("vi");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ApiResponseData>;
      const message =
        axiosError.response?.data?.message ||
        (lang === "vi"
          ? "Đã xảy ra lỗi. Vui lòng thử lại."
          : "An error occurred. Please try again.");
      setApiError(message);
    }
  };

  // ── i18n strings ──

  const t = {
    vi: {
      welcome: "Chào mừng trở lại",
      subtitle: "Đăng nhập vào hệ thống quản lý BizFlow 3D",
      email: "Email",
      emailPlaceholder: "admin@bizflow.com",
      password: "Mật khẩu",
      passwordPlaceholder: "••••••••",
      showPassword: "Hiện mật khẩu",
      hidePassword: "Ẩn mật khẩu",
      rememberMe: "Ghi nhớ đăng nhập",
      forgotPassword: "Quên mật khẩu?",
      login: "Đăng nhập",
      loggingIn: "Đang đăng nhập...",
      orContinue: "hoặc tiếp tục với",
      google: "Tiếp tục với Google",
      footer: "© 2026 BizFlow 3D — Nền tảng chuyển đổi số cho hộ kinh doanh",
    },
    en: {
      welcome: "Welcome back",
      subtitle: "Sign in to BizFlow 3D management system",
      email: "Email",
      emailPlaceholder: "admin@bizflow.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      showPassword: "Show password",
      hidePassword: "Hide password",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password?",
      login: "Sign in",
      loggingIn: "Signing in...",
      orContinue: "or continue with",
      google: "Continue with Google",
      footer: "© 2026 BizFlow 3D — Digital transformation for small businesses",
    },
  }[lang];

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-8 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-[420px]"
      >
        {/* Glassmorphism card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/20 backdrop-blur-2xl">
          {/* Card glow effect */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Language Switch */}
            <motion.div variants={itemVariants} className="mb-6 flex justify-end">
              <button
                type="button"
                onClick={() => setLang((l) => (l === "vi" ? "en" : "vi"))}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-slate-300"
                aria-label="Switch language"
              >
                <Globe className="h-3.5 w-3.5" />
                {lang === "vi" ? "VI" : "EN"}
              </button>
            </motion.div>

            {/* Logo */}
            <motion.div variants={itemVariants} className="mb-6 flex justify-center">
              <div className="relative">
                <Image
                  src="/images/logo.png"
                  alt="BizFlow 3D Logo"
                  width={72}
                  height={72}
                  className="h-18 w-18 rounded-2xl border border-white/10 drop-shadow-lg"
                  priority
                />
                {/* Pulse ring */}
                <div className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-blue-500/20 [animation-duration:3s]" />
              </div>
            </motion.div>

            {/* Welcome text */}
            <motion.div variants={itemVariants} className="mb-8 text-center">
              <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-white">
                {t.welcome}
              </h2>
              <p className="text-sm text-slate-400">{t.subtitle}</p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* API Error */}
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  role="alert"
                  aria-live="polite"
                >
                  {apiError}
                </motion.div>
              )}

              {/* Email field */}
              <motion.div variants={itemVariants} className="space-y-2">
                <Label
                  htmlFor="login-email"
                  className="text-sm font-medium text-slate-300"
                >
                  {t.email}
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    autoComplete="email"
                    className="h-11 border-white/[0.08] bg-white/[0.04] pl-10 text-white placeholder:text-slate-600 transition-all focus:border-blue-500/30 focus:bg-white/[0.06] focus-visible:ring-1 focus-visible:ring-blue-500/40"
                    {...register("email")}
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={
                      errors.email ? "email-error" : undefined
                    }
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="text-xs text-red-400" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </motion.div>

              {/* Password field */}
              <motion.div variants={itemVariants} className="space-y-2">
                <Label
                  htmlFor="login-password"
                  className="text-sm font-medium text-slate-300"
                >
                  {t.password}
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passwordPlaceholder}
                    autoComplete="current-password"
                    className="h-11 border-white/[0.08] bg-white/[0.04] pl-10 pr-11 text-white placeholder:text-slate-600 transition-all focus:border-blue-500/30 focus:bg-white/[0.06] focus-visible:ring-1 focus-visible:ring-blue-500/40"
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 transition-colors hover:text-slate-300"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? t.hidePassword : t.showPassword
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    className="text-xs text-red-400"
                    role="alert"
                  >
                    {errors.password.message}
                  </p>
                )}
              </motion.div>

              {/* Remember me + Forgot password */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="login-remember"
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 transition-colors focus:ring-blue-500/50 focus:ring-offset-0"
                    {...register("rememberMe")}
                  />
                  <Label
                    htmlFor="login-remember"
                    className="cursor-pointer text-sm font-normal text-slate-400"
                  >
                    {t.rememberMe}
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
                >
                  {t.forgotPassword}
                </button>
              </motion.div>

              {/* Login button */}
              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="relative h-11 w-full overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                >
                  {/* Button shimmer */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 hover:translate-x-full" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.loggingIn}
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        {t.login}
                      </>
                    )}
                  </span>
                </Button>
              </motion.div>

              {/* Divider */}
              <motion.div
                variants={itemVariants}
                className="relative flex items-center py-1"
              >
                <div className="flex-1 border-t border-white/[0.06]" />
                <span className="mx-4 text-xs text-slate-500">
                  {t.orContinue}
                </span>
                <div className="flex-1 border-t border-white/[0.06]" />
              </motion.div>

              {/* Google button */}
              <motion.div variants={itemVariants}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-white/[0.08] bg-white/[0.03] font-medium text-slate-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                >
                  <GoogleIcon />
                  <span className="ml-2.5">{t.google}</span>
                </Button>
              </motion.div>

              {/* Link to Register */}
              <motion.div variants={itemVariants} className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  {lang === "vi" ? "Chưa có tài khoản?" : "Don't have an account?"}{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    {lang === "vi" ? "Đăng ký dùng thử 14 ngày" : "Sign up for 14-day trial"}
                  </Link>
                </p>
              </motion.div>
            </form>

            {/* Footer */}
            <motion.p
              variants={itemVariants}
              className="mt-8 text-center text-[11px] text-slate-600"
            >
              {t.footer}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
