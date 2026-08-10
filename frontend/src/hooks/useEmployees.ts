"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  storeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "employee";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
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
  userId: string;
  action: string;
  performedBy: string;
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

// ── Mock Data ─────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "emp1",
    storeId: "s1",
    fullName: "Trần Thị Hồng",
    email: "hong.tran@bizflow.com",
    phone: "0901111222",
    role: "employee",
    isActive: true,
    lastLoginAt: "2026-08-10T08:30:00Z",
    createdAt: "2026-02-15T08:00:00Z",
    updatedAt: "2026-08-10T08:30:00Z",
    createdBy: "Nguyễn Văn Thành",
  },
  {
    id: "emp2",
    storeId: "s1",
    fullName: "Lê Minh Tuấn",
    email: "tuan.le@bizflow.com",
    phone: "0912222333",
    role: "employee",
    isActive: true,
    lastLoginAt: "2026-08-09T17:45:00Z",
    createdAt: "2026-03-10T08:00:00Z",
    updatedAt: "2026-08-09T17:45:00Z",
    createdBy: "Nguyễn Văn Thành",
  },
  {
    id: "emp3",
    storeId: "s1",
    fullName: "Phạm Ngọc Lan",
    email: "lan.pham@bizflow.com",
    phone: "0933334444",
    role: "employee",
    isActive: true,
    lastLoginAt: "2026-08-08T14:20:00Z",
    createdAt: "2026-04-20T08:00:00Z",
    updatedAt: "2026-08-08T14:20:00Z",
    createdBy: "Nguyễn Văn Thành",
  },
  {
    id: "emp4",
    storeId: "s1",
    fullName: "Võ Đức Huy",
    email: "huy.vo@bizflow.com",
    phone: "0944445555",
    role: "employee",
    isActive: false,
    lastLoginAt: "2026-06-15T09:00:00Z",
    createdAt: "2026-01-05T08:00:00Z",
    updatedAt: "2026-07-01T10:00:00Z",
    createdBy: "Nguyễn Văn Thành",
  },
  {
    id: "emp5",
    storeId: "s1",
    fullName: "Nguyễn Thị Mai",
    email: "mai.nguyen@bizflow.com",
    phone: null,
    role: "employee",
    isActive: true,
    lastLoginAt: null,
    createdAt: "2026-08-05T08:00:00Z",
    updatedAt: "2026-08-05T08:00:00Z",
    createdBy: "Nguyễn Văn Thành",
  },
];

const MOCK_AUDIT_LOGS: Record<string, AuditLogEntry[]> = {
  emp1: [
    {
      id: "al1",
      userId: "emp1",
      action: "employee_created",
      performedBy: "owner1",
      performedByName: "Nguyễn Văn Thành",
      details: "Tạo tài khoản nhân viên Trần Thị Hồng (hong.tran@bizflow.com)",
      createdAt: "2026-02-15T08:00:00Z",
    },
    {
      id: "al2",
      userId: "emp1",
      action: "password_reset",
      performedBy: "owner1",
      performedByName: "Nguyễn Văn Thành",
      details: "Reset mật khẩu tài khoản",
      createdAt: "2026-05-10T14:30:00Z",
    },
  ],
  emp2: [
    {
      id: "al3",
      userId: "emp2",
      action: "employee_created",
      performedBy: "owner1",
      performedByName: "Nguyễn Văn Thành",
      details: "Tạo tài khoản nhân viên Lê Minh Tuấn (tuan.le@bizflow.com)",
      createdAt: "2026-03-10T08:00:00Z",
    },
  ],
  emp3: [
    {
      id: "al4",
      userId: "emp3",
      action: "employee_created",
      performedBy: "owner1",
      performedByName: "Nguyễn Văn Thành",
      details: "Tạo tài khoản nhân viên Phạm Ngọc Lan (lan.pham@bizflow.com)",
      createdAt: "2026-04-20T08:00:00Z",
    },
  ],
  emp4: [
    {
      id: "al5",
      userId: "emp4",
      action: "employee_created",
      performedBy: "owner1",
      performedByName: "Nguyễn Văn Thành",
      details: "Tạo tài khoản nhân viên Võ Đức Huy (huy.vo@bizflow.com)",
      createdAt: "2026-01-05T08:00:00Z",
    },
    {
      id: "al6",
      userId: "emp4",
      action: "status_deactivated",
      performedBy: "owner1",
      performedByName: "Nguyễn Văn Thành",
      details: "Vô hiệu hóa tài khoản nhân viên",
      createdAt: "2026-07-01T10:00:00Z",
    },
  ],
  emp5: [
    {
      id: "al7",
      userId: "emp5",
      action: "employee_created",
      performedBy: "owner1",
      performedByName: "Nguyễn Văn Thành",
      details: "Tạo tài khoản nhân viên Nguyễn Thị Mai (mai.nguyen@bizflow.com)",
      createdAt: "2026-08-05T08:00:00Z",
    },
  ],
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Lấy danh sách nhân viên (Owner) */
export function useEmployeeList(params: EmployeeListParams = {}) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: async (): Promise<PaginatedResponse<Employee>> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<Employee>>
        >("/employees", { params });
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(600);

      let filtered = [...MOCK_EMPLOYEES];

      // Search by name or email
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q)
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

/** Tạo nhân viên mới (Owner) */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateEmployeeData
    ): Promise<{ success: boolean; employee: Employee }> => {
      try {
        const { data: res } = await apiClient.post<
          ApiResponseData<{ success: boolean; employee: Employee }>
        >("/employees", data);
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(800);

      const newEmployee: Employee = {
        id: `emp${Date.now()}`,
        storeId: "s1",
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        role: "employee",
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "Nguyễn Văn Thành",
      };

      MOCK_EMPLOYEES.push(newEmployee);

      // Add audit log entry
      MOCK_AUDIT_LOGS[newEmployee.id] = [
        {
          id: `al${Date.now()}`,
          userId: newEmployee.id,
          action: "employee_created",
          performedBy: "owner1",
          performedByName: "Nguyễn Văn Thành",
          details: `Tạo tài khoản nhân viên ${data.fullName} (${data.email})${data.sendEmail ? " — Đã gửi email thông báo" : ""}`,
          createdAt: new Date().toISOString(),
        },
      ];

      return { success: true, employee: newEmployee };
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
    }): Promise<{ success: boolean }> => {
      try {
        const { data: res } = await apiClient.patch<
          ApiResponseData<{ success: boolean }>
        >(`/employees/${employeeId}/status`, { activate });
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(600);

      const employee = MOCK_EMPLOYEES.find((e) => e.id === employeeId);
      if (employee) {
        employee.isActive = activate;
        employee.updatedAt = new Date().toISOString();
      }

      // Add audit log
      const logs = MOCK_AUDIT_LOGS[employeeId] ?? [];
      logs.push({
        id: `al${Date.now()}`,
        userId: employeeId,
        action: activate ? "status_activated" : "status_deactivated",
        performedBy: "owner1",
        performedByName: "Nguyễn Văn Thành",
        details: activate
          ? "Kích hoạt lại tài khoản nhân viên"
          : "Vô hiệu hóa tài khoản nhân viên",
        createdAt: new Date().toISOString(),
      });
      MOCK_AUDIT_LOGS[employeeId] = logs;

      return { success: true };
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
    }: {
      employeeId: string;
      newPassword: string;
    }): Promise<{ success: boolean }> => {
      try {
        const { data: res } = await apiClient.patch<
          ApiResponseData<{ success: boolean }>
        >(`/employees/${employeeId}/reset-password`, {});
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(600);

      // Add audit log
      const logs = MOCK_AUDIT_LOGS[employeeId] ?? [];
      logs.push({
        id: `al${Date.now()}`,
        userId: employeeId,
        action: "password_reset",
        performedBy: "owner1",
        performedByName: "Nguyễn Văn Thành",
        details: "Reset mật khẩu tài khoản",
        createdAt: new Date().toISOString(),
      });
      MOCK_AUDIT_LOGS[employeeId] = logs;

      return { success: true };
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
      if (!employeeId) return [];

      try {
        const { data } = await apiClient.get<
          ApiResponseData<AuditLogEntry[]>
        >(`/employees/${employeeId}/audit-log`);
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(400);
      const logs = MOCK_AUDIT_LOGS[employeeId] ?? [];
      return [...logs].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    enabled: !!employeeId,
  });
}
