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
  description: string | null;
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
  createdBy: string | null;
}

export interface AnnouncementData {
  title: string;
  content: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  version: string | null;
  fileUrl: string | null;
  isActive: boolean;
  updatedAt: string;
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

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Lấy danh sách stores (Admin) */
export function useStoreList(params: StoreListParams = {}) {
  return useQuery({
    queryKey: ["admin", "stores", params],
    queryFn: async (): Promise<PaginatedResponse<Store>> => {
      const { data } = await apiClient.get<
        ApiResponseData<PaginatedResponse<Store>>
      >("/admin/stores", {
        params: {
          search: params.search || undefined,
          status: params.status === "all" || !params.status ? undefined : params.status,
          plan: params.plan === "all" || !params.plan ? undefined : params.plan,
          page: params.page,
          limit: params.limit,
        },
      });
      if (!data.data) throw new Error(data.message);
      return data.data;
    },
    staleTime: 30_000,
  });
}

/** Lấy chi tiết 1 store (Admin) */
export function useStoreDetail(storeId: string) {
  return useQuery({
    queryKey: ["admin", "store", storeId],
    queryFn: async (): Promise<StoreDetail> => {
      const { data } = await apiClient.get<ApiResponseData<StoreDetail>>(
        `/admin/stores/${storeId}`
      );
      if (!data.data) throw new Error(data.message);
      return data.data;
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
    }): Promise<Store> => {
      const { data: res } = await apiClient.patch<ApiResponseData<Store>>(
        `/admin/stores/${storeId}/subscription`,
        data
      );
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "store"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
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
    }): Promise<Store> => {
      const { data: res } = await apiClient.patch<ApiResponseData<Store>>(
        `/admin/stores/${storeId}/status`,
        { activate }
      );
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "store"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
}

/** Lấy danh sách system config (Admin) */
export function useSystemConfig() {
  return useQuery({
    queryKey: ["admin", "system-config"],
    queryFn: async (): Promise<SystemConfig[]> => {
      const { data } = await apiClient.get<ApiResponseData<SystemConfig[]>>(
        "/admin/system-config"
      );
      if (!data.data) throw new Error(data.message);
      return data.data;
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
    ): Promise<SystemConfig[]> => {
      const { data: res } = await apiClient.put<ApiResponseData<SystemConfig[]>>(
        "/admin/system-config",
        { configs }
      );
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-config"] });
    },
  });
}

/** Tạo thông báo broadcast */
export function useBroadcastAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AnnouncementData): Promise<Announcement> => {
      const { data: res } = await apiClient.post<ApiResponseData<Announcement>>(
        "/admin/announcements",
        data
      );
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });
}

/** Lấy danh sách thông báo đã gửi (Admin) */
export function useAnnouncements() {
  return useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: async (): Promise<Announcement[]> => {
      const { data } = await apiClient.get<ApiResponseData<Announcement[]>>(
        "/admin/announcements"
      );
      if (!data.data) throw new Error(data.message);
      return data.data;
    },
    staleTime: 60_000,
  });
}

/** Upload template báo cáo */
export function useUploadTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      file: File
    ): Promise<{ success: boolean; url: string | null }> => {
      const formData = new FormData();
      formData.append("template", file);
      const { data: res } = await apiClient.post<
        ApiResponseData<{ success: boolean; url: string | null }>
      >("/admin/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
  });
}

/** Lấy danh sách mẫu báo cáo (Admin) */
export function useReportTemplates() {
  return useQuery({
    queryKey: ["admin", "templates"],
    queryFn: async (): Promise<ReportTemplate[]> => {
      const { data } = await apiClient.get<ApiResponseData<ReportTemplate[]>>(
        "/admin/templates"
      );
      if (!data.data) throw new Error(data.message);
      return data.data;
    },
    staleTime: 60_000,
  });
}

/** Lấy analytics toàn nền tảng (Admin) */
export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async (): Promise<PlatformAnalytics> => {
      const { data } = await apiClient.get<ApiResponseData<PlatformAnalytics>>(
        "/admin/analytics"
      );
      if (!data.data) throw new Error(data.message);
      return data.data;
    },
    staleTime: 60_000,
  });
}