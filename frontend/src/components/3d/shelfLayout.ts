/** Shared by shelf meshes and the camera so a sparse shelf keeps its focus aligned. */
export function getShelfProductPosition(index: number, count: number): [number, number, number] {
  const sparse = count <= 5;
  const row = sparse ? 1 : Math.floor(index / 5);
  const col = sparse ? index + (5 - count) / 2 : index % 5;
  return [-5.6 / 2 + (col + 1) * (5.6 / 6), (row + 1) * (3.8 / 5) + 0.48 / 2 + 0.04, 0];
}
