"use client";

import { Html } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard-keys";
import { SceneCanvas, useDemandLoop } from "./SceneCanvas";

export interface ShelfItem {
  productId: string;
  productName: string | null;
  totalQuantity: number;
  /** Ngưỡng tồn tối thiểu — mặc định dùng LOW_STOCK_THRESHOLD */
  minStock?: number;
}

interface MiniShelf3DProps {
  items: ShelfItem[];
  /** Chiều cao vùng 3D (px) — mặc định fill vùng cha */
  height?: number;
  /** Click vào ô sản phẩm → điều hướng tới sản phẩm đó */
  onSelectItem?: (productId: string) => void;
}

// ── Kích thước kệ ─────────────────────────────────────────────────────────────
const SHELF_WIDTH = 3.6;
const SHELF_DEPTH = 1.15;
const SHELF_HEIGHT = 2.3;
const ROWS = 3;
const SLOTS_PER_ROW = 4;
const MAX_CELLS = ROWS * SLOTS_PER_ROW;

const ROW_LEVELS = [0.55, 1.15, 1.75]; // y tâm của từng tầng kệ
const CELL_SIZE: [number, number, number] = [0.62, 0.42, 0.55];

function isLowStock(item: ShelfItem): boolean {
  return item.totalQuantity <= (item.minStock ?? LOW_STOCK_THRESHOLD);
}

/**
 * MiniShelf3D — mô hình kệ hàng thu nhỏ (tái sử dụng chung với B7 Inventory).
 * Các ô sản phẩm dưới ngưỡng tồn tối thiểu sẽ NHẤP NHÁY ĐỎ nhẹ
 * (animate opacity bằng @react-spring/three); ô đủ hàng màu xanh.
 * Số lượng tồn mỗi ô luôn hiển thị dạng text (Html) — không phụ thuộc thị giác.
 */
export default function MiniShelf3D({
  items,
  height,
  onSelectItem,
}: MiniShelf3DProps) {
  const visible = items.slice(0, MAX_CELLS);

  return (
    <div className="h-full w-full" style={height ? { height } : undefined}>
      <SceneCanvas
        camera={{ position: [0, 1.5, 4.6], fov: 45 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ShelfInner items={visible} onSelectItem={onSelectItem} />
      </SceneCanvas>
    </div>
  );
}

function ShelfInner({
  items,
  onSelectItem,
}: {
  items: ShelfItem[];
  onSelectItem?: (productId: string) => void;
}) {
  // Kệ có ô nhấp nháy (chuyển động liên tục) → cần invalidate mỗi frame
  useDemandLoop();

  const woodColor = "#b45309";

  return (
    <group>
      {/* Chân + khung sau */}
      <mesh position={[-(SHELF_WIDTH / 2 - 0.12), SHELF_HEIGHT / 2, -0.25]}>
        <boxGeometry args={[0.12, SHELF_HEIGHT, 0.12]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>
      <mesh position={[SHELF_WIDTH / 2 - 0.12, SHELF_HEIGHT / 2, -0.25]}>
        <boxGeometry args={[0.12, SHELF_HEIGHT, 0.12]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>
      {/* Tấm lưng kệ */}
      <mesh position={[0, SHELF_HEIGHT / 2, -0.35]}>
        <boxGeometry args={[SHELF_WIDTH, SHELF_HEIGHT, 0.08]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      {/* Các tầng kệ */}
      {ROW_LEVELS.map((y) => (
        <mesh key={y} position={[0, y - 0.12, 0]}>
          <boxGeometry args={[SHELF_WIDTH, 0.09, SHELF_DEPTH]} />
          <meshStandardMaterial color={woodColor} roughness={0.8} />
        </mesh>
      ))}

      {/* Ô sản phẩm */}
      {items.map((item, index) => {
        const row = Math.floor(index / SLOTS_PER_ROW) % ROWS;
        const col = index % SLOTS_PER_ROW;
        const x = -SHELF_WIDTH / 2 + (col + 0.5) * (SHELF_WIDTH / SLOTS_PER_ROW);
        const y = ROW_LEVELS[row] + CELL_SIZE[1] / 2 + 0.04;
        const low = isLowStock(item);

        return (
          <group
            key={item.productId}
            position={[x, y, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem?.(item.productId);
            }}
          >
            <BlinkingCell low={low} />
            {/* Số lượng tồn luôn hiển thị dạng text */}
            <Html
              position={[0, -CELL_SIZE[1] / 2 - 0.18, 0.28]}
              center
              zIndexRange={[30, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div
                className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white shadow ${
                  low ? "bg-red-600" : "bg-emerald-600"
                }`}
              >
                {item.totalQuantity}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/** Ô sản phẩm — nhấp nháy đỏ nhẹ nếu dưới ngưỡng tồn tối thiểu */
function BlinkingCell({ low }: { low: boolean }) {
  const { opacity } = useSpring({
    from: { opacity: 0.3 },
    to: { opacity: 1 },
    loop: { reverse: true },
    config: { duration: 850 },
  });

  return (
    <animated.mesh>
      <boxGeometry args={CELL_SIZE} />
      <animated.meshStandardMaterial
        transparent={low}
        opacity={low ? opacity : 1}
        color={low ? "#ef4444" : "#10b981"}
        emissive={low ? "#ef4444" : "#000000"}
        emissiveIntensity={low ? 0.25 : 0}
        roughness={0.55}
      />
    </animated.mesh>
  );
}
