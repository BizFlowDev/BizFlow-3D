"use client";

import { useMemo, useState } from "react";
import { Box, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DailyRevenuePoint } from "@/lib/dashboard-keys";
import { SceneCanvas } from "./SceneCanvas";

type RevenueTab = "day" | "week" | "month";

interface Bucket {
  label: string;
  totalRevenue: number;
}

const TAB_ORDER: RevenueTab[] = ["day", "week", "month"];
const TAB_LABELS: Record<RevenueTab, string> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Nhóm dữ liệu 7 ngày theo tab Ngày / Tuần / Tháng (theo thứ tự cũ → mới) */
function aggregateBuckets(points: DailyRevenuePoint[], tab: RevenueTab): Bucket[] {
  if (tab === "day") {
    return points.map((p) => ({
      label: `${p.date.slice(8, 10)}/${p.date.slice(5, 7)}`,
      totalRevenue: p.totalRevenue,
    }));
  }

  const groups = new Map<string, { label: string; sum: number }>();
  for (const p of points) {
    const key = tab === "week" ? weekKey(p.date) : monthKey(p.date);
    const label =
      tab === "week"
        ? `Tuần ${p.date.slice(8, 10)}/${p.date.slice(5, 7)}`
        : `Thg ${Number(p.date.slice(5, 7))}`;
    const existing = groups.get(key);
    if (existing) existing.sum += p.totalRevenue;
    else groups.set(key, { label, sum: p.totalRevenue });
  }
  return [...groups.values()].map((g) => ({ label: g.label, totalRevenue: g.sum }));
}

/** Tuần ISO (năm + tuần) — dùng làm key gộp theo tuần */
function weekKey(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = (d.getDay() + 6) % 7; // Thứ 2 = 0
  const iso = new Date(d);
  iso.setDate(d.getDate() - day + 3);
  const yearThursday = new Date(iso.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((iso.getTime() - yearThursday.getTime()) / 864e5 -
        3 +
        ((yearThursday.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-${week}`;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

const BAR_WIDTH = 0.62;
const BAR_SPACING = 1.05;
const MAX_BAR_HEIGHT = 3.1;

interface RevenueChart3DProps {
  data: DailyRevenuePoint[];
  /** Chiều cao vùng 3D (px) — mặc định fill toàn bộ vùng cha */
  height?: number;
}

/**
 * Revenue Chart 3D — cột doanh thu 7 ngày gần nhất.
 * Mỗi cột = 1 ngày, chiều cao tỉ lệ doanh thu; màu xanh khi tăng so với
 * hôm trước, đỏ khi giảm (ngữ nghĩa màu: xanh ổn / đỏ cảnh báo).
 * Hover cột → tooltip 2D (Html) hiện ngày + số tiền chính xác.
 * Tab chuyển Ngày / Tuần / Tháng phía trên canvas.
 */
export default function RevenueChart3D({ data, height }: RevenueChart3DProps) {
  const [tab, setTab] = useState<RevenueTab>("day");
  const [hovered, setHovered] = useState<number | null>(null);

  const buckets = useMemo(() => aggregateBuckets(data ?? [], tab), [data, tab]);
  const max = useMemo(
    () => Math.max(...buckets.map((b) => b.totalRevenue), 1),
    [buckets],
  );

  return (
    <div
      className="flex h-full w-full flex-col"
      style={height ? { height } : undefined}
    >
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as RevenueTab)}
        className="w-fit"
      >
        <TabsList className="h-8">
          {TAB_ORDER.map((key) => (
            <TabsTrigger key={key} value={key} className="px-3 text-xs">
              {TAB_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative min-h-0 flex-1">
        <SceneCanvas
          camera={{ position: [0, 1.9, 6.2], fov: 42 }}
          style={{ position: "absolute", inset: 0 }}
        >
          <RevenueBars
            buckets={buckets}
            max={max}
            hovered={hovered}
            onHoverChange={setHovered}
          />
        </SceneCanvas>
      </div>
    </div>
  );
}

/**
 * Scene bên trong Canvas — useThree chỉ hợp lệ trong cây Canvas,
 * nên invalidate được lấy ở component này (không phải component cha).
 */
function RevenueBars({
  buckets,
  max,
  hovered,
  onHoverChange,
}: {
  buckets: Bucket[];
  max: number;
  hovered: number | null;
  onHoverChange: (index: number | null) => void;
}) {
  const invalidate = useThree((state) => state.invalidate);

  return (
    <>
      {/* Nền đỡ cho các cột */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 2.6]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.1} />
      </mesh>

      {buckets.map((bucket, index) => {
        const barHeight = Math.max((bucket.totalRevenue / max) * MAX_BAR_HEIGHT, 0.12);
        const x = (index - (buckets.length - 1) / 2) * BAR_SPACING;
        const up = index === 0 || bucket.totalRevenue >= buckets[index - 1].totalRevenue;
        const color = up ? "#10b981" : "#ef4444";
        const isHovered = hovered === index;

        return (
          <group key={`${bucket.label}-${index}`} position={[x, 0, 0]}>
            <Box
              args={[BAR_WIDTH, barHeight, BAR_WIDTH]}
              position={[0, barHeight / 2, 0]}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverChange(index);
                invalidate();
              }}
              onPointerOut={() => {
                onHoverChange(null);
                invalidate();
              }}
            >
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered ? 0.45 : 0.1}
                roughness={0.5}
                metalness={0.05}
              />
            </Box>

            {/* Nhãn ngày dưới chân cột (text — không phụ thuộc thị giác không gian) */}
            <Html
              position={[0, -0.32, 0]}
              center
              zIndexRange={[30, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div className="whitespace-nowrap text-[10px] text-muted-foreground">
                {bucket.label}
              </div>
            </Html>

            {/* Tooltip 2D khi hover — ngày + số tiền chính xác */}
            {isHovered && (
              <Html
                position={[0, barHeight + 0.45, 0]}
                center
                zIndexRange={[40, 0]}
                style={{ pointerEvents: "none" }}
              >
                <div className="rounded-lg border border-border bg-background/95 px-2.5 py-1.5 text-xs shadow-xl shadow-black/10 backdrop-blur-md">
                  <div className="font-semibold">{bucket.label}</div>
                  <div className="mt-0.5 tabular-nums font-semibold">
                    {formatCurrency(bucket.totalRevenue)}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}
