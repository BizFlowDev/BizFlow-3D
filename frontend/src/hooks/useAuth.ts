"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/stores/auth-store";
import type { ApiResponseData } from "@/lib/api-client";

// ── API response types (khớp với backend LoginOutput, RefreshTokenOutput) ────

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    storeId: string | null;
    storeName: string | null;
    fullName: string;
    email: string;
    role: string;
  };
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    setAuth,
    updateTokens,
    clearAuth,
    setLoading,
  } = useAuthStore();

  /** POST /auth/login — đăng nhập, lưu token + user, redirect dashboard */
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.post<ApiResponseData<LoginResponse>>(
          "/auth/login",
          { email, password },
        );

        if (!res.data) {
          throw new Error(res.message || "Đăng nhập thất bại");
        }

        const { accessToken, refreshToken, user: userData } = res.data;

        const authUser: AuthUser = {
          id: userData.id,
          fullName: userData.fullName,
          email: userData.email,
          role: userData.role as AuthUser["role"],
          storeId: userData.storeId,
          storeName: userData.storeName,
        };

        setAuth(authUser, accessToken, refreshToken);

        // Redirect theo role
        if (authUser.role === "admin") {
          router.push("/admin/stores");
        } else {
          router.push("/");
        }

        return res;
      } finally {
        setLoading(false);
      }
    },
    [router, setAuth, setLoading],
  );

  /** POST /auth/logout — đăng xuất, xóa token, redirect /login */
  const logout = useCallback(async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Ignore — vẫn clear local dù API lỗi
    } finally {
      clearAuth();
      router.push("/login");
    }
  }, [router, clearAuth]);

  /** POST /auth/refresh — làm mới cặp token */
  const refresh = useCallback(async () => {
    const currentRefreshToken = useAuthStore.getState().refreshToken;
    if (!currentRefreshToken) {
      clearAuth();
      return;
    }

    try {
      const { data: res } = await apiClient.post<ApiResponseData<RefreshResponse>>(
        "/auth/refresh",
        { refreshToken: currentRefreshToken },
      );

      if (!res.data) {
        throw new Error("Refresh token thất bại");
      }

      updateTokens(res.data.accessToken, res.data.refreshToken);
    } catch {
      clearAuth();
      router.push("/login");
    }
  }, [router, clearAuth, updateTokens]);

  /** POST /auth/change-password — đổi mật khẩu */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const { data: res } = await apiClient.post<ApiResponseData<null>>(
        "/auth/change-password",
        { currentPassword, newPassword },
      );
      return res;
    },
    [],
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refresh,
    changePassword,
  };
}
