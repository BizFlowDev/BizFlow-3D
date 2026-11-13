/** Fit the physical 1.6 × 1.024 m monitor while approaching along its tilted normal. */
export function getPOSCamera(aspect: number, fov: number) {
  const tangent = Math.tan(fov * Math.PI / 360);
  const distance = Math.max(0.8 / (tangent * aspect * 0.94), 0.512 / (tangent * 0.88));
  const target: [number, number, number] = [0.45, 1.81 + Math.sin(0.35) * 0.03, 1.95 + Math.cos(0.35) * 0.03];
  const position: [number, number, number] = [target[0], target[1] + Math.sin(0.35) * distance, target[2] + Math.cos(0.35) * distance];
  return { target, position };
}
