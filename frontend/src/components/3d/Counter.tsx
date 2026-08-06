"use client";

import { useState } from "react";
import { Html } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CounterProps {
  /** Số đơn hàng nháp đang chờ duyệt */
  pendingCount: number;
  /** Tổng doanh thu gần nhất (hiển thị trên màn hình quầy) */
  recentTotal: number;
  /** Callback khi click vào quầy — mở order summary */
  onOpenOrders?: () => void;
  /** Vị trí trong scene */
  position?: [number, number, number];
  /** Xoay (radian) */
  rotation?: [number, number, number];
}

// ── Hằng số quầy ─────────────────────────────────────────────────────────────

const COUNTER_W = 3.2;
const COUNTER_D = 1.2;
const COUNTER_H = 1.1;
const LEG_SIZE = 0.12;

const REGISTER_W = 0.6;
const REGISTER_H = 0.45;
const REGISTER_D = 0.5;
const SCREEN_W = 0.5;
const SCREEN_H = 0.35;

// ── Format VND ────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── CounterGlow: nhấp nháy khi có đơn mới ────────────────────────────────────

function CounterGlow({ active }: { active: boolean }) {
  const { emissiveIntensity } = useSpring({
    from: { emissiveIntensity: 0.1 },
    to: { emissiveIntensity: active ? 0.7 : 0.1 },
    loop: active ? { reverse: true } : false,
    config: { duration: 600 },
  });

  return (
    <animated.meshStandardMaterial
      color="#1e293b"
      emissive="#22c55e"
      emissiveIntensity={emissiveIntensity}
      roughness={0.4}
      metalness={0.1}
    />
  );
}

// ── ScreenGlow: màn hình máy tính tiền ────────────────────────────────────────

function ScreenGlow({ active }: { active: boolean }) {
  const { emissiveIntensity } = useSpring({
    from: { emissiveIntensity: 0.3 },
    to: { emissiveIntensity: active ? 1.2 : 0.5 },
    loop: active ? { reverse: true } : false,
    config: { duration: 500 },
  });

  return (
    <animated.meshStandardMaterial
      color="#0f172a"
      emissive="#38bdf8"
      emissiveIntensity={emissiveIntensity}
      roughness={0.2}
      metalness={0.3}
    />
  );
}

// ── Counter (main) ────────────────────────────────────────────────────────────

/**
 * Counter — Quầy tính tiền 3D.
 *
 * - Mô hình: mặt bàn + 4 chân + kệ dưới + máy tính tiền với "màn hình"
 * - Khi pendingCount > 0: material emissive nhấp nháy xanh lá
 * - Click → gọi onOpenOrders() để mở order summary
 * - Badge HTML hiển thị số đơn chờ duyệt
 */
export default function Counter({
  pendingCount,
  recentTotal,
  onOpenOrders,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: CounterProps) {
  const [hovered, setHovered] = useState(false);
  const hasPending = pendingCount > 0;

  return (
    <group position={position} rotation={rotation}>
      {/* ── Mặt bàn quầy ────────────────────────────────────── */}
      <mesh
        position={[0, COUNTER_H, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onOpenOrders?.();
        }}
      >
        <boxGeometry args={[COUNTER_W, 0.08, COUNTER_D]} />
        <CounterGlow active={hasPending} />
      </mesh>

      {/* ── 4 chân quầy ──────────────────────────────────────── */}
      {[
        [-COUNTER_W / 2 + 0.15, COUNTER_H / 2, -COUNTER_D / 2 + 0.15],
        [COUNTER_W / 2 - 0.15, COUNTER_H / 2, -COUNTER_D / 2 + 0.15],
        [-COUNTER_W / 2 + 0.15, COUNTER_H / 2, COUNTER_D / 2 - 0.15],
        [COUNTER_W / 2 - 0.15, COUNTER_H / 2, COUNTER_D / 2 - 0.15],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[LEG_SIZE, COUNTER_H, LEG_SIZE]} />
          <meshStandardMaterial color="#374151" roughness={0.7} />
        </mesh>
      ))}

      {/* ── Kệ dưới quầy ─────────────────────────────────────── */}
      <mesh position={[0, COUNTER_H * 0.35, 0]}>
        <boxGeometry args={[COUNTER_W - 0.3, 0.06, COUNTER_D - 0.2]} />
        <meshStandardMaterial color="#475569" roughness={0.8} />
      </mesh>

      {/* ── Tấm chắn phía trước quầy ─────────────────────────── */}
      <mesh position={[0, COUNTER_H / 2, COUNTER_D / 2 + 0.04]}>
        <boxGeometry args={[COUNTER_W, COUNTER_H, 0.06]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>

      {/* ── Máy tính tiền (hộp) ──────────────────────────────── */}
      <mesh position={[0.4, COUNTER_H + REGISTER_H / 2 + 0.04, -0.1]}>
        <boxGeometry args={[REGISTER_W, REGISTER_H, REGISTER_D]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.15} />
      </mesh>

      {/* ── Màn hình máy tính tiền ───────────────────────────── */}
      <mesh position={[0.4, COUNTER_H + REGISTER_H / 2 + 0.12, REGISTER_D / 2 - 0.22]}>
        <boxGeometry args={[SCREEN_W, SCREEN_H, 0.03]} />
        <ScreenGlow active={hasPending} />
      </mesh>

      {/* ── Badge số đơn chờ ──────────────────────────────────── */}
      {hasPending && (
        <Html
          position={[0.4, COUNTER_H + REGISTER_H + 0.5, 0]}
          center
          zIndexRange={[45, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-red-500/30 animate-pulse">
            <span className="inline-block h-2 w-2 rounded-full bg-white" />
            {pendingCount} đơn chờ
          </div>
        </Html>
      )}

      {/* ── Hiển thị doanh thu trên quầy ──────────────────────── */}
      <Html
        position={[-0.6, COUNTER_H + 0.25, 0.3]}
        center
        zIndexRange={[40, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap rounded-lg bg-background/90 px-2.5 py-1 text-[11px] shadow-md backdrop-blur-sm">
          <div className="text-muted-foreground">Doanh thu hôm nay</div>
          <div className="mt-0.5 font-bold tabular-nums text-foreground">
            {formatVND(recentTotal)}
          </div>
        </div>
      </Html>

      {/* ── Tooltip hover ─────────────────────────────────────── */}
      {hovered && (
        <Html
          position={[0, COUNTER_H + 0.7, 0.5]}
          center
          zIndexRange={[55, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xl">
            Click để xem đơn hàng
          </div>
        </Html>
      )}

      {/* ── Nhãn "Quầy tính tiền" ─────────────────────────────── */}
      <Html
        position={[0, -0.15, COUNTER_D / 2 + 0.3]}
        center
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-200 shadow">
          Quầy tính tiền
        </div>
      </Html>
    </group>
  );
}
