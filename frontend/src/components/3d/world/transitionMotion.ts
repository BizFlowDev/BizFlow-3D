import type { RoomId } from "./types";

export type TransitionPhase = "idle" | "preparing" | "moving";
export function canRequestRoom(phase: TransitionPhase, current: RoomId, target: RoomId) {
  return phase === "idle" && current !== target;
}

/** Monotone cubic Hermite: shared velocities, no overshoot at door coordinates. */
export function createTrack(points: number[][], durations: number[]) {
  const velocities = points.map((point, i) => point.map((_, axis) => {
    if (i === 0 || i === points.length - 1) return 0;
    const before = (point[axis] - points[i - 1][axis]) / durations[i - 1];
    const after = (points[i + 1][axis] - point[axis]) / durations[i];
    if (before * after <= 0) return 0;
    return 2 * before * after / (before + after);
  }));
  return { points, durations, velocities };
}

export function sampleTrack(track: ReturnType<typeof createTrack>, segment: number, t: number, out: { set: (x: number, y: number, z: number) => unknown }) {
  const t2 = t * t, t3 = t2 * t;
  const { points, velocities, durations } = track;
  const axis = (a: number) => (2 * t3 - 3 * t2 + 1) * points[segment][a]
    + (t3 - 2 * t2 + t) * durations[segment] * velocities[segment][a]
    + (-2 * t3 + 3 * t2) * points[segment + 1][a]
    + (t3 - t2) * durations[segment] * velocities[segment + 1][a];
  out.set(axis(0), axis(1), axis(2));
}

/** Unwrap yaw so a half-turn travels horizontally, never through a vertical pole. */
export function lookAngles(position: number[], target: number[], previousYaw = 0): number[] {
  const x = target[0] - position[0], y = target[1] - position[1], z = target[2] - position[2];
  const horizontal = Math.hypot(x, z);
  let yaw = horizontal < 0.0001 ? previousYaw : Math.atan2(x, z);
  yaw = previousYaw + Math.atan2(Math.sin(yaw - previousYaw), Math.cos(yaw - previousYaw));
  return [yaw, Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, Math.atan2(y, horizontal))), Math.max(0.1, Math.hypot(x, y, z))];
}
