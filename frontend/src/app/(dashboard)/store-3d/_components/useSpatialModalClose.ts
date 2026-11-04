"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Let the device retract before its parent removes the modal. */
export function useSpatialModalClose(open: boolean, onClosed: () => void) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onClosed);
  useEffect(() => { callback.current = onClosed; }, [onClosed]);
  useEffect(() => {
    setClosing(false);
    return () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  }, [open]);
  const close = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      callback.current();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);
  return { close, closing };
}
