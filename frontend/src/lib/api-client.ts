"use client";

import axios from "axios";

// ── Axios instance ────────────────────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

// ── Request Interceptor — Attach access token ────────────────────────────────

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bizflow.accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor — Handle 401 / 403 ──────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;

    if (status === 401) {
      // Token hết hạn hoặc không hợp lệ → clear & redirect login
      if (typeof window !== "undefined") {
        localStorage.removeItem("bizflow.accessToken");
        localStorage.removeItem("bizflow.refreshToken");
        localStorage.removeItem("bizflow.auth");
        localStorage.removeItem("bizflow.user");

        // Xóa cookie cho middleware
        document.cookie =
          "bizflow.accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // Redirect nếu chưa ở trang login
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }

    if (status === 403) {
      // Permission denied — user đã login nhưng không có quyền
      console.error("[API] 403 Forbidden — Bạn không có quyền truy cập");
    }

    return Promise.reject(error);
  },
);

// ── Type helpers ──────────────────────────────────────────────────────────────

/** Shape trả về từ backend (ApiResponse.toJSON()) */
export interface ApiResponseData<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

export default apiClient;
