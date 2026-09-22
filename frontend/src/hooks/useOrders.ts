"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";
import { MOCK_CUSTOMERS } from "./useCustomers";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderStatus = "draft" | "confirmed" | "cancelled";
export type OrderType = "counter" | "ai_generated";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productUnitId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  productName?: string | null;
  unitName?: string | null;
}

export interface Order {
  id: string;
  storeId: string;
  customerId: string | null;
  userId: string | null;
  orderType: OrderType;
  status: OrderStatus;
  paymentMethod?: 'cash' | 'qr_code' | 'debt';
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  debtAmount: number;
  paidAmount?: number;
  changeAmount?: number;
  note: string | null;
  createdByAi: boolean;
  aiRawInput: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  /** Enriched client-side hoặc API trả về: tên và SĐT khách hàng để hiển thị */
  customerName?: string | null;
  customerPhone?: string | null;
}

export interface CreateOrderData {
  customerId?: string;
  orderType?: OrderType;
  paymentMethod?: 'cash' | 'qr_code' | 'debt';
  note?: string;
  discountAmount?: number;
  debtAmount?: number;
  paidAmount?: number;
  changeAmount?: number;
  items: {
    productId: string;
    productUnitId?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface OrderListParams {
  status?: OrderStatus | "all";
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Name lookups (fallback khi API chưa join tên) ─────────────────────────────

const MOCK_CUSTOMER_NAMES: Record<string, string> = {
  c1: "Nguyễn Văn An",
  c2: "Trần Thị Bình",
  c3: "Lê Hoàng Cường",
  c4: "Phạm Minh Đức",
  c5: "Hoàng Thị Nga",
  c6: "Võ Thanh Hải",
  c7: "Đỗ Quang Khải",
  c8: "Bùi Thị Mai Linh",
};

const MOCK_PRODUCT_NAMES: Record<string, string> = {
  p1: "Bàn phím cơ Keychron K8",
  p2: "Áo thun cotton",
  p3: "Quần jean slim",
  p4: "Kem chống nắng SPF50",
  p5: "Ấm siêu tốc 1.8L",
  p6: "Cà phê sạch rang xay",
  p7: "Giày sneaker trắng",
  p8: "Tất cotton trắng",
};

const MOCK_PRODUCT_UNITS: Record<string, string> = {
  u1: "Cái",
  u2: "Cái",
  u3: "Lố (10 cái)",
  u4: "Cái",
  u5: "Chai",
  u6: "Cái",
  u7: "Gói 500g",
  u8: "Thùng (10 gói)",
  u9: "Đôi",
  u10: "Đôi",
};

// ── Mock Data (fallback khi API chưa sẵn sàng) ────────────────────────────────

const MOCK_ORDERS: Order[] = [
  {
    id: "ord-20260805-1",
    storeId: "s1",
    customerId: "c1",
    userId: "u1",
    orderType: "counter",
    status: "confirmed",
    totalAmount: 970000,
    discountAmount: 20000,
    finalAmount: 950000,
    debtAmount: 0,
    note: "Giao buổi chiều",
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: "u1",
    confirmedAt: "2026-08-05T10:15:00Z",
    createdAt: "2026-08-05T10:15:00Z",
    updatedAt: "2026-08-05T10:15:00Z",
    items: [
      { id: "it-1", orderId: "ord-20260805-1", productId: "p2", productUnitId: "u2", quantity: 2, unitPrice: 150000, totalPrice: 300000, createdAt: "2026-08-05T10:15:00Z", productName: "Áo thun cotton", unitName: "Cái" },
      { id: "it-2", orderId: "ord-20260805-1", productId: "p3", productUnitId: "u4", quantity: 1, unitPrice: 420000, totalPrice: 420000, createdAt: "2026-08-05T10:15:00Z", productName: "Quần jean slim", unitName: "Cái" },
      { id: "it-3", orderId: "ord-20260805-1", productId: "p4", productUnitId: "u5", quantity: 1, unitPrice: 250000, totalPrice: 250000, createdAt: "2026-08-05T10:15:00Z", productName: "Kem chống nắng SPF50", unitName: "Chai" },
    ],
  },
  {
    id: "ord-20260804-2",
    storeId: "s1",
    customerId: null,
    userId: "u1",
    orderType: "counter",
    status: "draft",
    totalAmount: 925000,
    discountAmount: 25000,
    finalAmount: 900000,
    debtAmount: 0,
    note: "Chờ khách xác nhận",
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: null,
    confirmedAt: null,
    createdAt: "2026-08-04T17:40:00Z",
    updatedAt: "2026-08-04T17:40:00Z",
    items: [
      { id: "it-4", orderId: "ord-20260804-2", productId: "p7", productUnitId: "u9", quantity: 1, unitPrice: 850000, totalPrice: 850000, createdAt: "2026-08-04T17:40:00Z", productName: "Giày sneaker trắng", unitName: "Đôi" },
      { id: "it-5", orderId: "ord-20260804-2", productId: "p8", productUnitId: "u10", quantity: 3, unitPrice: 25000, totalPrice: 75000, createdAt: "2026-08-04T17:40:00Z", productName: "Tất cotton trắng", unitName: "Đôi" },
    ],
  },
  {
    id: "ord-20260803-3",
    storeId: "s1",
    customerId: "c3",
    userId: "u1",
    orderType: "counter",
    status: "confirmed",
    totalAmount: 1700000,
    discountAmount: 0,
    finalAmount: 1700000,
    debtAmount: 500000,
    note: "Khách nợ 500k, hẹn trả cuối tuần",
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: "u1",
    confirmedAt: "2026-08-03T14:00:00Z",
    createdAt: "2026-08-03T14:00:00Z",
    updatedAt: "2026-08-03T14:00:00Z",
    items: [
      { id: "it-6", orderId: "ord-20260803-3", productId: "p6", productUnitId: "u8", quantity: 1, unitPrice: 1700000, totalPrice: 1700000, createdAt: "2026-08-03T14:00:00Z", productName: "Cà phê sạch rang xay", unitName: "Thùng (10 gói)" },
    ],
  },
  {
    id: "ord-20260802-4",
    storeId: "s1",
    customerId: "c8",
    userId: "u1",
    orderType: "counter",
    status: "confirmed",
    totalAmount: 1640000,
    discountAmount: 40000,
    finalAmount: 1600000,
    debtAmount: 0,
    note: null,
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: "u1",
    confirmedAt: "2026-08-02T11:05:00Z",
    createdAt: "2026-08-02T11:05:00Z",
    updatedAt: "2026-08-02T11:05:00Z",
    items: [
      { id: "it-7", orderId: "ord-20260802-4", productId: "p5", productUnitId: "u6", quantity: 1, unitPrice: 350000, totalPrice: 350000, createdAt: "2026-08-02T11:05:00Z", productName: "Ấm siêu tốc 1.8L", unitName: "Cái" },
      { id: "it-8", orderId: "ord-20260802-4", productId: "p3", productUnitId: "u4", quantity: 2, unitPrice: 420000, totalPrice: 840000, createdAt: "2026-08-02T11:05:00Z", productName: "Quần jean slim", unitName: "Cái" },
      { id: "it-9", orderId: "ord-20260802-4", productId: "p2", productUnitId: "u2", quantity: 3, unitPrice: 150000, totalPrice: 450000, createdAt: "2026-08-02T11:05:00Z", productName: "Áo thun cotton", unitName: "Cái" },
    ],
  },
  {
    id: "ord-20260801-5",
    storeId: "s1",
    customerId: null,
    userId: "u1",
    orderType: "counter",
    status: "cancelled",
    totalAmount: 400000,
    discountAmount: 0,
    finalAmount: 400000,
    debtAmount: 0,
    note: "Khách hủy vì hết size",
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: null,
    confirmedAt: null,
    createdAt: "2026-08-01T09:30:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    items: [
      { id: "it-10", orderId: "ord-20260801-5", productId: "p4", productUnitId: "u5", quantity: 1, unitPrice: 250000, totalPrice: 250000, createdAt: "2026-08-01T09:30:00Z", productName: "Kem chống nắng SPF50", unitName: "Chai" },
      { id: "it-11", orderId: "ord-20260801-5", productId: "p2", productUnitId: "u2", quantity: 1, unitPrice: 150000, totalPrice: 150000, createdAt: "2026-08-01T09:30:00Z", productName: "Áo thun cotton", unitName: "Cái" },
    ],
  },
  {
    id: "ord-20260729-6",
    storeId: "s1",
    customerId: "c2",
    userId: "u1",
    orderType: "counter",
    status: "confirmed",
    totalAmount: 1850000,
    discountAmount: 0,
    finalAmount: 1850000,
    debtAmount: 0,
    note: null,
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: "u1",
    confirmedAt: "2026-07-29T16:20:00Z",
    createdAt: "2026-07-29T16:20:00Z",
    updatedAt: "2026-07-29T16:20:00Z",
    items: [
      { id: "it-12", orderId: "ord-20260729-6", productId: "p1", productUnitId: "u1", quantity: 1, unitPrice: 1850000, totalPrice: 1850000, createdAt: "2026-07-29T16:20:00Z", productName: "Bàn phím cơ Keychron K8", unitName: "Cái" },
    ],
  },
  {
    id: "ord-20260728-7",
    storeId: "s1",
    customerId: "c4",
    userId: "u1",
    orderType: "counter",
    status: "draft",
    totalAmount: 1700000,
    discountAmount: 100000,
    finalAmount: 1600000,
    debtAmount: 0,
    note: "Đang chờ duyệt chiết khấu",
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: null,
    confirmedAt: null,
    createdAt: "2026-07-28T15:10:00Z",
    updatedAt: "2026-07-28T15:10:00Z",
    items: [
      { id: "it-13", orderId: "ord-20260728-7", productId: "p7", productUnitId: "u9", quantity: 2, unitPrice: 850000, totalPrice: 1700000, createdAt: "2026-07-28T15:10:00Z", productName: "Giày sneaker trắng", unitName: "Đôi" },
    ],
  },
  {
    id: "ord-20260725-8",
    storeId: "s1",
    customerId: "c5",
    userId: "u1",
    orderType: "counter",
    status: "confirmed",
    totalAmount: 875000,
    discountAmount: 0,
    finalAmount: 875000,
    debtAmount: 875000,
    note: "Ghi sổ, thanh toán cuối tháng",
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: "u1",
    confirmedAt: "2026-07-25T10:40:00Z",
    createdAt: "2026-07-25T10:40:00Z",
    updatedAt: "2026-07-25T10:40:00Z",
    items: [
      { id: "it-14", orderId: "ord-20260725-8", productId: "p2", productUnitId: "u2", quantity: 5, unitPrice: 150000, totalPrice: 750000, createdAt: "2026-07-25T10:40:00Z", productName: "Áo thun cotton", unitName: "Cái" },
      { id: "it-15", orderId: "ord-20260725-8", productId: "p8", productUnitId: "u10", quantity: 5, unitPrice: 25000, totalPrice: 125000, createdAt: "2026-07-25T10:40:00Z", productName: "Tất cotton trắng", unitName: "Đôi" },
    ],
  },
  {
    id: "ord-20260722-9",
    storeId: "s1",
    customerId: null,
    userId: "u1",
    orderType: "counter",
    status: "confirmed",
    totalAmount: 720000,
    discountAmount: 20000,
    finalAmount: 700000,
    debtAmount: 0,
    note: null,
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: "u1",
    confirmedAt: "2026-07-22T08:50:00Z",
    createdAt: "2026-07-22T08:50:00Z",
    updatedAt: "2026-07-22T08:50:00Z",
    items: [
      { id: "it-16", orderId: "ord-20260722-9", productId: "p6", productUnitId: "u7", quantity: 4, unitPrice: 180000, totalPrice: 720000, createdAt: "2026-07-22T08:50:00Z", productName: "Cà phê sạch rang xay", unitName: "Gói 500g" },
    ],
  },
  {
    id: "ord-20260720-10",
    storeId: "s1",
    customerId: "c6",
    userId: "u1",
    orderType: "counter",
    status: "cancelled",
    totalAmount: 350000,
    discountAmount: 0,
    finalAmount: 350000,
    debtAmount: 0,
    note: "Khách đổi ý",
    createdByAi: false,
    aiRawInput: null,
    confirmedBy: null,
    confirmedAt: null,
    createdAt: "2026-07-20T13:25:00Z",
    updatedAt: "2026-07-20T14:05:00Z",
    items: [
      { id: "it-17", orderId: "ord-20260720-10", productId: "p5", productUnitId: "u6", quantity: 1, unitPrice: 350000, totalPrice: 350000, createdAt: "2026-07-20T13:25:00Z", productName: "Ấm siêu tốc 1.8L", unitName: "Cái" },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Product catalog (để gắn tên sản phẩm/đơn vị cho order items) ─────────────

interface CatalogProduct {
  id: string;
  name: string;
  units: { id: string; unitName: string }[];
}

let catalogPromise: Promise<Map<string, CatalogProduct>> | null = null;

/** Fetch danh mục sản phẩm một lần, cache lại. Giới hạn 2s nếu backend không phản hồi. */
function getProductCatalog(): Promise<Map<string, CatalogProduct>> {
  if (!catalogPromise) {
    const fetchCatalog = (async () => {
      const map = new Map<string, CatalogProduct>();
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<CatalogProduct>>
        >("/products", { params: { page: 1, limit: 100 } });
        for (const p of data.data?.items ?? []) {
          map.set(p.id, { id: p.id, name: p.name, units: p.units ?? [] });
        }
      } catch {
        // Catalog unavailable → fall back to mock names
      }
      return map;
    })();
    catalogPromise = Promise.race([
      fetchCatalog,
      new Promise<Map<string, CatalogProduct>>((resolve) =>
        setTimeout(() => resolve(new Map()), 2000),
      ),
    ]);
  }
  return catalogPromise;
}

// ── Customer catalog (để gắn tên/SĐT khách hàng nếu API chưa join) ─────────

interface CatalogCustomer {
  id: string;
  name: string;
  phone?: string | null;
}

let customerCatalogPromise: Promise<Map<string, CatalogCustomer>> | null = null;

export function invalidateCustomerCatalog(): void {
  customerCatalogPromise = null;
}

/** Fetch danh mục khách hàng một lần, cache lại. Giới hạn 2s nếu backend không phản hồi. */
function getCustomerCatalog(): Promise<Map<string, CatalogCustomer>> {
  if (!customerCatalogPromise) {
    const fetchCatalog = (async () => {
      const map = new Map<string, CatalogCustomer>();
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<CatalogCustomer>>
        >("/customers", { params: { page: 1, limit: 200 } });
        for (const c of data.data?.items ?? []) {
          map.set(c.id, { id: c.id, name: c.name, phone: c.phone });
        }
      } catch {
        // Fallback
      }
      return map;
    })();
    customerCatalogPromise = Promise.race([
      fetchCatalog,
      new Promise<Map<string, CatalogCustomer>>((resolve) =>
        setTimeout(() => resolve(new Map()), 2000),
      ),
    ]);
  }
  return customerCatalogPromise;
}

/** Tạo mã đơn dạng DH-YYYYMMDD-SEQ từ id & createdAt */
export function getOrderCode(order: Pick<Order, "id" | "createdAt">): string {
  const d = new Date(order.createdAt);
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const match = order.id.match(/(\d+)$/);
  const seq = match ? match[1].padStart(3, "0") : order.id.slice(-4).toUpperCase();
  return `DH-${dateStr}-${seq}`;
}

async function enrichOrder(order: Order): Promise<Order> {
  let customerName = order.customerName ?? null;
  let customerPhone = order.customerPhone ?? null;

  if (!customerName && order.customerId) {
    customerName = MOCK_CUSTOMER_NAMES[order.customerId] ?? null;
    if (!customerName) {
      const customerCatalog = await getCustomerCatalog();
      const matched = customerCatalog.get(order.customerId);
      if (matched) {
        customerName = matched.name;
        customerPhone = matched.phone ?? null;
      }
    }
  }

  const rawItems = order.items ?? [];
  const needsCatalog = rawItems.some(
    (item) => !item.productName || !item.unitName,
  );
  const catalog = needsCatalog
    ? await getProductCatalog()
    : new Map<string, CatalogProduct>();
  const items = rawItems.map((item) => {
    const product = catalog.get(item.productId);
    const unit = product?.units.find((u) => u.id === item.productUnitId);
    return {
      ...item,
      productName:
        item.productName ??
        product?.name ??
        MOCK_PRODUCT_NAMES[item.productId] ??
        `Sản phẩm ${item.productId.slice(0, 8)}`,
      unitName:
        item.unitName ??
        unit?.unitName ??
        MOCK_PRODUCT_UNITS[item.productUnitId ?? ""] ??
        "Cái",
    };
  });
  return { ...order, customerName, customerPhone, items };
}

/** Xử lý shape { order, items } mà backend trả cho create/detail */
async function unwrapOrder(data: unknown): Promise<Order | null> {
  if (!data || typeof data !== "object") return null;
  const rec = data as { order?: Order; items?: OrderItem[] };
  if (rec.order) {
    const order = { ...rec.order, items: rec.items ?? rec.order.items ?? [] };
    return enrichOrder(order);
  }
  return enrichOrder(rec as Order);
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Tạo đơn hàng (quầy). `status: "confirmed"` → tạo + xác nhận ngay. */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: CreateOrderData & { status?: OrderStatus },
    ): Promise<Order> => {
      const { status, ...body } = input;
      try {
        const { data: res } = await apiClient.post<
          ApiResponseData<{ order: Order; items: OrderItem[] }>
        >("/orders", body);
        const created = await unwrapOrder(res.data);
        if (created) {
          if (status === "confirmed") {
            const { data: confirmRes } = await apiClient.patch<
              ApiResponseData<Order>
            >(`/orders/${created.id}/confirm`);
            if (confirmRes.data)
              return (await unwrapOrder(confirmRes.data)) ?? created;
          }
          return created;
        }
      } catch (err: unknown) {
        const apiError = err as { response?: { data?: { message?: string; error?: string }; status?: number } };
        const msg = apiError.response?.data?.message || apiError.response?.data?.error;
        if (apiError.response?.status && apiError.response.status >= 400 && apiError.response.status < 500 && msg) {
          throw new Error(msg);
        }
        // Fallback mock
      }

      await delay(700);

      // Check credit limit in mock
      if (body.customerId && (body.debtAmount ?? 0) > 0) {
        const cust = MOCK_CUSTOMERS.find((c) => c.id === body.customerId);
        if (cust && cust.creditLimit > 0 && (cust.debtBalance + (body.debtAmount ?? 0)) > cust.creditLimit) {
          const excess = (cust.debtBalance + (body.debtAmount ?? 0)) - cust.creditLimit;
          throw new Error(
            `Không thể ghi nợ! Khách hàng "${cust.name}" có hạn mức nợ ${new Intl.NumberFormat("vi-VN").format(cust.creditLimit)}đ, hiện đang nợ ${new Intl.NumberFormat("vi-VN").format(cust.debtBalance)}đ. Đơn hàng nợ thêm ${new Intl.NumberFormat("vi-VN").format(body.debtAmount ?? 0)}đ sẽ vượt hạn mức ${new Intl.NumberFormat("vi-VN").format(excess)}đ.`
          );
        }
        if (cust && status === "confirmed") {
          cust.debtBalance += body.debtAmount ?? 0;
        }
      }
      const now = new Date().toISOString();
      const today = `${now.slice(0, 10).replace(/-/g, "")}`;
      const seq = String(MOCK_ORDERS.length + 1).padStart(3, "0");
      const orderId = `ord-${today}-${seq}`;
      const items: OrderItem[] = body.items.map((it, i) => ({
        id: `${orderId}-it${i + 1}`,
        orderId,
        productId: it.productId,
        productUnitId: it.productUnitId ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.quantity * it.unitPrice,
        createdAt: now,
        productName: MOCK_PRODUCT_NAMES[it.productId] ?? null,
        unitName: it.productUnitId ? MOCK_PRODUCT_UNITS[it.productUnitId] : "Cái",
      }));
      const totalAmount = items.reduce((s, it) => s + it.totalPrice, 0);
      const discountAmount = body.discountAmount ?? 0;
      const finalAmount = Math.max(0, totalAmount - discountAmount);
      const order: Order = {
        id: orderId,
        storeId: "s1",
        customerId: body.customerId ?? null,
        userId: "u1",
        orderType: body.orderType ?? "counter",
        status: status === "confirmed" ? "confirmed" : "draft",
        paymentMethod: body.paymentMethod ?? "cash",
        paidAmount: body.paidAmount ?? (body.paymentMethod === "cash" ? finalAmount : 0),
        changeAmount: body.changeAmount ?? 0,
        totalAmount,
        discountAmount,
        finalAmount,
        debtAmount: body.debtAmount ?? 0,
        note: body.note ?? null,
        createdByAi: false,
        aiRawInput: null,
        confirmedBy: status === "confirmed" ? "u1" : null,
        confirmedAt: status === "confirmed" ? now : null,
        createdAt: now,
        updatedAt: now,
        items,
      };
      MOCK_ORDERS.unshift(order);
      return enrichOrder(order);
    },
    onSuccess: () => {
      invalidateCustomerCatalog();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

/** Lấy danh sách đơn hàng với status/date + pagination */
export function useOrderList(params: OrderListParams = {}) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async (): Promise<PaginatedResponse<Order>> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<Order>>
        >("/orders", {
          params: {
            status: params.status === "all" || !params.status ? undefined : params.status,
            fromDate: params.fromDate || undefined,
            toDate: params.toDate || undefined,
            page: params.page,
            limit: params.limit,
          },
        });
        if (data.data) {
          return {
            ...data.data,
            items: await Promise.all(data.data.items.map(enrichOrder)),
          };
        }
      } catch {
        // Fallback mock
      }

      await delay(500);
      let filtered = [...MOCK_ORDERS];
      if (params.status && params.status !== "all") {
        filtered = filtered.filter((o) => o.status === params.status);
      }
      if (params.fromDate) {
        const from = new Date(
          params.fromDate.includes("T")
            ? params.fromDate
            : `${params.fromDate}T00:00:00`,
        ).getTime();
        filtered = filtered.filter(
          (o) => new Date(o.createdAt).getTime() >= from,
        );
      }
      if (params.toDate) {
        const to = new Date(
          params.toDate.includes("T")
            ? params.toDate
            : `${params.toDate}T23:59:59`,
        ).getTime();
        filtered = filtered.filter(
          (o) => new Date(o.createdAt).getTime() <= to,
        );
      }

      const page = params.page ?? 1;
      const limit = params.limit ?? 10;
      const start = (page - 1) * limit;
      const items = await Promise.all(
        filtered.slice(start, start + limit).map(enrichOrder),
      );

      return {
        items,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      };
    },
    staleTime: 30_000,
  });
}

/** Lấy chi tiết đơn hàng (gồm items) */
export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async (): Promise<Order> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<unknown>>(
          `/orders/${id}`,
        );
        const order = await unwrapOrder(data.data);
        if (order) return order;
      } catch {
        // Fallback mock
      }

      await delay(400);
      const order = MOCK_ORDERS.find((o) => o.id === id);
      if (!order) throw new Error("Đơn hàng không tồn tại");
      return enrichOrder(order);
    },
    enabled: !!id,
  });
}

/** Xác nhận đơn nháp (trừ kho + ghi nợ) */
export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Order> => {
      try {
        const { data } = await apiClient.patch<ApiResponseData<Order>>(
          `/orders/${id}/confirm`,
        );
        if (data.data) return (await unwrapOrder(data.data)) ?? data.data;
      } catch {
        // Fallback mock
      }

      await delay(500);
      const order = MOCK_ORDERS.find((o) => o.id === id);
      if (!order) throw new Error("Đơn hàng không tồn tại");
      order.status = "confirmed";
      order.confirmedBy = "u1";
      order.confirmedAt = new Date().toISOString();
      order.updatedAt = order.confirmedAt;
      return enrichOrder(order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Hủy đơn nháp */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Order> => {
      try {
        const { data } = await apiClient.patch<ApiResponseData<Order>>(
          `/orders/${id}/cancel`,
        );
        if (data.data) return (await unwrapOrder(data.data)) ?? data.data;
      } catch {
        // Fallback mock
      }

      await delay(500);
      const order = MOCK_ORDERS.find((o) => o.id === id);
      if (!order) throw new Error("Đơn hàng không tồn tại");
      order.status = "cancelled";
      order.updatedAt = new Date().toISOString();
      return enrichOrder(order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
    },
  });
}
