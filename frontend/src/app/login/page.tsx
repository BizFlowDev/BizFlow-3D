"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAuthStore, isTokenValid } from "@/stores/auth-store";
import { AnimatedBackground } from "./_components/animated-background";
import { BrandShowcase } from "./_components/brand-showcase";
import { LoginForm } from "./_components/login-form";

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, user, accessToken, clearAuth } =
    useAuthStore();

  // Redirect nếu đã login hợp lệ
  useEffect(() => {
    if (_hasHydrated) {
      if (isAuthenticated) {
        // Kiểm tra tính hợp lệ của token và cookie
        const hasCookie =
          typeof document !== "undefined" &&
          document.cookie.includes("bizflow.accessToken");

        if (!accessToken || !isTokenValid(accessToken) || !hasCookie) {
          // Token hết hạn hoặc không đồng bộ cookie -> xóa auth để hiển thị form
          clearAuth();
          return;
        }

        const dest =
          user?.role === "admin"
            ? "/admin/stores"
            : user?.role === "employee"
              ? "/orders/new"
              : "/";
        router.replace(dest);
      }
    }
  }, [_hasHydrated, isAuthenticated, user, accessToken, router, clearAuth]);

  // Chờ hydrate xong hoặc đang trong quá trình redirect (tránh màn hình trắng)
  if (!_hasHydrated || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key="login-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="relative flex min-h-screen overflow-hidden"
      >
        {/* Animated Background */}
        <AnimatedBackground />

        {/* Split Layout */}
        <div className="relative z-10 flex w-full flex-col lg:flex-row">
          {/* Left Panel — Brand Showcase (desktop only) */}
          <div className="hidden lg:flex lg:w-1/2 xl:w-[55%]">
            <BrandShowcase />
          </div>

          {/* Right Panel — Login Form */}
          <div className="flex w-full items-center justify-center lg:w-1/2 xl:w-[45%]">
            <LoginForm />
          </div>
        </div>
      </motion.main>
    </AnimatePresence>
  );
}
