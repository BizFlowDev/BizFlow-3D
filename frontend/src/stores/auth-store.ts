import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/config/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  storeId: string | null;
  storeName: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
}

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // ── State ──
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      // ── Actions ──

      setAuth: (user, accessToken, refreshToken) => {
        // Lưu token vào localStorage riêng cho interceptor
        if (typeof window !== "undefined") {
          localStorage.setItem("bizflow.accessToken", accessToken);
          localStorage.setItem("bizflow.refreshToken", refreshToken);
          // Compat: session.ts cũ dùng key này cho role
          localStorage.setItem("bizflow.user", JSON.stringify({ role: user.role }));
        }

        // Set cookie cho NextJS middleware (edge runtime)
        setCookie("bizflow.accessToken", accessToken, 7);

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      updateTokens: (accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("bizflow.accessToken", accessToken);
          localStorage.setItem("bizflow.refreshToken", refreshToken);
        }
        setCookie("bizflow.accessToken", accessToken, 7);

        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("bizflow.accessToken");
          localStorage.removeItem("bizflow.refreshToken");
          localStorage.removeItem("bizflow.user");
        }
        deleteCookie("bizflow.accessToken");

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: "bizflow.auth",
      // Chỉ persist các field cần thiết (không persist isLoading, _hasHydrated)
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
