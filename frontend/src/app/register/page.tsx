"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAuthStore } from "@/stores/auth-store";
import { AnimatedBackground } from "../login/_components/animated-background";
import { RegisterShowcase } from "./_components/register-showcase";
import { RegisterForm } from "./_components/register-form";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Redirect nếu đã login
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.replace("/");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Chờ hydrate xong mới render (tránh flash UI)
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Đã login → đang redirect
  if (isAuthenticated) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key="register-page"
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
          {/* Left Panel — Register Showcase (desktop only) */}
          <div className="hidden lg:flex lg:w-1/2 xl:w-[48%]">
            <RegisterShowcase />
          </div>

          {/* Right Panel — Register Form */}
          <div className="flex w-full items-center justify-center lg:w-1/2 xl:w-[52%] overflow-y-auto py-8">
            <RegisterForm />
          </div>
        </div>
      </motion.main>
    </AnimatePresence>
  );
}
