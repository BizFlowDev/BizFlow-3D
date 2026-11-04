"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";

interface Modal3DCardProps {
  children: ReactNode;
  closing?: boolean;
  className?: string;
  accentGlowColor?: string;
  enableTilt?: boolean;
  isFloating?: boolean;
  showTechCorners?: boolean;
}

/** Shared device shell for every showroom, POS and warehouse panel. */
export function Modal3DCard({ children, closing = false, className = "", accentGlowColor = "rgba(52, 211, 153, 0.25)", enableTilt = true, isFloating = false, showTechCorners = true }: Modal3DCardProps) {
  const card = useRef<HTMLDivElement>(null);
  const reset = () => {
    card.current?.style.setProperty("--spatial-x", "0deg");
    card.current?.style.setProperty("--spatial-y", "0deg");
    card.current?.style.setProperty("--spatial-glare-x", "25%");
    card.current?.style.setProperty("--spatial-glare-y", "10%");
  };
  return <div data-spatial-shell className="relative w-full" style={{ "--spatial-glow": accentGlowColor } as CSSProperties}>
    <div ref={card} data-spatial-card data-closing={closing} data-floating={isFloating} className={`relative rounded-xl border border-emerald-300/40 bg-slate-950/95 text-slate-100 ${className}`} onPointerMove={(event) => {
      if (!enableTilt || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      event.currentTarget.style.setProperty("--spatial-x", `${-y * 1.05}deg`);
      event.currentTarget.style.setProperty("--spatial-y", `${x * 1.4}deg`);
      event.currentTarget.style.setProperty("--spatial-glare-x", `${(x + 1) * 50}%`);
      event.currentTarget.style.setProperty("--spatial-glare-y", `${(y + 1) * 50}%`);
    }} onPointerLeave={reset}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-xl"><div data-spatial-sweep /></div>
      {showTechCorners && <div aria-hidden="true" data-spatial-rails className="pointer-events-none absolute inset-0 z-30 rounded-xl" />}
      <div className="relative z-10 overflow-hidden rounded-xl">{children}</div>
    </div>
  </div>;
}
