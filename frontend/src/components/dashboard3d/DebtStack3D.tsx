"use client";

import { useMemo, useState } from "react";
import { Box, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { DEBT_ALERT_THRESHOLD } from "@/lib/dashboard-keys";
import { SceneCanvas } from "./SceneCanvas";

const DEBT_CHUNK = 5_000_000; // mỗi "thùng nợ" tương ứng 5 triệu
const MAX_BOXES = 8;
const BOX_SIZE: [number, number, number] = [0.95, 0.5, 0.95];
const BOX_OFFSET = 0.52;

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

interface DebtStack3DProps {
  totalRemaining: number;
  /** Chiều cao vùng 3D (px) — mặc định fill vùng cha */
  height?: number;
}

/**
 * Total Debt 3D — "chồng thùng nợ": cụm khối hộp xếp chồng, tổng chiều cao
 * tỉ lệ tổng nợ hiện tại (mỗi thùng = DEBT_CHUNK). Khối chuyển màu đỏ khi
 * vượt ngưỡng cấu hình (DEBT_ALERT_THRESHOLD), màu vàng (cảnh báo) khi còn
 * dưới ngưỡng. Số tiền chính xác hiển thị to bên cạnh (widget cha), hover
 * thùng cho tooltip 2D.
 */
export default function DebtStack3D({
  totalRemaining,
  height,
}: DebtStack3DProps) {
  const [hovered, setHovered] = useState(false);

  const boxCount = useMemo(() => {
    if (totalRemaining <= 0) return 1;
    return Math.min(Math.ceil(totalRemaining / DEBT_CHUNK), MAX_BOXES);
  }, [totalRemaining]);

  const overThreshold = totalRemaining > DEBT_ALERT_THRESHOLD;
  const baseColor = overThreshold ? "#ef4444" : "#f59e0b";
  const topColor = overThreshold ? "#f87171" : "#fbbf24";
  const totalHeight = BOX_SIZE[1] + (boxCount - 1) * BOX_OFFSET;

  return (
    <div className="h-full w-full" style={height ? { height } : undefined}>
      <SceneCanvas
        camera={{ position: [0, 1.5, 4.8], fov: 45 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <DebtStackScene
          totalRemaining={totalRemaining}
          boxCount={boxCount}
          overThreshold={overThreshold}
          baseColor={baseColor}
          topColor={topColor}
          totalHeight={totalHeight}
          hovered={hovered}
          onHoverChange={setHovered}
        />
      </SceneCanvas>
    </div>
  );
}

/**
 * Scene bên trong Canvas — useThree chỉ hợp lệ trong cây Canvas,
 * nên invalidate được lấy ở component này (không phải component cha).
 */
function DebtStackScene({
  totalRemaining,
  boxCount,
  overThreshold,
  baseColor,
  topColor,
  totalHeight,
  hovered,
  onHoverChange,
}: {
  totalRemaining: number;
  boxCount: number;
  overThreshold: boolean;
  baseColor: string;
  topColor: string;
  totalHeight: number;
  hovered: boolean;
  onHoverChange: (value: boolean) => void;
}) {
  const invalidate = useThree((state) => state.invalidate);

  return (
    <>
      {/* Nền đỡ */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 2.2]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.1} />
      </mesh>

      {Array.from({ length: boxCount }).map((_, index) => {
        const y = BOX_SIZE[1] / 2 + index * BOX_OFFSET;
        const isTop = index === boxCount - 1;
        return (
          <Box
            key={index}
            args={BOX_SIZE}
            position={[0, y, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverChange(true);
              invalidate();
            }}
            onPointerOut={() => {
              onHoverChange(false);
              invalidate();
            }}
          >
            <meshStandardMaterial
              color={isTop ? topColor : baseColor}
              emissive={baseColor}
              emissiveIntensity={hovered && isTop ? 0.45 : 0.06}
              roughness={0.5}
              metalness={0.05}
            />
          </Box>
        );
      })}

      {/* Nhãn tổng nợ ngay trên đỉnh chồng (text — nguyên tắc #1) */}
      <Html
        position={[0, totalHeight + 0.35, 0]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums shadow ${
            overThreshold
              ? "bg-red-500 text-white"
              : "bg-amber-400/90 text-amber-950"
          }`}
        >
          {formatCompact(Math.max(totalRemaining, 0))} đ
        </div>
      </Html>

      {hovered && (
        <Html
          position={[1.1, 0.4, 0]}
          center
          zIndexRange={[40, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded-lg border border-border bg-background/95 px-2.5 py-1.5 text-xs shadow-xl shadow-black/10 backdrop-blur-md">
            <div className="font-semibold">Tổng nợ chưa thu</div>
            <div className="mt-0.5 tabular-nums">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
                maximumFractionDigits: 0,
              }).format(Math.max(totalRemaining, 0))}
            </div>
            {overThreshold && (
              <div className="mt-0.5 text-red-600 dark:text-red-400">
                Vượt ngưỡng cảnh báo
              </div>
            )}
          </div>
        </Html>
      )}
    </>
  );
}
