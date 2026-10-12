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
    position: [0, 4.2, -7.5],
    target: [0, 1.5, -14],
    label: "Toàn cảnh Hành Lang",
    room: "hallway",
  },
  hallwayDoorA: {
    position: [0, 2.0, -11.8],
    target: [0, 1.6, -9.8],
    label: "Cửa Showroom (Phòng 1)",
    room: "hallway",
  },
  hallwayDoorB: {
    position: [-7.2, 2.0, -15.2],
    target: [-8.0, 1.6, -18.2],
    label: "Cửa Kho Hàng (Phòng 2)",
    room: "hallway",
  },
  hallwayDoorC: {
    position: [7.2, 2.0, -15.2],
    target: [8.0, 1.6, -18.2],
    label: "Cửa Văn Phòng (Phòng 3)",
    room: "hallway",
  },

  // ── 📦 KHO HÀNG (Tọa độ trung tâm tại [-8, 0, -25]) ──
  warehouseOverview: {
    position: [-8, 5.2, -18.5],
    target: [-8, 1.4, -25],
    label: "Toàn cảnh Kho Hàng",
    room: "warehouse",
  },
  warehouseShelves: {
    position: [-8, 3.2, -22.5],
    target: [-8, 1.6, -27.5],
    label: "Kệ Kho 3D",
    room: "warehouse",
  },
  warehouseDesk: {
    position: [-11.8, 2.2, -22.8],
    target: [-12.5, 1.2, -24.8],
    label: "Bàn Kiểm Hàng",
    room: "warehouse",
  },
  warehouseImport: {
    position: [-4.2, 2.2, -22.8],
    target: [-3.8, 1.1, -25.2],
    label: "Khu Nhập Hàng",
    room: "warehouse",
  },
  warehouseCategory: {
    position: [-13.2, 2.4, -25.0],
    target: [-15.2, 2.2, -25.0],
    label: "Bảng Danh Mục",
    room: "warehouse",
  },

  // ── 📊 VĂN PHÒNG QUẢN LÝ (Tọa độ trung tâm tại [8, 0, -25]) ──
  officeOverview: {
    position: [8, 4.8, -18.8],
    target: [8, 1.4, -25],
    label: "Toàn cảnh Văn Phòng",
    room: "office",
  },
  officeTV: {
    position: [8, 2.8, -23.5],
    target: [8, 2.4, -27.8],
    label: "TV Báo Cáo Doanh Thu",
    room: "office",
  },
  officeDesk: {
    position: [6.2, 2.3, -23.2],
    target: [5.8, 1.3, -25.5],
    label: "Bàn Giám Đốc",
    room: "office",
  },
  officeCabinet: {
    position: [10.8, 2.2, -23.2],
    target: [12.2, 1.5, -24.8],
    label: "Tủ Hồ Sơ Nhân Viên",
    room: "office",
  },
  officeKPI: {
    position: [12.5, 2.3, -23.8],
    target: [14.8, 2.2, -23.8],
    label: "Bảng Chỉ Số KPI",
    room: "office",
  },
};
