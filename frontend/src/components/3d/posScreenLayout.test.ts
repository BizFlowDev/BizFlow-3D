import { test } from "node:test";
import assert from "node:assert/strict";
import { getPOSCamera } from "./posScreenLayout";

test("the physical POS monitor fits laptop viewports without cutting either edge", () => {
  for (const [width, height] of [[1024, 768], [1033, 830], [1366, 768], [1920, 1080]]) {
    const { position, target } = getPOSCamera(width / height, 52);
    const distance = Math.hypot(...position.map((value, index) => value - target[index]));
    const viewHeight = 2 * distance * Math.tan(26 * Math.PI / 180);
    assert.ok(1.6 / (viewHeight * width / height) <= 0.941);
    assert.ok(1.024 / viewHeight <= 0.881);
    // The camera faces the same 20-degree normal as the actual monitor.
    assert.ok(Math.abs((position[1] - target[1]) / (position[2] - target[2]) - Math.tan(0.35)) < 1e-10);
  }
});

test("a narrow window moves the camera back rather than cropping the monitor", () => {
  assert.ok(getPOSCamera(1, 52).position[2] > getPOSCamera(16 / 9, 52).position[2]);
});
