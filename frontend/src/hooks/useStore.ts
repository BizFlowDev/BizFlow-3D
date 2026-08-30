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
