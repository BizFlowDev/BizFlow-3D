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
  subscriptionPlan: string;
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
  plan?: string;
  page?: number;
  limit?: number;
}

export interface CreateStoreData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxCode?: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerPassword: string;
  subscriptionPlan?: string;
  subscriptionStatus?: "active" | "expired" | "trial";
  durationMonths?: number;
}

export interface UpdateSubscriptionData {
  plan: string;
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

/** Tạo cửa hàng mới + tài khoản chủ sở hữu (Admin) */
export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStoreData): Promise<Store> => {
      const { data: res } = await apiClient.post<ApiResponseData<Store>>(
        "/admin/stores",
        data
      );
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
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

// ── Subscription Plans ────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  features: string[];
  maxEmployees: number;
  isActive: boolean;
  sortOrder: number;
  colorFrom: string | null;
  colorTo: string | null;
  icon: string | null;
  storeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanData {
  name: string;
  slug: string;
  description?: string;
  price: number;
  features: string[];
  maxEmployees: number;
  sortOrder?: number;
  colorFrom?: string;
  colorTo?: string;
  icon?: string;
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  price?: number;
  features?: string[];
  maxEmployees?: number;
  isActive?: boolean;
  sortOrder?: number;
  colorFrom?: string;
  colorTo?: string;
  icon?: string;
}

/** Lấy danh sách subscription plans */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["admin", "subscription-plans"],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data } = await apiClient.get<ApiResponseData<SubscriptionPlan[]>>(
        "/admin/subscription-plans"
      );
      if (!data.data) throw new Error(data.message);
      return data.data;
    },
    staleTime: 30_000,
  });
}

/** Tạo subscription plan mới */
export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planData: CreatePlanData): Promise<SubscriptionPlan> => {
      const { data: res } = await apiClient.post<
        ApiResponseData<SubscriptionPlan>
      >("/admin/subscription-plans", planData);
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
    },
  });
}

/** Cập nhật subscription plan */
export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      data,
    }: {
      planId: string;
      data: UpdatePlanData;
    }): Promise<SubscriptionPlan> => {
      const { data: res } = await apiClient.put<
        ApiResponseData<SubscriptionPlan>
      >(`/admin/subscription-plans/${planId}`, data);
      if (!res.data) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
    },
  });
}

/** Xoá subscription plan */
export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<void> => {
      await apiClient.delete(`/admin/subscription-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
    },
  });
}

// ── Subscription History ──────────────────────────────────────────────────────

export interface SubscriptionHistoryItem {
  id: string;
  storeId: string;
  storeName: string | null;
  oldPlan: string | null;
  newPlan: string;
  oldStatus: string | null;
  newStatus: string | null;
  changedBy: string | null;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
}

export interface SubscriptionHistoryParams {
  storeId?: string;
  page?: number;
  limit?: number;
}

interface SubscriptionHistoryResponse {
  items: SubscriptionHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Lấy lịch sử thay đổi gói đăng ký */
export function useSubscriptionHistory(
  params: SubscriptionHistoryParams = {}
) {
  return useQuery({
    queryKey: ["admin", "subscription-history", params],
    queryFn: async (): Promise<SubscriptionHistoryResponse> => {
      const { data } = await apiClient.get<
        ApiResponseData<SubscriptionHistoryResponse>
      >("/admin/subscription-history", {
        params: {
          storeId: params.storeId || undefined,
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