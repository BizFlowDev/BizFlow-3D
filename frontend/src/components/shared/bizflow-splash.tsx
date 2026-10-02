"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BizFlowSplashProps {
  message?: string;
  subMessage?: string;
  fullscreen?: boolean;
  className?: string;
}

/**
 * BizFlowSplash — Màn hình chờ thương hiệu tối giản & tinh tế.
 * Kết hợp logo BizFlow 3D, hiệu ứng vòng quay xoay tròn nhẹ nhàng và chữ nhận diện.
 */
export function BizFlowSplash({
  message = "Đang tải dữ liệu...",
  subMessage = "",
  fullscreen = true,
  className,
}: BizFlowSplashProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none",
        fullscreen
          ? "fixed inset-0 z-50 bg-background/90 backdrop-blur-sm"
          : "h-full min-h-[300px] w-full py-12",
        className
      )}
    >
      <div className="relative flex flex-col items-center">
        {/* Vùng Logo với vòng tròn quay tinh tế */}
        <div className="relative flex items-center justify-center">
          {/* Vòng quay spinner mỏng tối giản bao quanh logo */}
          <div className="absolute h-20 w-20 animate-spin rounded-full border-2 border-primary/20 border-t-primary [animation-duration:1.2s]" />

          {/* Logo BizFlow */}
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-card p-1 shadow-sm border border-border/50">
            <Image
              src="/images/logo.png"
              alt="BizFlow 3D"
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Thông tin thương hiệu & Trạng thái tải */}
        <div className="mt-5 text-center">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            BizFlow <span className="text-primary font-bold">3D</span>
          </h2>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>{message}</span>
          </div>
          {subMessage && (
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {subMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
