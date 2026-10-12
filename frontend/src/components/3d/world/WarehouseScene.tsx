"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { Door3D } from "./Door3D";
import { ROOMS } from "./types";
import type { StockLevelRow } from "@/hooks/useInventory";

interface WarehouseSceneProps {
  stockItems?: StockLevelRow[];
  onOpenProductForm?: () => void;
  onOpenImportStock?: (productId?: string) => void;
  onOpenCategoryManage?: () => void;
  onReturnToHallway?: () => void;
}

const WAREHOUSE_WIDTH = 15;
const WAREHOUSE_DEPTH = 14;
const WAREHOUSE_HEIGHT = 5.4;
const CENTER_X = -8;
const CENTER_Z = -25;
const WALL_THICKNESS = 0.2;

/**
 * RackStockBlock — Khối hàng tồn kho 3D đổi màu theo tỷ lệ tồn kho
 * > 50%: Xanh lá | 10-50%: Vàng cam | < 10%: Đỏ nhấp nháy
 */
function RackStockBlock({
  item,
  position,
  onSelect,
}: {
  item: StockLevelRow;
  position: [number, number, number];
  onSelect: (item: StockLevelRow) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const ratio = item.stockRatio ?? 0.5;

  let baseColor = "#10b981"; // Xanh
  let isBlinking = false;
  if (ratio < 0.1) {
    baseColor = "#ef4444"; // Đỏ cảnh báo
    isBlinking = true;
  } else if (ratio < 0.5) {
    baseColor = "#f59e0b"; // Vàng
  }

  useFrame(({ clock }) => {
    if (isBlinking && meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const t = Math.sin(clock.getElapsedTime() * 5);
      mat.emissiveIntensity = t > 0 ? 0.9 : 0.1;
    }
  });

  const blockHeight = Math.max(0.18, Math.min(0.7, ratio * 0.75));

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, blockHeight / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item);
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.62, blockHeight, 0.62]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.4}
          metalness={0.2}
          emissive={baseColor}
          emissiveIntensity={hovered ? 0.6 : isBlinking ? 0.3 : 0}
        />
      </mesh>

      {hovered && (
        <Html
          position={[0, blockHeight + 0.3, 0]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded-lg border border-white/20 bg-slate-950/95 px-2.5 py-1.5 shadow-xl backdrop-blur-md whitespace-nowrap text-xs text-white">
            <p className="font-bold text-amber-300">{item.productName}</p>
            <p className="text-[11px] text-slate-300">
              Tồn: <span className="font-semibold text-white">{item.currentStock}</span> | Mã: {item.code}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * IndustrialStorageRack — Hệ thống kệ để hàng công nghiệp chịu tải cao
 */
function IndustrialStorageRack({
  position,
  items,
  onSelectItem,
}: {
  position: [number, number, number];
  items: StockLevelRow[];
  onSelectItem: (item: StockLevelRow) => void;
}) {
  const RACK_W = 6.4;
  const RACK_D = 1.0;
  const RACK_H = 3.6;
  const LEVELS = [0.4, 1.4, 2.4]; // 3 tầng kệ

  return (
    <group position={position}>
      {/* 4 Chân trụ đứng màu xanh lam đậm công nghiệp */}
      {[-RACK_W / 2 + 0.05, RACK_W / 2 - 0.05].map((x, xi) =>
        [-RACK_D / 2 + 0.05, RACK_D / 2 - 0.05].map((z, zi) => (
          <mesh
            key={`upright-${xi}-${zi}`}
            position={[x, RACK_H / 2, z]}
            castShadow
          >
            <boxGeometry args={[0.08, RACK_H, 0.08]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.8} />
          </mesh>
        )),
      )}

      {/* Dầm ngang đỡ sàn màu cam đặc trưng kho hàng */}
      {LEVELS.map((y, li) => (
        <group key={`level-${li}`}>
          {/* Dầm trước & sau */}
          <mesh position={[0, y, -RACK_D / 2 + 0.04]}>
            <boxGeometry args={[RACK_W, 0.1, 0.06]} />
            <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, y, RACK_D / 2 - 0.04]}>
            <boxGeometry args={[RACK_W, 0.1, 0.06]} />
            <meshStandardMaterial color="#ea580c" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Mặt sàn pallet lưới thép */}
          <mesh position={[0, y + 0.04, 0]}>
            <boxGeometry args={[RACK_W - 0.1, 0.03, RACK_D - 0.1]} />
            <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Phân bố các khối hàng lên 3 tầng x 6 vị trí = 18 slot */}
      {items.slice(0, 18).map((it, idx) => {
        const levelIdx = Math.floor(idx / 6);
        const colIdx = idx % 6;
        const posX = -RACK_W / 2 + 0.6 + colIdx * 1.05;
        const posY = LEVELS[levelIdx] + 0.06;
        return (
          <RackStockBlock
            key={it.productId || `block-${idx}`}
            item={it}
            position={[posX, posY, 0]}
            onSelect={onSelectItem}
          />
        );
      })}

      {/* Bảng tên dãy kệ LED */}
      <group position={[0, RACK_H + 0.25, 0]}>
        <mesh>
          <boxGeometry args={[2.2, 0.35, 0.06]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Text
          position={[0, 0, 0.04]}
          fontSize={0.16}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
        >
          DÃY KỆ THÔNG MINH
        </Text>
      </group>
    </group>
  );
}

/**
 * InspectionDesk — Bàn kiểm hàng & sửa thông tin sản phẩm (click -> ProductFormDialog)
 */
function InspectionDesk({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
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
      {/* Mặt bàn gỗ công nghiệp ép cao cấp */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[2.2, 0.08, 1.2]} />
        <meshStandardMaterial
          color={hovered ? "#38bdf8" : "#854d0e"}
          roughness={0.4}
          emissive={hovered ? "#0284c7" : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* 4 Chân bàn kim loại hộp đen */}
      {[-0.95, 0.95].map((x, xi) =>
        [-0.45, 0.45].map((z, zi) => (
          <mesh key={`desk-leg-${xi}-${zi}`} position={[x, 0.45, z]} castShadow>
            <boxGeometry args={[0.08, 0.9, 0.08]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
        )),
      )}

      {/* Laptop kiểm kho */}
      <group position={[-0.4, 1.0, 0]}>
        {/* Thân máy */}
        <mesh position={[0, 0.015, 0]}>
          <boxGeometry args={[0.42, 0.02, 0.3]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        {/* Màn hình laptop mở góc 110 độ */}
        <mesh position={[0, 0.16, -0.15]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.42, 0.28, 0.02]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>

      {/* Máy quét mã vạch cầm tay Barcode Scanner */}
      <group position={[0.45, 1.02, 0.1]}>
        <mesh rotation={[0.4, 0.2, 0]}>
          <boxGeometry args={[0.1, 0.14, 0.18]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Tia laser đỏ phát sáng */}
        <mesh position={[0, 0.02, 0.12]}>
          <boxGeometry args={[0.08, 0.02, 0.02]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Biển hiệu tương tác nổi */}
      <group position={[0, 1.5, 0]}>
        <Html center distanceFactor={8}>
          <button
            type="button"
            onClick={onClick}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-2xl backdrop-blur-md transition-all ${
              hovered
                ? "border-sky-400 bg-sky-600/90 text-white scale-110 shadow-sky-500/40"
                : "border-white/20 bg-slate-900/85 text-slate-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            <span className="whitespace-nowrap text-xs font-bold">
              Bàn Kiểm Hàng &bull; Sửa/Thêm SP
            </span>
          </button>
        </Html>
      </group>
    </group>
  );
}

/**
 * PalletImportZone — Khu nhập hàng: Pallet gỗ + thùng carton (click -> ImportStockDialog)
 */
function PalletImportZone({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
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
      {/* Pallet gỗ tiêu chuẩn (1.4m x 1.2m) */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <boxGeometry args={[1.6, 0.14, 1.4]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} />
      </mesh>

      {/* Các thùng hàng carton xếp chồng trên pallet */}
      {/* Tầng 1: 4 thùng */}
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

      {/* Tầng 2: 2 thùng lớn hơn */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.9]} />
        <meshStandardMaterial
          color={hovered ? "#f59e0b" : "#b45309"}
          roughness={0.7}
          emissive={hovered ? "#f59e0b" : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* Xe nâng tay mô phỏng (Hand Pallet Jack) */}
      <group position={[1.4, 0, 0]} rotation={[0, -Math.PI / 4, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.6, 0.08, 1.2]} />
          <meshStandardMaterial color="#dc2626" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.5, 0.5]}>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
      </group>

      {/* Nút hành động nổi */}
      <group position={[0, 1.5, 0]}>
        <Html center distanceFactor={8}>
          <button
            type="button"
            onClick={onClick}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-2xl backdrop-blur-md transition-all ${
              hovered
                ? "border-amber-400 bg-amber-600/90 text-white scale-110 shadow-amber-500/40"
                : "border-white/20 bg-slate-900/85 text-slate-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="whitespace-nowrap text-xs font-bold">
              Khu Nhập Hàng &bull; Nhập Kho Nhanh
            </span>
          </button>
        </Html>
      </group>
    </group>
  );
}

/**
 * CategoryBoard — Bảng quản lý danh mục gắn trên tường kho
 */
function CategoryBoard({
  position,
  rotation,
  onClick,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  onClick: () => void;
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
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* Viền LED */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[2.64, 1.64, 0.02]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={hovered ? 1.4 : 0.8}
        />
      </mesh>

      <Text
        position={[0, 0.45, 0.04]}
        fontSize={0.16}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
      >
        QUẢN LÝ DANH MỤC
      </Text>
      <Text
        position={[0, 0.1, 0.04]}
        fontSize={0.11}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Click để xem & phân loại
      </Text>

      <group position={[0, -0.4, 0.1]}>
        <Html center distanceFactor={8}>
          <button
            type="button"
            onClick={onClick}
            className={`pointer-events-auto rounded-lg border border-sky-400/40 bg-sky-600/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-md transition-all ${
              hovered ? "scale-105 bg-sky-500" : ""
            }`}
          >
            Mở Danh Mục
          </button>
        </Html>
      </group>
    </group>
  );
}

/**
 * WarehouseScene — Toàn bộ không gian Phòng 2: Kho & Quản lý Sản phẩm
 */
export function WarehouseScene({
  stockItems = [],
  onOpenProductForm = () => {},
  onOpenImportStock = () => {},
  onOpenCategoryManage = () => {},
  onReturnToHallway = () => {},
}: WarehouseSceneProps) {
  // Tạo dữ liệu mẫu fallback cho kho nếu stockItems chưa tải kịp
  const displayItems: StockLevelRow[] =
    stockItems.length > 0
      ? stockItems
      : Array.from({ length: 18 }).map((_, idx) => ({
          productId: `fallback-${idx}`,
          productName: `Vật Phẩm Kho #${idx + 1}`,
          code: `WH-${100 + idx}`,
          categoryId: null,
          categoryName: "Kho Tổng",
          productUnitId: `unit-${idx}`,
          unitName: "Thùng",
          currentStock: Math.floor(Math.random() * 80) + 5,
          maxStock: 100,
          minStock: 10,
          lastUpdated: new Date().toISOString(),
          status: "in_stock",
          stockRatio: (Math.floor(Math.random() * 80) + 5) / 100,
        }));

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. SÀN KHO CÔNG NGHIỆP ──────────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CENTER_X, 0, CENTER_Z]}
        receiveShadow
      >
        <planeGeometry args={[WAREHOUSE_WIDTH, WAREHOUSE_DEPTH]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.35}
          metalness={0.3}
        />
      </mesh>

      {/* Vạch kẻ an toàn màu vàng/đen (Safety Hazard Line) quanh lối đi */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CENTER_X, 0.003, CENTER_Z]}
      >
        <planeGeometry args={[11, 0.1]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#ca8a04"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* ── 2. TƯỜNG KHO ────────────────────────────────────────────── */}
      {/* Tường sau (z = -32) */}
      <mesh position={[CENTER_X, WAREHOUSE_HEIGHT / 2, -32]}>
        <boxGeometry args={[WAREHOUSE_WIDTH, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b1120" roughness={0.8} />
      </mesh>

      {/* Tường trước giáp hành lang (z = -18) */}
      <mesh position={[CENTER_X - 4.5, WAREHOUSE_HEIGHT / 2, -18.1]}>
        <boxGeometry args={[6, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b1120" roughness={0.8} />
      </mesh>
      <mesh position={[CENTER_X + 4.5, WAREHOUSE_HEIGHT / 2, -18.1]}>
        <boxGeometry args={[6, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b1120" roughness={0.8} />
      </mesh>

      {/* ── CỬA THÔNG RA HÀNH LANG (x = -8, z = -18.1, quay mặt vào trong kho) ── */}
      <Door3D
        position={[CENTER_X, 0, -18.1]}
        rotation={[0, 0, 0]}
        targetRoom="hallway"
        label={ROOMS.hallway.name}
        subLabel="LỐI RA"
        onEnter={onReturnToHallway}
        accentColor="#38bdf8"
      />

      {/* Tường trái (x = -15.5) */}
      <mesh
        position={[-15.5, WAREHOUSE_HEIGHT / 2, CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[WAREHOUSE_DEPTH, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b1120" roughness={0.8} />
      </mesh>

      {/* Tường phải ngăn cách với Văn phòng (x = -0.5) */}
      <mesh
        position={[-0.5, WAREHOUSE_HEIGHT / 2, CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[WAREHOUSE_DEPTH, WAREHOUSE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#0b1120" roughness={0.8} />
      </mesh>

      {/* ── 3. TRẦN NHÀ & ĐÈN NHÀ XƯỞNG HIGH-BAY ────────────────────── */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[CENTER_X, WAREHOUSE_HEIGHT, CENTER_Z]}
      >
        <planeGeometry args={[WAREHOUSE_WIDTH, WAREHOUSE_DEPTH]} />
        <meshStandardMaterial color="#050811" roughness={0.9} side={2} />
      </mesh>

      {/* Dàn đèn High-bay treo trần */}
      {[-11, -8, -5].map((x, i) =>
        [-28, -22].map((z, j) => (
          <group key={`bay-light-${i}-${j}`} position={[x, WAREHOUSE_HEIGHT - 0.5, z]}>
            <mesh>
              <coneGeometry args={[0.35, 0.4, 16]} />
              <meshStandardMaterial color="#475569" metalness={0.7} />
            </mesh>
            <pointLight
              position={[0, -0.2, 0]}
              intensity={22}
              distance={8}
              color="#fef3c7"
            />
          </group>
        )),
      )}

      {/* Ánh sáng tổng thể kho */}
      <ambientLight intensity={0.5} color="#e2e8f0" />
      <directionalLight
        position={[-6, WAREHOUSE_HEIGHT - 0.5, -20]}
        intensity={1.0}
        color="#ffffff"
      />

      {/* ── 4. NỘI THẤT & TRANG THIẾT BỊ KHO ───────────────────────── */}
      {/* Dãy Kệ Kho 3D thông minh ở tường sau */}
      <IndustrialStorageRack
        position={[CENTER_X, 0, -28.5]}
        items={displayItems}
        onSelectItem={(item) => onOpenImportStock(item.productId)}
      />

      {/* Bàn kiểm hàng & quét mã sản phẩm bên trái */}
      <InspectionDesk
        position={[-12.2, 0, -24.5]}
        onClick={onOpenProductForm}
      />

      {/* Khu tiếp nhận & nhập hàng (Pallet) bên phải */}
      <PalletImportZone
        position={[-3.8, 0, -24.5]}
        onClick={() => onOpenImportStock()}
      />

      {/* Bảng phân loại danh mục treo trên tường trái */}
      <CategoryBoard
        position={[-15.35, 2.4, -25]}
        rotation={[0, Math.PI / 2, 0]}
        onClick={onOpenCategoryManage}
      />
    </group>
  );
}
