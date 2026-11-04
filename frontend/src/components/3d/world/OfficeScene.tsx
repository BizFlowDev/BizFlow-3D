"use client";

import { useState } from "react";
import { Text, Html } from "@react-three/drei";
import { Door3D } from "./Door3D";
import { ROOMS, type DoorId } from "./types";
import { SmartOcclusionGroup } from "./SmartOcclusion";

interface OfficeSceneProps {
  todayRevenue?: number;
  revenueSeries?: number[];
  metricsStatus?: string;
  completedOrdersCount?: number;
  totalProductsCount?: number;
  employeeCount?: number;
  onOpenSettings?: () => void;
  onOpenEmployeeDialog?: () => void;
  onOpenReports?: () => void;
  onOpenAccounting?: () => void;
  canManage?: boolean;
  onReturnToHallway?: () => void;
  openDoor?: DoorId | null;
  isVisible?: boolean;
  isAnyModalOpen?: boolean;
}

const OFFICE_WIDTH = 15;
const OFFICE_DEPTH = 14;
const OFFICE_HEIGHT = 5.4;
const CENTER_X = 8;
const CENTER_Z = -25;
const WALL_THICKNESS = 0.2;

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * WallMountedTV — Màn hình TV 85 inch treo tường hiển thị Dashboard doanh thu
 */
function WallMountedTV({
  position,
  revenue,
  ordersCount,
  revenueSeries,
  metricsStatus,
  onClick,
  showHotspot = true,
}: {
  position: [number, number, number];
  revenue: number;
  ordersCount: number;
  revenueSeries: number[];
  metricsStatus?: string;
  onClick: () => void;
  showHotspot?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const chartBars = revenueSeries;
  const chartMax = Math.max(1, ...chartBars);

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
      {/* Khung viền kim loại TV */}
      <mesh castShadow>
        <boxGeometry args={[4.4, 2.5, 0.08]} />
        <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Viền LED viền lưng TV (Ambilight) */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[4.46, 2.56, 0.02]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={hovered ? 1.5 : 0.6}
        />
      </mesh>

      {/* Màn hình TV phát sáng OLED */}
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[4.26, 2.36]} />
        <meshStandardMaterial
          color="#0b1120"
          emissive="#061226"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Tiêu đề trên TV */}
      <Text
        position={[-1.4, 0.85, 0.05]}
        fontSize={0.16}
        color="#38bdf8"
        anchorX="left"
        anchorY="middle"
      >
        BIZFLOW / TỔNG QUAN KINH DOANH
      </Text>

      {/* Thẻ Doanh thu hôm nay trên TV */}
      <Text
        position={[-1.4, 0.55, 0.05]}
        fontSize={0.11}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        Doanh thu hôm nay
      </Text>
      <Text
        position={[-1.4, 0.3, 0.05]}
        fontSize={0.24}
        color="#34d399"
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.02}
      >
        {metricsStatus ? "—" : formatVND(revenue)}
      </Text>

      {/* Thẻ Số đơn hàng */}
      <Text
        position={[0.8, 0.55, 0.05]}
        fontSize={0.11}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        Đơn hoàn tất hôm nay
      </Text>
      <Text
        position={[0.8, 0.3, 0.05]}
        fontSize={0.24}
        color="#60a5fa"
        anchorX="left"
        anchorY="middle"
      >
        {metricsStatus ? "—" : `${ordersCount} đơn`}
      </Text>

      {/* Biểu đồ cột 3D mini vẽ trực tiếp trên màn hình TV */}
      <group position={[-1.4, -0.55, 0.05]}>
        {chartBars.map((val, idx) => {
          const barH = (val / chartMax) * 0.6;
          const barW = 0.32;
          const barX = idx * 0.44;
          return (
            <group key={`chart-bar-${idx}`} position={[barX, barH / 2, 0]}>
              <mesh>
                <planeGeometry args={[barW, barH]} />
                <meshStandardMaterial
                  color="#38bdf8"
                  emissive="#0284c7"
                  emissiveIntensity={idx === chartBars.length - 1 ? 1.5 : 0.8}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      <Text position={[0, -0.72, 0.06]} fontSize={0.09} color="#94a3b8" anchorX="center">
        {metricsStatus || "DOANH THU 7 NGÀY GẦN NHẤT"}
      </Text>
      {/* Nút hành động tương tác */}
      {showHotspot && (
        <group position={[0, -0.9, 0.08]}>
          <Html
            center
            distanceFactor={8}
            zIndexRange={hovered ? [40, 25] : [25, 10]}
          >
            <button
              type="button"
              onClick={onClick}
              className={`pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-bold shadow-xl backdrop-blur-md transition-all ${hovered
                ? "border-sky-400 bg-sky-600 text-white scale-110 shadow-sky-500/40"
                : "border-white/20 bg-slate-900/85 text-slate-200"
                }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Xem Chi Tiết Báo Cáo
            </button>
          </Html>
        </group>
      )}
    </group>
  );
}

/**
 * DirectorDesk — Bàn làm việc Giám đốc (Click -> Mở Cấu hình Cửa hàng)
 */
function DirectorDesk({
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
      {/* Mặt bàn gỗ óc chó cao cấp + đá cẩm thạch */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[2.6, 0.09, 1.3]} />
        <meshStandardMaterial
          color={hovered ? "#10b981" : "#3b2314"}
          roughness={0.25}
          metalness={0.2}
          emissive={hovered ? "#059669" : "#000000"}
          emissiveIntensity={hovered ? 0.35 : 0}
        />
      </mesh>

      {/* Khung chân bàn kim loại mạ titanium vàng sậm sang trọng */}
      <mesh position={[-1.15, 0.45, 0]}>
        <boxGeometry args={[0.1, 0.9, 1.2]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[1.15, 0.45, 0]}>
        <boxGeometry args={[0.1, 0.9, 1.2]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Màn hình cong siêu rộng Ultra-Wide trên bàn */}
      <group position={[0, 1.5, -0.2]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.7, 0.04]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        {/* Màn hình phát sáng hiển thị bảng quản trị */}
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[1.16, 0.65]} />
          <meshStandardMaterial
            color="#059669"
            emissive="#10b981"
            emissiveIntensity={0.9}
          />
        </mesh>
        {/* Chân đế màn hình */}
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.16, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} />
        </mesh>
      </group>

      {/* Bảng đứng QR để bàn */}
      <group position={[0.8, 1.1, 0.1]} rotation={[0, -0.3, 0]}>
        <mesh>
          <boxGeometry args={[0.16, 0.22, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[0.14, 0.14]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0284c7"
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>

      {/* Ghế giám đốc da đen cao cấp */}
      <group position={[0, 0, -0.9]}>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.65, 0.1, 0.65]} />
          <meshStandardMaterial color="#1e2433" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.1, -0.28]}>
          <boxGeometry args={[0.65, 0.8, 0.1]} />
          <meshStandardMaterial color="#1e2433" roughness={0.5} />
        </mesh>
      </group>

      {/* Nút hành động nổi */}
      {showHotspot && (
        <group position={[0, 2.2, 0]}>
          <Html
            center
            distanceFactor={8}
            zIndexRange={hovered ? [40, 25] : [25, 10]}
          >
            <button
              type="button"
              onClick={onClick}
              className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-2xl backdrop-blur-md transition-all ${hovered
                ? "border-emerald-400 bg-emerald-600/90 text-white scale-110 shadow-emerald-500/40"
                : "border-white/20 bg-slate-900/85 text-slate-200"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="whitespace-nowrap text-xs font-bold">
                Bàn Giám Đốc &bull; Cài Đặt Cửa Hàng
              </span>
            </button>
          </Html>
        </group>
      )}
    </group>
  );
}

/**
 * EmployeeFilingCabinet — Tủ hồ sơ nhân sự (Click -> Mở EmployeeFormDialog)
 */
function EmployeeFilingCabinet({
  position,
  employeeCount,
  onClick,
  showHotspot = true,
}: {
  position: [number, number, number];
  employeeCount?: number;
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
      {/* Thân tủ kim loại sơn tĩnh điện */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[1.4, 2.8, 0.65]} />
        <meshStandardMaterial
          color={hovered ? "#0ea5e9" : "#1e293b"}
          roughness={0.4}
          metalness={0.6}
          emissive={hovered ? "#0284c7" : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* 4 Ngăn kéo kéo ra */}
      {[0.5, 1.1, 1.7, 2.3].map((y, i) => (
        <group key={`drawer-${i}`} position={[0, y, 0.33]}>
          <mesh>
            <boxGeometry args={[1.25, 0.5, 0.02]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} />
          </mesh>
          {/* Tay nắm ngăn kéo */}
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.3, 0.03, 0.03]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Biển hiệu trên tủ */}
      {showHotspot && (
        <group position={[0, 3.0, 0]}>
          <Html
            center
            distanceFactor={8}
            zIndexRange={hovered ? [40, 25] : [25, 10]}
          >
            <button
              type="button"
              onClick={onClick}
              className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-2xl backdrop-blur-md transition-all ${hovered
                ? "border-sky-400 bg-sky-600/90 text-white scale-110 shadow-sky-500/40"
                : "border-white/20 bg-slate-900/85 text-slate-200"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span className="whitespace-nowrap text-xs font-bold">
                Tủ Hồ Sơ &bull; {employeeCount ?? 0} Nhân Viên
              </span>
            </button>
          </Html>
        </group>
      )}
    </group>
  );
}

/**
 * KPIGlassBoard — Bảng kính KPI hiển thị số liệu kinh doanh trên tường bên
 */
function KPIGlassBoard({
  position,
  rotation,
  revenue,
  orders,
  productsCount,
  metricsStatus,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  revenue: number;
  orders: number;
  productsCount: number;
  metricsStatus?: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Tấm kính cường lực mờ */}
      <mesh>
        <boxGeometry args={[2.8, 2.0, 0.04]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Viền LED */}
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[2.84, 2.04, 0.02]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.8}
        />
      </mesh>

      <Text
        position={[0, 0.75, 0.03]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        CHỈ SỐ KPI HÔM NAY
      </Text>

      <Text
        position={[-1.1, 0.35, 0.03]}
        fontSize={0.11}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        Doanh thu:
      </Text>
      <Text
        position={[-1.1, 0.15, 0.03]}
        fontSize={0.16}
        color="#34d399"
        anchorX="left"
        anchorY="middle"
      >
        {metricsStatus ? "—" : formatVND(revenue)}
      </Text>

      <Text
        position={[-1.1, -0.15, 0.03]}
        fontSize={0.11}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        Đơn hoàn tất:
      </Text>
      <Text
        position={[-1.1, -0.35, 0.03]}
        fontSize={0.16}
        color="#60a5fa"
        anchorX="left"
        anchorY="middle"
      >
        {metricsStatus ? "—" : `${orders} đơn`}
      </Text>

      <Text
        position={[-1.1, -0.65, 0.03]}
        fontSize={0.11}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        Tổng mặt hàng:
      </Text>
      <Text
        position={[-1.1, -0.85, 0.03]}
        fontSize={0.16}
        color="#fbbf24"
        anchorX="left"
        anchorY="middle"
      >
        {productsCount} sản phẩm
      </Text>
    </group>
  );
}

/**
 * OfficeScene — Toàn bộ không gian Phòng 3: Văn Phòng Quản Lý & Giám Đốc
 */
export function OfficeScene({
  todayRevenue = 0,
  revenueSeries = [],
  metricsStatus,
  completedOrdersCount = 0,
  totalProductsCount = 0,
  employeeCount = 0,
  onOpenSettings = () => { },
  onOpenEmployeeDialog = () => { },
  onOpenReports = () => { },
  onOpenAccounting = () => { },
  canManage = false,
  onReturnToHallway = () => { },
  openDoor = null,
  isVisible = true,
  isAnyModalOpen = false,
}: OfficeSceneProps) {
  const showHotspots = Boolean(isVisible && !isAnyModalOpen && canManage);
  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. SÀN GỖ VĂN PHÒNG EXECUTIVE ───────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CENTER_X, 0, CENTER_Z]}
        receiveShadow
      >
        <planeGeometry args={[OFFICE_WIDTH, OFFICE_DEPTH]} />
        <meshStandardMaterial
          color="#695345"
          roughness={0.3}
          metalness={0.15}
        />
      </mesh>

      {/* Thảm trung tâm phòng giám đốc */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CENTER_X, 0.003, CENTER_Z - 1]}
      >
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.7}
        />
      </mesh>

      {/* ── 2. TƯỜNG VĂN PHÒNG ──────────────────────────────────────── */}
      {/* Tường sau (z = -32) */}
      <mesh position={[CENTER_X, OFFICE_HEIGHT / 2, -32]}>
        <boxGeometry args={[OFFICE_WIDTH, OFFICE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color="#253444" roughness={0.75} />
      </mesh>

      {/* Tường trước giáp hành lang (z = -18.1) — Tự động làm mờ khi camera nhìn từ ngoài/hành lang */}
      <SmartOcclusionGroup preset="wall-front" threshold={-18.4}>
        <mesh position={[1.45, OFFICE_HEIGHT / 2, -18.1]}>
          <boxGeometry args={[1.9, OFFICE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#253444" roughness={0.75} />
        </mesh>
        <mesh position={[9.75, OFFICE_HEIGHT / 2, -18.1]}>
          <boxGeometry args={[11.5, OFFICE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#253444" roughness={0.75} />
        </mesh>
        {/* Mảng tường trên cửa ra hành lang */}
        <mesh
          position={[
            3.2,
            2.8 + (OFFICE_HEIGHT - 2.8) / 2,
            -18.1,
          ]}
        >
          <boxGeometry args={[1.6, OFFICE_HEIGHT - 2.8, WALL_THICKNESS]} />
          <meshStandardMaterial color="#253444" roughness={0.75} />
        </mesh>

        {/* ── CỬA THÔNG RA HÀNH LANG (x = 3.2, z = -18.1, quay mặt vào trong văn phòng) ── */}
        <Door3D
          position={[3.2, 0, -18.1]}
          rotation={[0, 0, 0]}
          doorId="office_exit"
          targetRoom="hallway"
          label={ROOMS.hallway.name}
          subLabel="LỐI RA"
          isOpen={openDoor === "office_exit"}
          onEnter={onReturnToHallway}
          accentColor="#38bdf8"
        />
      </SmartOcclusionGroup>

      {/* Tường ngăn với kho hàng (x = 0.5) — Tự động làm mờ khi camera nhìn từ bên trái */}
      <SmartOcclusionGroup preset="wall-left" threshold={0.8}>
        <mesh
          position={[0.5, OFFICE_HEIGHT / 2, CENTER_Z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[OFFICE_DEPTH, OFFICE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#253444" roughness={0.75} />
        </mesh>
      </SmartOcclusionGroup>

      {/* Tường kính bên ngoài (x = 15.5) — Tự động làm mờ khi camera nhìn từ bên phải */}
      <SmartOcclusionGroup preset="wall-right" threshold={15.2}>
        <mesh
          position={[15.5, OFFICE_HEIGHT / 2, CENTER_Z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[OFFICE_DEPTH, OFFICE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color="#253444" roughness={0.75} />
        </mesh>
      </SmartOcclusionGroup>

      {/* ── 3. TRẦN NHÀ & HỆ THỐNG ĐÈN ẤM ÁP — Tự động làm mờ khi camera ở trên cao ───────────────────────── */}
      <SmartOcclusionGroup preset="ceiling" threshold={4.9}>
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[CENTER_X, OFFICE_HEIGHT, CENTER_Z]}
        >
          <planeGeometry args={[OFFICE_WIDTH, OFFICE_DEPTH]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.9} side={2} />
        </mesh>
      </SmartOcclusionGroup>

      {/* Đèn trần âm hiện đại */}
      <ambientLight intensity={0.6} color="#f8fafc" />
      <pointLight
        position={[CENTER_X, OFFICE_HEIGHT - 0.4, CENTER_Z]}
        intensity={20}
        distance={10}
        color="#fef3c7"
      />
      <pointLight
        position={[CENTER_X, OFFICE_HEIGHT - 0.4, -30]}
        intensity={18}
        distance={8}
        color="#bae6fd"
      />

      <OfficeFinishes />
      <group position={[3.0, 0, -28.6]}>
        <mesh position={[0, 0.82, 0]} castShadow><boxGeometry args={[2.4, 0.12, 1.15]} /><meshStandardMaterial color="#9b7958" roughness={0.55} /></mesh>
        {[-0.95, 0.95].map((x) => <mesh key={x} position={[x, 0.4, 0]} castShadow><boxGeometry args={[0.12, 0.8, 0.9]} /><meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} /></mesh>)}
        {[0, 1, 2].map((i) => <mesh key={i} position={[-0.7, 0.94 + i * 0.075, 0]}><boxGeometry args={[0.45, 0.065, 0.58]} /><meshStandardMaterial color={["#64748b", "#c8a878", "#e2e8f0"][i]} /></mesh>)}
        <group position={[0.35, 1.25, -0.24]} onClick={(e) => { e.stopPropagation(); if (showHotspots) onOpenAccounting(); }}>
          <mesh><boxGeometry args={[1.05, 0.63, 0.07]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[0, 0, 0.04]}><planeGeometry args={[0.96, 0.54]} /><meshStandardMaterial color="#134e4a" emissive="#0d9488" emissiveIntensity={0.4} /></mesh>
          <Text position={[0, 0, 0.05]} fontSize={0.1} color="#ccfbf1">SỔ KẾ TOÁN</Text>
        </group>
        {showHotspots && <Html center position={[0, 1.95, 0]} distanceFactor={8} zIndexRange={[25, 10]}><button type="button" onClick={onOpenAccounting} className="whitespace-nowrap rounded-xl border border-teal-300/40 bg-slate-900/90 px-3 py-2 text-xs font-bold text-teal-200 shadow-xl hover:bg-teal-800 focus-visible:outline focus-visible:outline-2">Bàn kế toán · Sổ sách & công nợ</button></Html>}
      </group>
      {/* ── 4. TRANG THIẾT BỊ NỘI THẤT VĂN PHÒNG ───────────────────── */}
      {/* TV treo tường 85 inch hiển thị Dashboard */}
      <WallMountedTV
        position={[CENTER_X, 2.4, -31.85]}
        revenue={todayRevenue}
        ordersCount={completedOrdersCount}
        revenueSeries={revenueSeries}
        metricsStatus={metricsStatus}
        onClick={() => { if (showHotspots) onOpenReports(); }}
        showHotspot={showHotspots}
      />

      {/* Bàn làm việc Giám Đốc */}
      <DirectorDesk
        position={[6.2, 0, -25.5]}
        onClick={() => { if (showHotspots) onOpenSettings(); }}
        showHotspot={showHotspots}
      />

      {/* Tủ hồ sơ nhân viên */}
      <EmployeeFilingCabinet
        position={[9.8, 0, -25.0]}
        employeeCount={employeeCount}
        onClick={() => { if (showHotspots) onOpenEmployeeDialog(); }}
        showHotspot={showHotspots}
      />

      {/* Bảng kính KPI trên tường */}
      <KPIGlassBoard
        position={[15.35, 2.3, -24.5]}
        rotation={[0, -Math.PI / 2, 0]}
        revenue={todayRevenue}
        orders={completedOrdersCount}
        productsCount={totalProductsCount}
        metricsStatus={metricsStatus}
      />

      {/* Ghế sofa tiếp khách & bàn trà */}
      <group position={[11.5, 0, -20.5]} rotation={[0, -Math.PI / 4, 0]}>
        {/* Ghế sofa da góc */}
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.8, 0.4, 0.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.75, -0.32]}>
          <boxGeometry args={[1.8, 0.5, 0.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        {/* Bàn trà mặt kính */}
        <mesh position={[0, 0.25, 0.75]}>
          <cylinderGeometry args={[0.45, 0.45, 0.35, 24]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/** Low-poly architectural details; no additional lights or animation loops. */
function OfficeFinishes() {
  return <group>
    {Array.from({ length: 15 }, (_, i) => <mesh key={`floor-${i}`} position={[0.65 + i, 0.006, -25]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.018, 13.8]} /><meshStandardMaterial color="#382c26" /></mesh>)}
    {Array.from({ length: 19 }, (_, i) => <mesh key={`slat-${i}`} position={[4.3 + i * 0.41, 2.7, -31.84]}><boxGeometry args={[0.12, 5.1, 0.08]} /><meshStandardMaterial color="#83654c" roughness={0.65} /></mesh>)}
    <Text position={[8, 4.42, -31.7]} fontSize={0.26} letterSpacing={0.12} color="#e5d0a8">BIZFLOW / VĂN PHÒNG</Text>
    <Text position={[8, 4.02, -31.7]} fontSize={0.11} letterSpacing={0.08} color="#cbd5e1">BÁO CÁO   /   NHÂN SỰ   /   KẾ TOÁN   /   ĐIỀU HÀNH</Text>
    {[-30.6, -24, -19].map((z) => <mesh key={z} position={[8, 5.12, z]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[9, 0.08]} /><meshStandardMaterial color="#fff1d6" emissive="#fff1d6" emissiveIntensity={1.5} side={2} /></mesh>)}
    {[[1.6, -30.8], [14.3, -30.8], [14.2, -19.5]].map(([x, z]) => <group key={`${x}-${z}`} position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.35, 0.25, 0.6, 12]} /><meshStandardMaterial color="#d6c8b5" roughness={0.8} /></mesh>
      <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.035, 0.05, 1.2, 6]} /><meshStandardMaterial color="#70553c" /></mesh>
      {[[-0.22, 1.1, 0], [0.2, 1.4, 0.05], [0, 1.7, 0]].map(([lx, ly, lz], i) => <mesh key={i} position={[lx, ly, lz]} scale={[0.45, 0.55, 0.35]} castShadow><icosahedronGeometry args={[0.8, 1]} /><meshStandardMaterial color={i % 2 ? "#527d52" : "#396849"} roughness={0.9} /></mesh>)}
    </group>)}
    <mesh position={[11.5, 0.01, -20.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.8, 3]} /><meshStandardMaterial color="#737c7c" roughness={1} /></mesh>
  </group>;
}
