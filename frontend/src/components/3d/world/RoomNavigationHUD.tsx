"use client";

import { useMemo } from "react";
import {
  Store,
  Compass,
  Package,
  BarChart3,
  Globe,
  CreditCard,
  Layers,
  ArrowLeft,
  ChevronRight,
  Tv,
  Briefcase,
  FolderOpen,
  Boxes,
  ClipboardList,
} from "lucide-react";
import { type RoomId, ROOMS, type CameraPreset, CAMERA_PRESETS } from "./types";

interface RoomNavigationHUDProps {
  activeRoom: RoomId;
  currentPreset: CameraPreset;
  onSelectRoom: (room: RoomId) => void;
  onSelectPreset: (preset: CameraPreset) => void;
  onToggle2D: () => void;
  isPOSActive?: boolean;
}

export function RoomNavigationHUD({
  activeRoom,
  currentPreset,
  onSelectRoom,
  onSelectPreset,
  onToggle2D,
  isPOSActive = false,
}: RoomNavigationHUDProps) {
  // Danh sách các phòng
  const roomList: { id: RoomId; label: string; icon: typeof Store; color: string }[] = [
    { id: "showroom", label: "Showroom (P.1)", icon: Store, color: "#6366f1" },
    { id: "hallway", label: "Hành Lang", icon: Compass, color: "#38bdf8" },
    { id: "warehouse", label: "Kho Hàng (P.2)", icon: Package, color: "#f59e0b" },
    { id: "office", label: "Văn Phòng (P.3)", icon: BarChart3, color: "#10b981" },
  ];

  // Presets camera dành riêng cho từng phòng
  const currentRoomPresets = useMemo(() => {
    switch (activeRoom) {
      case "showroom":
        return [
          { id: "showroomOverview" as CameraPreset, label: "Toàn cảnh", icon: Globe },
          { id: "shelfLeft" as CameraPreset, label: "Kệ A", icon: Package },
          { id: "shelfRight" as CameraPreset, label: "Kệ B", icon: Package },
          { id: "shelfSideLeft" as CameraPreset, label: "Kệ C", icon: Package },
          { id: "shelfSideRight" as CameraPreset, label: "Kệ D", icon: Package },
          { id: "posScreen" as CameraPreset, label: "Màn hình POS", icon: CreditCard },
        ];
      case "hallway":
        return [
          { id: "hallwayOverview" as CameraPreset, label: "Toàn cảnh", icon: Globe },
          { id: "hallwayDoorA" as CameraPreset, label: "Cửa Showroom", icon: Store },
          { id: "hallwayDoorB" as CameraPreset, label: "Cửa Kho", icon: Package },
          { id: "hallwayDoorC" as CameraPreset, label: "Cửa Văn Phòng", icon: BarChart3 },
        ];
      case "warehouse":
        return [
          { id: "warehouseOverview" as CameraPreset, label: "Toàn cảnh", icon: Globe },
          { id: "warehouseShelves" as CameraPreset, label: "Kệ kho 3D", icon: Boxes },
          { id: "warehouseDesk" as CameraPreset, label: "Bàn kiểm hàng", icon: ClipboardList },
          { id: "warehouseImport" as CameraPreset, label: "Khu nhập hàng", icon: Package },
          { id: "warehouseCategory" as CameraPreset, label: "Bảng danh mục", icon: Layers },
        ];
      case "office":
        return [
          { id: "officeOverview" as CameraPreset, label: "Toàn cảnh", icon: Globe },
          { id: "officeTV" as CameraPreset, label: "TV Báo cáo", icon: Tv },
          { id: "officeDesk" as CameraPreset, label: "Bàn Giám Đốc", icon: Briefcase },
          { id: "officeCabinet" as CameraPreset, label: "Tủ hồ sơ", icon: FolderOpen },
          { id: "officeKPI" as CameraPreset, label: "Bảng KPI", icon: BarChart3 },
        ];
      default:
        return [];
    }
  }, [activeRoom]);

  // Nếu đang tập trung thao tác trong POS thì ẩn HUD để không chắn tầm nhìn
  if (isPOSActive) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 sm:bottom-4 z-40 flex flex-col items-center gap-1.5 sm:gap-2.5 px-2 sm:px-4">
      {/* ── 1. THANH ĐIỀU HƯỚNG GÓC NHÌN TRONG PHÒNG ────────────────── */}
      <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-white/15 bg-slate-950/85 p-1 sm:p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="hidden sm:flex items-center gap-1 px-2.5 text-[11px] font-bold text-slate-400 border-r border-white/10 mr-0.5">
          <span>Góc nhìn:</span>
        </div>

        {currentRoomPresets.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPreset === item.id ||
            (item.id === "showroomOverview" && currentPreset === "overview");

          return (
            <button
              key={item.id}
              id={`btn-preset-${item.id}`}
              type="button"
              onClick={() => onSelectPreset(item.id)}
              className={`group flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Nút quay lại Hành Lang nhanh khi đang ở trong các phòng */}
        {activeRoom !== "hallway" && (
          <button
            id="btn-nav-to-hallway"
            type="button"
            onClick={() => onSelectRoom("hallway")}
            className="flex items-center gap-1 rounded-xl border border-sky-500/30 bg-sky-600/20 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-600/40 hover:text-white transition-all ml-1"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Ra Hành Lang</span>
          </button>
        )}
      </div>

      {/* ── 2. THANH CHUYỂN PHÒNG CHÍNH (TOP-LEVEL ROOM TABS) ────────── */}
      <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-white/20 bg-slate-950/90 p-1 sm:p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
        {/* Nút thoát về 2D */}
        <button
          id="btn-nav-2d"
          type="button"
          onClick={onToggle2D}
          className="flex items-center gap-1 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all mr-1 border-r border-white/10"
          title="Quay lại giao diện bảng điều khiển 2D"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Về 2D</span>
        </button>

        {/* 4 Phòng chức năng */}
        {roomList.map((room) => {
          const Icon = room.icon;
          const isActive = activeRoom === room.id;

          return (
            <button
              key={room.id}
              id={`btn-room-${room.id}`}
              type="button"
              onClick={() => onSelectRoom(room.id)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold transition-all ${
                isActive
                  ? "text-white shadow-xl scale-105"
                  : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
              style={{
                backgroundColor: isActive ? room.color : "transparent",
              }}
            >
              <Icon className="h-4 w-4" />
              <span>{room.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
