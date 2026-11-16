import { test } from "node:test";
import assert from "node:assert/strict";
import { accessibleRooms, canUsePreset } from "./roomAccess";
import { CAMERA_PRESETS } from "./types";

test("employee and unauthenticated scenes expose only sales rooms and sales camera destinations", () => {
  for (const role of ["employee", undefined]) {
    const rooms = accessibleRooms(role);
    assert.deepEqual(rooms, ["showroom", "hallway"]);
    for (const preset of Object.keys(CAMERA_PRESETS) as (keyof typeof CAMERA_PRESETS)[]) {
      const management = preset.startsWith("warehouse") || preset.startsWith("office") || preset === "hallwayDoorB" || preset === "hallwayDoorC";
      assert.equal(canUsePreset(rooms, preset), !management, preset);
    }
  }
});

test("owner retains all rooms and camera destinations", () => {
  const rooms = accessibleRooms("owner");
  assert.deepEqual(rooms, ["showroom", "hallway", "warehouse", "office"]);
  for (const preset of Object.keys(CAMERA_PRESETS) as (keyof typeof CAMERA_PRESETS)[]) {
    assert.equal(canUsePreset(rooms, preset), true, preset);
  }
});
