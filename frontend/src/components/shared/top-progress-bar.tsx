"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsFetching } from "@tanstack/react-query";

/**
 * TopProgressBar — Thanh tiến trình chuyển trang và tải dữ liệu nền.
 * Tối giản, tinh tế, mượt mà trên đỉnh màn hình (2.5px), tự động kích hoạt
 * khi điều hướng route hoặc khi có request API nặng từ TanStack Query.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFetching = useIsFetching();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Bắt đầu chạy tiến trình
  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setVisible(true);
    setProgress(15);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + 12;
        if (prev < 75) return prev + 5;
        if (prev < 88) return prev + 1.5;
        return prev;
      });
    }, 180);
  };

  // Hoàn tất tiến trình
  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 250);
    }, 200);
  };

  // Lắng nghe click các thẻ link nội bộ trong ứng dụng Next.js
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Bỏ qua nếu có phím bổ trợ (Ctrl/Cmd/Shift/Alt) hoặc click chuột phải/giữa
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      // Bỏ qua link ngoài, tab mới, download, hoặc link hash cùng trang
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || targetAttr === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      // Kiểm tra nếu là cùng URL hiện tại
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl || href === window.location.pathname) {
        return;
      }

      startProgress();
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Khi pathname hoặc searchParams thay đổi -> điều hướng đã hoàn tất
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  // Phản hồi nhẹ nhàng khi có API fetching lớn nếu chưa hiển thị
  useEffect(() => {
    if (isFetching > 0 && !visible && progress === 0) {
      // Chỉ kích hoạt một vệt mỏng nhẹ khi có fetching
      setVisible(true);
      setProgress(40);
    } else if (isFetching === 0 && visible && progress < 100) {
      completeProgress();
    }
  }, [isFetching]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999] h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: "0 0 10px rgba(56, 189, 248, 0.7), 0 0 5px rgba(59, 130, 246, 0.5)",
        }}
      />
    </div>
  );
}
