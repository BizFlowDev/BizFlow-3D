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

// ── Refresh Token State & Request Queue ──────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function handleLogout() {
  if (typeof window !== "undefined") {
    // Xóa sạch trạng thái xác thực trong Zustand, localStorage và Cookie
    localStorage.removeItem("bizflow.accessToken");
    localStorage.removeItem("bizflow.refreshToken");
    localStorage.removeItem("bizflow.auth");
    localStorage.removeItem("bizflow.user");

    document.cookie =
      "bizflow.accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // Redirect nếu chưa ở trang login
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }
}

// ── Response Interceptor — Handle 401 (Auto Refresh) / 403 ──────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;

    // Không kích hoạt refresh nếu 401 đến từ chính các API login / refresh / logout
    const requestUrl = originalRequest?.url || "";
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      const storedRefreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("bizflow.refreshToken")
          : null;

      // Nếu không có refreshToken (hoặc đã bị xóa) -> đăng xuất
      if (!storedRefreshToken) {
        handleLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Đã có 1 request refresh đang chạy -> xếp hàng đợi token mới
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((queueErr) => Promise.reject(queueErr));
      }

      isRefreshing = true;

      try {
        // Gọi API /auth/refresh bằng axios instance độc lập để không lặp qua interceptor
        const refreshRes = await axios.post<
          ApiResponseData<{ accessToken: string; refreshToken: string }>
        >(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });

        const newTokens = refreshRes.data?.data;
        if (!newTokens?.accessToken || !newTokens?.refreshToken) {
          throw new Error("Không nhận được token mới từ máy chủ");
        }

        // 1. Cập nhật localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("bizflow.accessToken", newTokens.accessToken);
          localStorage.setItem("bizflow.refreshToken", newTokens.refreshToken);

          // 2. Cập nhật cookie cho Next.js middleware (7 ngày)
          const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
          document.cookie = `bizflow.accessToken=${encodeURIComponent(
            newTokens.accessToken,
          )}; path=/; expires=${expires}; SameSite=Lax`;
        }

        // 3. Đánh thức các request đang nằm trong hàng đợi
        processQueue(null, newTokens.accessToken);

        // 4. Retry request ban đầu với accessToken mới
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        // Refresh token cũng đã hết hạn (sau 7 ngày) hoặc bị thu hồi -> đăng xuất
        processQueue(refreshErr, null);
        handleLogout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
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
