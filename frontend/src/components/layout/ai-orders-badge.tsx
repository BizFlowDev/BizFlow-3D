"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSocketStore } from "@/hooks/useSocket";

/**
 * Badge trên menu "AI Đơn hàng" — hiện số đơn nháp mới nhận qua socket.
 * Tự reset khi người dùng đã vào trang AI Orders để xem.
 */
export function AiOrdersBadge() {
  const pathname = usePathname();
  const draftCount = useSocketStore((s) => s.draftCount);
  const resetDraftCount = useSocketStore((s) => s.resetDraftCount);

  // Khi người dùng vào trang AI Orders → coi như đã xem, xoá badge
  useEffect(() => {
    if (pathname.startsWith("/ai-orders") && draftCount > 0) {
      resetDraftCount();
    }
  }, [pathname, draftCount, resetDraftCount]);

  if (draftCount <= 0) return null;

  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white tabular-nums"
      aria-label={`${draftCount} đơn nháp mới`}
    >
      {draftCount}
    </span>
  );
}
