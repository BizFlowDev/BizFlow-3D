"use client";

import { type RoomId, type DoorId, type TransitionWaypoint, CAMERA_PRESETS } from "./types";

/**
 * Tạo danh sách các Waypoints điều khiển camera và trạng thái mở cửa 
 * cho hành trình di chuyển qua lại giữa các phòng trong BizFlow 3D.
 * 
 * Nhịp điệu điện ảnh êm ái:
 * - 1-hop: ~2.2 giây (Cửa mở thư thái -> Lướt qua khung cửa -> Đáp xuống toàn cảnh)
 * - 2-hop: ~3.2 giây (Ra hành lang -> Xoay hướng đón phòng đích -> Vào phòng đích)
 */
export function getDoorTransitionSequence(
  fromRoom: RoomId,
  toRoom: RoomId,
): TransitionWaypoint[] {
  if (fromRoom === toRoom) return [];

  // ── 1-HOP TRANSITIONS: Từ Hành Lang vào các phòng (~2.2s) ──────────────────
  if (fromRoom === "hallway" && toRoom === "showroom") {
    return [
      {
        position: [0, 1.8, -12.5],
        target: [0, 1.5, -8.0],
        duration: 0.75,
        openDoor: "hallway_door_showroom",
      },
      {
        position: [0, 1.8, -7.2],
        target: [0, 1.5, 0.0],
        duration: 0.75,
        openDoor: "hallway_door_showroom",
        activeRoomHint: "showroom",
      },
      {
        position: CAMERA_PRESETS.showroomOverview.position,
        target: CAMERA_PRESETS.showroomOverview.target,
        duration: 0.70,
        openDoor: null,
        activeRoomHint: "showroom",
      },
    ];
  }

  if (fromRoom === "hallway" && toRoom === "warehouse") {
    return [
      {
        position: [-3.2, 1.8, -15.5],
        target: [-3.2, 1.5, -19.5],
        duration: 0.75,
        openDoor: "hallway_door_warehouse",
      },
      {
        position: [-3.2, 1.8, -20.2],
        target: [-7.8, 1.5, -25.5],
        duration: 0.75,
        openDoor: "hallway_door_warehouse",
        activeRoomHint: "warehouse",
      },
      {
        position: CAMERA_PRESETS.warehouseOverview.position,
        target: CAMERA_PRESETS.warehouseOverview.target,
        duration: 0.70,
        openDoor: null,
        activeRoomHint: "warehouse",
      },
    ];
  }

  if (fromRoom === "hallway" && toRoom === "office") {
    return [
      {
        position: [3.2, 1.8, -15.5],
        target: [3.2, 1.5, -19.5],
        duration: 0.75,
        openDoor: "hallway_door_office",
      },
      {
        position: [3.2, 1.8, -20.2],
        target: [7.8, 1.5, -25.5],
        duration: 0.75,
        openDoor: "hallway_door_office",
        activeRoomHint: "office",
      },
      {
        position: CAMERA_PRESETS.officeOverview.position,
        target: CAMERA_PRESETS.officeOverview.target,
        duration: 0.70,
        openDoor: null,
        activeRoomHint: "office",
      },
    ];
  }

  // ── 1-HOP TRANSITIONS: Từ các phòng ra Hành Lang (~2.2s) ────────────────────
  if (fromRoom === "showroom" && toRoom === "hallway") {
    return [
      {
        position: [0, 1.8, -6.5],
        target: [0, 1.5, -11.0],
        duration: 0.75,
        openDoor: "showroom_exit",
      },
      {
        position: [0, 1.8, -12.0],
        target: [0, 1.5, -16.5],
        duration: 0.75,
        openDoor: "showroom_exit",
        activeRoomHint: "hallway",
      },
      {
        position: CAMERA_PRESETS.hallwayOverview.position,
        target: CAMERA_PRESETS.hallwayOverview.target,
        duration: 0.70,
        openDoor: null,
        activeRoomHint: "hallway",
      },
    ];
  }

  if (fromRoom === "warehouse" && toRoom === "hallway") {
    return [
      {
        position: [-3.2, 1.8, -21.0],
        target: [-3.2, 1.5, -16.0],
        duration: 0.75,
        openDoor: "warehouse_exit",
      },
      {
        position: [-3.2, 1.8, -15.5],
        target: [0, 1.5, -14.0],
        duration: 0.75,
        openDoor: "warehouse_exit",
        activeRoomHint: "hallway",
      },
      {
        position: CAMERA_PRESETS.hallwayOverview.position,
        target: CAMERA_PRESETS.hallwayOverview.target,
        duration: 0.70,
        openDoor: null,
        activeRoomHint: "hallway",
      },
    ];
  }

  if (fromRoom === "office" && toRoom === "hallway") {
    return [
      {
        position: [3.2, 1.8, -21.0],
        target: [3.2, 1.5, -16.0],
        duration: 0.75,
        openDoor: "office_exit",
      },
      {
        position: [3.2, 1.8, -15.5],
        target: [0, 1.5, -14.0],
        duration: 0.75,
        openDoor: "office_exit",
        activeRoomHint: "hallway",
      },
      {
        position: CAMERA_PRESETS.hallwayOverview.position,
        target: CAMERA_PRESETS.hallwayOverview.target,
        duration: 0.70,
        openDoor: null,
        activeRoomHint: "hallway",
      },
    ];
  }

  // ── 2-HOP TRANSITIONS: Đi qua Hành Lang từ phòng này sang phòng khác (~3.2s) ──
  // Giai đoạn 1: Mở cửa và thoát ra hành lang (~1.3s)
  const exitWaypoints: TransitionWaypoint[] = [];
  if (fromRoom === "showroom") {
    exitWaypoints.push(
      {
        position: [0, 1.8, -6.5],
        target: [0, 1.5, -11.0],
        duration: 0.65,
        openDoor: "showroom_exit",
      },
      {
        position: [0, 1.8, -12.0],
        target: [0, 1.5, -16.5],
        duration: 0.65,
        openDoor: "showroom_exit",
        activeRoomHint: "hallway",
      },
    );
  } else if (fromRoom === "warehouse") {
    exitWaypoints.push(
      {
        position: [-3.2, 1.8, -21.0],
        target: [-3.2, 1.5, -16.0],
        duration: 0.65,
        openDoor: "warehouse_exit",
      },
      {
        position: [-3.2, 1.8, -15.5],
        target: [0, 1.5, -14.0],
        duration: 0.65,
        openDoor: "warehouse_exit",
        activeRoomHint: "hallway",
      },
    );
  } else if (fromRoom === "office") {
    exitWaypoints.push(
      {
        position: [3.2, 1.8, -21.0],
        target: [3.2, 1.5, -16.0],
        duration: 0.65,
        openDoor: "office_exit",
      },
      {
        position: [3.2, 1.8, -15.5],
        target: [0, 1.5, -14.0],
        duration: 0.65,
        openDoor: "office_exit",
        activeRoomHint: "hallway",
      },
    );
  }

  // Giai đoạn 2: Xoay hướng cửa đích và bước vào phòng (~1.9s)
  const enterWaypoints: TransitionWaypoint[] = [];
  if (toRoom === "showroom") {
    enterWaypoints.push(
      {
        position: [0, 1.8, -13.0],
        target: [0, 1.5, -8.0],
        duration: 0.55,
        openDoor: "hallway_door_showroom",
        activeRoomHint: "hallway",
      },
      {
        position: [0, 1.8, -7.2],
        target: [0, 1.5, 0.0],
        duration: 0.70,
        openDoor: "hallway_door_showroom",
        activeRoomHint: "showroom",
      },
      {
        position: CAMERA_PRESETS.showroomOverview.position,
        target: CAMERA_PRESETS.showroomOverview.target,
        duration: 0.65,
        openDoor: null,
        activeRoomHint: "showroom",
      },
    );
  } else if (toRoom === "warehouse") {
    enterWaypoints.push(
      {
        position: [-2.4, 1.8, -14.5],
        target: [-3.2, 1.5, -19.5],
        duration: 0.55,
        openDoor: "hallway_door_warehouse",
        activeRoomHint: "hallway",
      },
      {
        position: [-3.2, 1.8, -20.2],
        target: [-7.8, 1.5, -25.5],
        duration: 0.70,
        openDoor: "hallway_door_warehouse",
        activeRoomHint: "warehouse",
      },
      {
        position: CAMERA_PRESETS.warehouseOverview.position,
        target: CAMERA_PRESETS.warehouseOverview.target,
        duration: 0.65,
        openDoor: null,
        activeRoomHint: "warehouse",
      },
    );
  } else if (toRoom === "office") {
    enterWaypoints.push(
      {
        position: [2.4, 1.8, -14.5],
        target: [3.2, 1.5, -19.5],
        duration: 0.55,
        openDoor: "hallway_door_office",
        activeRoomHint: "hallway",
      },
      {
        position: [3.2, 1.8, -20.2],
        target: [7.8, 1.5, -25.5],
        duration: 0.70,
        openDoor: "hallway_door_office",
        activeRoomHint: "office",
      },
      {
        position: CAMERA_PRESETS.officeOverview.position,
        target: CAMERA_PRESETS.officeOverview.target,
        duration: 0.65,
        openDoor: null,
        activeRoomHint: "office",
      },
    );
  }

  return [...exitWaypoints, ...enterWaypoints];
}
