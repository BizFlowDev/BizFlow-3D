"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  storeId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: "employee";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateEmployeeData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  sendEmail?: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  performedBy: string | null;
  performedByName: string;
  details: string;
  createdAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Lấy danh sách nhân viên (Owner) */
export function useEmployeeList(params: EmployeeListParams = {}) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: async (): Promise<PaginatedResponse<Employee>> => {
      const { data } = await apiClient.get<
        ApiResponseData<PaginatedResponse<Employee>>
      >("/employees", { params });
      return data.data!;
    },
    staleTime: 30_000,
  });
}

/** Tạo nhân viên mới (Owner) */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateEmployeeData
    ): Promise<{ success: boolean; employee: Employee }> => {
      const { data: res } = await apiClient.post<
        ApiResponseData<{ success: boolean; employee: Employee }>
      >("/employees", data);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

/** Toggle trạng thái nhân viên (Activate / Deactivate) */
export function useToggleEmployeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      activate,
    }: {
      employeeId: string;
      activate: boolean;
    }): Promise<{ success: boolean; isActive: boolean }> => {
      const { data: res } = await apiClient.patch<
        ApiResponseData<{ success: boolean; isActive: boolean }>
      >(`/employees/${employeeId}/status`, { activate });
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-audit"] });
    },
  });
}

/** Reset mật khẩu nhân viên (Owner) */
export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      newPassword,
    }: {
      employeeId: string;
      newPassword: string;
    }): Promise<{ success: boolean }> => {
      const { data: res } = await apiClient.patch<
        ApiResponseData<{ success: boolean }>
      >(`/employees/${employeeId}/reset-password`, { newPassword });
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-audit"] });
    },
  });
}

/** Lấy audit log của 1 nhân viên */
export function useEmployeeAuditLog(employeeId: string | null) {
  return useQuery({
    queryKey: ["employee-audit", employeeId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data } = await apiClient.get<
        ApiResponseData<AuditLogEntry[]>
      >(`/employees/${employeeId}/audit-log`);
      return data.data ?? [];
    },
    enabled: !!employeeId,
  });
}
