"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  storeId: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  debtBalance: number;
  note: string | null;
  isActive: boolean;
  totalPurchases: number;
  lastPurchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends Customer {
  totalOrders: number;
  totalRevenue: number;
}

export interface PurchaseOrder {
  id: string;
  orderCode: string;
  createdAt: string;
  products: string;
  totalAmount: number;
  paymentMethod: string;
  status: "confirmed" | "draft" | "cancelled";
}

export interface DebtTransaction {
  id: string;
  date: string;
  type: "debt_created" | "payment" | "adjustment";
  amount: number;
  remainingBalance: number;
  operator: string;
  note: string | null;
}

export interface CustomerListParams {
  search?: string;
  filter?: "all" | "has_debt" | "no_debt";
  page?: number;
  limit?: number;
}

export interface CustomerFormData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  note?: string;
}

export interface DebtPaymentData {
  amount: number;
  paymentMethod: "cash" | "transfer";
  note?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    storeId: "s1",
    code: "KH-001",
    name: "Nguyễn Văn An",
    phone: "0901234567",
    email: "an.nguyen@gmail.com",
    address: "123 Nguyễn Huệ, Q.1, TP.HCM",
    debtBalance: 2500000,
    note: "Khách hàng thân thiết",
    isActive: true,
    totalPurchases: 15,
    lastPurchaseDate: "2026-07-28T10:30:00Z",
    createdAt: "2026-01-15T08:00:00Z",
    updatedAt: "2026-07-28T10:30:00Z",
  },
  {
    id: "c2",
    storeId: "s1",
    code: "KH-002",
    name: "Trần Thị Bình",
    phone: "0912345678",
    email: "binh.tran@gmail.com",
    address: "456 Lê Lợi, Q.1, TP.HCM",
    debtBalance: 0,
    note: null,
    isActive: true,
    totalPurchases: 8,
    lastPurchaseDate: "2026-07-25T14:00:00Z",
    createdAt: "2026-02-20T08:00:00Z",
    updatedAt: "2026-07-25T14:00:00Z",
  },
  {
    id: "c3",
    storeId: "s1",
    code: "KH-003",
    name: "Lê Hoàng Cường",
    phone: "0378901234",
    email: "cuong.le@yahoo.com",
    address: "789 Trần Hưng Đạo, Q.5, TP.HCM",
    debtBalance: 5800000,
    note: "Mua sỉ hàng tháng",
    isActive: true,
    totalPurchases: 32,
    lastPurchaseDate: "2026-07-30T16:45:00Z",
    createdAt: "2025-11-10T08:00:00Z",
    updatedAt: "2026-07-30T16:45:00Z",
  },
  {
    id: "c4",
    storeId: "s1",
    code: "KH-004",
    name: "Phạm Minh Đức",
    phone: "0567890123",
    email: null,
    address: "12 Nguyễn Trãi, Q.5, TP.HCM",
    debtBalance: 1200000,
    note: null,
    isActive: true,
    totalPurchases: 5,
    lastPurchaseDate: "2026-07-20T09:15:00Z",
    createdAt: "2026-04-05T08:00:00Z",
    updatedAt: "2026-07-20T09:15:00Z",
  },
  {
    id: "c5",
    storeId: "s1",
    code: "KH-005",
    name: "Hoàng Thị Nga",
    phone: "0823456789",
    email: "nga.hoang@outlook.com",
    address: "34 Hai Bà Trưng, Q.3, TP.HCM",
    debtBalance: 0,
    note: "Thanh toán đúng hạn",
    isActive: true,
    totalPurchases: 22,
    lastPurchaseDate: "2026-07-29T11:20:00Z",
    createdAt: "2025-08-15T08:00:00Z",
    updatedAt: "2026-07-29T11:20:00Z",
  },
  {
    id: "c6",
    storeId: "s1",
    code: "KH-006",
    name: "Võ Thanh Hải",
    phone: "0934567890",
    email: "hai.vo@gmail.com",
    address: "56 Cách Mạng Tháng 8, Q.10, TP.HCM",
    debtBalance: 800000,
    note: null,
    isActive: false,
    totalPurchases: 3,
    lastPurchaseDate: "2026-05-10T13:00:00Z",
    createdAt: "2026-03-01T08:00:00Z",
    updatedAt: "2026-05-10T13:00:00Z",
  },
  {
    id: "c7",
    storeId: "s1",
    code: "KH-007",
    name: "Đỗ Quang Khải",
    phone: "0709876543",
    email: null,
    address: "78 Võ Văn Tần, Q.3, TP.HCM",
    debtBalance: 0,
    note: null,
    isActive: true,
    totalPurchases: 11,
    lastPurchaseDate: "2026-07-27T08:45:00Z",
    createdAt: "2026-01-20T08:00:00Z",
    updatedAt: "2026-07-27T08:45:00Z",
  },
  {
    id: "c8",
    storeId: "s1",
    code: "KH-008",
    name: "Bùi Thị Mai Linh",
    phone: "0856789012",
    email: "linh.bui@gmail.com",
    address: "90 Điện Biên Phủ, Q. Bình Thạnh, TP.HCM",
    debtBalance: 3400000,
    note: "Đại lý cấp 2",
    isActive: true,
    totalPurchases: 45,
    lastPurchaseDate: "2026-07-31T15:30:00Z",
    createdAt: "2025-06-01T08:00:00Z",
    updatedAt: "2026-07-31T15:30:00Z",
  },
];

const MOCK_PURCHASE_HISTORY: PurchaseOrder[] = [
  {
    id: "o1",
    orderCode: "DH-20260730-001",
    createdAt: "2026-07-30T16:45:00Z",
    products: "Áo thun cotton (x3), Quần jean (x2)",
    totalAmount: 1850000,
    paymentMethod: "cash",
    status: "confirmed",
  },
  {
    id: "o2",
    orderCode: "DH-20260725-003",
    createdAt: "2026-07-25T10:20:00Z",
    products: "Giày sneaker (x1), Tất cotton (x5)",
    totalAmount: 950000,
    paymentMethod: "transfer",
    status: "confirmed",
  },
  {
    id: "o3",
    orderCode: "DH-20260720-007",
    createdAt: "2026-07-20T14:00:00Z",
    products: "Balo laptop (x1)",
    totalAmount: 650000,
    paymentMethod: "cash",
    status: "confirmed",
  },
  {
    id: "o4",
    orderCode: "DH-20260715-002",
    createdAt: "2026-07-15T09:30:00Z",
    products: "Áo khoác (x2), Mũ lưỡi trai (x3)",
    totalAmount: 1200000,
    paymentMethod: "cash",
    status: "cancelled",
  },
  {
    id: "o5",
    orderCode: "DH-20260710-005",
    createdAt: "2026-07-10T11:15:00Z",
    products: "Ví da nam (x1), Thắt lưng (x1)",
    totalAmount: 780000,
    paymentMethod: "transfer",
    status: "confirmed",
  },
];

const MOCK_DEBT_HISTORY: DebtTransaction[] = [
  {
    id: "d1",
    date: "2026-07-30T16:45:00Z",
    type: "debt_created",
    amount: 1850000,
    remainingBalance: 5800000,
    operator: "Chủ cửa hàng",
    note: "Đơn hàng DH-20260730-001",
  },
  {
    id: "d2",
    date: "2026-07-28T10:00:00Z",
    type: "payment",
    amount: 2000000,
    remainingBalance: 3950000,
    operator: "Chủ cửa hàng",
    note: "Thanh toán tiền mặt",
  },
  {
    id: "d3",
    date: "2026-07-25T10:20:00Z",
    type: "debt_created",
    amount: 950000,
    remainingBalance: 5950000,
    operator: "Nhân viên A",
    note: "Đơn hàng DH-20260725-003",
  },
  {
    id: "d4",
    date: "2026-07-20T14:00:00Z",
    type: "debt_created",
    amount: 650000,
    remainingBalance: 5000000,
    operator: "Chủ cửa hàng",
    note: "Đơn hàng DH-20260720-007",
  },
  {
    id: "d5",
    date: "2026-07-15T08:00:00Z",
    type: "payment",
    amount: 1500000,
    remainingBalance: 4350000,
    operator: "Chủ cửa hàng",
    note: "Chuyển khoản ngân hàng",
  },
  {
    id: "d6",
    date: "2026-07-10T11:15:00Z",
    type: "debt_created",
    amount: 780000,
    remainingBalance: 5850000,
    operator: "Nhân viên B",
    note: "Đơn hàng DH-20260710-005",
  },
  {
    id: "d7",
    date: "2026-07-05T09:00:00Z",
    type: "adjustment",
    amount: -200000,
    remainingBalance: 5070000,
    operator: "Chủ cửa hàng",
    note: "Điều chỉnh giảm do chiết khấu",
  },
];

// ── Helper: simulate API delay ────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Lấy danh sách khách hàng với search, filter, pagination */
export function useCustomerList(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: async (): Promise<PaginatedResponse<Customer>> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<Customer>>
        >("/customers", { params });
        if (data.data) return data.data;
      } catch {
        // Fallback to mock data khi API chưa sẵn sàng
      }

      // Mock implementation
      await delay(600);
      let filtered = [...MOCK_CUSTOMERS];

      // Search
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.phone && c.phone.includes(q))
        );
      }

      // Filter
      if (params.filter === "has_debt") {
        filtered = filtered.filter((c) => c.debtBalance > 0);
      } else if (params.filter === "no_debt") {
        filtered = filtered.filter((c) => c.debtBalance === 0);
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

/** Tạo khách hàng mới */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CustomerFormData): Promise<Customer> => {
      try {
        const { data: res } = await apiClient.post<ApiResponseData<Customer>>(
          "/customers",
          data
        );
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(800);
      const newCustomer: Customer = {
        id: `c${Date.now()}`,
        storeId: "s1",
        code: `KH-${String(MOCK_CUSTOMERS.length + 1).padStart(3, "0")}`,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        debtBalance: 0,
        note: data.note || null,
        isActive: true,
        totalPurchases: 0,
        lastPurchaseDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_CUSTOMERS.unshift(newCustomer);
      return newCustomer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

/** Cập nhật khách hàng */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: CustomerFormData;
    }): Promise<Customer> => {
      try {
        const { data: res } = await apiClient.put<ApiResponseData<Customer>>(
          `/customers/${id}`,
          data
        );
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(800);
      const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("Customer not found");
      MOCK_CUSTOMERS[idx] = {
        ...MOCK_CUSTOMERS[idx],
        ...data,
        email: data.email || null,
        address: data.address || null,
        note: data.note || null,
        updatedAt: new Date().toISOString(),
      };
      return MOCK_CUSTOMERS[idx];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

/** Lấy chi tiết khách hàng */
export function useCustomerDetail(id: string) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async (): Promise<CustomerDetail> => {
      try {
        // 1. Fetch customer info
        const { data } = await apiClient.get<ApiResponseData<Customer>>(
          `/customers/${id}`
        );
        if (data.data) {
          const customer = data.data;

          // 2. Fetch orders for this customer to compute totalOrders, totalRevenue
          let totalOrders = 0;
          let totalRevenue = 0;
          let lastPurchaseDate: string | null = null;
          try {
            const { data: ordersData } = await apiClient.get<
              ApiResponseData<PaginatedResponse<{
                id: string;
                status: string;
                finalAmount: number;
                createdAt: string;
              }>>
            >(`/orders`, { params: { customerId: id, limit: 100 } });
            if (ordersData.data) {
              const confirmedOrders = ordersData.data.items.filter(
                (o) => o.status === "confirmed"
              );
              totalOrders = confirmedOrders.length;
              totalRevenue = confirmedOrders.reduce(
                (sum, o) => sum + o.finalAmount,
                0
              );
              if (confirmedOrders.length > 0) {
                lastPurchaseDate = confirmedOrders
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                  .createdAt;
              }
            }
          } catch {
            // Orders API failed, use defaults
          }

          return {
            ...customer,
            totalPurchases: totalOrders,
            lastPurchaseDate: lastPurchaseDate || customer.updatedAt,
            totalOrders,
            totalRevenue,
          };
        }
      } catch {
        // Fallback mock
      }

      await delay(500);
      const customer = MOCK_CUSTOMERS.find((c) => c.id === id);
      if (!customer) throw new Error("Customer not found");

      // Tính từ purchase history thực tế (confirmed orders only)
      const confirmedOrders = MOCK_PURCHASE_HISTORY.filter(
        (o) => o.status === "confirmed"
      );
      const totalOrders = confirmedOrders.length;
      const totalRevenue = confirmedOrders.reduce(
        (sum, o) => sum + o.totalAmount,
        0
      );

      return {
        ...customer,
        totalOrders,
        totalRevenue,
      };
    },
    enabled: !!id,
  });
}

/** Lấy lịch sử mua hàng của khách */
export function useCustomerPurchaseHistory(id: string) {
  return useQuery({
    queryKey: ["customer", id, "purchases"],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      try {
        // Backend endpoint: GET /orders?customerId=:id
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<{
            id: string;
            storeId: string;
            customerId: string | null;
            orderType: string;
            status: "confirmed" | "draft" | "cancelled";
            totalAmount: number;
            finalAmount: number;
            debtAmount: number;
            note: string | null;
            createdAt: string;
            updatedAt: string;
            items?: {
              id: string;
              productId: string;
              quantity: number;
              unitPrice: number;
              totalPrice: number;
            }[];
          }>>
        >(`/orders`, { params: { customerId: id, limit: 100 } });
        if (data.data && data.data.items) {
          // Map backend Order entity to frontend PurchaseOrder interface
          return data.data.items.map((order, index) => {
            // Generate order code from date
            const date = new Date(order.createdAt);
            const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
            const orderCode = `DH-${dateStr}-${String(index + 1).padStart(3, '0')}`;

            // Build products string from items
            const products = order.items && order.items.length > 0
              ? order.items.map(item => `SP (x${item.quantity})`).join(", ")
              : order.note || "Đơn hàng";

            // Determine payment method based on debtAmount
            const paymentMethod = order.debtAmount > 0 ? "transfer" : "cash";

            return {
              id: order.id,
              orderCode,
              createdAt: order.createdAt,
              products,
              totalAmount: order.finalAmount,
              paymentMethod,
              status: order.status,
            };
          });
        }
      } catch {
        // Fallback mock
      }

      await delay(400);
      return MOCK_PURCHASE_HISTORY;
    },
    enabled: !!id,
  });
}

/** Lấy lịch sử công nợ */
export function useCustomerDebtHistory(id: string) {
  return useQuery({
    queryKey: ["customer", id, "debts"],
    queryFn: async (): Promise<DebtTransaction[]> => {
      try {
        // Backend endpoint: GET /customers/:id/debt (not /debts)
        // Returns { summary: DebtSummaryRow, payments: DebtPayment[] }
        const { data } = await apiClient.get<
          ApiResponseData<{
            summary: {
              customerId: string;
              customerName: string;
              customerPhone: string | null;
              currentDebt: number;
              totalPaid: number;
              totalDebtCreated: number;
              remainingDebt: number;
            };
            payments: {
              id: string;
              storeId: string;
              customerId: string;
              orderId: string | null;
              amount: number;
              paymentMethod: string;
              note: string | null;
              createdBy: string | null;
              createdAt: string;
            }[];
          }>
        >(`/customers/${id}/debt`);
        if (data.data) {
          const { summary, payments } = data.data;
          const transactions: DebtTransaction[] = [];

          // Add debt_created entry if there was debt
          if (summary.totalDebtCreated > 0) {
            transactions.push({
              id: `debt-created-${id}`,
              date: new Date().toISOString(),
              type: "debt_created",
              amount: summary.totalDebtCreated,
              remainingBalance: summary.remainingDebt,
              operator: "Hệ thống",
              note: "Tổng nợ phát sinh từ đơn hàng",
            });
          }

          // Map payments to DebtTransaction
          for (const p of payments) {
            transactions.push({
              id: p.id,
              date: p.createdAt,
              type: "payment",
              amount: p.amount,
              remainingBalance: summary.remainingDebt,
              operator: p.createdBy || "Chủ cửa hàng",
              note: p.note,
            });
          }

          return transactions;
        }
      } catch {
        // Fallback mock
      }

      await delay(400);
      return MOCK_DEBT_HISTORY;
    },
    enabled: !!id,
  });
}

/** Ghi nhận thanh toán nợ */
export function useRecordDebtPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      data,
    }: {
      customerId: string;
      data: DebtPaymentData;
    }): Promise<{ success: boolean }> => {
      try {
        const { data: res } = await apiClient.post<
          ApiResponseData<{ success: boolean }>
        >(`/customers/${customerId}/debts/pay`, data);
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(800);
      const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
      if (customer) {
        customer.debtBalance = Math.max(
          0,
          customer.debtBalance - data.amount
        );
      }
      return { success: true };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({
        queryKey: ["customer", variables.customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer", variables.customerId, "debts"],
      });
    },
  });
}

/** Xóa khách hàng */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string): Promise<void> => {
      try {
        await apiClient.delete(`/customers/${customerId}`);
        return;
      } catch {
        // Fallback mock
      }

      await delay(500);
      const index = MOCK_CUSTOMERS.findIndex((c) => c.id === customerId);
      if (index !== -1) {
        MOCK_CUSTOMERS.splice(index, 1);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
