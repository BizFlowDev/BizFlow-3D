"use client";

// ── Định nghĩa các phòng trong BizFlow 3D ─────────────────────────────────────
export type RoomId = "hallway" | "showroom" | "warehouse" | "office";

export interface RoomInfo {
  id: RoomId;
  name: string;
  shortName: string;
  iconName: string;
  description: string;
  badge: string;
  accentColor: string;
}

export const ROOMS: Record<RoomId, RoomInfo> = {
  showroom: {
    id: "showroom",
    name: "Showroom & Bán Hàng",
    shortName: "Showroom",
    iconName: "Store",
    description: "Kệ trưng bày sản phẩm, quầy thu ngân & máy tính POS bán hàng",
    badge: "Phòng 1",
    accentColor: "#6366f1",
  },
  hallway: {
    id: "hallway",
    name: "Hành Lang Trung Tâm",
    shortName: "Hành Lang",
    iconName: "Compass",
    description: "Khu vực kết nối đa phòng điều phối luồng di chuyển",
    badge: "Trung tâm",
    accentColor: "#38bdf8",
  },
  warehouse: {
    id: "warehouse",
    name: "Kho Hàng & Sản Phẩm",
    shortName: "Kho Hàng",
    iconName: "Package",
    description: "Kệ kho thông minh 3D, bàn kiểm hàng & khu tiếp nhận nhập kho",
    badge: "Phòng 2",
    accentColor: "#f59e0b",
  },
  office: {
    id: "office",
    name: "Văn Phòng Quản Lý",
    shortName: "Văn Phòng",
    iconName: "BarChart3",
    description: "Màn hình TV báo cáo doanh thu, bàn giám đốc & tủ hồ sơ nhân viên",
    badge: "Phòng 3",
    accentColor: "#10b981",
  },
};

// ── Preset Camera cho từng phòng ─────────────────────────────────────────────
export type CameraPreset =
  // Toàn cảnh mặc định / tương thích ngược
  | "overview"
  // ── Showroom ──
  | "showroomOverview"
  | "shelfLeft"
  | "shelfRight"
  | "shelfSideLeft"
  | "shelfSideRight"
  | "counter"
  | "posScreen"
  // ── Hành lang ──
  | "hallwayOverview"
  | "hallwayDoorA"
  | "hallwayDoorB"
  | "hallwayDoorC"
  // ── Kho hàng ──
  | "warehouseOverview"
  | "warehouseShelves"
  | "warehouseDesk"
  | "warehouseImport"
  | "warehouseCategory"
  // ── Văn phòng quản lý ──
  | "officeOverview"
  | "officeTV"
  | "officeDesk"
  | "officeCabinet"
  | "officeKPI";

export interface CameraPresetConfig {
  position: [number, number, number];
  target: [number, number, number];
  label: string;
  room: RoomId;
}

export const CAMERA_PRESETS: Record<CameraPreset, CameraPresetConfig> = {
  // Legacy alias
  overview: {
    position: [0, 4.8, 9.8],
    target: [0, 1.2, 0],
    label: "Toàn cảnh Showroom",
    room: "showroom",
  },

  // ── 🏪 SHOWROOM (Tọa độ gốc tại [0, 0, 0]) ──
  showroomOverview: {
    position: [0, 4.8, 9.8],
    target: [0, 1.2, 0],
    label: "Toàn cảnh Showroom",
    room: "showroom",
  },
  shelfLeft: {
    position: [-3.7, 2.4, 2],
    target: [-3.5, 1.8, -5.5],
    label: "Kệ hàng Trái (A)",
    room: "showroom",
  },
  shelfRight: {
    position: [3.7, 2.4, 2],
    target: [3.5, 1.8, -5.5],
    label: "Kệ hàng Phải (B)",
    room: "showroom",
  },
  shelfSideLeft: {
    position: [0, 2.2, -0.5],
    target: [-7.0, 1.8, -0.5],
    label: "Kệ Hông Trái (C)",
    room: "showroom",
  },
  shelfSideRight: {
    position: [0, 2.2, -0.5],
    target: [7.0, 1.8, -0.5],
    label: "Kệ Hông Phải (D)",
    room: "showroom",
  },
  counter: {
    position: [0, 2.1, 4.8],
    target: [0, 1.1, 2],
    label: "Quầy Thu Ngân",
    room: "showroom",
  },
  posScreen: {
    position: [0.45, 2.2, 2.95],
    target: [0.45, 1.85, 1.95],
    label: "Màn hình POS",
    room: "showroom",
  },

  // ── 🏢 HÀNH LANG (Tọa độ trung tâm tại [0, 0, -14]) ──
  hallwayOverview: {
    position: [0, 2.5, -10.8],
    target: [0, 1.5, -16.8],
    label: "Toàn cảnh Hành Lang",
    room: "hallway",
  },
  hallwayDoorA: {
    position: [0, 1.9, -13.5],
    target: [0, 1.5, -10.0],
    label: "Cửa Showroom (Phòng 1)",
    room: "hallway",
  },
  hallwayDoorB: {
    position: [-2.4, 1.9, -14.5],
    target: [-3.2, 1.5, -18.0],
    label: "Cửa Kho Hàng (Phòng 2)",
    room: "hallway",
  },
  hallwayDoorC: {
    position: [2.4, 1.9, -14.5],
    target: [3.2, 1.5, -18.0],
    label: "Cửa Văn Phòng (Phòng 3)",
    room: "hallway",
  },

  // ── 📦 KHO HÀNG (Tọa độ trung tâm tại [-8, 0, -25]) ──
  warehouseOverview: {
    position: [-8, 3.8, -19.0],
    target: [-8, 1.5, -26.5],
    label: "Toàn cảnh Kho Hàng",
    room: "warehouse",
  },
  warehouseShelves: {
    position: [-8, 2.4, -24.5],
    target: [-8, 1.6, -28.5],
    label: "Kệ Kho 3D",
    room: "warehouse",
  },
  warehouseDesk: {
    position: [-9.0, 2.0, -22.5],
    target: [-9.8, 1.1, -25.2],
    label: "Bàn Kiểm Hàng",
    room: "warehouse",
  },
  warehouseImport: {
    position: [-7.0, 2.0, -22.5],
    target: [-6.2, 1.1, -25.2],
    label: "Khu Nhập Hàng",
    room: "warehouse",
  },
  warehouseCategory: {
    position: [-12.5, 2.2, -23.5],
    target: [-15.35, 2.2, -25.0],
    label: "Bảng Danh Mục",
    room: "warehouse",
  },

  // ── 📊 VĂN PHÒNG QUẢN LÝ (Tọa độ trung tâm tại [8, 0, -25]) ──
  officeOverview: {
    position: [8, 3.4, -19.0],
    target: [8, 1.5, -26.5],
    label: "Toàn cảnh Văn Phòng",
    room: "office",
  },
  officeTV: {
    position: [8, 2.2, -26.0],
    target: [8, 2.3, -31.8],
    label: "TV Báo Cáo Doanh Thu",
    room: "office",
  },
  officeDesk: {
    position: [7.0, 1.9, -22.8],
    target: [6.2, 1.2, -25.2],
    label: "Bàn Giám Đốc",
    room: "office",
  },
  officeCabinet: {
    position: [9.0, 2.0, -22.8],
    target: [9.8, 1.5, -25.2],
    label: "Tủ Hồ Sơ Nhân Viên",
    room: "office",
  },
  officeKPI: {
    position: [11.8, 2.2, -23.5],
    target: [15.35, 2.2, -24.5],
    label: "Bảng Chỉ Số KPI",
    room: "office",
  },
};
