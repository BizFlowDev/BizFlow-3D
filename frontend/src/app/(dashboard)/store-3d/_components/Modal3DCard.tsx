"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { Compass } from "lucide-react";

interface Modal3DCardProps {
  children: ReactNode;
  className?: string;
  accentGlowColor?: string;
  enableTilt?: boolean;
  isFloating?: boolean;
  showTechCorners?: boolean;
}

/**
 * Modal3DCard — Bảng Giao Diện Hologram Lơ Lửng Không Gian 3D (Spatial Glass HUD)
 * Lơ lửng bồng bềnh trong không trung (Floating bobbing), nghiêng theo góc chuột (CSS 3D Tilt),
 * chất liệu kính mờ bán trong suốt không che mờ không gian 3D phía sau.
 */
export function Modal3DCard({
  children,
  className = "",
  accentGlowColor = "rgba(56, 189, 248, 0.35)",
  enableTilt = true,
  isFloating = true,
  showTechCorners = true,
}: Modal3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltEnabled, setTiltEnabled] = useState(enableTilt);
  const [transformStyle, setTransformStyle] = useState<string>("perspective(1400px) rotateX(0deg) rotateY(0deg)");
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!tiltEnabled || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Góc nghiêng nhẹ nhàng tinh tế (max 7 độ)
      const maxTilt = 7.0;
      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      setTransformStyle(
        `perspective(1400px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`,
      );

      // Điểm phản quang động nhẹ
      setGlarePosition({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
        opacity: 0.14,
      });
    },
    [tiltEnabled],
  );

  const handleMouseLeave = useCallback(() => {
    if (!tiltEnabled) return;
    setTransformStyle("perspective(1400px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  }, [tiltEnabled]);

  return (
    <div className={`relative ${isFloating ? "animate-[spatialFloat_5s_ease-in-out_infinite]" : ""}`}>
      {/* CSS Keyframes cho hiệu ứng lơ lửng bồng bềnh trong không gian */}
      <style jsx global>{`
        @keyframes spatialFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>

      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: transformStyle,
          transformStyle: "preserve-3d",
          transition: "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease-out",
        }}
        className={`relative overflow-hidden rounded-3xl border border-sky-400/30 bg-slate-950/78 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_35px_rgba(56,189,248,0.18)] ring-1 ring-white/10 ${className}`}
      >
        {/* ── HIỆU ỨNG ÁNH SÁNG PHẢN QUANG KÍNH (Specular Glare) ────────── */}
        <div
          className="pointer-events-none absolute inset-0 z-50 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 380px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,${glarePosition.opacity}), transparent 70%)`,
          }}
        />

        {/* ── VIỀN QUẦNG SÁNG NEON AMBIENT (Glow Rim) ─────────────────── */}
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-3xl opacity-50 blur-lg transition-all duration-300 -z-10"
          style={{
            background: `linear-gradient(135deg, ${accentGlowColor}, transparent 55%, ${accentGlowColor})`,
          }}
        />

        {/* ── 4 VẠCH ĐỊNH VỊ GÓC SCI-FI HOLOGRAPHIC (Corner Brackets) ─── */}
        {showTechCorners && (
          <>
            <div className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 border-t-2 border-l-2 border-sky-400/70 z-30" />
            <div className="pointer-events-none absolute top-2.5 right-2.5 h-3.5 w-3.5 border-t-2 border-r-2 border-sky-400/70 z-30" />
            <div className="pointer-events-none absolute bottom-2.5 left-2.5 h-3.5 w-3.5 border-b-2 border-l-2 border-sky-400/70 z-30" />
            <div className="pointer-events-none absolute bottom-2.5 right-2.5 h-3.5 w-3.5 border-b-2 border-r-2 border-sky-400/70 z-30" />
          </>
        )}

        {/* ── NÚT BẬT / TẮT GÓC NGHIÊNG 3D Ở ĐÁY THẺ ────────────────── */}
        <div className="absolute bottom-2.5 right-4 z-40 hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTiltEnabled((v) => !v);
              if (tiltEnabled) {
                setTransformStyle("perspective(1400px) rotateX(0deg) rotateY(0deg)");
                setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
              }
            }}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold backdrop-blur-md transition-all ${
              tiltEnabled
                ? "border border-sky-400/40 bg-sky-500/20 text-sky-200"
                : "border border-white/10 bg-slate-900/80 text-slate-400 hover:text-white"
            }`}
            title="Bật/Tắt hiệu ứng nghiêng 3D không gian theo chuột"
          >
            <Compass className="h-3 w-3" />
            <span>{tiltEnabled ? "Nghiêng 3D: Bật" : "Cố định"}</span>
          </button>
        </div>

        {/* ── NỘI DUNG CHÍNH (Hỗ trợ translateZ cho các tầng chiều sâu) ─ */}
        <div className="relative z-10" style={{ transformStyle: "preserve-3d" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
