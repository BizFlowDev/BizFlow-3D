"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

export interface StoreBankInfo {
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

export interface StoreProfile {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  subscriptionPlan: string;
  subscriptionStatus: "active" | "expired" | "trial";
  subscriptionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const STORE_QUERY_KEY = ["store", "me"] as const;

/**
 * Hook lấy thông tin cửa hàng hiện tại
 */
export function useCurrentStore() {
  return useQuery<StoreProfile>({
    queryKey: STORE_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponseData<StoreProfile>>("/stores/me");
      if (!data.success || !data.data) {
        throw new Error(data.message || "Không thể lấy thông tin cửa hàng");
      }
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}

/**
 * Hook cập nhật thông tin ngân hàng nhận tiền (VietQR)
 */
export function useUpdateStoreBankInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      bankCode: string | null;
      bankAccountNumber: string | null;
      bankAccountHolder: string | null;
    }) => {
      const { data } = await apiClient.put<ApiResponseData<StoreProfile>>(
        "/stores/bank-info",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.message || "Cập nhật thông tin ngân hàng thất bại");
      }
      return data.data;
    },
    onSuccess: (updatedStore) => {
      queryClient.setQueryData(STORE_QUERY_KEY, updatedStore);
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEY });
    },
  });
}

/**
 * Hook cập nhật thông tin cơ bản cửa hàng
 */
export function useUpdateStoreProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      taxCode?: string | null;
    }) => {
      const { data } = await apiClient.put<ApiResponseData<StoreProfile>>(
        "/stores/profile",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.message || "Cập nhật thông tin cửa hàng thất bại");
      }
      return data.data;
    },
    onSuccess: (updatedStore) => {
      queryClient.setQueryData(STORE_QUERY_KEY, updatedStore);
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEY });
    },
  });
}

export interface SubscriptionPlanItem {
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
}

/**
 * Hook lấy danh sách các gói dịch vụ dành cho cửa hàng
 */
export function useStoreSubscriptionPlans() {
  return useQuery<SubscriptionPlanItem[]>({
    queryKey: ["store", "subscription-plans"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponseData<SubscriptionPlanItem[]>>(
        "/stores/subscription-plans",
      );
      if (!data.success || !data.data) {
        throw new Error(data.message || "Không thể tải danh sách gói dịch vụ");
      }
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook nâng cấp / gia hạn gói dịch vụ cho cửa hàng
 */
export function useUpgradeStoreSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      plan: string;
      durationMonths: number;
      paymentMethod?: string;
    }) => {
      const { data } = await apiClient.post<ApiResponseData<StoreProfile>>(
        "/stores/upgrade-subscription",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.message || "Nâng cấp gói dịch vụ thất bại");
      }
      return data.data;
    },
    onSuccess: (updatedStore) => {
      queryClient.setQueryData(STORE_QUERY_KEY, updatedStore);
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "subscription-history"] });
    },
  });
}

export interface SubscriptionPaymentBank {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  memoPrefix: string;
}

/**
 * Hook lấy thông tin tài khoản ngân hàng nhận tiền bản quyền/gói dịch vụ do Admin cấu hình
 */
export function useSubscriptionPaymentBank() {
  return useQuery({
    queryKey: ["stores", "subscription-payment-bank"],
    queryFn: async (): Promise<SubscriptionPaymentBank> => {
      const { data } = await apiClient.get<ApiResponseData<SubscriptionPaymentBank>>(
        "/stores/subscription-payment-bank",
      );
      if (!data.success || !data.data) {
        throw new Error(data.message || "Không thể tải thông tin thanh toán");
      }
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export interface StripeUpgradeSessionData {
  orderId: string;
  sessionId: string;
  checkoutUrl: string;
  qrCodeUrl: string;
  amount: number;
  currency: string;
  planSlug: string;
  planName: string;
  durationMonths: number;
  expiresAt: string;
}

/**
 * Hook tạo phiên thanh toán Stripe Checkout và nhận mã QR
 */
export function useCreateStripeUpgradeSession() {
  return useMutation({
    mutationFn: async (payload: { plan: string; durationMonths: number }) => {
      const { data } = await apiClient.post<ApiResponseData<StripeUpgradeSessionData>>(
        "/stores/upgrade-session/stripe",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.message || "Tạo phiên thanh toán Stripe thất bại");
      }
      return data.data;
    },
  });
}

export interface SubscriptionOrderStatusData {
  id: string;
  storeId: string;
  planSlug: string;
  durationMonths: number;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "expired" | "cancelled";
  checkoutUrl: string | null;
  qrCodeUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook kiểm tra trạng thái đơn nâng cấp gói (phục vụ fallback polling)
 */
export function useSubscriptionOrderStatus(orderId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["stores", "subscription-orders", orderId, "status"],
    queryFn: async (): Promise<SubscriptionOrderStatusData> => {
      const { data } = await apiClient.get<ApiResponseData<SubscriptionOrderStatusData>>(
        `/stores/subscription-orders/${orderId}/status`,
      );
      if (!data.success || !data.data) {
        throw new Error(data.message || "Không thể kiểm tra trạng thái đơn hàng");
      }
      return data.data;
    },
    enabled: Boolean(orderId && enabled),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed" || status === "expired" || status === "cancelled") {
        return false;
      }
      return 3000;
    },
  });
}


