"use client";
import { useRoomFrame } from "./roomActivity";

import { useRef, useState } from "react";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { Door3D } from "./Door3D";
import { type RoomId, ROOMS, type DoorId } from "./types";
import { SmartOcclusionGroup } from "./SmartOcclusion";
import type { StockLevelRow } from "@/hooks/useInventory";

interface WarehouseSceneProps {
  stockItems?: StockLevelRow[];
  visibleStockItems?: StockLevelRow[];
  onOpenProductForm?: () => void;
  onOpenImportStock?: (productId?: string) => void;
  onOpenCategoryManage?: () => void;
  onSelectCargoItem?: (
    item: StockLevelRow,
    location: { aisle: string; level: number; col: number },
  ) => void;
  highlightCategoryId?: string | null;
  onReturnToHallway?: () => void;
  openDoor?: DoorId | null;
  isVisible?: boolean;
  isAnyModalOpen?: boolean;
}

// ── Kích thước & tọa độ phòng kho ─────────────────────────────────────────────
const WAREHOUSE_WIDTH = 15;
const WAREHOUSE_DEPTH = 14;
const WAREHOUSE_HEIGHT = 5.4;
const CENTER_X = -8;
const CENTER_Z = -25;
const WALL_THICKNESS = 0.2;

// ── VÒNG PHÁT SÁNG NỀN TRẠM KHO (Ground Beacon Ring) ──────────────────────────
function StationFloorRing({
  radius = 1.4,
  color = "#38bdf8",
}: {
  radius?: number;
  color?: string;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  useRoomFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 2.2) * 0.05;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ringRef}>
        <ringGeometry args={[radius * 0.94, radius, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} side={2} />
      </mesh>
      <mesh>
        <circleGeometry args={[radius * 0.92, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={2} />
      </mesh>
    </group>
  );
}

// ── 1. KIỆN HÀNG THỰC TẾ ĐA DẠNG (Realistic Cargo Box) ───────────────────────
type CargoType = "carton" | "plastic_tote" | "wooden_crate" | "pallet_bundle";

function RealisticCargoItem({
  item,
  position,
  type = "carton",
  onSelect,
  isHighlighted = false,
}: {
  item: StockLevelRow;
  position: [number, number, number];
  type?: CargoType;
  onSelect: (item: StockLevelRow) => void;
  isHighlighted?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const indicatorRef = useRef<THREE.Mesh>(null);

  const isLowStock = (item.currentStock ?? 0) <= (item.minStock ?? 5);
  const statusColor = isLowStock ? "#ef4444" : "#10b981";

  // Hiệu ứng nhấp nháy cảnh báo nếu hàng sắp hết
  useRoomFrame(({ clock }) => {
    if (isLowStock && indicatorRef.current) {
      const mat = indicatorRef.current.material as THREE.MeshStandardMaterial;
      const t = Math.sin(clock.getElapsedTime() * 6);
      mat.emissiveIntensity = t > 0 ? 1.5 : 0.2;
    }
  });

  const boxHeight = 0.6;

  return (
    <group position={position}>
      {/* ── LOẠI 1: THÙNG CARTON LOGISTICS TIÊU CHUẨN ── */}
      {type === "carton" && (
        <group
          position={[0, boxHeight / 2, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
        >
          {/* Thân thùng carton Kraft */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.7, boxHeight, 0.7]} />
            <meshStandardMaterial
              color={hovered ? "#fbbf24" : "#b47846"}
              roughness={0.75}
              metalness={0.05}
              emissive={hovered ? "#d97706" : "#000000"}
              emissiveIntensity={hovered ? 0.35 : 0}
            />
          </mesh>

          {/* Dải băng keo nâu niêm phong giữa nắp thùng */}
          <mesh position={[0, boxHeight / 2 + 0.002, 0]}>
            <boxGeometry args={[0.16, 0.004, 0.702]} />
            <meshStandardMaterial color="#78350f" roughness={0.4} />
          </mesh>

          {/* Tem nhãn vận chuyển mã vạch (Shipping Label) dán mặt trước */}
          <mesh position={[0.12, 0, 0.352]}>
            <planeGeometry args={[0.22, 0.16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          {/* Vạch mã vạch đen mô phỏng */}
          <mesh position={[0.12, -0.02, 0.353]}>
            <planeGeometry args={[0.18, 0.05]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      )}

      {/* ── LOẠI 2: KHAY NHỰA CÔNG NGHIỆP (Plastic Tote) ── */}
      {type === "plastic_tote" && (
        <group
          position={[0, 0.22, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
        >
          {/* Thân khay nhựa màu xanh công nghiệp */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.68, 0.42, 0.68]} />
            <meshStandardMaterial
              color={hovered ? "#60a5fa" : "#1d4ed8"}
              roughness={0.35}
              metalness={0.15}
              emissive={hovered ? "#2563eb" : "#000000"}
              emissiveIntensity={hovered ? 0.4 : 0}
            />
          </mesh>
          {/* Gờ viền miệng khay */}
          <mesh position={[0, 0.21, 0]}>
            <boxGeometry args={[0.72, 0.04, 0.72]} />
            <meshStandardMaterial color="#172554" roughness={0.3} metalness={0.2} />
          </mesh>
        </group>
      )}

      {/* ── LOẠI 3: THÙNG GỖ XUẤT KHẨU (Wooden Crate) ── */}
      {type === "wooden_crate" && (
        <group
          position={[0, 0.32, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
        >
          {/* Khối gỗ lõi */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.68, 0.6, 0.68]} />
            <meshStandardMaterial
              color={hovered ? "#f59e0b" : "#92400e"}
              roughness={0.85}
              metalness={0.05}
              emissive={hovered ? "#b45309" : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>
          {/* Nẹp viền gỗ chữ X */}
          <mesh position={[0, 0, 0.345]}>
            <boxGeometry args={[0.62, 0.04, 0.02]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.345]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.72, 0.03, 0.015]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* ── LOẠI 4: KIỆN PALLET BỌC MÀNG CO (Shrink-wrapped cargo) ── */}
      {type === "pallet_bundle" && (
        <group
          position={[0, 0.35, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
        >
          {/* Khối hàng xếp tầng bọc màng */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.72, 0.65, 0.72]} />
            <meshStandardMaterial
              color={hovered ? "#fef08a" : "#f1f5f9"}
              roughness={0.2}
              metalness={0.1}
              transparent
              opacity={0.88}
              emissive={hovered ? "#eab308" : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>
        </group>
      )}

      {/* Đèn LED chỉ báo trạng thái tồn kho ở góc dầm */}
      <mesh
        ref={indicatorRef}
        position={[0.34, 0.06, 0.34]}
        castShadow
      >
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isLowStock ? 1.0 : 0.6}
        />
      </mesh>

      {/* Khung viền Neon khi được làm nổi bật danh mục */}
      {isHighlighted && (
        <group position={[0, boxHeight / 2, 0]}>
          <mesh>
            <boxGeometry args={[0.76, boxHeight + 0.06, 0.76]} />
            <meshBasicMaterial color="#c084fc" wireframe={true} />
          </mesh>
        </group>
      )}

      {/* ── TOOLTIP THÔNG TIN CHI TIẾT KHI HOVER ── */}
      {hovered && (
        <Html
          position={[0, boxHeight + 0.45, 0]}
          center
          distanceFactor={7.5}
          style={{ pointerEvents: "none" }}
        >
          <div className="w-56 rounded-xl border border-white/20 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-1.5 border-b border-white/10 pb-1.5 mb-1.5">
              <div>
                <p className="text-xs font-bold text-amber-400 line-clamp-1">{item.productName}</p>
                <p className="text-[10px] text-slate-400">Mã: {item.code || "WH-SKU"}</p>
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${isLowStock
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
              >
                {item.currentStock <= 0 ? "Hết hàng" : isLowStock ? "Sắp hết" : "Còn hàng"}
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Tồn thực tế:</span>
                <span className="font-bold text-white">
                  {item.currentStock} {item.unitName || "Đơn vị"}
                </span>
              </div>
              <div className="pt-2 text-center text-[10px] text-sky-400 font-medium border-t border-white/5">
                💡 Click để xem chi tiết ô kệ & kiểm định 3D
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── 2. HỆ THỐNG KỆ CÔNG NGHIỆP TẢI TRỌNG LỚN (Heavy Duty Warehouse Rack) ──────
function HeavyDutyWarehouseRack({
  position,
  rotation = [0, 0, 0],
  aisleName = "DÃY A",
  aisleSub = "HÀNG TIÊU DÙNG & ĐIỆN TỬ",
  accentColor = "#38bdf8",
  items,
  onSelectItem,
  rackWidth = 6.4,
  highlightCategoryId = null,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  aisleName?: string;
  aisleSub?: string;
  accentColor?: string;
  items: StockLevelRow[];
  onSelectItem: (
    item: StockLevelRow,
    location: { aisle: string; level: number; col: number },
  ) => void;
  rackWidth?: number;
  highlightCategoryId?: string | null;
}) {
  const RACK_W = rackWidth;
  const RACK_D = 1.05;
  const RACK_H = 3.8;
  const LEVELS = [0.45, 1.55, 2.65]; // 3 tầng dầm
  const cols = 5;

  return (
    <group position={position} rotation={rotation}>
      {/* ── CHÂN TRỤ ĐỨNG THÉP XANH LAM ĐẬM (Heavy Duty Uprights) ── */}
      {[-RACK_W / 2 + 0.05, 0, RACK_W / 2 - 0.05].map((x, xi) =>
        [-RACK_D / 2 + 0.05, RACK_D / 2 - 0.05].map((z, zi) => (
          <group key={`upright-${xi}-${zi}`} position={[x, RACK_H / 2, z]}>
            <mesh castShadow>
              <boxGeometry args={[0.09, RACK_H, 0.09]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Chân đế bắt bulong cố định xuống sàn (Base plate) */}
            <mesh position={[0, -RACK_H / 2 + 0.015, 0]}>
              <boxGeometry args={[0.18, 0.03, 0.18]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} />
            </mesh>
          </group>
        )),
      )}

      {/* ── GIẰNG CHÉO CHỊU LỰC CHỮ X SAU LƯNG KỆ (Cross Bracing) ── */}
      <group position={[0, RACK_H / 2, -RACK_D / 2 + 0.04]}>
        <mesh rotation={[0, 0, 0.48]}>
          <boxGeometry args={[RACK_W * 0.55, 0.03, 0.02]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        <mesh rotation={[0, 0, -0.48]}>
          <boxGeometry args={[RACK_W * 0.55, 0.03, 0.02]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      </group>

      {/* ── DẦM NGANG CAM CHỊU TẢI & SÀN LƯỚI THÉP ── */}
      {LEVELS.map((y, li) => (
        <group key={`level-${li}`}>
          {/* Dầm trước & sau màu cam công nghiệp */}
          <mesh position={[0, y, -RACK_D / 2 + 0.045]}>
            <boxGeometry args={[RACK_W, 0.11, 0.06]} />
            <meshStandardMaterial color="#ea580c" roughness={0.35} metalness={0.6} />
          </mesh>
          <mesh position={[0, y, RACK_D / 2 - 0.045]}>
            <boxGeometry args={[RACK_W, 0.11, 0.06]} />
            <meshStandardMaterial color="#ea580c" roughness={0.35} metalness={0.6} />
          </mesh>

          {/* Sàn lưới pallet thép mạ kẽm */}
          <mesh position={[0, y + 0.05, 0]} receiveShadow>
            <boxGeometry args={[RACK_W - 0.1, 0.03, RACK_D - 0.08]} />
            <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.7} />
          </mesh>

          {/* Tem nhãn mã vị trí ô kệ dán trên dầm trước */}
          {Array.from({ length: cols }).map((_, ci) => {
            const labelX = -RACK_W / 2 + 0.6 + ci * ((RACK_W - 1.2) / (cols - 1));
            return (
              <mesh key={`bin-tag-${li}-${ci}`} position={[labelX, y, RACK_D / 2 - 0.01]}>
                <planeGeometry args={[0.16, 0.04]} />
                <meshStandardMaterial color="#fef08a" roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* ── CÁC KIỆN HÀNG TRÊN KỆ (3 tầng x cols vị trí) ── */}
      {items.slice(0, cols * 3).map((it, idx) => {
        const levelIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const posX = -RACK_W / 2 + 0.6 + colIdx * ((RACK_W - 1.2) / (cols - 1));
        const posY = LEVELS[levelIdx] + 0.07;

        const isHighlighted = !!highlightCategoryId && it.categoryId === highlightCategoryId;

        // Xoay vòng các loại kiện hàng để tạo sự đa dạng chân thực
        const cargoTypes: CargoType[] = ["carton", "plastic_tote", "wooden_crate", "pallet_bundle"];
        const chosenType = cargoTypes[idx % cargoTypes.length];

        return (
          <RealisticCargoItem
            key={`${it.productId}-${it.productUnitId}`}
            item={it}
            position={[posX, posY, 0]}
            type={chosenType}
            isHighlighted={isHighlighted}
            onSelect={(selected) =>
              onSelectItem(selected, { aisle: aisleName, level: levelIdx, col: colIdx })
            }
          />
        );
      })}

      {/* ── BIỂN HIỆU ĐẦU HỒI DÃY KỆ (Aisle LED Header) ── */}
      <group position={[0, RACK_H + 0.32, 0]}>
        <mesh>
          <boxGeometry args={[2.8, 0.45, 0.08]} />
          <meshStandardMaterial color="#090d16" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Khung viền LED màu chỉ định */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.84, 0.49, 0.02]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} />
        </mesh>
        <Text
          position={[0, 0.08, 0.05]}
          fontSize={0.17}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {aisleName}
        </Text>
        <Text
          position={[0, -0.1, 0.05]}
          fontSize={0.08}
          color={accentColor}
          anchorX="center"
          anchorY="middle"
        >
          {aisleSub}
        </Text>
      </group>
    </group>
  );
}

// ── 3. MÀN HÌNH LED DASHBOARD GIÁM SÁT KHO (Smart Warehouse WMS LED Board) ────
function WarehouseWMSDashboard({
  position,
  items,
}: {
  position: [number, number, number];
  items: StockLevelRow[];
}) {
  const totalSku = items.length;
  const totalStock = items.reduce((acc, it) => acc + (it.currentStock || 0), 0);
  const lowStockCount = items.filter(
    (it) => (it.currentStock || 0) <= (it.minStock ?? 5),
  ).length;

  const pulseRef = useRef<THREE.Mesh>(null);
  useRoomFrame(({ clock }) => {
    if (pulseRef.current) {
      const mat = pulseRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Khung màn hình LED siêu lớn */}
      <mesh>
        <boxGeometry args={[4.4, 2.3, 0.1]} />
        <meshStandardMaterial color="#030712" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Viền LED phát sáng màu Sky */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4.44, 2.34, 0.02]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#0284c7"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* Màn hình hiển thị nội dung */}
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[4.3, 2.2]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} />
      </mesh>

      {/* Header WMS */}
      <group position={[0, 0.85, 0.07]}>
        <Text fontSize={0.16} color="#38bdf8" anchorX="center" anchorY="middle">
          BIZFLOW WMS 3D • KHO HÀNG THÔNG MINH #02
        </Text>
        <Text position={[0, -0.16, 0]} fontSize={0.08} color="#94a3b8" anchorX="center" anchorY="middle">
          HE THONG GIAM SAT TON KHO REALTIME
        </Text>
        {/* Đèn xanh trạng thái */}
        <mesh ref={pulseRef} position={[1.8, 0, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Thẻ 1: Tổng SKU */}
      <group position={[-1.35, 0.32, 0.07]}>
        <mesh>
          <planeGeometry args={[1.2, 0.55]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Text position={[0, 0.14, 0.01]} fontSize={0.08} color="#94a3b8" anchorX="center" anchorY="middle">
          TONG MAT HANG (SKU)
        </Text>
        <Text position={[0, -0.06, 0.01]} fontSize={0.24} color="#f8fafc" anchorX="center" anchorY="middle">
          {totalSku}
        </Text>
      </group>

      {/* Thẻ 2: Tổng Lượng Tồn Kho */}
      <group position={[0, 0.32, 0.07]}>
        <mesh>
          <planeGeometry args={[1.2, 0.55]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Text position={[0, 0.14, 0.01]} fontSize={0.08} color="#94a3b8" anchorX="center" anchorY="middle">
          TONG SO LUONG TON
        </Text>
        <Text position={[0, -0.06, 0.01]} fontSize={0.24} color="#38bdf8" anchorX="center" anchorY="middle">
          {totalStock.toLocaleString()}
        </Text>
      </group>

      {/* Thẻ 3: Cảnh Báo Tồn Thấp */}
      <group position={[1.35, 0.32, 0.07]}>
        <mesh>
          <planeGeometry args={[1.2, 0.55]} />
          <meshStandardMaterial color={lowStockCount > 0 ? "#450a0a" : "#0f172a"} />
        </mesh>
        <Text position={[0, 0.14, 0.01]} fontSize={0.08} color="#f87171" anchorX="center" anchorY="middle">
          CANH BAO HET HANG
        </Text>
        <Text
          position={[0, -0.06, 0.01]}
          fontSize={0.24}
          color={lowStockCount > 0 ? "#ef4444" : "#10b981"}
          anchorX="center"
          anchorY="middle"
        >
          {lowStockCount}
        </Text>
      </group>

      <group position={[0, -0.32, 0.07]}>
        <Text fontSize={0.13} color="#cbd5e1" anchorX="center" anchorY="middle">
          {`CON HANG: ${items.filter(item => item.currentStock > 0).length}  |  HET HANG: ${items.filter(item => item.currentStock <= 0).length}`}
        </Text>
      </group>

      {/* Dòng ticker trạng thái đáy màn hình */}
      <group position={[0, -0.78, 0.07]}>
        <Text fontSize={0.08} color="#64748b" anchorX="center" anchorY="middle">
          DU LIEU TON KHO  |  VI TRI KE LA MO PHONG
        </Text>
      </group>
    </group>
  );
}

// ── 4. XE NÂNG HÀNG ĐIỆN CÔNG NGHIỆP 3D (Detailed Forklift 3D) ───────────────
function WarehouseForklift3D({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const beaconRef = useRef<THREE.Mesh>(null);

  // Hiệu ứng đèn chớp vàng xoay nhấp nháy trên nóc xe nâng
  useRoomFrame(({ clock }) => {
    if (beaconRef.current) {
      const mat = beaconRef.current.material as THREE.MeshStandardMaterial;
      const t = Math.sin(clock.getElapsedTime() * 8);
      mat.emissiveIntensity = t > 0.2 ? 2.5 : 0.3;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* ── THÂN XE NÂNG VÀNG CÔNG NGHIỆP ── */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.2, 0.65, 1.8]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Khối đối trọng kim loại đen đúc phía sau (Counterweight) */}
      <mesh position={[0, 0.55, 0.82]} castShadow>
        <boxGeometry args={[1.16, 0.7, 0.35]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* ── BUỒNG LÁI & KHUNG BẢO VỆ CHỐNG LẬT (Roll Cage) ── */}
      {/* 4 Cột chống lật */}
      {[-0.52, 0.52].map((x, xi) =>
        [-0.45, 0.55].map((z, zi) => (
          <mesh key={`cage-post-${xi}-${zi}`} position={[x, 1.35, z]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 1.1, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        )),
      )}
      {/* Nóc lồng bảo vệ */}
      <mesh position={[0, 1.9, 0.05]} castShadow>
        <boxGeometry args={[1.15, 0.04, 1.1]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} />
      </mesh>

      {/* Đèn chớp vàng Amber Beacon trên nóc */}
      <mesh ref={beaconRef} position={[0, 1.98, 0.05]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Ghế ngồi lái đệm đen */}
      <mesh position={[0, 0.95, 0.1]} castShadow>
        <boxGeometry args={[0.5, 0.15, 0.45]} />
        <meshStandardMaterial color="#020617" roughness={0.7} />
      </mesh>
      {/* Tựa lưng ghế */}
      <mesh position={[0, 1.25, 0.3]}>
        <boxGeometry args={[0.48, 0.45, 0.08]} />
        <meshStandardMaterial color="#020617" roughness={0.7} />
      </mesh>

      {/* Vô lăng tròn */}
      <mesh position={[0, 1.18, -0.22]} rotation={[0.6, 0, 0]}>
        <torusGeometry args={[0.12, 0.02, 8, 20]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>

      {/* ── CỘT NÂNG (MAST) & CÀNG NÂNG (FORKS) ── */}
      {/* 2 Cột ray thép trượt đứng */}
      {[-0.32, 0.32].map((x, i) => (
        <mesh key={`mast-rail-${i}`} position={[x, 1.1, -1.0]} castShadow>
          <boxGeometry args={[0.08, 1.9, 0.08]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
      ))}

      {/* Thanh xà ngang giá đỡ càng nâng */}
      <mesh position={[0, 0.45, -1.05]}>
        <boxGeometry args={[0.85, 0.18, 0.04]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>

      {/* 2 Lưỡi càng nâng hàng (Forks) vươn ra phía trước */}
      {[-0.26, 0.26].map((x, i) => (
        <group key={`fork-${i}`} position={[x, 0.08, -1.45]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.04, 0.85]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.2, 0.4]}>
            <boxGeometry args={[0.1, 0.4, 0.04]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Kiện pallet mẫu đặt trên càng nâng */}
      <group position={[0, 0.14, -1.45]}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.85, 0.08, 0.85]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.7, 0.5, 0.7]} />
          <meshStandardMaterial color="#d97706" roughness={0.7} />
        </mesh>
      </group>

      {/* ── 4 BÁNH XE CAO SU CÔNG NGHIỆP ── */}
      {/* Bánh trước lớn */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={`front-wheel-${i}`} position={[x, 0.28, -0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 0.18, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.8} />
        </mesh>
      ))}
      {/* Bánh sau nhỏ đánh lái */}
      {[-0.56, 0.56].map((x, i) => (
        <mesh key={`rear-wheel-${i}`} position={[x, 0.22, 0.65]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.15, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.8} />
        </mesh>
      ))}

      {/* ── ĐÈN PHA CHIẾU RỌI PHÍA TRƯỚC ── */}
      {[-0.4, 0.4].map((x, i) => (
        <group key={`headlight-${i}`} position={[x, 0.85, -0.92]}>
          <mesh>
            <boxGeometry args={[0.1, 0.08, 0.06]} />
            <meshStandardMaterial color="#f8fafc" emissive="#ffffff" emissiveIntensity={1.5} />
          </mesh>
          <spotLight
            position={[0, 0, 0]}
            target-position={[x, 0, -3.5]}
            angle={0.4}
            penumbra={0.4}
            intensity={4}
            distance={5}
            color="#fef08a"
          />
        </group>
      ))}
    </group>
  );
}

// ── 5. CỬA CUỐN CÔNG NGHIỆP DOCK 01 (Industrial Roll-up Shutter Door) ─────────
function RollUpShutterDoor({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Khung bao cửa công nghiệp */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[3.2, 3.7, 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* Hộp cuộn cuốn phía trên */}
      <mesh position={[0, 3.65, 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 3.1, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>

      {/* Các nan rãnh cửa cuốn kim loại */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`slat-${i}`} position={[0, 0.2 + i * 0.24, 0.04]}>
          <boxGeometry args={[2.85, 0.21, 0.03]} />
          <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* Biển hiệu tên Dock */}
      <group position={[0, 3.25, 0.1]}>
        <mesh>
          <boxGeometry args={[1.8, 0.38, 0.04]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <Text position={[0, 0, 0.03]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle">
          DOCK 01 • INBOUND
        </Text>
      </group>

      {/* Đèn tín hiệu tiếp nhận xanh / đỏ (Traffic Dock Light) */}
      <group position={[1.65, 2.2, 0.1]}>
        <mesh>
          <boxGeometry args={[0.16, 0.35, 0.08]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Đèn xanh Ready */}
        <mesh position={[0, 0.08, 0.05]}>
          <circleGeometry args={[0.05, 12]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1.8} />
        </mesh>
        {/* Đèn đỏ Standby */}
        <mesh position={[0, -0.08, 0.05]}>
          <circleGeometry args={[0.05, 12]} />
          <meshStandardMaterial color="#7f1d1d" emissive="#7f1d1d" emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  );
}

// ── 6. CÂN SÀN ĐIỆN TỬ CÔNG NGHIỆP (Floor Platform Scale) ─────────────────────
function FloorWeighingScale({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Mặt bệ cân thép tấm gân chống trượt */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[1.3, 0.08, 1.3]} />
        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Viền vàng cảnh báo quanh bệ cân */}
      <mesh position={[0, 0., 0]}>
        <boxGeometry args={[1.34, 0.07, 1.34]} />
        <meshStandardMaterial color="#ca8a04" emissive="#ca8a04" emissiveIntensity={0.4} />
      </mesh>

      {/* Cột hiển thị đồng hồ LED */}
      <group position={[0.65, 0, 0.55]}>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.1, 10]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
        {/* Hộp màn hình LED đỏ */}
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[0.26, 0.18, 0.08]} />
          <meshStandardMaterial color="#020617" />
        </mesh>
        <Text position={[0, 1.15, 0.045]} fontSize={0.065} color="#ef4444" anchorX="center" anchorY="middle">
          1,420 KG
        </Text>
      </group>
    </group>
  );
}

// ── 7. BÀN KIỂM HÀNG & SỬA SẢN PHẨM (Inspection Station) ──────────────────────
function InspectionDesk({
  position,
  onClick,
  showHotspot = true,
}: {
  position: [number, number, number];
  onClick: () => void;
  showHotspot?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const laserRef = useRef<THREE.Mesh>(null);

  // Tia laser đỏ máy quét mã vạch chớp nháy
  useRoomFrame(({ clock }) => {
    if (laserRef.current) {
      const mat = laserRef.current.material as THREE.MeshStandardMaterial;
      const t = Math.sin(clock.getElapsedTime() * 10);
      mat.emissiveIntensity = t > 0 ? 2.5 : 0.4;
    }
  });

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Mặt bàn gỗ công nghiệp ép cao cấp */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[2.3, 0.08, 1.2]} />
        <meshStandardMaterial
          color={hovered ? "#38bdf8" : "#854d0e"}
          roughness={0.4}
          emissive={hovered ? "#0284c7" : "#000000"}
          emissiveIntensity={hovered ? 0.35 : 0}
        />
      </mesh>

      {/* 4 Chân bàn kim loại hộp sơn tĩnh điện */}
      {[-1.0, 1.0].map((x, xi) =>
        [-0.48, 0.48].map((z, zi) => (
          <mesh key={`desk-leg-${xi}-${zi}`} position={[x, 0.45, z]} castShadow>
            <boxGeometry args={[0.08, 0.9, 0.08]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        )),
      )}

      {/* Ghế xoay công nghiệp */}
      <group position={[0, 0, 0.85]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.08, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      </group>

      {/* Laptop trạm kiểm kho WMS */}
      <group position={[-0.45, 1.0, 0]}>
        <mesh position={[0, 0.015, 0]}>
          <boxGeometry args={[0.44, 0.02, 0.32]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.17, -0.16]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.44, 0.3, 0.02]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.85} />
        </mesh>
      </group>

      {/* Máy quét mã vạch cầm tay Barcode Scanner có tia laser đỏ */}
      <group position={[0.42, 1.02, 0.08]}>
        <mesh rotation={[0.4, 0.2, 0]}>
          <boxGeometry args={[0.1, 0.14, 0.18]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} />
        </mesh>
        {/* Tia laser đỏ phát sáng */}
        <mesh ref={laserRef} position={[0, 0.02, 0.12]}>
          <boxGeometry args={[0.12, 0.015, 0.015]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.5} />
        </mesh>
      </group>

      {/* Chồng tài liệu kiểm kho & cốc cà phê */}
      <mesh position={[0.15, 1.02, -0.25]}>
        <boxGeometry args={[0.26, 0.05, 0.32]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[-0.9, 1.05, 0.2]}>
        <cylinderGeometry args={[0.04, 0.035, 0.1, 10]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>

      {/* Vòng định vị phát sáng sàn trạm */}
      <StationFloorRing radius={1.4} color="#38bdf8" />

      {/* Nút hành động nổi tương tác */}
      {showHotspot && (
        <group position={[0, 1.85, 0]}>
          <Html
            center
            distanceFactor={11}
            zIndexRange={hovered ? [40, 25] : [25, 10]}
          >
            <button
              type="button"
              onClick={onClick}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1 shadow-2xl backdrop-blur-md transition-all ${hovered
                ? "border-sky-400 bg-sky-600/90 text-white scale-110 shadow-sky-500/40"
                : "border-sky-400/40 bg-slate-950/85 text-slate-200"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <span className="whitespace-nowrap text-[11px] font-bold">
                Bàn Kiểm Hàng
              </span>
            </button>
          </Html>
        </group>
      )}
    </group>
  );
}

// ── 8. KHU TIẾP NHẬN & NHẬP HÀNG (Pallet Inbound Zone) ────────────────────────
function PalletImportZone({
  position,
  onClick,
  showHotspot = true,
}: {
  position: [number, number, number];
  onClick: () => void;
  showHotspot?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Vòng định vị phát sáng sàn trạm */}
      <StationFloorRing radius={1.5} color="#f59e0b" />

      {/* Pallet gỗ tự nhiên tiêu chuẩn */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <boxGeometry args={[1.6, 0.14, 1.4]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} />
      </mesh>

      {/* Các thùng hàng xếp tầng */}
      <mesh position={[-0.38, 0.44, -0.32]} castShadow>
        <boxGeometry args={[0.65, 0.6, 0.58]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>
      <mesh position={[0.38, 0.44, -0.32]} castShadow>
        <boxGeometry args={[0.65, 0.6, 0.58]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>
      <mesh position={[-0.38, 0.44, 0.32]} castShadow>
        <boxGeometry args={[0.65, 0.6, 0.58]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>
      <mesh position={[0.38, 0.44, 0.32]} castShadow>
        <boxGeometry args={[0.65, 0.6, 0.58]} />
        <meshStandardMaterial color="#d97706" roughness={0.7} />
      </mesh>
      {/* Tầng 2 */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshStandardMaterial
          color={hovered ? "#f59e0b" : "#b45309"}
          roughness={0.7}
          emissive={hovered ? "#f59e0b" : "#000000"}
          emissiveIntensity={hovered ? 0.35 : 0}
        />
      </mesh>

      {/* Xe nâng tay mô phỏng chi tiết (Hand Pallet Jack) */}
      <group position={[1.4, 0, 0.2]} rotation={[0, -Math.PI / 4, 0]}>
        {/* Càng nâng đỏ */}
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.55, 0.08, 1.1]} />
          <meshStandardMaterial color="#dc2626" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Tay bơm thủy lực */}
        <mesh position={[0, 0.52, 0.5]}>
          <cylinderGeometry args={[0.03, 0.03, 0.95, 10]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.98, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 10]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* Nút hành động nổi tương tác */}
      {showHotspot && (
        <group position={[0, 1.85, 0]}>
          <Html
            center
            distanceFactor={11}
            zIndexRange={hovered ? [40, 25] : [25, 10]}
          >
            <button
              type="button"
              onClick={onClick}
              className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1 shadow-2xl backdrop-blur-md transition-all ${hovered
                ? "border-amber-400 bg-amber-600/90 text-white scale-110 shadow-amber-500/40"
                : "border-amber-400/40 bg-slate-950/85 text-slate-200"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="whitespace-nowrap text-[11px] font-bold">
                Khu Nhập Hàng
              </span>
            </button>
          </Html>
        </group>
      )}
    </group>
  );
}

// ── 9. BẢNG QUẢN LÝ DANH MỤC GẮN TƯỜNG (Category Wall Board) ─────────────────
function CategoryBoard({
  position,
  rotation,
  onClick,
  showHotspot = true,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick: () => void;
  showHotspot?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh>
        <boxGeometry args={[2.6, 1.6, 0.06]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Viền LED */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.64, 1.64, 0.02]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={hovered ? 1.4 : 0.8}
        />
      </mesh>

      <Text position={[0, 0.45, 0.04]} fontSize={0.16} color="#38bdf8" anchorX="center" anchorY="middle">
        QUẢN LÝ DANH MỤC
      </Text>
      <Text position={[0, 0.1, 0.04]} fontSize={0.11} color="#ffffff" anchorX="center" anchorY="middle">
        Click để xem & phân loai
      </Text>

      {showHotspot && (
        <group position={[0, -0.4, 0.1]}>
          <Html
            transform
            distanceFactor={8}
            occlude
            center
            zIndexRange={hovered ? [40, 25] : [25, 10]}
          >
            <button
              type="button"
              onClick={onClick}
              className={`pointer-events-auto whitespace-nowrap rounded-lg border border-sky-400/40 bg-sky-600/80 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all ${hovered ? "scale-105 bg-sky-500" : ""
                }`}
            >
              Mở Danh Mục
            </button>
          </Html>
        </group>
      )}
    </group>
  );
}

// ── 10. THIẾT BỊ AN TOÀN PCCC & CƠ SỞ HẠ TẦNG (Safety & Facility) ──────────────
function WarehouseSafetyEquipment() {
  const cameraLedRef = useRef<THREE.Mesh>(null);
  useRoomFrame(({ clock }) => {
    if (cameraLedRef.current) {
      const mat = cameraLedRef.current.material as THREE.MeshStandardMaterial;
      const t = Math.sin(clock.getElapsedTime() * 4);
      mat.emissiveIntensity = t > 0 ? 1.8 : 0.2;
    }
  });

  return (
    <group>
      {/* ── 2 BÌNH CHỮA CHÁY PCCC GẮN TƯỜNG (Fire Extinguishers) ── */}
      {[-15.35, -0.65].map((x, i) => (
        <group key={`fire-ext-${i}`} position={[x, 1.2, -20.5]}>
          {/* Thân bình đỏ */}
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.55, 14]} />
            <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Cụm van & vòi xịt */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.1, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          {/* Bảng báo PCCC phía trên */}
          <mesh position={[0, 0.55, 0.01]}>
            <planeGeometry args={[0.3, 0.25]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>
      ))}

      {/* ── HỘP SƠ CỨU Y TẾ (First Aid Box) TRÊN TƯỜNG ── */}
      <group position={[-15.35, 1.9, -21.8]}>
        <mesh>
          <boxGeometry args={[0.08, 0.45, 0.35]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Chữ thập đỏ */}
        <mesh position={[0.045, 0, 0]}>
          <planeGeometry args={[0.04, 0.18]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0.045, 0, 0]}>
          <planeGeometry args={[0.18, 0.04]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>

      {/* ── CAMERA AN NINH DOME CCTV CHỚP ĐÈN ── */}
      <group position={[-14.5, WAREHOUSE_HEIGHT - 0.2, -18.8]}>
        <mesh>
          <sphereGeometry args={[0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh ref={cameraLedRef} position={[0.08, -0.06, 0.08]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* ── THANG DI ĐỘNG CÔNG NGHIỆP CÓ BÁNH XE (Rolling Ladder) ── */}
      <group position={[-14.2, 0, -28.2]} rotation={[0, Math.PI / 6, 0]}>
        {/* 2 Khung thang kim loại */}
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[0.7, 2.8, 0.05]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Tay vịn an toàn đỉnh thang */}
        <mesh position={[0, 2.8, 0.2]}>
          <boxGeometry args={[0.7, 0.4, 0.4]} />
          <meshStandardMaterial color="#ca8a04" metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// ── 11. HỆ THỐNG KẾT CẤU TRẦN THÉP ZAMIL & KỸ THUẬT XƯỞNG (Roof Structure) ────
function IndustrialRoofStructure() {
  return (
    <group>
      {/* ── DẦM THÉP CHỮ I BÊN TRÊN KHU VỰC KỆ HÀNG (I-Beams) ── */}
      {[-30, -27].map((z, i) => (
        <group key={`i-beam-${i}`} position={[CENTER_X, WAREHOUSE_HEIGHT - 0.2, z]}>
          <mesh castShadow>
            <boxGeometry args={[WAREHOUSE_WIDTH, 0.25, 0.12]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* ── DẦM THÉP CHỮ I PHÍA TRƯỚC (Tự động ẩn khi camera xem từ trên cao) ── */}
      <SmartOcclusionGroup checkOcclusion={(pos) => pos.y > 4.3}>
        {[-23, -19.5].map((z, i) => (
          <group key={`front-beam-${i}`} position={[CENTER_X, WAREHOUSE_HEIGHT - 0.2, z]}>
            <mesh castShadow>
              <boxGeometry args={[WAREHOUSE_WIDTH, 0.25, 0.12]} />
              <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.4} />
            </mesh>
          </group>
        ))}
      </SmartOcclusionGroup>

      {/* ── ĐƯỜNG ỐNG THÔNG GIÓ HVAC MẠ BẠC (Phía trên dãy kệ) ── */}
      <group position={[CENTER_X + 2.5, WAREHOUSE_HEIGHT - 0.45, -27.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 8, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* ── ĐƯỜNG ỐNG PCCC ĐỎ VÀ ĐẦU PHUN SPRINKLER ── */}
      <group position={[CENTER_X - 2.5, WAREHOUSE_HEIGHT - 0.55, -27.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 8, 12]} />
          <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Vòi phun Sprinkler tự động thả xuống */}
        {[-4, 0, 4].map((offsetZ, zi) => (
          <group key={`sprinkler-${zi}`} position={[0, -0.15, offsetZ]}>
            <mesh>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <coneGeometry args={[0.05, 0.06, 8]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── DÀN ĐÈN HIGH-BAY CÔNG NGHIỆP TREO TRẦN ── */}
      {[-12, -8, -4].map((x, i) =>
        [-28, -22].map((z, j) => (
          <group key={`high-bay-${i}-${j}`} position={[x, WAREHOUSE_HEIGHT - 0.45, z]}>
            <mesh>
              <coneGeometry args={[0.42, 0.4, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

// ── 12. VẠCH KẺ SÀN AN TOÀN & LỐI XE NÂNG (Floor Markings) ────────────────────
function FloorSafetyMarkings() {
  return (
    <group>
      {/* Vạch kẻ sọc vàng đen phân làn xe nâng (Forklift Lane Hazard Stripes) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7.8, 0.004, -25]}>
        <planeGeometry args={[2.4, 11.5]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.4}
        />
      </mesh>

      {/* 2 Dải kẻ vạch vàng biên an toàn dọc lối đi */}
      {[-9.0, -6.6].map((x, i) => (
        <mesh key={`lane-line-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, -25]}>
          <planeGeometry args={[0.12, 11.5]} />
          <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.6} />
        </mesh>
      ))}

      {/* Chữ sơn sàn công nghiệp điều hướng xe nâng */}
      <group position={[-7.8, 0.006, -20.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text fontSize={0.22} color="#facc15" anchorX="center" anchorY="middle">
          FORKLIFT ONLY
        </Text>
      </group>
      <group position={[-7.8, 0.006, -26.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text fontSize={0.16} color="#facc15" anchorX="center" anchorY="middle">
          MAX SPEED 5 KM/H
        </Text>
      </group>

      {/* Ô tập kết Pallet Bay 01 viền vàng đứt nét */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.5, 0.004, -22.5]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial color="#172554" roughness={0.5} opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

// ── MAIN: WAREHOUSE SCENE NÂNG CẤP TRỌN GÓI ──────────────────────────────────
export function WarehouseScene({
  stockItems = [],
  visibleStockItems = stockItems.slice(0, 30),
  onOpenProductForm = () => { },
  onOpenImportStock = () => { },
  onOpenCategoryManage = () => { },
  onSelectCargoItem = () => { },
  highlightCategoryId = null,
  onReturnToHallway = () => { },
  openDoor = null,
  isVisible = true,
  isAnyModalOpen = false,
}: WarehouseSceneProps) {
  const showHotspots = Boolean(isVisible && !isAnyModalOpen);
  // Only the current page is mounted; the dashboard always uses the full inventory.
  const itemsAisleA = visibleStockItems.slice(0, 15);
  const itemsAisleB = visibleStockItems.slice(15, 30);

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. MẶT SÀN EPOXY CÔNG NGHIỆP PHẢN CHIẾU ───────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CENTER_X, 0, CENTER_Z]}
        receiveShadow
      >
        <planeGeometry args={[WAREHOUSE_WIDTH, WAREHOUSE_DEPTH]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.28}
          metalness={0.35}
        />
      </mesh>

      {/* Vạch kẻ an toàn sàn & làn xe nâng */}
      <FloorSafetyMarkings />

      {/* ── 2. CÁC MẢNG TƯỜNG & TRẦN KHO THÔNG MINH (SMART OCCLUSION) ────── */}
      {/* Tường sau (z = -32) - Luôn hiển thị vì nằm sau hậu cảnh */}
      <mesh position={[CENTER_X, WAREHOUSE_HEIGHT / 2, -32]} receiveShadow>
        <boxGeometry args={[WAREHOUSE_WIDTH, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b1120" roughness={0.8} />
      </mesh>

      {/* Tường trước (z = -18.1) — Tự động làm mờ/biến mất khi camera ở góc nhìn toàn cảnh phía trước */}
      <SmartOcclusionGroup checkOcclusion={(pos) => pos.z > -18.4}>
        <mesh position={[-9.75, WAREHOUSE_HEIGHT / 2, -18.1]}>
          <boxGeometry args={[11.5, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#0b1120" roughness={0.8} />
        </mesh>
        <mesh position={[-1.45, WAREHOUSE_HEIGHT / 2, -18.1]}>
          <boxGeometry args={[1.9, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#0b1120" roughness={0.8} />
        </mesh>
        {/* Mảng tường phía trên cửa ra hành lang */}
        <mesh
          position={[
            -3.2,
            2.8 + (WAREHOUSE_HEIGHT - 2.8) / 2,
            -18.1,
          ]}
        >
          <boxGeometry args={[1.6, WAREHOUSE_HEIGHT - 2.8, WALL_THICKNESS]} />
          <meshStandardMaterial color="#0b1120" roughness={0.8} />
        </mesh>

        {/* Cửa thông ra hành lang */}
        <Door3D
          position={[-3.2, 0, -18.1]}
          rotation={[0, 0, 0]}
          doorId="warehouse_exit"
          targetRoom="hallway"
          label={ROOMS.hallway.name}
          subLabel="LỐI RA"
          isOpen={openDoor === "warehouse_exit"}
          onEnter={onReturnToHallway}
          accentColor="#38bdf8"
        />
      </SmartOcclusionGroup>

      {/* Trần nhà kho (y = 5.4) — Tự động làm mờ/biến mất khi camera ở trên cao nhìn xuống (Overview / Sa bàn) */}
      <SmartOcclusionGroup checkOcclusion={(pos) => pos.y > 4.3}>
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[CENTER_X, WAREHOUSE_HEIGHT, CENTER_Z]}
        >
          <planeGeometry args={[WAREHOUSE_WIDTH, WAREHOUSE_DEPTH]} />
          <meshStandardMaterial color="#050811" roughness={0.9} side={2} />
        </mesh>
      </SmartOcclusionGroup>

      {/* Tường trái (x = -15.5) — Tự động làm mờ khi camera xoay về bên trái */}
      <SmartOcclusionGroup checkOcclusion={(pos) => pos.x < -15.2}>
        <mesh
          position={[-15.5, WAREHOUSE_HEIGHT / 2, CENTER_Z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[WAREHOUSE_DEPTH, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#0b1120" roughness={0.8} />
        </mesh>
      </SmartOcclusionGroup>

      {/* Tường phải ngăn cách với Văn phòng (x = -0.5) — Tự động làm mờ khi camera xoay về bên phải */}
      <SmartOcclusionGroup checkOcclusion={(pos) => pos.x > -0.8}>
        <mesh
          position={[-0.5, WAREHOUSE_HEIGHT / 2, CENTER_Z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[WAREHOUSE_DEPTH, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#0b1120" roughness={0.8} />
        </mesh>
      </SmartOcclusionGroup>

      {/* ── 3. HỆ THỐNG KẾT CẤU TRẦN THÉP & ÁNH SÁNG ─────────────────── */}
      <SmartOcclusionGroup checkOcclusion={(pos) => pos.y > WAREHOUSE_HEIGHT - 1.1}>
        <IndustrialRoofStructure />
      </SmartOcclusionGroup>

      {/* Keep operational lighting active when the roof is cut away. */}
      {[-12, -8, -4].flatMap(x => [-28, -22].map(z => (
        <pointLight key={`warehouse-light-${x}-${z}`} position={[x, 4.7, z]} intensity={28} distance={9.5} color="#fef3c7" />
      )))}
      {/* Ánh sáng tổng thể phòng kho */}
      <ambientLight intensity={0.8} color="#e2e8f0" />
      <directionalLight
        position={[-8, WAREHOUSE_HEIGHT - 0.5, -22]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* ── 4. TRANG THIẾT BỊ & NỘI THẤT KHO THÔNG MINH ────────────────── */}

      {/* Màn hình LED Dashboard Giám sát Kho WMS trên tường sau */}
      <group scale={0.75} position={[-8, 2.9, -31.85]}>
        <WarehouseWMSDashboard position={[0, 0, 0]} items={stockItems} />
      </group>

      {/* DÃY KỆ THÔNG MINH A (Bên trái tường sau) */}
      <HeavyDutyWarehouseRack
        position={[-12, 0, -28.2]}
        aisleName="DÃY KỆ A"
        aisleSub={`${itemsAisleA.length}/15 VỊ TRÍ · TRANG HIỆN TẠI`}
        accentColor="#38bdf8"
        items={itemsAisleA}
        highlightCategoryId={highlightCategoryId}
        onSelectItem={(item, loc) => onSelectCargoItem(item, loc)}
        rackWidth={4.8}
      />

      {/* DÃY KỆ THÔNG MINH B (Bên phải tường sau) */}
      <HeavyDutyWarehouseRack
        position={[-4, 0, -28.2]}
        aisleName="DÃY KỆ B"
        aisleSub={`${itemsAisleB.length}/15 VỊ TRÍ · TRANG HIỆN TẠI`}
        accentColor="#f59e0b"
        items={itemsAisleB}
        highlightCategoryId={highlightCategoryId}
        onSelectItem={(item, loc) => onSelectCargoItem(item, loc)}
        rackWidth={4.8}
      />

      {/* Xe nâng đỗ cạnh khu nhập hàng, chừa lối nhìn vào hai kệ */}
      <WarehouseForklift3D
        position={[-2.3, 0, -25.0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Cửa cuốn công nghiệp tiếp nhận hàng Dock 01 (Tường trái) */}
      <RollUpShutterDoor
        position={[-15.35, 0, -26.0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* Cân sàn điện tử công nghiệp */}
      <FloorWeighingScale position={[-2.4, 0, -22.5]} />

      {/* Bàn kiểm hàng & quét mã sản phẩm */}
      <InspectionDesk
        position={[-12, 0, -22.8]}
        onClick={onOpenProductForm}
        showHotspot={showHotspots}
      />

      {/* Khu tiếp nhận & Nhập kho nhanh */}
      <PalletImportZone
        position={[-4.5, 0, -22.8]}
        onClick={() => onOpenImportStock()}
        showHotspot={showHotspots}
      />

      {/* Trụ danh mục cạnh bàn QC, bên ngoài làn xe nâng và phía trước kệ. */}
      <group position={[-9.9, 0, -23.3]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.1, 0.84, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[0.65, 0.08, 0.45]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} />
        </mesh>
        <group scale={0.6}>
          <CategoryBoard
            position={[0, 2.25, 0]}
            onClick={onOpenCategoryManage}
            showHotspot={showHotspots}
          />
        </group>
      </group>

      {/* Trang bị an toàn PCCC, Hộp cứu thương & Camera giám sát */}
      <WarehouseSafetyEquipment />
    </group>
  );
}
