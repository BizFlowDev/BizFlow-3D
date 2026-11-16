"use client";

import { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { type RoomId, type CameraPreset, type DoorId, type TransitionWaypoint } from "./types";
import { WorldCameraController, type CameraFocusPoint } from "./WorldCameraController";
import { getDoorTransitionSequence } from "./doorTransitions";
import { HallwayScene } from "./HallwayScene";
import { ShowroomScene } from "./ShowroomScene";
import { WarehouseScene } from "./WarehouseScene";
import { OfficeScene } from "./OfficeScene";
import { ScenePrewarmer, type PrepareRoom } from "./ScenePrewarmer";
import { TransitionProfiler } from "./TransitionProfiler";
import { RoomActivity } from "./roomActivity";
import { canRequestRoom, type TransitionPhase } from "./transitionMotion";
import type { StockLevelRow } from "@/hooks/useInventory";

interface BizFlowWorldProps {
  activeRoom: RoomId;
  reducedMotion?: boolean;
  quickNavigation?: boolean;
  navigationRef: React.MutableRefObject<((room: RoomId) => void) | null>;
  onBusyChange: (busy: boolean) => void;
  onEnterRoom: (room: RoomId) => void;
  currentPreset: CameraPreset;
  isPOSActive?: boolean;
  targetFocusPoint?: CameraFocusPoint | null;
  /** Con bên trong Showroom: Kệ A, B, C, D & Quầy Counter POS */
  showroomChildren: React.ReactNode;
  /** Dữ liệu tồn kho cho Phòng Kho */
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
  /** Dữ liệu số liệu cho Phòng Văn Phòng */
  todayRevenue?: number;
  revenueSeries?: number[];
  metricsStatus?: string;
  completedOrdersCount?: number;
  employeeCount?: number;
  onOpenSettings?: () => void;
  onOpenEmployeeDialog?: () => void;
  onOpenReports?: () => void;
  onOpenAccounting?: () => void;
  canManageOffice?: boolean;
  isAnyModalOpen?: boolean;
}

export function BizFlowWorld({
  activeRoom,
  reducedMotion = false,
  quickNavigation = true,
  navigationRef,
  onBusyChange,
  onEnterRoom,
  currentPreset,
  isPOSActive = false,
  isAnyModalOpen = false,
  targetFocusPoint = null,
  showroomChildren,
  stockItems = [],
  visibleStockItems,
  onOpenProductForm,
  onOpenImportStock,
  onOpenCategoryManage,
  onSelectCargoItem,
  highlightCategoryId = null,
  todayRevenue = 0,
  revenueSeries,
  metricsStatus,
  completedOrdersCount = 0,
  employeeCount = 0,
  onOpenSettings,
  onOpenEmployeeDialog,
  onOpenReports,
  onOpenAccounting,
  canManageOffice = false,
}: BizFlowWorldProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isInteractingWithPOS = isPOSActive || currentPreset === "posScreen";

  // Quản lý chuyển cảnh mượt mà xuyên cửa
  const [transitionWaypoints, setTransitionWaypoints] = useState<TransitionWaypoint[] | null>(null);
  const [activeOpenDoor, setActiveOpenDoor] = useState<DoorId | null>(null);

  const prepareRef = useRef<PrepareRoom | null>(null);
  const phaseRef = useRef<TransitionPhase>("idle");
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [journey, setJourney] = useState<{ from: RoomId; to: RoomId } | null>(null);
  const journeyRef = useRef<typeof journey>(null);
  const [error, setError] = useState<RoomId | null>(null);
  const mounted = useRef(true);
  const changePhase = useCallback((next: TransitionPhase) => {
    phaseRef.current = next;
    setPhase(next);
    onBusyChange(next !== "idle");
  }, [onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleRequestRoomTransition = useCallback(async (to: RoomId) => {
    if (!canRequestRoom(phaseRef.current, activeRoom, to)) return;
    const from = activeRoom;
    setError(null);
    changePhase("preparing");
    try {
      // Suspense may still be waiting for the environment or a room asset.
      const deadline = performance.now() + 20000;
      while (!prepareRef.current) {
        if (!mounted.current) return;
        if (performance.now() > deadline) throw new Error("Scene readiness timeout");
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          prepareRef.current(from, to),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Room preparation timeout")), 20000); }),
        ]);
      } finally { clearTimeout(timeout); }
      if (!mounted.current) return;
      if (reducedMotion || quickNavigation) {
        onEnterRoom(to);
        changePhase("idle");
        return;
      }
      const next = { from, to };
      journeyRef.current = next;
      setJourney(next);
      setTransitionWaypoints(getDoorTransitionSequence(from, to));
      changePhase("moving");
    } catch (cause) {
      if (!mounted.current) return;
      console.warn("Room preparation failed", cause);
      setError(to);
      changePhase("idle");
    }
  }, [activeRoom, changePhase, reducedMotion, quickNavigation, onEnterRoom]);
  useEffect(() => {
    navigationRef.current = handleRequestRoomTransition;
    return () => { navigationRef.current = null; };
  }, [navigationRef, handleRequestRoomTransition]);

  const handleWaypointChange = useCallback((wp: TransitionWaypoint) => {
    setActiveOpenDoor(wp.openDoor || null);
  }, []);
  const handleTransitionComplete = useCallback(() => {
    const destination = journeyRef.current?.to;
    setTransitionWaypoints(null);
    setActiveOpenDoor(null);
    journeyRef.current = null;
    setJourney(null);
    if (destination) onEnterRoom(destination);
    changePhase("idle");
  }, [onEnterRoom, changePhase]);

  const visible = (room: RoomId) => phase === "moving" && journey
    ? room === journey.from || room === journey.to || room === "hallway"
    : room === activeRoom || (room === "hallway" && activeRoom === "showroom");
  const isShowroomVisible = visible("showroom");
  const isWarehouseVisible = visible("warehouse");
  const isOfficeVisible = visible("office");
  const isHallwayVisible = visible("hallway");

  return (
    <div
      className="relative h-full w-full select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {phase === "preparing" && <div role="status" className="absolute inset-x-0 top-20 z-30 mx-auto w-fit rounded-xl bg-slate-900/95 px-5 py-3 text-sm text-white">Đang chuẩn bị phòng…</div>}
      {error && <div role="alert" className="absolute inset-x-0 top-20 z-30 mx-auto w-fit rounded-xl bg-slate-900/95 p-4 text-sm text-white">
        Không thể chuẩn bị phòng. <button className="ml-3 underline" onClick={() => handleRequestRoomTransition(error)}>Thử lại</button>
        <button className="ml-3 underline" onClick={() => setError(null)}>Đóng</button>
      </div>}
      {phase !== "idle" && <div className="absolute inset-0 z-20" aria-hidden="true" />}
      {/* Lớp phủ điện ảnh mờ viền khi camera lướt qua cửa */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-700 ease-out"
        style={{
          opacity: activeOpenDoor ? 0.18 : 0,
          background:
            "radial-gradient(circle at center, transparent 55%, rgba(100, 116, 139, 0.3) 100%)",
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
        style={{ position: "absolute", inset: 0, background: "#5b6a73" }}
      >
        <color attach="background" args={["#5b6a73"]} />

        {/* Môi trường chiếu sáng nhẹ & sương mù chiều sâu */}
        <fog attach="fog" args={activeRoom === "warehouse" ? ["#5b6a73", 38, 90] : ["#5b6a73", 20, 48]} />
        <Suspense fallback={<Html center><div role="status" className="whitespace-nowrap rounded-xl bg-slate-950/95 px-5 py-3 text-sm text-white">Đang tải không gian 3D…</div></Html>}>
        <Environment preset="city" environmentIntensity={0.32} />

        {/* ── BỘ ĐIỀU KHIỂN CAMERA ĐA PHÒNG & MOUSE PARALLAX ────────── */}
        <WorldCameraController
          paused={phase === "preparing"}
          reducedMotion={reducedMotion || (quickNavigation && !isInteractingWithPOS)}
          activeRoom={activeRoom}
          currentPreset={currentPreset}
          controlsRef={controlsRef}
          targetFocusPoint={targetFocusPoint}
          isPOSActive={isInteractingWithPOS}
          isAnyModalOpen={isAnyModalOpen}
          waypoints={transitionWaypoints}
          onWaypointChange={handleWaypointChange}
          onTransitionComplete={handleTransitionComplete}
        />

        {/* OrbitControls: KHÓA XOAY TỰ DO, KHÓA CHUỘT PHẢI, ZOOM NHẸ DO CAMERA CONTROLLER QUẢN LÝ */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 1.2, 0]}
          enableRotate={false}
          enablePan={false}
          enableZoom={false}
          minDistance={isInteractingWithPOS ? 0.1 : 0.8}
          maxDistance={25}
          enableDamping
          dampingFactor={0.08}
        />

        {/* ── 1. HÀNH LANG TRUNG TÂM (Central Hallway) ──────────────── */}
        <RoomActivity.Provider value={isHallwayVisible}>
        <group name="room-hallway" visible={isHallwayVisible}>
          <HallwayScene
            activeRoom={activeRoom}
            openDoor={activeOpenDoor}
            onEnterRoom={handleRequestRoomTransition}
          />
        </group>
        </RoomActivity.Provider>

        {/* ── 2. CÁC PHÒNG CHỨC NĂNG (Giữ tài nguyên giữa các lần chuyển phòng) ── */}
          {/* PHÒNG 1: SHOWROOM & BÁN HÀNG */}
          <RoomActivity.Provider value={isShowroomVisible}>
          <group name="room-showroom" visible={isShowroomVisible}>
            <ShowroomScene
              openDoor={activeOpenDoor}
              onReturnToHallway={() => handleRequestRoomTransition("hallway")}
            >
              {showroomChildren}
            </ShowroomScene>
          </group>
          </RoomActivity.Provider>

          {/* PHÒNG 2: KHO & SẢN PHẨM */}
          <RoomActivity.Provider value={isWarehouseVisible}>
          <group name="room-warehouse" visible={isWarehouseVisible}>
            <WarehouseScene
              stockItems={stockItems}
              visibleStockItems={visibleStockItems}
              onOpenProductForm={onOpenProductForm}
              onOpenImportStock={onOpenImportStock}
              onOpenCategoryManage={onOpenCategoryManage}
              onSelectCargoItem={onSelectCargoItem}
              highlightCategoryId={highlightCategoryId}
              openDoor={activeOpenDoor}
              onReturnToHallway={() => handleRequestRoomTransition("hallway")}
              isVisible={isWarehouseVisible}
              isAnyModalOpen={isAnyModalOpen}
            />
          </group>
          </RoomActivity.Provider>

          {/* PHÒNG 3: VĂN PHÒNG QUẢN LÝ */}
          <RoomActivity.Provider value={isOfficeVisible}>
          <group name="room-office" visible={isOfficeVisible}>
            <OfficeScene
              todayRevenue={todayRevenue}
              revenueSeries={revenueSeries}
              metricsStatus={metricsStatus}
              completedOrdersCount={completedOrdersCount}
              employeeCount={employeeCount}
              onOpenSettings={onOpenSettings}
              onOpenEmployeeDialog={onOpenEmployeeDialog}
              onOpenReports={onOpenReports}
              onOpenAccounting={onOpenAccounting}
              canManage={canManageOffice}
              openDoor={activeOpenDoor}
              onReturnToHallway={() => handleRequestRoomTransition("hallway")}
              isVisible={isOfficeVisible}
              isAnyModalOpen={isAnyModalOpen}
            />
          </group>
          </RoomActivity.Provider>
          <TransitionProfiler phase={phase} />
          <ScenePrewarmer prepareRef={prepareRef} activeRoom={activeRoom} busy={phase !== "idle"} />
        </Suspense>
      </Canvas>
    </div>
  );
}
