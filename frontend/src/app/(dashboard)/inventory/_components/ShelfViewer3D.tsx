"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Edges } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import type { StockLevelRow } from "@/hooks/useInventory";

// ── Kích thước kệ hàng ────────────────────────────────────────────────────────
const SHELF_ROWS = 3; // 3 tầng
const SHELF_SLOTS = 5; // 5 ô ngang mỗi kệ
const CELLS_PER_SHELF = SHELF_ROWS * SHELF_SLOTS; // 15 sản phẩm / kệ

const SLOT_WIDTH = 0.72;
const SLOT_DEPTH = 0.72;
const SHELF_WIDTH = SHELF_SLOTS * SLOT_WIDTH; // 3.6
const SHELF_GAP = 0.5;
const SHELF_PITCH = SHELF_WIDTH + SHELF_GAP; // 4.1
const SHELF_HEIGHT = 2.3;

const ROW_LEVELS = [0.62, 1.3, 1.98]; // y tâm của từng tầng kệ
const BLOCK_WIDTH = 0.62;
const BLOCK_DEPTH = 0.6;
const BLOCK_HEIGHT = 0.52;

const COLOR_GREEN = "#10b981";
const COLOR_YELLOW = "#f59e0b";
const COLOR_RED = "#ef4444";

// ── Meta 1 ô kệ ───────────────────────────────────────────────────────────────
interface CellMeta {
  productId: string;
  productName: string;
  stock: number;
  index: number;
  row: number;
  x: number;
  y: number;
  z: number;
  h: number;
  color: THREE.Color;
  blink: boolean;
  match: boolean;
  focused: boolean;
  highlight: boolean;
}

function buildCells(
  items: StockLevelRow[],
  searchQuery: string,
  focusProductId: string | null,
  selectedProductId: string | null,
): CellMeta[] {
  const q = searchQuery.trim().toLowerCase();
  const searchActive = q.length > 0;
  const dimFactor = new THREE.Color(0.28, 0.28, 0.3);

  return items.map((item, i) => {
    const row = i % SHELF_ROWS;
    const shelfCol = Math.floor(i / SHELF_ROWS) % SHELF_SLOTS;
    const shelfIndex = Math.floor(i / CELLS_PER_SHELF);
    const x = shelfIndex * SHELF_PITCH + (shelfCol + 0.5) * SLOT_WIDTH;
    const boardTop = ROW_LEVELS[row] - 0.1;
    const h = BLOCK_HEIGHT;
    const y = boardTop + h / 2;
    const z = 0;

    const match =
      item.productName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q);
    const focused = item.productId === focusProductId;
    const selected = item.productId === selectedProductId;

    let base: string;
    let blink = false;
    if (item.currentStock <= 0) {
      base = COLOR_RED;
      blink = true;
    } else if (item.currentStock <= (item.minStock ?? 5)) {
      base = COLOR_YELLOW;
      blink = true;
    } else {
      base = COLOR_GREEN;
    }

    const color = new THREE.Color(base);
    if (searchActive && !match) color.multiply(dimFactor);

    return {
      productId: item.productId,
      productName: item.productName,
      stock: item.currentStock,
      index: i,
      row,
      x,
      y,
      z,
      h,
      color,
      blink,
      match,
      focused,
      highlight: focused || selected || (searchActive && match),
    };
  });
}

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

// ── Props ─────────────────────────────────────────────────────────────────────
interface ShelfViewer3DProps {
  items: StockLevelRow[];
  /** Từ khoá tìm kiếm dùng chung với bảng 2D — nổi bật ô khớp, làm mờ ô còn lại */
  searchQuery: string;
  /** Sản phẩm được chọn từ phía bảng 2D */
  selectedProductId: string | null;
  /** Sản phẩm cần camera bay tới (từ bảng 2D) */
  focusProductId: string | null;
  /** Tăng lên mỗi lần bấm bảng để bay lại dù cùng sản phẩm */
  focusNonce: number;
  /** Click ô kệ → truyền ngược lên trang (highlight bảng + mở dialog nhập kho) */
  onCellClick: (productId: string) => void;
}

/**
 * ShelfViewer3D — chế độ xem kệ hàng 3D của trang Kho hàng.
 * - InstancedMesh cho toàn bộ khối sản phẩm (hàng trăm sản phẩm = 1 draw call).
 * - Khối đỏ (<10% tồn) nhấp nháy bằng @react-spring/three trên 1 mesh riêng.
 * - Label tên sản phẩm chỉ hiện khi camera đủ gần + ô nằm trong khung nhìn (LOD).
 * - Đồng bộ 2 chiều: click bảng → camera bay tới ô; click ô → callback lên bảng.
 * - frameloop="demand" — chỉ render khi có invalidate (fly/blink/tương tác).
 */
export default function ShelfViewer3D({
  items,
  searchQuery,
  selectedProductId,
  focusProductId,
  focusNonce,
  onCellClick,
}: ShelfViewer3DProps) {
  const [webglSupported] = useState(supportsWebGL);

  const cells = useMemo(
    () => buildCells(items, searchQuery, focusProductId, selectedProductId),
    [items, searchQuery, focusProductId, selectedProductId],
  );
  const shelfCount = Math.max(1, Math.ceil(items.length / CELLS_PER_SHELF));
  const initialX = ((shelfCount - 1) / 2) * SHELF_PITCH + SHELF_WIDTH / 2;

  if (!webglSupported) {
    return <WebGLFallback />;
  }

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [initialX, 1.6, 7.2], fov: 50 }}
      gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
      resize={{ scroll: false }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 6]} intensity={0.95} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#b8c6ff" />
      <ShelfScene
        cells={cells}
        shelfCount={shelfCount}
        initialX={initialX}
        focusProductId={focusProductId}
        focusNonce={focusNonce}
        onCellClick={onCellClick}
      />
      <OrbitControls
        makeDefault
        target={[initialX, 1.25, 0]}
        minDistance={1.4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2 - 0.06}
        enableDamping={false}
      />
    </Canvas>
  );
}

// ── Scene chính ───────────────────────────────────────────────────────────────
function ShelfScene({
  cells,
  shelfCount,
  initialX,
  focusProductId,
  focusNonce,
  onCellClick,
}: {
  cells: CellMeta[];
  shelfCount: number;
  initialX: number;
  focusProductId: string | null;
  focusNonce: number;
  onCellClick: (productId: string) => void;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  // OrbitControls có makeDefault → state.controls = instance của OrbitControls
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
  } | null;

  const [win, setWin] = useState({ close: false, start: 0, end: 0 });
  const winRef = useRef({ close: false, bucket: Number.NaN });
  const flyRef = useRef<THREE.Vector3 | null>(null);

  const hasBlink = cells.some((c) => c.blink);

  // Camera bay tới ô khi bảng 2D chọn sản phẩm (focusProductId + focusNonce)
  useEffect(() => {
    if (!focusProductId) return;
    const cell = cells.find((c) => c.productId === focusProductId);
    if (!cell) return;
    flyRef.current = new THREE.Vector3(cell.x, ROW_LEVELS[cell.row] + 0.05, 0);
  }, [focusProductId, focusNonce, cells]);

  useFrame(() => {
    // Nhấp nháy đỏ liên tục cần invalidate mỗi frame (frameloop demand)
    if (hasBlink) invalidate();

    // Bay camera tới ô đang focus
    if (flyRef.current && controls) {
      const t = flyRef.current;
      controls.target.lerp(t, 0.12);
      const desired = new THREE.Vector3(t.x, t.y + 0.55, 3.4);
      camera.position.lerp(desired, 0.12);
      invalidate();
      if (camera.position.distanceTo(desired) < 0.1) flyRef.current = null;
    }

    // Cập nhật cửa sổ label (LOD): chỉ render label khi camera đủ gần
    const targetX = controls?.target?.x ?? initialX;
    const dist = camera.position.distanceTo(
      new THREE.Vector3(targetX, 1.25, 0),
    );
    const close = dist < 13.5;
    const bucket = Math.round(targetX / 0.8);
    if (close !== winRef.current.close || bucket !== winRef.current.bucket) {
      winRef.current = { close, bucket };
      setWin({ close, start: targetX - 3.4, end: targetX + 3.4 });
    }
  });

  const labelCells = win.close
    ? cells.filter((c) => c.x >= win.start && c.x <= win.end)
    : [];

  return (
    <group>
      <ShelfStructure shelfCount={shelfCount} />
      <CellMeshes cells={cells} onCellClick={onCellClick} />
      <HighlightOutlines cells={cells} />

      {/* Label tên sản phẩm — chỉ hiện khi camera đủ gần & ô trong khung nhìn */}
      {labelCells.map((cell) => (
        <Html
          key={cell.productId}
          position={[cell.x, cell.y + cell.h / 2 + 0.42, 0.35]}
          center
          zIndexRange={[40, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="max-w-[120px] truncate rounded-md border border-white/10 bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-lg">
              {cell.productName}
            </span>
            <span
              className={`rounded px-1.5 text-[10px] font-bold tabular-nums text-white ${
                cell.blink ? "bg-red-600" : "bg-black/55"
              }`}
            >
              {cell.stock} cái
            </span>
          </div>
        </Html>
      ))}
    </group>
  );
}

// ── Kệ gỗ (khung) ─────────────────────────────────────────────────────────────
function ShelfStructure({ shelfCount }: { shelfCount: number }) {
  const wood = "#b45309";
  const woodDark = "#92400e";

  const boards = [];
  for (let s = 0; s < shelfCount; s++) {
    const ox = s * SHELF_PITCH;
    // Tấm lưng
    boards.push(
      <mesh key={`back-${s}`} position={[ox + SHELF_WIDTH / 2, SHELF_HEIGHT / 2, -0.42]}>
        <boxGeometry args={[SHELF_WIDTH, SHELF_HEIGHT, 0.06]} />
        <meshStandardMaterial color={woodDark} roughness={0.9} />
      </mesh>,
    );
    // Chân trái/phải
    boards.push(
      <mesh key={`post-l-${s}`} position={[ox + 0.06, SHELF_HEIGHT / 2, -0.3]}>
        <boxGeometry args={[0.1, SHELF_HEIGHT, 0.12]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>,
      <mesh key={`post-r-${s}`} position={[ox + SHELF_WIDTH - 0.06, SHELF_HEIGHT / 2, -0.3]}>
        <boxGeometry args={[0.1, SHELF_HEIGHT, 0.12]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>,
    );
    // Các tầng kệ
    ROW_LEVELS.forEach((rowY, r) => {
      boards.push(
        <mesh key={`board-${s}-${r}`} position={[ox + SHELF_WIDTH / 2, rowY - 0.1, 0]}>
          <boxGeometry args={[SHELF_WIDTH, 0.08, SLOT_DEPTH + 0.14]} />
          <meshStandardMaterial color={wood} roughness={0.8} />
        </mesh>,
      );
    });
    // Mặt nền + nóc
    boards.push(
      <mesh key={`floor-${s}`} position={[ox + SHELF_WIDTH / 2, 0.14, 0]}>
        <boxGeometry args={[SHELF_WIDTH, 0.1, SLOT_DEPTH + 0.14]} />
        <meshStandardMaterial color={woodDark} roughness={0.9} />
      </mesh>,
      <mesh key={`top-${s}`} position={[ox + SHELF_WIDTH / 2, SHELF_HEIGHT + 0.04, 0]}>
        <boxGeometry args={[SHELF_WIDTH, 0.08, SLOT_DEPTH + 0.14]} />
        <meshStandardMaterial color={woodDark} roughness={0.9} />
      </mesh>,
    );
  }

  return <group>{boards}</group>;
}

// ── Khối sản phẩm (InstancedMesh) ─────────────────────────────────────────────
function CellMeshes({
  cells,
  onCellClick,
}: {
  cells: CellMeta[];
  onCellClick: (productId: string) => void;
}) {
  const staticRef = useRef<THREE.InstancedMesh>(null);
  const blinkRef = useRef<THREE.InstancedMesh>(null);

  const staticCells = useMemo(() => cells.filter((c) => !c.blink), [cells]);
  const blinkCells = useMemo(() => cells.filter((c) => c.blink), [cells]);

  const staticCount = Math.max(staticCells.length, 1);
  const blinkCount = Math.max(blinkCells.length, 1);

  useLayoutEffect(() => {
    const mesh = staticRef.current;
    if (!mesh) return;
    staticCells.forEach((c, i) => {
      const m = new THREE.Matrix4();
      m.makeScale(1, c.h, 1);
      m.setPosition(c.x, c.y, c.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.color);
    });
    mesh.count = staticCells.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [staticCells]);

  useLayoutEffect(() => {
    const mesh = blinkRef.current;
    if (!mesh) return;
    blinkCells.forEach((c, i) => {
      const m = new THREE.Matrix4();
      m.makeScale(1, c.h, 1);
      m.setPosition(c.x, c.y, c.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.color);
    });
    mesh.count = blinkCells.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blinkCells]);

  const onMeshClick =
    (list: CellMeta[]) =>
    (e: { stopPropagation: () => void; instanceId?: number }) => {
      e.stopPropagation();
      if (e.instanceId == null) return;
      const cell = list[e.instanceId];
      if (cell) onCellClick(cell.productId);
    };

  // Nhấp nháy đỏ cho ô <10% tồn (@react-spring/three)
  const blinkSpring = useSpring({
    from: { opacity: 0.35 },
    to: { opacity: 1 },
    loop: { reverse: true },
    config: { duration: 750 },
  });

  return (
    <>
      <instancedMesh
        ref={staticRef}
        args={[undefined, undefined, staticCount]}
        frustumCulled={false}
        onClick={onMeshClick(staticCells)}
      >
        <boxGeometry args={[BLOCK_WIDTH, 1, BLOCK_DEPTH]} />
        <meshStandardMaterial roughness={0.55} />
      </instancedMesh>

      <instancedMesh
        ref={blinkRef}
        args={[undefined, undefined, blinkCount]}
        frustumCulled={false}
        onClick={onMeshClick(blinkCells)}
      >
        <boxGeometry args={[BLOCK_WIDTH, 1, BLOCK_DEPTH]} />
        <animated.meshStandardMaterial
          transparent
          roughness={0.55}
          color={COLOR_RED}
          emissive={COLOR_RED}
          emissiveIntensity={0.3}
          opacity={blinkSpring.opacity}
        />
      </instancedMesh>
    </>
  );
}

// ── Viền nổi bật cho ô khớp tìm kiếm / đang chọn ─────────────────────────────
function HighlightOutlines({ cells }: { cells: CellMeta[] }) {
  const highlighted = useMemo(
    () => cells.filter((c) => c.highlight),
    [cells],
  );
  if (highlighted.length === 0) return null;

  return (
    <group>
      {highlighted.map((c) => (
        <mesh key={c.productId} position={[c.x, c.y, c.z]}>
          <boxGeometry
            args={[BLOCK_WIDTH * 1.1, Math.max(c.h + 0.1, 0.16), BLOCK_DEPTH * 1.1]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={c.focused ? "#22d3ee" : "#3b82f6"} />
        </mesh>
      ))}
    </group>
  );
}

// ── Fallback khi không hỗ trợ WebGL ───────────────────────────────────────────
function WebGLFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 p-6 text-center">
      <svg
        viewBox="0 0 120 90"
        className="h-28 w-36 opacity-80"
        aria-hidden="true"
      >
        <rect x="8" y="8" width="104" height="74" rx="4" fill="#e2e8f0" />
        <rect x="14" y="14" width="92" height="12" fill="#cbd5e1" />
        <rect x="14" y="34" width="92" height="12" fill="#cbd5e1" />
        <rect x="14" y="54" width="92" height="12" fill="#cbd5e1" />
        <rect x="20" y="17" width="18" height="6" fill="#10b981" />
        <rect x="44" y="17" width="18" height="6" fill="#10b981" />
        <rect x="68" y="17" width="18" height="6" fill="#f59e0b" />
        <rect x="20" y="37" width="18" height="6" fill="#ef4444" />
        <rect x="44" y="37" width="18" height="6" fill="#f59e0b" />
        <rect x="68" y="37" width="18" height="6" fill="#10b981" />
      </svg>
      <p className="text-sm font-medium text-muted-foreground">
        Thiết bị của bạn không hỗ trợ WebGL.
      </p>
      <p className="text-xs text-muted-foreground/80">
        Bạn vẫn theo dõi tồn kho đầy đủ qua bảng bên cạnh. Chế độ 3D chỉ là
        hình minh hoạ, không thay thế số liệu.
      </p>
    </div>
  );
}
