"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONES: Record<ToastType, { icon: string; bar: string }> = {
  success: {
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  error: {
    icon: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    bar: "bg-red-500",
  },
  info: {
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    bar: "bg-blue-500",
  },
};

/** Quản lý danh sách toast, tự ẩn sau 4.5s */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, type, title, description }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return { toasts, showToast, dismiss };
}

/** Viewport hiển thị toast — đặt 1 lần trong trang dùng `useToast` */
export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Thông báo"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          const tone = TONES[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto relative overflow-hidden rounded-xl border bg-background p-3 pr-8 shadow-lg"
              role="status"
            >
              <span className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
              <div className="flex items-start gap-2.5 pl-1.5">
                <span className={cn("rounded-lg p-1.5", tone.icon)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDismiss(t.id)}
                  className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Đóng thông báo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
