"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

export interface UseStripeCountdownOptions {
  /** Thời điểm hết hạn (ISO string hoặc Date object) */
  expiresAt?: string | Date | null;
  /** Thời lượng đếm lùi mặc định tính bằng giây nếu không có expiresAt (Mặc định: 15 phút = 900s) */
  defaultDurationSeconds?: number;
  /** Bật/tắt bộ đếm */
  enabled?: boolean;
  /** Hàm callback được gọi chính xác 1 lần khi bộ đếm về 00:00 */
  onExpire?: () => void;
}

export interface UseStripeCountdownReturn {
  /** Số giây còn lại */
  secondsLeft: number;
  /** Số phút còn lại */
  minutes: number;
  /** Số giây còn lại của phút hiện tại */
  seconds: number;
  /** Chuỗi thời gian định dạng mm:ss (ví dụ: "14:59") */
  formattedTime: string;
  /** Trạng thái đã hết hạn hay chưa */
  isExpired: boolean;
  /** Tỷ lệ phần trăm thời gian còn lại (100% -> 0%) */
  percent: number;
  /** Mức độ khẩn cấp: normal (>5m), warning (<=5m), critical (<=1m) */
  urgency: "normal" | "warning" | "critical";
  /** Đặt lại bộ đếm */
  resetCountdown: () => void;
}

export function useStripeCountdown({
  expiresAt,
  defaultDurationSeconds = 15 * 60, // 15 phút = 900 giây
  enabled = true,
  onExpire,
}: UseStripeCountdownOptions): UseStripeCountdownReturn {
  // Xác định thời điểm đích (target timestamp)
  const targetTimeRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const hasTriggeredExpireRef = useRef<boolean>(false);

  // Khởi tạo hoặc cập nhật targetTime khi expiresAt thay đổi
  useEffect(() => {
    if (!enabled) return;

    if (expiresAt) {
      const parsed = new Date(expiresAt).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) {
        targetTimeRef.current = parsed;
      } else {
        // Nếu expiresAt không hợp lệ hoặc đã qua, gán 15 phút từ bây giờ
        targetTimeRef.current = Date.now() + defaultDurationSeconds * 1000;
      }
    } else {
      targetTimeRef.current = Date.now() + defaultDurationSeconds * 1000;
    }
    hasTriggeredExpireRef.current = false;
  }, [expiresAt, defaultDurationSeconds, enabled]);

  const calculateSecondsLeft = useCallback(() => {
    if (!enabled || targetTimeRef.current === 0) return defaultDurationSeconds;
    const diff = Math.max(0, Math.floor((targetTimeRef.current - Date.now()) / 1000));
    return diff;
  }, [enabled, defaultDurationSeconds]);

  const [secondsLeft, setSecondsLeft] = useState<number>(() => calculateSecondsLeft());

  useEffect(() => {
    if (!enabled) return;

    // Cập nhật ngay giá trị khởi đầu
    const initial = calculateSecondsLeft();
    setSecondsLeft(initial);

    if (initial <= 0 && !hasTriggeredExpireRef.current) {
      hasTriggeredExpireRef.current = true;
      onExpireRef.current?.();
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = calculateSecondsLeft();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalId);
        if (!hasTriggeredExpireRef.current) {
          hasTriggeredExpireRef.current = true;
          onExpireRef.current?.();
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [enabled, calculateSecondsLeft]);

  const resetCountdown = useCallback(() => {
    targetTimeRef.current = Date.now() + defaultDurationSeconds * 1000;
    hasTriggeredExpireRef.current = false;
    setSecondsLeft(defaultDurationSeconds);
  }, [defaultDurationSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isExpired = secondsLeft <= 0;

  const totalDuration = defaultDurationSeconds;
  const percent = Math.min(100, Math.max(0, (secondsLeft / totalDuration) * 100));

  const urgency = useMemo<"normal" | "warning" | "critical">(() => {
    if (secondsLeft <= 60) return "critical";
    if (secondsLeft <= 5 * 60) return "warning";
    return "normal";
  }, [secondsLeft]);

  return {
    secondsLeft,
    minutes,
    seconds,
    formattedTime,
    isExpired,
    percent,
    urgency,
    resetCountdown,
  };
}
