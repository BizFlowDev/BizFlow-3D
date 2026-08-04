"use client";

import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TopProductRow } from "@/lib/dashboard-keys";
import { SceneCanvas, useDemandLoop } from "./SceneCanvas";

const SLICE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];
const DONUT_INNER_RADIUS = 0.9;
const DONUT_OUTER_RADIUS = 1.75;
const MIN_DEPTH = 0.35;
const MAX_DEPTH = 2.6;

interface DonutSlice {
  product: TopProductRow;
  startAngle: number;
  endAngle: number;
  share: number;
  depth: number;
  color: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function shortName(name: string, max = 20): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

/** Cắt lát donut 3D (Shape + ExtrudeGeometry) cho 1 sản phẩm */
function buildSliceGeometry(slice: DonutSlice): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const segments = 28;
  shape.absarc(0, 0, DONUT_OUTER_RADIUS, slice.startAngle, slice.endAngle, false);
  shape.absarc(0, 0, DONUT_INNER_RADIUS, slice.endAngle, slice.startAngle, true);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: slice.depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: segments,
  });
  geometry.center();
  return geometry;
}

interface TopProducts3DProps {
  data: TopProductRow[];
}

/**
 * Top Products 3D — donut chart dạng đĩa xoay.
 * Mỗi lát = 1 sản phẩm trong top 5, độ dày lát tỉ lệ tỷ trọng doanh số.
 * Click lát → tooltip 2D (Html) hiện tên sản phẩm + %.
 * Dữ liệu dạng text (tên, %, doanh thu) luôn hiển thị ở legend dưới canvas.
 */
export default function TopProducts3D({ data }: TopProducts3DProps) {
  const items = data ?? [];
  const totalRevenue = useMemo(
    () => items.reduce((sum, p) => sum + Math.max(p.totalRevenue, 0), 0) || 1,
    [items],
  );

  const slices = useMemo<DonutSlice[]>(() => {
    let angle = 0;
    return items.map((product, index) => {
      const share = Math.max(product.totalRevenue, 0) / totalRevenue;
      const startAngle = angle;
      const endAngle = angle + share * Math.PI * 2;
      angle = endAngle;
      return {
        product,
        startAngle,
        endAngle,
        share,
        depth: MIN_DEPTH + share * (MAX_DEPTH - MIN_DEPTH),
        color: SLICE_COLORS[index % SLICE_COLORS.length],
      };
    });
  }, [items, totalRevenue]);

  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="relative h-full w-full">
      <SceneCanvas
        camera={{ position: [0, 2.1, 6.2], fov: 42 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <RotatingDonut
          slices={slices}
          hovered={hovered}
          onHover={setHovered}
          onSelect={setSelected}
        />
      </SceneCanvas>

      {/* Tooltip 2D khi click lát */}
      {selected !== null && slices[selected] && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-xl shadow-black/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slices[selected].color }}
            />
            <span className="max-w-[180px] truncate font-semibold">
              {shortName(slices[selected].product.name)}
            </span>
            <span className="font-semibold tabular-nums text-muted-foreground">
              {(slices[selected].share * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 pl-[18px] tabular-nums text-muted-foreground">
            {formatCurrency(slices[selected].product.totalRevenue)}
          </div>
        </div>
      )}

      {/* Legend — dữ liệu text luôn hiển thị (nguyên tắc #1) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-wrap items-center justify-center gap-1.5 px-2">
        {slices.map((slice, index) => (
          <button
            key={slice.product.productId}
            type="button"
            onClick={() => setSelected(index)}
            className={`pointer-events-auto inline-flex max-w-[46%] items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] backdrop-blur transition-colors hover:bg-accent ${
              selected === index
                ? "ring-2 ring-ring"
                : "text-muted-foreground"
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="truncate">{shortName(slice.product.name, 16)}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {(slice.share * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Đĩa donut tự xoay (gọi invalidate mỗi frame vì frameloop="demand") */
function RotatingDonut({
  slices,
  hovered,
  onHover,
  onSelect,
}: {
  slices: DonutSlice[];
  hovered: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}) {
  const spin = useRef<THREE.Group>(null);
  useDemandLoop();

  useFrame((_, delta) => {
    if (spin.current) {
      spin.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={spin}>
      {/* Lật mặt phẳng XY xuống ngang để nhìn như một "đĩa" */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {slices.map((slice, index) => {
          const angleMid = (slice.startAngle + slice.endAngle) / 2;
          const radiusMid = (DONUT_INNER_RADIUS + DONUT_OUTER_RADIUS) / 2;
          const tooltipPosition: [number, number, number] = [
            Math.cos(angleMid) * radiusMid,
            Math.sin(angleMid) * radiusMid,
            slice.depth + 0.3,
          ];
          const isHovered = hovered === index;

          return (
            <group key={slice.product.productId}>
              <mesh
                geometry={buildSliceGeometry(slice)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(index);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHover(index);
                }}
                onPointerOut={() => onHover(null)}
              >
                <meshStandardMaterial
                  color={slice.color}
                  emissive={slice.color}
                  emissiveIntensity={isHovered ? 0.45 : 0.07}
                  roughness={0.45}
                  metalness={0.05}
                />
              </mesh>

              {/* Nhãn % ngay tại lát (text luôn hiển thị) */}
              <Html
                position={tooltipPosition}
                center
                zIndexRange={[30, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div className="select-none whitespace-nowrap text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                  {(slice.share * 100).toFixed(0)}%
                </div>
              </Html>
            </group>
          );
        })}
      </group>
    </group>
  );
}
