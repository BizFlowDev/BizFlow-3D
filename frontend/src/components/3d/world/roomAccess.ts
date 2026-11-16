import type { CameraPreset, RoomId } from "./types";

export const ALL_ROOMS: readonly RoomId[] = ["showroom", "hallway", "warehouse", "office"];
const SALES_ROOMS: readonly RoomId[] = ["showroom", "hallway"];

export function accessibleRooms(role: string | undefined): readonly RoomId[] {
  return role === "owner" ? ALL_ROOMS : SALES_ROOMS;
}

export function canUsePreset(rooms: readonly RoomId[], preset: CameraPreset): boolean {
  if (preset.startsWith("warehouse") || preset === "hallwayDoorB") return rooms.includes("warehouse");
  if (preset.startsWith("office") || preset === "hallwayDoorC") return rooms.includes("office");
  return true;
}
