"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Edges } from "@react-three/drei";
import { useSpring } from "@react-spring/three";
import {
  formatCurrency,
  fmtFullDate,
  type RevenueBucket,
  type TimelineGranularity,
} from "@/lib/report-utils";
import PeriodTransactionsSheet from "./PeriodTransactionsSheet";

// ── Kích thước & ngữ nghĩa màu ────────────────────────────────────────────────
const SPACING = 1.15; // khoảng cách giữa 2 trạm
const BAR_WIDTH = 0.74;
const BAR_DEPTH = 0.74;
const MAX_H = 3.4;

// Ngữ nghĩa màu (đúng nguyên tắc #7): xanh = tăng/ổn định, đỏ = giảm/cảnh báo
const COLOR_RISE = "#10b981";
const COLOR_FALL = "#ef4444";
const COLOR_FIRST = "#3b82f6";

const LABEL_VISIBLE_COUNT = 3; // số trạm hiện nhãn xung quanh trung tâm (LOD)

// ── WebGL fallback ────────────────────────────────────────────────────────────
function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

interface RevenueTimeline3DProps {
  stations: RevenueBucket[];
  granularity: TimelineGranularity;
  /** Để ExportButton chụp snapshot Canvas khi đang ở chế độ 3D */
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
}

/**
 * Revenue Overview — chế độ "Dòng thời gian 3D".
 * - 1 trục thời gian nằm ngang; mỗi mốc ngày/tuần/tháng là 1 "trạm" với cột
 *   dữ liệu nổi lên, chiều cao cột = doanh thu tại mốc đó.
 * - Kéo thanh scroll riêng bên dưới canvas để "du hành" dọc trục thời gian
 *   (không dùng scroll trang).
 * - Hover cột → tooltip 2D (ngày + giá trị chính xác VND).
 * - Click cột → mở Sheet chi tiết giao dịch của ngày/kỳ đó.
 * - frameloop="demand" + dpr giới hạn + InstancedMesh (nhiều cột = 1 draw call).
 * - @react-spring/three animate chiều cao cột khi đổi khoảng thời gian.
 */
export default function RevenueTimeline3D({
  stations,
  granularity,
  snapshotRef,
}: RevenueTimeline3DProps) {
  const [webglSupported] = useState(supportsWebGL);
  const [scroll, setScroll] = useState(0); // 0..1
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<RevenueBucket | null>(null);

  const maxRevenue = useMemo(
    () => Math.max(...stations.map((s) => s.totalRevenue), 1),
    [stations],
  );

  const maxIndex = Math.max(0, stations.length - 1);
  const centerIndex = Math.min(
    maxIndex,
    Math.max(0, Math.round(scroll * maxIndex)),
  );

  // Reset khi đổi khoảng thời gian trong DateRangeSelector
  useEffect(() => {
    setScroll(0);
    setHovered(null);
    setSelected(null);
  }, [stations]);

  if (!webglSupported) {
    return <WebGLFallback granularity={granularity} />;
  }

  const selectedIndex = selected
    ? stations.findIndex((s) => s.key === selected.key)
    : -1;

  return (
    <div className="flex h-full w-full flex-col">
      {/* ── Canvas 3D ── */}
      <div className="relative min-h-0 flex-1">
        <Canvas
          frameloop="demand"
          dpr={[1, 1.75]}
          camera={{ position: [0, 3.1, 7.4], fov: 45 }}
          gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
          resize={{ scroll: false }}
          style={{ position: "absolute", inset: 0 }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 6]} intensity={0.95} />
          <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#b8c6ff" />
          <TimelineScene
            key={stations.map((s) => s.key).join("|")}
            stations={stations}
            maxRevenue={maxRevenue}
            scroll={scroll}
            hovered={hovered}
            selectedIndex={selectedIndex}
            onHover={setHovered}
            onSelect={setSelected}
            snapshotRef={snapshotRef}
          />
          <OrbitControls
            makeDefault
            target={[0, 1.2, 0]}
            enablePan={false}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2 - 0.12}
            minDistance={3}
            maxDistance={15}
          />
        </Canvas>
      </div>

      {/* ── Thanh scroll "du hành" (không dùng scroll trang) ── */}
      {stations.length > 5 && (
        <div className="mt-1.5 px-1">
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(scroll * 1000)}
            onChange={(e) => setScroll(Number(e.target.value) / 1000)}
            aria-label="Di chuyển dọc trục thời gian"
            className="w-full accent-blue-600"
          />
        </div>
      )}

      {/* ── Thông tin trạm hiện tại (text luôn hiển thị — a11y) ── */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <span className="font-semibold text-foreground">
            {stations[centerIndex]?.label ?? "—"}
          </span>
          {stations[centerIndex] && (
            <>
              <span className="hidden sm:inline">
                {fmtFullDate(stations[centerIndex].startDate)}
                {stations[centerIndex].startDate !== stations[centerIndex].endDate &&
                  ` → ${fmtFullDate(stations[centerIndex].endDate)}`}
              </span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(stations[centerIndex].totalRevenue)}
              </span>
              <span>· {stations[centerIndex].orderCount} đơn</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Tăng
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
            Giảm
          </span>
          <span className="hidden text-muted-foreground md:inline">
            • Kéo thanh để du hành • Click cột xem chi tiết
          </span>
        </div>
      </div>

      <PeriodTransactionsSheet
        station={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

// ── Scene bên trong Canvas ────────────────────────────────────────────────────
function TimelineScene({
  stations,
  maxRevenue,
  scroll,
  hovered,
  selectedIndex,
  onHover,
  onSelect,
  snapshotRef,
}: {
  stations: RevenueBucket[];
  maxRevenue: number;
  scroll: number;
  hovered: number | null;
  selectedIndex: number;
  onHover: (index: number | null) => void;
  onSelect: (bucket: RevenueBucket) => void;
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
  } | null;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevHoverRef = useRef<number | null>(null);
  const grow = useSpring({
    from: { v: 0 },
    to: { v: 1 },
    config: { duration: 550 },
  });

  const N = stations.length;
  const totalWidth = Math.max(0, (N - 1) * SPACING);
  const targetX = scroll * totalWidth;

  const colors = useMemo(
    () =>
      stations.map((s, i) =>
        i === 0
          ? new THREE.Color(COLOR_FIRST)
          : new THREE.Color(
              s.totalRevenue >= stations[i - 1].totalRevenue
                ? COLOR_RISE
                : COLOR_FALL,
            ),
      ),
    [stations],
  );

  const heights = useMemo(
    () =>
      stations.map((s) =>
        Math.max((s.totalRevenue / maxRevenue) * MAX_H, 0.06),
      ),
    [stations, maxRevenue],
  );

  // Cửa sổ nhãn (LOD): chỉ hiện nhãn trạm quanh trung tâm camera
  const [labelWindow, setLabelWindow] = useState({ min: 0, max: Math.min(N - 1, LABEL_VISIBLE_COUNT) });
  const labelWinRef = useRef(labelWindow);

  useFrame(() => {
    const g = Math.min(1, grow.v.get());
    const mesh = meshRef.current;

    // Cập nhật ma trận + màu từng cột (ghi vào InstancedMesh)
    if (mesh) {
      for (let i = 0; i < N; i++) {
        const scaleY = Math.max(0.001, heights[i] * g);
        const m = new THREE.Matrix4();
        m.makeScale(BAR_WIDTH, scaleY, BAR_DEPTH);
        m.setPosition(i * SPACING, scaleY / 2, 0);
        mesh.setMatrixAt(i, m);
        const c = colors[i];
        const final = hovered === i ? c.clone().lerp(new THREE.Color("#ffffff"), 0.35) : c;
        mesh.setColorAt(i, final);
      }
      mesh.count = N;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Camera "du hành" dọc trục thời gian theo thanh scroll (giữ góc nhìn:
    // dịch cùng lúc target + camera theo cùng 1 delta → offset không đổi)
    let moving = false;
    if (controls && camera && N > 1) {
      const dx = targetX - controls.target.x;
      if (Math.abs(dx) > 0.01) {
        const step = dx * 0.14;
        controls.target.x += step;
        camera.position.x += step;
        moving = true;
      }
    }

    // Cập nhật cửa sổ nhãn khi trung tâm đổi
    const center = controls?.target?.x ?? 0;
    const bucket = Math.round(center / SPACING);
    const next = {
      min: Math.max(0, bucket - LABEL_VISIBLE_COUNT),
      max: Math.min(N - 1, bucket + LABEL_VISIBLE_COUNT),
    };
    if (
      next.min !== labelWinRef.current.min ||
      next.max !== labelWinRef.current.max
    ) {
      labelWinRef.current = next;
      setLabelWindow(next);
    }

    const hoverChanged = prevHoverRef.current !== hovered;
    prevHoverRef.current = hovered;

    // frameloop="demand": chỉ vẽ tiếp khi đang animate / camera chạy / hover đổi
    if (g < 0.999 || moving || hoverChanged) invalidate();
  });

  const visibleStations = stations.slice(labelWindow.min, labelWindow.max + 1);

  return (
    <group>
      {/* Nền đỡ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[totalWidth / 2, -0.02, 0]}>
        <planeGeometry args={[Math.max(totalWidth + 4, 6), 4]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.08} />
      </mesh>

      {/* Trục thời gian (đường ray) */}
      <mesh position={[totalWidth / 2, -0.02, 0]}>
        <boxGeometry args={[Math.max(totalWidth + 1.6, 3), 0.06, 0.18]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.4} />
      </mesh>

      {/* Cột dữ liệu — InstancedMesh */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(N, 1)]}
        frustumCulled={false}
        onClick={(e) => {
          e.stopPropagation();
          if (e.instanceId == null || !stations[e.instanceId]) return;
          onSelect(stations[e.instanceId]);
          invalidate();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(e.instanceId ?? null);
          invalidate();
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
          invalidate();
        }}
      >
        <boxGeometry args={[BAR_WIDTH, 1, BAR_DEPTH]} />
        <meshStandardMaterial roughness={0.5} metalness={0.05} />
      </instancedMesh>

      {/* Viền nổi bật cho cột đang hover / được chọn */}
      {hovered !== null && hovered >= 0 && hovered < N && (
        <OutlineColumn x={hovered * SPACING} h={heights[hovered]} color="#facc15" />
      )}
      {selectedIndex >= 0 && selectedIndex < N && (
        <OutlineColumn x={selectedIndex * SPACING} h={heights[selectedIndex]} color="#22d3ee" />
      )}

      {/* Nhãn trạm (LOD — chỉ quanh trung tâm) */}
      {visibleStations.map((s, i) => {
        const index = labelWindow.min + i;
        return (
          <Html
            key={s.key}
            position={[index * SPACING, -0.3, 0]}
            center
            zIndexRange={[30, 0]}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <div className="whitespace-nowrap rounded bg-background/80 px-1 text-[10px] text-muted-foreground">
              {s.label}
            </div>
          </Html>
        );
      })}

      {/* Tooltip 2D khi hover — ngày + giá trị chính xác */}
      {hovered !== null && hovered >= 0 && hovered < N && stations[hovered] && (
        <Html
          position={[hovered * SPACING, heights[hovered] + 0.55, 0]}
          center
          zIndexRange={[40, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded-lg border border-border bg-background/95 px-2.5 py-1.5 text-xs shadow-xl shadow-black/10 backdrop-blur-md">
            <div className="font-semibold">
              {stations[hovered].startDate === stations[hovered].endDate
                ? fmtFullDate(stations[hovered].startDate)
                : stations[hovered].label}
            </div>
            <div className="mt-0.5 tabular-nums font-semibold">
              {formatCurrency(stations[hovered].totalRevenue)}
            </div>
            <div className="mt-0.5 text-muted-foreground">
              {stations[hovered].orderCount} đơn hàng
            </div>
          </div>
        </Html>
      )}

      {/* Cầu nối chụp snapshot cho ExportButton */}
      <SnapshotBridge snapshotRef={snapshotRef} />
    </group>
  );
}

/** Viền khung quanh 1 cột (hover/chọn) */
function OutlineColumn({ x, h, color }: { x: number; h: number; color: string }) {
  return (
    <mesh position={[x, h / 2, 0]}>
      <boxGeometry args={[BAR_WIDTH * 1.12, Math.max(h + 0.1, 0.2), BAR_DEPTH * 1.12]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      <Edges color={color} />
    </mesh>
  );
}

/**
 * Cầu nối giữa Canvas 3D và ExportButton: expose hàm render + chụp canvas
 * hiện tại (ghép vào PDF khi đang ở chế độ 3D).
 */
function SnapshotBridge({
  snapshotRef,
}: {
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useLayoutEffect(() => {
    snapshotRef.current = () => {
      try {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    };
    return () => {
      snapshotRef.current = null;
    };
  }, [gl, scene, camera, snapshotRef]);

  return null;
}

// ── Fallback khi không hỗ trợ WebGL ───────────────────────────────────────────
function WebGLFallback({ granularity }: { granularity: TimelineGranularity }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 p-6 text-center">
      <svg
        viewBox="0 0 220 110"
        className="h-32 w-56 opacity-80"
        aria-hidden="true"
      >
        <line x1="14" y1="92" x2="206" y2="92" stroke="#94a3b8" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const h = [34, 52, 40, 66, 58, 74, 46][i];
          const up = i === 0 || [34, 52, 40, 66, 58, 74, 46][i] >= [34, 52, 40, 66, 58, 74, 46][i - 1] || i === 0;
          return (
            <g key={i}>
              <rect
                x={24 + i * 26}
                y={92 - h}
                width="16"
                height={h}
                rx="2"
                fill={up ? "#10b981" : "#ef4444"}
              />
              <line
                x1={24 + i * 26 + 8}
                y1={92 - h}
                x2={24 + i * 26 + 8}
                y2="97"
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          );
        })}
      </svg>
      <p className="text-sm font-medium text-muted-foreground">
        Thiết bị của bạn không hỗ trợ WebGL.
      </p>
      <p className="text-xs text-muted-foreground/80">
        Chuyển sang chế độ đơn giản (biểu đồ 2D) hoặc xem số liệu chính xác ở
        các bảng bên dưới. Chế độ 3D chỉ là hình minh hoạ, không thay thế số liệu
        ({granularity === "day" ? "theo ngày" : granularity === "week" ? "theo tuần" : "theo tháng"}).
      </p>
    </div>
  );
}
