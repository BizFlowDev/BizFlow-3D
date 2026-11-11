import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { canRequestRoom, createTrack, sampleTrack, lookAngles } from "./transitionMotion";
import { getDoorTransitionSequence } from "./doorTransitions";
import { CAMERA_PRESETS, type RoomId } from "./types";

const rooms: RoomId[] = ["showroom", "hallway", "warehouse", "office"];
test("navigation rejects duplicate and overlapping requests during preparation and flight", () => {
  for (const from of rooms) for (const to of rooms) {
    assert.equal(canRequestRoom("idle", from, to), from !== to);
    assert.equal(canRequestRoom("preparing", from, to), false);
    assert.equal(canRequestRoom("moving", from, to), false);
  }
  assert.equal(canRequestRoom("idle", "showroom", "warehouse"), true, "retry after failure is allowed");
});

test("all 12 routes reach exact waypoints with continuous velocity and no coordinate overshoot", () => {
  for (const from of rooms) for (const to of rooms) {
    if (from === to) { assert.deepEqual(getDoorTransitionSequence(from, to), []); continue; }
    const route = getDoorTransitionSequence(from, to);
    assert.ok(route.length > 0);
    assert.deepEqual(route.at(-1)!.position, CAMERA_PRESETS[`${to}Overview`].position);
    for (const field of ["position", "target"] as const) {
      const points = [CAMERA_PRESETS[`${from}Overview`][field], ...route.map(wp => wp[field])];
      const track = createTrack(points, route.map(wp => wp.duration));
      const sample = (segment: number, t: number) => {
        const out = new Vector3(); sampleTrack(track, segment, t, out); return out;
      };
      for (let i = 0; i < route.length; i++) {
        assert.ok(sample(i, 0).distanceTo(new Vector3(...points[i])) < 1e-9);
        assert.ok(sample(i, 1).distanceTo(new Vector3(...points[i + 1])) < 1e-9);
        for (let j = 0; j <= 100; j++) {
          sample(i, j / 100).toArray().forEach((value, axis) => {
            assert.ok(value >= Math.min(points[i][axis], points[i + 1][axis]) - 1e-8);
            assert.ok(value <= Math.max(points[i][axis], points[i + 1][axis]) + 1e-8);
          });
        }
        if (i + 1 < route.length) {
          const epsilon = 1e-6;
          const left = sample(i, 1).sub(sample(i, 1 - epsilon)).divideScalar(epsilon * route[i].duration);
          const right = sample(i + 1, epsilon).sub(sample(i + 1, 0)).divideScalar(epsilon * route[i + 1].duration);
          assert.ok(left.distanceTo(right) < 0.001, `${from} → ${to}, ${field}, join ${i}`);
        }
      }
    }
  }
});

test("opposite look directions rotate through horizontal yaw without vertical flip", () => {
  const start = lookAngles([0, 2, 0], [0, 1, 5]);
  const end = lookAngles([0, 2, 0], [0, 1, -5], start[0]);
  const track = createTrack([start, end], [1]);
  for (let i = 0; i <= 100; i++) {
    const angle = new Vector3();
    sampleTrack(track, 0, i / 100, angle);
    assert.ok(Math.abs(angle.y) < Math.PI / 4);
    assert.ok(Math.cos(angle.y) * angle.z > 4.9);
  }
  const nearPi = lookAngles([0, 0, 0], [0.01, 0, -1]);
  const acrossPi = lookAngles([0, 0, 0], [-0.01, 0, -1], nearPi[0]);
  assert.ok(Math.abs(acrossPi[0] - nearPi[0]) < 0.03);
});
