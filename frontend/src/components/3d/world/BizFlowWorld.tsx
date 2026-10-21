"use client";

import { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { type RoomId, type CameraPreset } from "./types";
import { WorldCameraController, type CameraFocusPoint } from "./WorldCameraController";
import { HallwayScene } from "./HallwayScene";
import { ShowroomScene } from "./ShowroomScene";
import { WarehouseScene } from "./WarehouseScene";
import { OfficeScene } from "./OfficeScene";
import type { StockLevelRow } from "@/hooks/useInventory";

interface BizFlowWorldProps {
  activeRoom: RoomId;
  onEnterRoom: (room: RoomId) => void;
  currentPreset: CameraPreset;
  isPOSActive?: boolean;
  targetFocusPoint?: CameraFocusPoint | null;
  /** Con bên trong Showroom: Kệ A, B, C, D & Quầy Counter POS */
  showroomChildren: React.ReactNode;
  /** Dữ liệu tồn kho cho Phòng Kho */
  stockItems?: StockLevelRow[];
  onOpenProductForm?: () => void;
  onOpenImportStock?: (productId?: string) => void;
  onOpenCategoryManage?: () => void;
  onSelectCargoItem?: (
    item: StockLevelRow,
    location: { aisle: string; level: number; col: number },
  ) => void;
  highlightCategoryId?: string | null;
  /** Dữ liệu số liệu cho Phòng Văn Phòng */
  todayRevenue?: number;
  pendingCount?: number;
  totalProductsCount?: number;
  employeeCount?: number;
  onOpenSettings?: () => void;
  onOpenEmployeeDialog?: () => void;
  onOpenReports?: () => void;
}

export function BizFlowWorld({
  activeRoom,
  onEnterRoom,
  currentPreset,
  isPOSActive = false,
  targetFocusPoint = null,
  showroomChildren,
  stockItems = [],
  onOpenProductForm,
  onOpenImportStock,
  onOpenCategoryManage,
  onSelectCargoItem,
  highlightCategoryId = null,
  todayRevenue = 0,
  pendingCount = 0,
  totalProductsCount = 0,
  employeeCount = 1,
  onOpenSettings,
  onOpenEmployeeDialog,
  onOpenReports,
}: BizFlowWorldProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isInteractingWithPOS = isPOSActive || currentPreset === "posScreen";

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        camera={{
          position: [0, 5.8, 9.8],
          fov: 52,
          near: 0.1,
          far: 120,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        shadows
        style={{ position: "absolute", inset: 0, background: "#070b14" }}
      >
        {/* Môi trường chiếu sáng nhẹ & sương mù chiều sâu */}
        <fog attach="fog" args={["#070b14", 20, 48]} />
        <Environment preset="city" environmentIntensity={0.25} />

        {/* ── BỘ ĐIỀU KHIỂN CAMERA ĐA PHÒNG ────────────────────────── */}
        <WorldCameraController
          currentPreset={currentPreset}
          controlsRef={controlsRef}
          targetFocusPoint={targetFocusPoint}
        />

        <OrbitControls
          ref={controlsRef}
          target={[0, 1.2, 0]}
          minPolarAngle={Math.PI * 0.08}
          maxPolarAngle={Math.PI * 0.46}
          minDistance={1.0}
          maxDistance={25}
          enableDamping
          dampingFactor={0.08}
          enablePan={!isInteractingWithPOS}
          enableRotate={!isInteractingWithPOS}
          panSpeed={0.5}
        />

        {/* ── 1. HÀNH LANG TRUNG TÂM (Central Hallway) ──────────────── */}
        {/* Ẩn khi đang ở phòng Kho hoặc Văn phòng để các góc nhìn toàn cảnh không bị che chắn */}
        {activeRoom !== "warehouse" && activeRoom !== "office" && (
          <HallwayScene
            activeRoom={activeRoom}
            onEnterRoom={onEnterRoom}
          />
        )}

        {/* ── 2. LAZY LOAD & MOUNT TỪNG PHÒNG RIÊNG BIỆT ─────────────── */}
        <Suspense fallback={null}>
          {/* PHÒNG 1: SHOWROOM & BÁN HÀNG */}
          {activeRoom === "showroom" && (
            <ShowroomScene onReturnToHallway={() => onEnterRoom("hallway")}>
              {showroomChildren}
            </ShowroomScene>
          )}

          {/* PHÒNG 2: KHO & SẢN PHẨM */}
          {activeRoom === "warehouse" && (
            <WarehouseScene
              stockItems={stockItems}
              onOpenProductForm={onOpenProductForm}
              onOpenImportStock={onOpenImportStock}
              onOpenCategoryManage={onOpenCategoryManage}
              onSelectCargoItem={onSelectCargoItem}
              highlightCategoryId={highlightCategoryId}
              onReturnToHallway={() => onEnterRoom("hallway")}
            />
          )}

          {/* PHÒNG 3: VĂN PHÒNG QUẢN LÝ */}
          {activeRoom === "office" && (
            <OfficeScene
              todayRevenue={todayRevenue}
              pendingCount={pendingCount}
              totalProductsCount={totalProductsCount}
              employeeCount={employeeCount}
              onOpenSettings={onOpenSettings}
              onOpenEmployeeDialog={onOpenEmployeeDialog}
              onOpenReports={onOpenReports}
              onReturnToHallway={() => onEnterRoom("hallway")}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
