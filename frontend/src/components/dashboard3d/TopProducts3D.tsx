"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TopProductRow } from "@/lib/dashboard-keys";
import { SceneCanvas, useDemandLoop } from "./SceneCanvas";

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];
const BAR_GLOW = ["#818cf8", "#a78bfa", "#22d3ee", "#fbbf24", "#34d399"];
const BAR_WIDTH = 0.7;
const BAR_DEPTH = 0.7;
const BAR_GAP = 0.25;
const MAX_BAR_HEIGHT = 3.0;
const BASE_HEIGHT = 0.12;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function shortName(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

interface BarData {
  product: TopProductRow;
  normalizedHeight: number;
  color: string;
  glowColor: string;
  rank: number;
}

interface TopProducts3DProps {
  data: TopProductRow[];
}

export default function TopProducts3D({ data }: TopProducts3DProps) {
  const items = data ?? [];

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.totalRevenue - a.totalRevenue),
    [items],
  );

  const maxRevenue = useMemo(
    () => Math.max(...sortedItems.map((p) => Math.max(p.totalRevenue, 0)), 1),
    [sortedItems],
  );

  const bars = useMemo<BarData[]>(() => {
    return sortedItems.map((product, index) => ({
      product,
      normalizedHeight: Math.max(product.totalRevenue, 0) / maxRevenue,
      color: BAR_COLORS[index % BAR_COLORS.length],
      glowColor: BAR_GLOW[index % BAR_GLOW.length],
      rank: index + 1,
    }));
  }, [sortedItems, maxRevenue]);

  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    if (selected === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  const activeIndex = selected ?? hovered;
  const activeBar = activeIndex !== null ? bars[activeIndex] : null;

  const totalWidth = bars.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  const offsetX = -totalWidth / 2;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <SceneCanvas
        camera={{ position: [0, 2.8, 6.5], fov: 38 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={12}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minAzimuthAngle={-Math.PI / 3}
          maxAzimuthAngle={Math.PI / 3}
          zoomSpeed={0.8}
          rotateSpeed={0.6}
          dampingFactor={0.1}
          enableDamping={true}
        />
        <BarScene
          bars={bars}
          offsetX={offsetX}
          hovered={hovered}
          selected={selected}
          onHover={setHovered}
          onSelect={setSelected}
        />
      </SceneCanvas>

      {/* Center info */}
      {activeBar && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-50 -translate-x-1/2">
          <div className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-border/50 bg-background/85 px-4 py-2.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow"
                style={{ backgroundColor: activeBar.color }}
              >
                {activeBar.rank}
              </span>
              <span className="max-w-[140px] truncate text-sm font-bold">
                {shortName(activeBar.product.name, 18)}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">Doanh thu:</span>
              <span className="text-right font-bold tabular-nums text-primary">
                {formatCurrency(activeBar.product.totalRevenue)}
              </span>
              <span className="text-muted-foreground">Đã bán:</span>
              <span className="text-right font-bold tabular-nums">
                {activeBar.product.totalQuantitySold.toLocaleString("vi-VN")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-50 flex flex-wrap items-center justify-center gap-1.5 px-2">
        {bars.map((bar, index) => (
          <button
            key={bar.product.productId}
            type="button"
            onClick={() => setSelected(selected === index ? null : index)}
            className={`pointer-events-auto inline-flex max-w-[48%] items-center gap-1 rounded-full px-2 py-0.5 text-[10px] backdrop-blur transition-all ${
              selected === index
                ? "bg-background shadow-md ring-2 ring-ring scale-105"
                : hovered === index
                  ? "bg-background/95 shadow-sm ring-1 ring-ring/50"
                  : "bg-background/80 text-muted-foreground hover:bg-accent"
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: bar.color }}
            />
            <span className="truncate">{shortName(bar.product.name, 14)}</span>
            <span className="shrink-0 font-bold tabular-nums">
              {formatCurrency(bar.product.totalRevenue)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BarScene({
  bars,
  offsetX,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  bars: BarData[];
  offsetX: number;
  hovered: number | null;
  selected: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number | null) => void;
}) {
  useDemandLoop();

  return (
    <>
      {/* Ambient light boost */}
      <ambientLight intensity={0.8} />

      {/* Platform */}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[bars.length * (BAR_WIDTH + BAR_GAP) + 1.2, 2.5]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.35} />
      </mesh>

      {/* Grid lines on platform */}
      {bars.map((_, index) => {
        const x = offsetX + index * (BAR_WIDTH + BAR_GAP);
        return (
          <mesh
            key={index}
            position={[x + BAR_WIDTH / 2, -0.05, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.02, 2.0]} />
            <meshStandardMaterial color="#334155" transparent opacity={0.25} />
          </mesh>
        );
      })}

      {bars.map((bar, index) => {
        const x = offsetX + index * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
        const targetHeight =
          BASE_HEIGHT + bar.normalizedHeight * MAX_BAR_HEIGHT;
        const isHovered = hovered === index;
        const isSelected = selected === index;
        const isActive = isHovered || isSelected;

        return (
          <Bar3D
            key={bar.product.productId}
            bar={bar}
            position={[x, 0, 0]}
            targetHeight={targetHeight}
            isActive={isActive}
            isHovered={isHovered}
            isSelected={isSelected}
            onHover={onHover}
            onSelect={onSelect}
            index={index}
          />
        );
      })}
    </>
  );
}

function Bar3D({
  bar,
  position,
  targetHeight,
  isActive,
  isHovered,
  isSelected,
  onHover,
  onSelect,
  index,
}: {
  bar: BarData;
  position: [number, number, number];
  targetHeight: number;
  isActive: boolean;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (index: number | null) => void;
  onSelect: (index: number | null) => void;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const currentHeight = useRef(BASE_HEIGHT);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = isActive ? targetHeight * 1.03 : targetHeight;
    currentHeight.current += (target - currentHeight.current) * 0.08;
    const h = currentHeight.current;
    meshRef.current.scale.y = h / BASE_HEIGHT;
    meshRef.current.position.y = h / 2;

    if (glowRef.current) {
      const glowTarget = isActive ? 0.4 : 0;
      const currentGlow = (glowRef.current.material as THREE.MeshStandardMaterial).opacity;
      (glowRef.current.material as THREE.MeshStandardMaterial).opacity +=
        (glowTarget - currentGlow) * 0.1;
      glowRef.current.position.y = h / 2;
      glowRef.current.scale.y = h / BASE_HEIGHT;
    }
  });

  const labelY = targetHeight + 0.35;

  return (
    <group position={position}>
      {/* Glow effect behind bar */}
      <mesh ref={glowRef} position={[0, targetHeight / 2, -BAR_DEPTH / 2 - 0.05]}>
        <boxGeometry args={[BAR_WIDTH + 0.15, BASE_HEIGHT, 0.08]} />
        <meshStandardMaterial
          color={bar.glowColor}
          transparent
          opacity={0}
          emissive={bar.glowColor}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Main bar */}
      <mesh
        ref={meshRef}
        position={[0, BASE_HEIGHT / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(isSelected ? null : index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(index);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[BAR_WIDTH, BASE_HEIGHT, BAR_DEPTH]} />
        <meshStandardMaterial
          color={isActive ? bar.glowColor : bar.color}
          emissive={bar.color}
          emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.35 : 0.08}
          roughness={isActive ? 0.3 : 0.5}
          metalness={isActive ? 0.15 : 0.05}
        />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, targetHeight + 0.02, 0]}>
        <boxGeometry args={[BAR_WIDTH + 0.06, 0.04, BAR_DEPTH + 0.06]} />
        <meshStandardMaterial
          color={bar.glowColor}
          emissive={bar.color}
          emissiveIntensity={0.3}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Rank badge */}
      <Html
        position={[0, labelY + 0.15, 0]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none" }}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg transition-transform ${
            isActive ? "scale-125" : ""
          }`}
          style={{ backgroundColor: bar.color }}
        >
          {bar.rank}
        </span>
      </Html>

      {/* Value label */}
      <Html
        position={[0, labelY - 0.1, 0]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap text-center">
          <div
            className={`text-[11px] font-bold tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] transition-all ${
              isActive ? "text-white scale-110" : "text-white/90"
            }`}
          >
            {(bar.normalizedHeight * 100).toFixed(0)}%
          </div>
        </div>
      </Html>

      {/* Product name below bar */}
      <Html
        position={[0, -0.3, 0]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="max-w-[80px] truncate text-center text-[9px] font-medium text-muted-foreground">
          {shortName(bar.product.name, 12)}
        </div>
      </Html>
    </group>
  );
}
