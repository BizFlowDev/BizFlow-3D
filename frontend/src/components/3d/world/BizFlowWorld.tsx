"use client";

import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { type RoomId, type CameraPreset, type DoorId, type TransitionWaypoint } from "./types";
import { WorldCameraController, type CameraFocusPoint } from "./WorldCameraController";
import { getDoorTransitionSequence } from "./doorTransitions";
import { HallwayScene } from "./HallwayScene";
import { ShowroomScene } from "./ShowroomScene";
import { WarehouseScene } from "./WarehouseScene";
import { OfficeScene } from "./OfficeScene";
import type { StockLevelRow } from "@/hooks/useInventory";

/**
 * ScenePrewarmer — Biên dịch ngầm tất cả WebGL Shaders của các phòng ngay khi tải trang
 * giúp loại bỏ 100% hiện tượng khựng lag khi mở phòng mới.
 */
function ScenePrewarmer() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        gl.compile(scene, camera);
      } catch {
        // Fallback an toàn
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [gl, scene, camera]);

  return null;
}

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

  // Quản lý chuyển cảnh mượt mà xuyên cửa
  const [transitionWaypoints, setTransitionWaypoints] = useState<TransitionWaypoint[] | null>(null);
  const [activeOpenDoor, setActiveOpenDoor] = useState<DoorId | null>(null);

  const targetRoomRef = useRef<RoomId | null>(null);
  const currentCommittedRoomRef = useRef<RoomId>(activeRoom);

  // ── Khởi động chuỗi chuyển phòng siêu mượt ──────────────────────────────────
  const handleRequestRoomTransition = useCallback(
    (targetRoom: RoomId) => {
      if (targetRoom === currentCommittedRoomRef.current) return;
      if (targetRoomRef.current === targetRoom) return;

      const fromRoom = currentCommittedRoomRef.current;
      const sequence = getDoorTransitionSequence(fromRoom, targetRoom);

      if (sequence.length === 0) {
        currentCommittedRoomRef.current = targetRoom;
        onEnterRoom(targetRoom);
        return;
      }

      targetRoomRef.current = targetRoom;
      setTransitionWaypoints(sequence);
      setActiveOpenDoor(sequence[0].openDoor || null);
    },
    [onEnterRoom],
  );

  // Lắng nghe khi `activeRoom` thay đổi từ bên ngoài (ví dụ: click RoomNavigationHUD)
  useEffect(() => {
    if (activeRoom !== currentCommittedRoomRef.current) {
      if (targetRoomRef.current !== activeRoom) {
        handleRequestRoomTransition(activeRoom);
      } else {
        currentCommittedRoomRef.current = activeRoom;
      }
    }
  }, [activeRoom, handleRequestRoomTransition]);

  // Khi camera đến từng waypoint trong chuỗi
  const handleWaypointChange = useCallback(
    (wp: TransitionWaypoint) => {
      setActiveOpenDoor(wp.openDoor || null);
      if (wp.activeRoomHint && wp.activeRoomHint !== currentCommittedRoomRef.current) {
        currentCommittedRoomRef.current = wp.activeRoomHint;
        onEnterRoom(wp.activeRoomHint);
      }
    },
    [onEnterRoom],
  );

  // Khi toàn bộ chuỗi animation ra vào cửa hoàn thành
  const handleTransitionComplete = useCallback(() => {
    setTransitionWaypoints(null);
    setActiveOpenDoor(null);
    if (targetRoomRef.current) {
      currentCommittedRoomRef.current = targetRoomRef.current;
      onEnterRoom(targetRoomRef.current);
      targetRoomRef.current = null;
    }
  }, [onEnterRoom]);

  // Xác định các cảnh 3D cần được hiển thị (giữ các phòng đã mount trong bộ nhớ GPU)
  const isTransitioning = transitionWaypoints !== null && transitionWaypoints.length > 0;
  const isShowroomVisible =
    activeRoom === "showroom" ||
    (isTransitioning && (targetRoomRef.current === "showroom" || currentCommittedRoomRef.current === "showroom"));
  const isWarehouseVisible =
    activeRoom === "warehouse" ||
    (isTransitioning && (targetRoomRef.current === "warehouse" || currentCommittedRoomRef.current === "warehouse"));
  const isOfficeVisible =
    activeRoom === "office" ||
    (isTransitioning && (targetRoomRef.current === "office" || currentCommittedRoomRef.current === "office"));
  const isHallwayVisible =
    isTransitioning || (activeRoom !== "warehouse" && activeRoom !== "office");

  return (
    <div
      className="relative h-full w-full select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Lớp phủ điện ảnh mờ viền khi camera lướt qua cửa */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-700 ease-out"
        style={{
          opacity: activeOpenDoor ? 0.38 : 0,
          background:
            "radial-gradient(circle at center, transparent 55%, rgba(3, 7, 18, 0.65) 100%)",
        }}
      />

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
        {/* Pre-warm WebGL Shaders loại bỏ 100% lag khi chuyển phòng */}
        <ScenePrewarmer />

        {/* Môi trường chiếu sáng nhẹ & sương mù chiều sâu */}
        <fog attach="fog" args={["#070b14", 20, 48]} />
        <Environment preset="city" environmentIntensity={0.25} />

        {/* ── BỘ ĐIỀU KHIỂN CAMERA ĐA PHÒNG & MOUSE PARALLAX ────────── */}
        <WorldCameraController
          activeRoom={activeRoom}
          currentPreset={currentPreset}
          controlsRef={controlsRef}
          targetFocusPoint={targetFocusPoint}
          isPOSActive={isInteractingWithPOS}
          waypoints={transitionWaypoints}
          onWaypointChange={handleWaypointChange}
          onTransitionComplete={handleTransitionComplete}
        />

        {/* OrbitControls: KHÓA XOAY TỰ DO, KHÓA CHUỘT PHẢI, CHỈ CHO PHÉP ZOOM AN TOÀN */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 1.2, 0]}
          enableRotate={false}
          enablePan={false}
          enableZoom={!isInteractingWithPOS}
          minDistance={2.0}
          maxDistance={25}
          enableDamping
          dampingFactor={0.08}
        />

        {/* ── 1. HÀNH LANG TRUNG TÂM (Central Hallway) ──────────────── */}
        <group visible={isHallwayVisible}>
          <HallwayScene
            activeRoom={activeRoom}
            openDoor={activeOpenDoor}
            onEnterRoom={handleRequestRoomTransition}
          />
        </group>

        {/* ── 2. CÁC PHÒNG CHỨC NĂNG (Pre-mounted with visible toggle để 0ms giật lag) ── */}
        <Suspense fallback={null}>
          {/* PHÒNG 1: SHOWROOM & BÁN HÀNG */}
          <group visible={isShowroomVisible}>
            <ShowroomScene
              openDoor={activeOpenDoor}
              onReturnToHallway={() => handleRequestRoomTransition("hallway")}
            >
              {showroomChildren}
            </ShowroomScene>
          </group>

          {/* PHÒNG 2: KHO & SẢN PHẨM */}
          <group visible={isWarehouseVisible}>
            <WarehouseScene
              stockItems={stockItems}
              onOpenProductForm={onOpenProductForm}
              onOpenImportStock={onOpenImportStock}
              onOpenCategoryManage={onOpenCategoryManage}
              onSelectCargoItem={onSelectCargoItem}
              highlightCategoryId={highlightCategoryId}
              openDoor={activeOpenDoor}
              onReturnToHallway={() => handleRequestRoomTransition("hallway")}
            />
          </group>

          {/* PHÒNG 3: VĂN PHÒNG QUẢN LÝ */}
          <group visible={isOfficeVisible}>
            <OfficeScene
              todayRevenue={todayRevenue}
              pendingCount={pendingCount}
              totalProductsCount={totalProductsCount}
              employeeCount={employeeCount}
              onOpenSettings={onOpenSettings}
              onOpenEmployeeDialog={onOpenEmployeeDialog}
              onOpenReports={onOpenReports}
              openDoor={activeOpenDoor}
              onReturnToHallway={() => handleRequestRoomTransition("hallway")}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
