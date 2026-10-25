"use client";

import React from "react";
import { Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeCountdown } from "@/hooks/useStripeCountdown";
import { cn } from "@/lib/utils";

export interface StripeCountdownTimerProps {
  /** Thời điểm hết hạn (ISO string hoặc Date) */
  expiresAt?: string | Date | null;
  /** Thời gian đếm ngược tính bằng giây (mặc định 15 * 60 = 900) */
  initialSeconds?: number;
  /** Tạm dừng đếm ngược (ví dụ khi đã thanh toán thành công) */
  isPaused?: boolean;
  /** Callback kích hoạt khi đồng hồ về 00:00 */
  onExpire?: () => void;
  /** Trạng thái đã hết hạn từ server (ghi đè đồng hồ) */
  isExpiredState?: boolean;
  /** Tùy biến class container */
  className?: string;
  /** Kiểu hiển thị thu gọn */
  compact?: boolean;
}

/**
 * Component hiển thị thanh đếm ngược 15 phút thanh toán Stripe chuyên nghiệp
 */
export function StripeCountdownTimer({
  expiresAt,
  initialSeconds = 15 * 60,
  isPaused = false,
  onExpire,
  isExpiredState = false,
  className,
  compact = false,
}: StripeCountdownTimerProps) {
  const { formattedTime, isExpired: isTimerExpired, percent, urgency } = useStripeCountdown({
    expiresAt,
    defaultDurationSeconds: initialSeconds,
    enabled: !isExpiredState && !isPaused,
    onExpire,
  });

  const expired = isExpiredState || isTimerExpired;

  if (expired) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition-all",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 animate-pulse" />
          <span>Mã thanh toán đã hết hạn (15 phút) & tự động hủy</span>
        </div>
        <span className="font-mono font-bold text-red-500 dark:text-red-400 bg-red-500/20 px-2 py-0.5 rounded text-[11px]">
          00:00
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all shadow-sm",
          urgency === "normal" &&
            "border-indigo-500/30 bg-indigo-50/70 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300",
          urgency === "warning" &&
            "border-amber-500/40 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300",
          urgency === "critical" &&
            "border-red-500/50 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-300 animate-pulse",
          className,
        )}
      >
        <Clock
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            urgency === "critical" ? "animate-spin text-red-500" : "text-indigo-600 dark:text-indigo-400",
          )}
        />
        <span>Hết hạn sau:</span>
        <span className="font-mono font-bold tracking-wider">{formattedTime}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 transition-all space-y-1.5 shadow-sm",
        urgency === "normal" &&
          "border-indigo-500/20 bg-indigo-50/50 dark:border-indigo-500/20 dark:bg-indigo-950/30",
        urgency === "warning" &&
          "border-amber-500/30 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-950/40",
        urgency === "critical" &&
          "border-red-500/40 bg-red-50/80 dark:border-red-500/40 dark:bg-red-950/50 animate-pulse",
        className,
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <Clock
            className={cn(
              "h-3.5 w-3.5",
              urgency === "normal" && "text-indigo-600 dark:text-indigo-400",
              urgency === "warning" && "text-amber-600 dark:text-amber-400",
              urgency === "critical" && "text-red-600 dark:text-red-400",
            )}
          />
          <span className="text-muted-foreground text-[11px]">
            {urgency === "critical"
              ? "Sắp hết thời hạn thanh toán:"
              : "Thời hạn hiệu lực mã QR (15 phút):"}
          </span>
        </div>
        <div
          className={cn(
            "font-mono font-extrabold text-xs px-2 py-0.5 rounded tracking-wider shadow-sm",
            urgency === "normal" &&
              "bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
            urgency === "warning" &&
              "bg-amber-600/15 text-amber-800 dark:bg-amber-500/25 dark:text-amber-300",
            urgency === "critical" &&
              "bg-red-600/20 text-red-700 dark:bg-red-500/30 dark:text-red-200 animate-bounce",
          )}
        >
          {formattedTime}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
        <div
          className={cn(
            "h-full transition-all duration-1000 ease-linear rounded-full",
            urgency === "normal" && "bg-gradient-to-r from-teal-500 to-indigo-600",
            urgency === "warning" && "bg-gradient-to-r from-amber-400 to-orange-500",
            urgency === "critical" && "bg-gradient-to-r from-rose-500 to-red-600",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export interface StripeExpiredOverlayProps {
  children?: React.ReactNode;
  /** Trạng thái đã hết hạn */
  isExpired?: boolean;
  /** Callback tạo lại mã mới */
  onRefresh?: () => void;
  onRegenerate?: () => void;
  /** Trạng thái đang tải lại mã */
  isRefreshing?: boolean;
  className?: string;
}

/**
 * Lớp phủ làm mờ và khóa tương tác mã QR Stripe khi đã hết hạn 15 phút.
 * Hỗ trợ vừa làm wrapper bọc thẻ QR hoặc dùng độc lập vị trí absolute.
 */
export function StripeExpiredOverlay({
  children,
  isExpired = false,
  onRefresh,
  onRegenerate,
  isRefreshing = false,
  className,
}: StripeExpiredOverlayProps) {
  const handleRefresh = onRegenerate || onRefresh;

  const overlayElement = (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-slate-950/85 backdrop-blur-[3px] p-4 text-center text-white animate-in fade-in duration-300",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/20 text-red-400 border border-red-500/30 mb-2 shadow-lg shadow-red-500/20">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="font-bold text-sm text-red-300">Mã thanh toán đã hết hạn</p>
      <p className="text-[11px] text-slate-300 mt-1 max-w-[210px] leading-relaxed">
        Phiên Stripe đã tự động hủy sau 15 phút để bảo đảm an toàn. Vui lòng tạo mã mới để tiếp tục.
      </p>
      {handleRefresh && (
        <Button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          size="sm"
          className="mt-3 h-8 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Tạo lại mã thanh toán
        </Button>
      )}
    </div>
  );

  if (children) {
    return (
      <div className="relative">
        {children}
        {isExpired && overlayElement}
      </div>
    );
  }

  if (!isExpired) return null;
  return overlayElement;
}
