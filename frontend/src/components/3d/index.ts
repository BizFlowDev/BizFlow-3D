// ── Barrel exports cho 3D components ──────────────────────────────────────────
// Tất cả component trong thư mục này dành cho scene 3D cửa hàng (store-3d page).
// Sử dụng dynamic import (next/dynamic) khi import từ page để lazy load three.js.

export { default as StoreViewer } from "./StoreViewer";
export { default as ProductShelf } from "./ProductShelf";
export { default as Counter } from "./Counter";
export { CameraController, CAMERA_PRESETS } from "./CameraController";
export { StoreDecorations } from "./StoreDecorations";

// Re-export types
export type { ShelfProduct } from "./ProductShelf";
export type { CameraPreset, CameraPresetConfig } from "./CameraController";
