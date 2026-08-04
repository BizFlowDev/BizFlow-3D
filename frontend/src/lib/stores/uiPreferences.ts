import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Hằng số phát hiện thiết bị ───────────────────────────────────────────────

// Breakpoint md của Tailwind
export const DESKTOP_MIN_WIDTH = 768;

// Thiết bị có ít hơn 4 luồng CPU được coi là "yếu" (điện thoại tầm trung/giá rẻ)
export const WEAK_DEVICE_MIN_CORES = 4;

// ── Types ─────────────────────────────────────────────────────────────────────

interface UiPreferencesState {
  /**
   * Bật/tắt chế độ 3D trên toàn ứng dụng.
   * - Mặc định `true` trên desktop.
   * - Mặc định `false` khi màn hình < 768px (mobile) hoặc thiết bị yếu
   *   (navigator.hardwareConcurrency < 4).
   * Các trang Dashboard / Kho hàng / Báo cáo đọc chung state này để quyết
   * định render Canvas 3D hay layout 2D thuần (Recharts/Table).
   */
  is3DEnabled: boolean;
  toggle3D: () => void;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function detectDefault3DPreference(): boolean {
  // SSR: chưa biết thiết bị → mặc định bật (client sẽ điều chỉnh sau mount)
  if (typeof window === "undefined") return true;

  // Màn hình nhỏ (mobile) → tắt 3D theo mặc định
  if (window.innerWidth < DESKTOP_MIN_WIDTH) return false;

  // Thiết bị yếu (ít luồng CPU) → tắt 3D theo mặc định
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores < WEAK_DEVICE_MIN_CORES) {
    return false;
  }

  return true;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      is3DEnabled: detectDefault3DPreference(),
      toggle3D: () => set((state) => ({ is3DEnabled: !state.is3DEnabled })),
    }),
    {
      // Lưu preference vào localStorage để giữ lựa chọn giữa các phiên
      name: "bizflow.ui-preferences",
      // Chỉ persist field cần thiết (không persist action)
      partialize: (state) => ({ is3DEnabled: state.is3DEnabled }),
    },
  ),
);
