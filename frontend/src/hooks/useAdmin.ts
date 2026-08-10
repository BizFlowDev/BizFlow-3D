"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  subscriptionPlan: "basic" | "professional";
  subscriptionStatus: "active" | "expired" | "trial";
  subscriptionExpiresAt: string | null;
  ownerName: string;
  ownerEmail: string;
  employeeCount: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreDetail extends Store {
  recentOrders: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export interface StoreListParams {
  search?: string;
  status?: "all" | "active" | "expired" | "trial";
  plan?: "all" | "basic" | "professional";
  page?: number;
  limit?: number;
}

export interface UpdateSubscriptionData {
  plan: "basic" | "professional";
  price: number;
  durationMonths: number;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface SystemConfigUpdateData {
  key: string;
  value: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface AnnouncementData {
  title: string;
  content: string;
}

export interface PlatformAnalytics {
  totalUsers: number;
  totalStores: number;
  activeSubscriptions: number;
  mrr: number;
  newRegistrations: { date: string; count: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  topStores: {
    id: string;
    name: string;
    revenue: number;
    orders: number;
    plan: string;
  }[];
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK_STORES: Store[] = [
  {
    id: "s1",
    name: "Cửa hàng Vật liệu Xây dựng Thành Phát",
    address: "123 Nguyễn Huệ, Q.1, TP.HCM",
    phone: "0901234567",
    email: "thanhphat@bizflow.com",
    taxCode: "0100123456",
    subscriptionPlan: "professional",
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2027-07-31T23:59:59Z",
    ownerName: "Nguyễn Văn Thành",
    ownerEmail: "thanh@bizflow.com",
    employeeCount: 5,
    totalOrders: 1250,
    totalRevenue: 2450000000,
    createdAt: "2025-06-15T08:00:00Z",
    updatedAt: "2026-08-01T10:30:00Z",
  },
  {
    id: "s2",
    name: "Tạp hóa Minh Quang",
    address: "456 Lê Lợi, Q.5, TP.HCM",
    phone: "0912345678",
    email: "minhquang@bizflow.com",
    taxCode: "0100234567",
    subscriptionPlan: "basic",
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2027-03-15T23:59:59Z",
    ownerName: "Trần Minh Quang",
    ownerEmail: "quang@bizflow.com",
    employeeCount: 2,
    totalOrders: 580,
    totalRevenue: 890000000,
    createdAt: "2025-09-01T08:00:00Z",
    updatedAt: "2026-07-28T14:00:00Z",
  },
  {
    id: "s3",
    name: "Đại lý Sơn Tùng",
    address: "789 Trần Hưng Đạo, Q.10, TP.HCM",
    phone: "0378901234",
    email: "sontung@bizflow.com",
    taxCode: "0100345678",
    subscriptionPlan: "professional",
    subscriptionStatus: "expired",
    subscriptionExpiresAt: "2026-06-30T23:59:59Z",
    ownerName: "Lê Sơn Tùng",
    ownerEmail: "tung@bizflow.com",
    employeeCount: 8,
    totalOrders: 2100,
    totalRevenue: 5600000000,
    createdAt: "2025-03-10T08:00:00Z",
    updatedAt: "2026-08-05T09:15:00Z",
  },
  {
    id: "s4",
    name: "Cửa hàng Điện nước Hòa Bình",
    address: "12 Nguyễn Trãi, Q.3, TP.HCM",
    phone: "0567890123",
    email: "hoabinh@bizflow.com",
    taxCode: null,
    subscriptionPlan: "basic",
    subscriptionStatus: "trial",
    subscriptionExpiresAt: "2026-09-01T23:59:59Z",
    ownerName: "Phạm Hòa Bình",
    ownerEmail: "binh@bizflow.com",
    employeeCount: 1,
    totalOrders: 45,
    totalRevenue: 120000000,
    createdAt: "2026-07-15T08:00:00Z",
    updatedAt: "2026-08-08T16:45:00Z",
  },
  {
    id: "s5",
    name: "Siêu thị Mini Gia Định",
    address: "34 Hai Bà Trưng, Bình Thạnh, TP.HCM",
    phone: "0823456789",
    email: "giadinh@bizflow.com",
    taxCode: "0100456789",
    subscriptionPlan: "professional",
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2027-01-15T23:59:59Z",
    ownerName: "Hoàng Thị Nga",
    ownerEmail: "nga@bizflow.com",
    employeeCount: 12,
    totalOrders: 3500,
    totalRevenue: 8900000000,
    createdAt: "2025-01-20T08:00:00Z",
    updatedAt: "2026-08-09T11:20:00Z",
  },
  {
    id: "s6",
    name: "Cửa hàng Nội thất Phú Mỹ",
    address: "56 CMT8, Q.Tân Bình, TP.HCM",
    phone: "0934567890",
    email: "phumy@bizflow.com",
    taxCode: "0100567890",
    subscriptionPlan: "basic",
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2027-05-20T23:59:59Z",
    ownerName: "Võ Thanh Hải",
    ownerEmail: "hai@bizflow.com",
    employeeCount: 3,
    totalOrders: 320,
    totalRevenue: 1650000000,
    createdAt: "2025-11-05T08:00:00Z",
    updatedAt: "2026-08-07T13:00:00Z",
  },
  {
    id: "s7",
    name: "Đại lý Gạo Phương Nam",
    address: "78 Võ Văn Tần, Q.3, TP.HCM",
    phone: "0709876543",
    email: "phuongnam@bizflow.com",
    taxCode: null,
    subscriptionPlan: "basic",
    subscriptionStatus: "expired",
    subscriptionExpiresAt: "2026-05-01T23:59:59Z",
    ownerName: "Đỗ Quang Khải",
    ownerEmail: "khai@bizflow.com",
    employeeCount: 2,
    totalOrders: 890,
    totalRevenue: 670000000,
    createdAt: "2025-05-12T08:00:00Z",
    updatedAt: "2026-07-30T08:45:00Z",
  },
  {
    id: "s8",
    name: "Cửa hàng Kim khí Đại Phong",
    address: "90 Lý Thường Kiệt, Q.11, TP.HCM",
    phone: "0856789012",
    email: "daiphong@bizflow.com",
    taxCode: "0100678901",
    subscriptionPlan: "professional",
    subscriptionStatus: "active",
    subscriptionExpiresAt: "2027-09-30T23:59:59Z",
    ownerName: "Bùi Đại Phong",
    ownerEmail: "phong@bizflow.com",
    employeeCount: 6,
    totalOrders: 1800,
    totalRevenue: 4200000000,
    createdAt: "2025-04-08T08:00:00Z",
    updatedAt: "2026-08-10T10:00:00Z",
  },
];

const MOCK_CONFIGS: SystemConfig[] = [
  {
    id: "cfg1",
    key: "max_employees_basic",
    value: "3",
    description: "Số nhân viên tối đa cho gói Basic",
    updatedAt: "2026-07-01T10:00:00Z",
  },
  {
    id: "cfg2",
    key: "max_employees_professional",
    value: "20",
    description: "Số nhân viên tối đa cho gói Professional",
    updatedAt: "2026-07-01T10:00:00Z",
  },
  {
    id: "cfg3",
    key: "trial_duration_days",
    value: "14",
    description: "Số ngày dùng thử miễn phí",
    updatedAt: "2026-06-15T08:00:00Z",
  },
  {
    id: "cfg4",
    key: "basic_price_monthly",
    value: "199000",
    description: "Giá gói Basic hàng tháng (VNĐ)",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "cfg5",
    key: "professional_price_monthly",
    value: "499000",
    description: "Giá gói Professional hàng tháng (VNĐ)",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "cfg6",
    key: "low_stock_threshold",
    value: "10",
    description: "Ngưỡng cảnh báo hàng sắp hết",
    updatedAt: "2026-07-20T14:30:00Z",
  },
  {
    id: "cfg7",
    key: "ai_model_provider",
    value: "gemini",
    description: "Nhà cung cấp AI (openai/gemini)",
    updatedAt: "2026-08-05T09:00:00Z",
  },
  {
    id: "cfg8",
    key: "report_template_version",
    value: "TT88-2021-v2",
    description: "Phiên bản mẫu báo cáo Thông tư 88",
    updatedAt: "2026-07-10T11:00:00Z",
  },
];

const MOCK_ANALYTICS: PlatformAnalytics = {
  totalUsers: 156,
  totalStores: 8,
  activeSubscriptions: 5,
  mrr: 3494000,
  newRegistrations: [
    { date: "2026-02-01", count: 1 },
    { date: "2026-03-01", count: 2 },
    { date: "2026-04-01", count: 0 },
    { date: "2026-05-01", count: 1 },
    { date: "2026-06-01", count: 1 },
    { date: "2026-07-01", count: 2 },
    { date: "2026-08-01", count: 1 },
  ],
  revenueOverTime: [
    { date: "2026-02-01", revenue: 1200000 },
    { date: "2026-03-01", revenue: 1600000 },
    { date: "2026-04-01", revenue: 1800000 },
    { date: "2026-05-01", revenue: 2200000 },
    { date: "2026-06-01", revenue: 2800000 },
    { date: "2026-07-01", revenue: 3200000 },
    { date: "2026-08-01", revenue: 3494000 },
  ],
  topStores: [
    {
      id: "s5",
      name: "Siêu thị Mini Gia Định",
      revenue: 8900000000,
      orders: 3500,
      plan: "professional",
    },
    {
      id: "s3",
      name: "Đại lý Sơn Tùng",
      revenue: 5600000000,
      orders: 2100,
      plan: "professional",
    },
    {
      id: "s8",
      name: "Cửa hàng Kim khí Đại Phong",
      revenue: 4200000000,
      orders: 1800,
      plan: "professional",
    },
    {
      id: "s1",
      name: "VLXD Thành Phát",
      revenue: 2450000000,
      orders: 1250,
      plan: "professional",
    },
    {
      id: "s6",
      name: "Nội thất Phú Mỹ",
      revenue: 1650000000,
      orders: 320,
      plan: "basic",
    },
  ],
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Lấy danh sách stores (Admin) */
export function useStoreList(params: StoreListParams = {}) {
  return useQuery({
    queryKey: ["admin", "stores", params],
    queryFn: async (): Promise<PaginatedResponse<Store>> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<Store>>
        >("/admin/stores", { params });
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(600);

      let filtered = [...MOCK_STORES];

      // Search
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.ownerName.toLowerCase().includes(q) ||
            (s.phone && s.phone.includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q))
        );
      }

      // Filter by status
      if (params.status && params.status !== "all") {
        filtered = filtered.filter(
          (s) => s.subscriptionStatus === params.status
        );
      }

      // Filter by plan
      if (params.plan && params.plan !== "all") {
        filtered = filtered.filter(
          (s) => s.subscriptionPlan === params.plan
        );
      }

      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const start = (page - 1) * limit;
      const items = filtered.slice(start, start + limit);

      return {
        items,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      };
    },
    staleTime: 30_000,
  });
}

/** Lấy chi tiết 1 store (Admin) */
export function useStoreDetail(storeId: string) {
  return useQuery({
    queryKey: ["admin", "store", storeId],
    queryFn: async (): Promise<StoreDetail> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<StoreDetail>>(
          `/admin/stores/${storeId}`
        );
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(400);

      const store = MOCK_STORES.find((s) => s.id === storeId);
      if (!store) throw new Error("Store not found");

      return {
        ...store,
        recentOrders: [
          {
            id: "o1",
            totalAmount: 3500000,
            status: "confirmed",
            createdAt: "2026-08-09T10:30:00Z",
          },
          {
            id: "o2",
            totalAmount: 1200000,
            status: "confirmed",
            createdAt: "2026-08-08T14:00:00Z",
          },
          {
            id: "o3",
            totalAmount: 5800000,
            status: "draft",
            createdAt: "2026-08-07T16:45:00Z",
          },
        ],
        monthlyRevenue: [
          { month: "2026-03", revenue: 320000000 },
          { month: "2026-04", revenue: 280000000 },
          { month: "2026-05", revenue: 350000000 },
          { month: "2026-06", revenue: 410000000 },
          { month: "2026-07", revenue: 390000000 },
          { month: "2026-08", revenue: 450000000 },
        ],
      };
    },
    enabled: !!storeId,
  });
}

/** Cập nhật subscription plan (Admin) */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      data,
    }: {
      storeId: string;
      data: UpdateSubscriptionData;
    }): Promise<{ success: boolean }> => {
      try {
        const { data: res } = await apiClient.patch<
          ApiResponseData<{ success: boolean }>
        >(`/admin/stores/${storeId}/subscription`, data);
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(800);
      const store = MOCK_STORES.find((s) => s.id === storeId);
      if (store) {
        store.subscriptionPlan = data.plan;
        store.subscriptionStatus = "active";
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + data.durationMonths);
        store.subscriptionExpiresAt = expiresAt.toISOString();
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "store"] });
    },
  });
}

/** Toggle trạng thái store (Activate / Deactivate) */
export function useToggleStoreStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      activate,
    }: {
      storeId: string;
      activate: boolean;
    }): Promise<{ success: boolean }> => {
      try {
        const { data: res } = await apiClient.patch<
          ApiResponseData<{ success: boolean }>
        >(`/admin/stores/${storeId}/status`, { activate });
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(600);
      const store = MOCK_STORES.find((s) => s.id === storeId);
      if (store) {
        store.subscriptionStatus = activate ? "active" : "expired";
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
    },
  });
}

/** Lấy danh sách system config (Admin) */
export function useSystemConfig() {
  return useQuery({
    queryKey: ["admin", "system-config"],
    queryFn: async (): Promise<SystemConfig[]> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<SystemConfig[]>
        >("/admin/system-config");
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(500);
      return MOCK_CONFIGS;
    },
    staleTime: 60_000,
  });
}

/** Cập nhật system config */
export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      configs: SystemConfigUpdateData[]
    ): Promise<{ success: boolean }> => {
      try {
        const { data: res } = await apiClient.put<
          ApiResponseData<{ success: boolean }>
        >("/admin/system-config", { configs });
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(600);
      for (const update of configs) {
        const cfg = MOCK_CONFIGS.find((c) => c.key === update.key);
        if (cfg) {
          cfg.value = update.value;
          cfg.updatedAt = new Date().toISOString();
        }
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-config"] });
    },
  });
}

/** Tạo thông báo broadcast */
export function useBroadcastAnnouncement() {
  return useMutation({
    mutationFn: async (
      data: AnnouncementData
    ): Promise<{ success: boolean }> => {
      try {
        const { data: res } = await apiClient.post<
          ApiResponseData<{ success: boolean }>
        >("/admin/announcements", data);
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(800);
      return { success: true };
    },
  });
}

/** Upload template báo cáo */
export function useUploadTemplate() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ success: boolean; url: string }> => {
      try {
        const formData = new FormData();
        formData.append("template", file);
        const { data: res } = await apiClient.post<
          ApiResponseData<{ success: boolean; url: string }>
        >("/admin/templates", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(1000);
      return { success: true, url: `/templates/${file.name}` };
    },
  });
}

/** Lấy analytics toàn nền tảng (Admin) */
export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async (): Promise<PlatformAnalytics> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PlatformAnalytics>
        >("/admin/analytics");
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(700);
      return MOCK_ANALYTICS;
    },
    staleTime: 60_000,
  });
}
