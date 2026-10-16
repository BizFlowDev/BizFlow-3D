"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
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
 * Lơ lửng bồng bềnh trong không trung (Floating bobbing), nghiêng 3D hướng theo con chuột
 * dù con chuột di chuyển ở bất cứ đâu trên màn hình (kể cả không chạm vào modal),
 * đồng thời giữ nguyên hiệu ứng phản quang ánh sáng kính (specular glare & neon glow rim).
 */
export function Modal3DCard({
  children,
  className = "",
  accentGlowColor = "rgba(56, 189, 248, 0.25)",
  enableTilt = true,
  isFloating = true,
  showTechCorners = true,
}: Modal3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltEnabled, setTiltEnabled] = useState(enableTilt);
  const [transformStyle, setTransformStyle] = useState<string>(
    "perspective(1400px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
  );
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0.16,
  });

  useEffect(() => {
    if (!tiltEnabled) {
      setTransformStyle("perspective(1400px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
      setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    // Khi bật nghiêng 3D, giữ mức phản quang ánh sáng luôn sẵn sàng
    setGlarePosition((prev) => ({ ...prev, opacity: 0.16 }));

    let rafId: number | null = null;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    const updateTiltAndLighting = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Vectơ từ tâm thẻ tới vị trí con trỏ chuột
      const dx = targetX - centerX;
      const dy = targetY - centerY;

      // Chuẩn hóa theo nửa màn hình (hoặc kích thước tối thiểu)
      const halfW = Math.max(window.innerWidth * 0.52, 450);
      const halfH = Math.max(window.innerHeight * 0.52, 350);

      const normX = Math.max(-1, Math.min(1, dx / halfW));
      const normY = Math.max(-1, Math.min(1, dy / halfH));

      // Góc nghiêng tối đa mượt mà, hướng về phía con chuột (Spatial Target)
      const maxTilt = 8.5;
      const rotateX = -normY * maxTilt;
      const rotateY = normX * maxTilt;

      setTransformStyle(
        `perspective(1400px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`,
      );

      // Điểm phản quang ánh sáng (Specular Glare) chiếu theo vị trí con chuột
      // Dù chuột ở ngoài thẻ, vị trí ánh sáng được tính tương đối và giữ lại viền sáng mềm
      const relX = ((targetX - rect.left) / rect.width) * 100;
      const relY = ((targetY - rect.top) / rect.height) * 100;

      // Giới hạn trong khoảng -25% đến 125% để ánh sáng trượt nhẹ quanh các cạnh thẻ
      const glareX = Math.max(-25, Math.min(125, relX));
      const glareY = Math.max(-25, Math.min(125, relY));

      // Cường độ phản quang: ở gần tâm thì sắc nét hơn, ở xa ngoài thẻ vẫn giữ vầng sáng tinh tế (không tắt ngúm)
      const dist = Math.hypot(normX, normY);
      const glareOpacity = Math.max(0.12, Math.min(0.24, 0.22 - dist * 0.08));

      setGlarePosition({
        x: glareX,
        y: glareY,
        opacity: glareOpacity,
      });

      rafId = null;
    };

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(updateTiltAndLighting);
      }
    };

    // Khi chuột rời khỏi cửa sổ trình duyệt hoàn toàn, trở về trạng thái thư thả nhẹ
    const handleMouseLeaveWindow = () => {
      setTransformStyle("perspective(1400px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
      setGlarePosition({ x: 50, y: 50, opacity: 0.12 });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeaveWindow);

    // Kích hoạt tính toán ban đầu một lần
    rafId = requestAnimationFrame(updateTiltAndLighting);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handleMouseLeaveWindow);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
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
        style={{
          transform: transformStyle,
          transformStyle: "preserve-3d",
          transition: "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease-out",
        }}
        className={`relative overflow-hidden rounded-3xl border border-sky-400/30 bg-slate-950/78 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_35px_rgba(56,189,248,0.18)] ring-1 ring-white/10 ${className}`}
      >
        {/* ── HIỆU ỨNG ÁNH SÁNG PHẢN QUANG KÍNH (Specular Glare) ────────── */}
        <div
          className="pointer-events-none absolute inset-0 z-50 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 300px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,${glarePosition.opacity}), transparent 32%)`,
          }}
        />

        {/* ── VIỀN QUẦNG SÁNG NEON AMBIENT (Glow Rim) ─────────────────── */}
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-3xl opacity-60 blur-lg transition-all duration-300 -z-10"
          style={{
            background: `radial-gradient(circle 450px at ${glarePosition.x}% ${glarePosition.y}%, ${accentGlowColor}, transparent 35%)`,
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



        {/* ── NỘI DUNG CHÍNH (Hỗ trợ translateZ cho các tầng chiều sâu) ─ */}
        <div className="relative z-10" style={{ transformStyle: "preserve-3d" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
