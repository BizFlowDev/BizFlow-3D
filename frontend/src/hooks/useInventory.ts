"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";
import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard-keys";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type TransactionType = "import" | "export" | "adjustment";
export type StockStatusFilter = "all" | StockStatus;
export type TransactionTypeFilter = "all" | TransactionType;

/** Đơn vị tính của sản phẩm trong kho */
export interface InventoryUnit {
  id: string;
  unitName: string;
  conversionFactor: number;
  isDefault: boolean;
}

/** Danh mục sản phẩm dùng chung cho module kho */
export interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  /** Mức tồn kho tối đa — dùng làm mốc 100% cho khối 3D */
  maxStock: number;
  units: InventoryUnit[];
}

/** 1 dòng trong bảng Stock Level (gộp sản phẩm + tồn kho) */
export interface StockLevelRow {
  productId: string;
  productName: string;
  code: string;
  categoryId: string | null;
  categoryName: string | null;
  /** Đơn vị tính mặc định đang hiển thị */
  productUnitId: string;
  unitName: string;
  currentStock: number;
  /** Mức tồn kho tối đa (mốc 100% chiều cao khối 3D) */
  maxStock: number;
  /** Ngưỡng cảnh báo sắp hết hàng */
  minStock: number;
  lastUpdated: string;
  status: StockStatus;
  /** currentStock / maxStock (0..1) — chiều cao khối 3D */
  stockRatio: number;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productUnitId?: string | null;
  productName: string;
  unitName: string;
  type: TransactionType;
  quantity: number;
  referenceType: "order" | "purchase" | "adjustment" | null;
  referenceId: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface StockLevelParams {
  search?: string;
  categoryId?: string;
  status?: StockStatusFilter;
}

export interface TransactionHistoryParams {
  type?: TransactionTypeFilter;
  productId?: string;
  from?: string;
  to?: string;
  search?: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const inventoryKeys = {
  all: ["inventory"] as const,
  stock: ["inventory", "stock"] as const,
  catalog: ["inventory", "catalog"] as const,
  transactions: (params?: TransactionHistoryParams) =>
    ["inventory", "transactions", params] as const,
};

// ── Mock Data (fallback khi API chưa sẵn sàng) ────────────────────────────────

const MOCK_CATEGORIES: { id: string; name: string }[] = [
  { id: "cat-mvl", name: "Vật liệu xây dựng" },
  { id: "cat-thep", name: "Thép xây dựng" },
  { id: "cat-son", name: "Sơn" },
  { id: "cat-dien", name: "Điện & dây điện" },
  { id: "cat-ong", name: "Ống nước & van" },
  { id: "cat-pk", name: "Phụ kiện & công cụ" },
];

const MOCK_INVENTORY_PRODUCTS: InventoryProduct[] = [
  {
    id: "p1",
    code: "VL-001",
    name: "Xi măng Hà Tiên PCB40",
    categoryId: "cat-mvl",
    categoryName: "Vật liệu xây dựng",
    maxStock: 200,
    units: [
      { id: "p1-u1", unitName: "Bao 50kg", conversionFactor: 1, isDefault: true },
      { id: "p1-u2", unitName: "Tấn", conversionFactor: 20, isDefault: false },
    ],
  },
  {
    id: "p2",
    code: "VL-002",
    name: "Gạch ống 8 lỗ",
    categoryId: "cat-mvl",
    categoryName: "Vật liệu xây dựng",
    maxStock: 500,
    units: [
      { id: "p2-u1", unitName: "Viên", conversionFactor: 1, isDefault: true },
      { id: "p2-u2", unitName: "Ngàn viên", conversionFactor: 1000, isDefault: false },
    ],
  },
  {
    id: "p3",
    code: "VL-003",
    name: "Sắt phi 10",
    categoryId: "cat-thep",
    categoryName: "Thép xây dựng",
    maxStock: 300,
    units: [
      { id: "p3-u1", unitName: "Cây 11.7m", conversionFactor: 1, isDefault: true },
      { id: "p3-u2", unitName: "Tấn", conversionFactor: 6.4, isDefault: false },
    ],
  },
  {
    id: "p4",
    code: "VL-004",
    name: "Sơn nước Dulux (18L)",
    categoryId: "cat-son",
    categoryName: "Sơn",
    maxStock: 60,
    units: [{ id: "p4-u1", unitName: "Thùng", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p5",
    code: "VL-005",
    name: "Cát xây dựng (m³)",
    categoryId: "cat-mvl",
    categoryName: "Vật liệu xây dựng",
    maxStock: 100,
    units: [{ id: "p5-u1", unitName: "Mét khối", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p6",
    code: "VL-006",
    name: "Đinh thép 5cm",
    categoryId: "cat-pk",
    categoryName: "Phụ kiện & công cụ",
    maxStock: 50,
    units: [{ id: "p6-u1", unitName: "Kg", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p7",
    code: "VL-007",
    name: "Keo dán gạch (25kg)",
    categoryId: "cat-mvl",
    categoryName: "Vật liệu xây dựng",
    maxStock: 40,
    units: [{ id: "p7-u1", unitName: "Bao", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p8",
    code: "VL-008",
    name: "Dây điện Cadivi 2.5",
    categoryId: "cat-dien",
    categoryName: "Điện & dây điện",
    maxStock: 80,
    units: [{ id: "p8-u1", unitName: "Cuộn", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p9",
    code: "VL-009",
    name: "Xi măng Hà Tiên PCB30",
    categoryId: "cat-mvl",
    categoryName: "Vật liệu xây dựng",
    maxStock: 200,
    units: [{ id: "p9-u1", unitName: "Bao 50kg", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p10",
    code: "VL-010",
    name: "Gạch block 4 lỗ",
    categoryId: "cat-mvl",
    categoryName: "Vật liệu xây dựng",
    maxStock: 400,
    units: [{ id: "p10-u1", unitName: "Viên", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p11",
    code: "VL-011",
    name: "Sắt phi 12",
    categoryId: "cat-thep",
    categoryName: "Thép xây dựng",
    maxStock: 300,
    units: [{ id: "p11-u1", unitName: "Cây 11.7m", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p12",
    code: "VL-012",
    name: "Sơn lót chống kiềm (5L)",
    categoryId: "cat-son",
    categoryName: "Sơn",
    maxStock: 40,
    units: [{ id: "p12-u1", unitName: "Thùng", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p13",
    code: "VL-013",
    name: "Ống nước PVC phi 21",
    categoryId: "cat-ong",
    categoryName: "Ống nước & van",
    maxStock: 120,
    units: [{ id: "p13-u1", unitName: "Cây 4m", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p14",
    code: "VL-014",
    name: "Van nước inox DN20",
    categoryId: "cat-ong",
    categoryName: "Ống nước & van",
    maxStock: 60,
    units: [{ id: "p14-u1", unitName: "Cái", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p15",
    code: "VL-015",
    name: "Đá 1x2 (m³)",
    categoryId: "cat-mvl",
    categoryName: "Vật liệu xây dựng",
    maxStock: 80,
    units: [{ id: "p15-u1", unitName: "Mét khối", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p16",
    code: "VL-016",
    name: "Bột trét tường (40kg)",
    categoryId: "cat-son",
    categoryName: "Sơn",
    maxStock: 60,
    units: [{ id: "p16-u1", unitName: "Bao", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p17",
    code: "VL-017",
    name: "Thép hộp 40x40",
    categoryId: "cat-thep",
    categoryName: "Thép xây dựng",
    maxStock: 150,
    units: [{ id: "p17-u1", unitName: "Cây 6m", conversionFactor: 1, isDefault: true }],
  },
  {
    id: "p18",
    code: "VL-018",
    name: "Đinh vít các loại (hộp)",
    categoryId: "cat-pk",
    categoryName: "Phụ kiện & công cụ",
    maxStock: 100,
    units: [{ id: "p18-u1", unitName: "Hộp", conversionFactor: 1, isDefault: true }],
  },
];

// Tồn kho mặc định (map productId → { qty, lastUpdated })
const MOCK_STOCK: Record<string, { qty: number; lastUpdated: string }> = {
  p1: { qty: 120, lastUpdated: "2026-08-04T09:30:00Z" },
  p2: { qty: 320, lastUpdated: "2026-08-03T14:20:00Z" },
  p3: { qty: 150, lastUpdated: "2026-08-02T10:10:00Z" },
  p4: { qty: 24, lastUpdated: "2026-08-04T16:45:00Z" },
  p5: { qty: 35, lastUpdated: "2026-08-01T08:00:00Z" },
  p6: { qty: 3, lastUpdated: "2026-08-04T11:15:00Z" },
  p7: { qty: 8, lastUpdated: "2026-08-04T13:40:00Z" },
  p8: { qty: 6, lastUpdated: "2026-08-03T17:05:00Z" },
  p9: { qty: 0, lastUpdated: "2026-07-28T09:00:00Z" },
  p10: { qty: 0, lastUpdated: "2026-07-29T15:30:00Z" },
  p11: { qty: 45, lastUpdated: "2026-08-02T09:20:00Z" },
  p12: { qty: 12, lastUpdated: "2026-08-01T16:10:00Z" },
  p13: { qty: 60, lastUpdated: "2026-08-03T10:50:00Z" },
  p14: { qty: 4, lastUpdated: "2026-08-04T08:30:00Z" },
  p15: { qty: 20, lastUpdated: "2026-07-31T11:25:00Z" },
  p16: { qty: 15, lastUpdated: "2026-08-02T14:00:00Z" },
  p17: { qty: 5, lastUpdated: "2026-08-04T10:05:00Z" },
  p18: { qty: 0, lastUpdated: "2026-07-27T09:45:00Z" },
};

const MOCK_TRANSACTIONS: InventoryTransaction[] = [
  { id: "t1", productId: "p1", productName: "Xi măng Hà Tiên PCB40", unitName: "Bao 50kg", type: "import", quantity: 50, referenceType: "purchase", referenceId: null, note: "Nhập lô đầu tháng", createdBy: "Nguyễn Văn An", createdAt: "2026-08-04T09:30:00Z" },
  { id: "t2", productId: "p4", productName: "Sơn nước Dulux (18L)", unitName: "Thùng", type: "import", quantity: 10, referenceType: "purchase", referenceId: null, note: "Bổ sung hàng trưng bày", createdBy: "Nguyễn Văn An", createdAt: "2026-08-04T16:45:00Z" },
  { id: "t3", productId: "p6", productName: "Đinh thép 5cm", unitName: "Kg", type: "import", quantity: 2, referenceType: "purchase", referenceId: null, note: "", createdBy: "Trần Thị Bích", createdAt: "2026-08-04T11:15:00Z" },
  { id: "t4", productId: "p14", productName: "Van nước inox DN20", unitName: "Cái", type: "import", quantity: 5, referenceType: "purchase", referenceId: null, note: "Hàng mới về", createdBy: "Trần Thị Bích", createdAt: "2026-08-04T08:30:00Z" },
  { id: "t5", productId: "p2", productName: "Gạch ống 8 lỗ", unitName: "Viên", type: "export", quantity: 200, referenceType: "order", referenceId: "DH-20260803-001", note: "Đơn của công trình Nguyễn Văn A", createdBy: "Nguyễn Văn An", createdAt: "2026-08-03T14:20:00Z" },
  { id: "t6", productId: "p8", productName: "Dây điện Cadivi 2.5", unitName: "Cuộn", type: "import", quantity: 10, referenceType: "purchase", referenceId: null, note: "", createdBy: "Nguyễn Văn An", createdAt: "2026-08-03T17:05:00Z" },
  { id: "t7", productId: "p13", productName: "Ống nước PVC phi 21", unitName: "Cây 4m", type: "import", quantity: 30, referenceType: "purchase", referenceId: null, note: "Nhập theo yêu cầu thầu", createdBy: "Trần Thị Bích", createdAt: "2026-08-03T10:50:00Z" },
  { id: "t8", productId: "p3", productName: "Sắt phi 10", unitName: "Cây 11.7m", type: "export", quantity: 60, referenceType: "order", referenceId: "DH-20260802-002", note: "", createdBy: "Nguyễn Văn An", createdAt: "2026-08-02T10:10:00Z" },
  { id: "t9", productId: "p11", productName: "Sắt phi 12", unitName: "Cây 11.7m", type: "adjustment", quantity: -5, referenceType: "adjustment", referenceId: null, note: "Kiểm kê phát hiện hao hụt", createdBy: "Nguyễn Văn An", createdAt: "2026-08-02T09:20:00Z" },
  { id: "t10", productId: "p16", productName: "Bột trét tường (40kg)", unitName: "Bao", type: "import", quantity: 10, referenceType: "purchase", referenceId: null, note: "", createdBy: "Trần Thị Bích", createdAt: "2026-08-02T14:00:00Z" },
  { id: "t11", productId: "p5", productName: "Cát xây dựng (m³)", unitName: "Mét khối", type: "export", quantity: 8, referenceType: "order", referenceId: "DH-20260801-003", note: "", createdBy: "Nguyễn Văn An", createdAt: "2026-08-01T08:00:00Z" },
  { id: "t12", productId: "p12", productName: "Sơn lót chống kiềm (5L)", unitName: "Thùng", type: "import", quantity: 8, referenceType: "purchase", referenceId: null, note: "", createdBy: "Trần Thị Bích", createdAt: "2026-08-01T16:10:00Z" },
  { id: "t13", productId: "p7", productName: "Keo dán gạch (25kg)", unitName: "Bao", type: "export", quantity: 5, referenceType: "order", referenceId: "DH-20260731-004", note: "", createdBy: "Nguyễn Văn An", createdAt: "2026-07-31T12:00:00Z" },
  { id: "t14", productId: "p15", productName: "Đá 1x2 (m³)", unitName: "Mét khối", type: "import", quantity: 12, referenceType: "purchase", referenceId: null, note: "Nhập bãi vật liệu", createdBy: "Trần Thị Bích", createdAt: "2026-07-31T11:25:00Z" },
  { id: "t15", productId: "p9", productName: "Xi măng Hà Tiên PCB30", unitName: "Bao 50kg", type: "export", quantity: 80, referenceType: "order", referenceId: "DH-20260730-001", note: "Chuyển toàn bộ tồn còn lại cho đại lý", createdBy: "Nguyễn Văn An", createdAt: "2026-07-28T09:00:00Z" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function computeStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock < LOW_STOCK_THRESHOLD) return "low_stock";
  return "in_stock";
}

function clampRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

function toStockLevelRow(product: InventoryProduct, stock: number, lastUpdated: string): StockLevelRow {
  const defaultUnit =
    product.units.find((u) => u.isDefault) ?? product.units[0];
  const ratio = clampRatio(product.maxStock > 0 ? stock / product.maxStock : 0);
  return {
    productId: product.id,
    productName: product.name,
    code: product.code,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    productUnitId: defaultUnit?.id ?? "",
    unitName: defaultUnit?.unitName ?? "Cái",
    currentStock: stock,
    maxStock: product.maxStock,
    minStock: LOW_STOCK_THRESHOLD,
    lastUpdated,
    status: computeStockStatus(stock),
    stockRatio: ratio,
  };
}

function buildMockStockRows(): StockLevelRow[] {
  return MOCK_INVENTORY_PRODUCTS.map((p) => {
    const s = MOCK_STOCK[p.id] ?? { qty: 0, lastUpdated: new Date().toISOString() };
    return toStockLevelRow(p, s.qty, s.lastUpdated);
  });
}

function filterStockRows(rows: StockLevelRow[], params: StockLevelParams): StockLevelRow[] {
  let result = rows;
  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q),
    );
  }
  if (params.categoryId && params.categoryId !== "all") {
    result = result.filter((r) => r.categoryId === params.categoryId);
  }
  if (params.status && params.status !== "all") {
    result = result.filter((r) => r.status === params.status);
  }
  return result;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Danh mục sản phẩm kho (có đơn vị tính) — dùng cho ImportStockDialog & gộp
 * tên sản phẩm vào lịch sử giao dịch.
 */
export function useInventoryCatalog() {
  return useQuery({
    queryKey: inventoryKeys.catalog,
    queryFn: async (): Promise<InventoryProduct[]> => {
      try {
        const { data: stockRes } = await apiClient.get<ApiResponseData<{ productId: string; totalQuantity: number }[]>>(
          "/inventory/stock",
        );
        const stockMap = new Map((stockRes.data ?? []).map((s) => [s.productId, s.totalQuantity]));

        const { data: productRes } = await apiClient.get<
          ApiResponseData<{
            items: {
              id: string;
              code: string;
              name: string;
              categoryId: string | null;
              units?: { id: string; unitName: string; conversionFactor: number; isDefault: boolean }[];
            }[];
          }>
        >("/products", { params: { limit: 500 } });
        const items = productRes.data?.items ?? [];

        const categories = new Map<string, string>();
        try {
          const { data: catRes } = await apiClient.get<ApiResponseData<{ id: string; name: string }[]>>(
            "/products/categories",
          );
          (catRes.data ?? []).forEach((c) => categories.set(c.id, c.name));
        } catch {
          // danh mục không bắt buộc — bỏ qua
        }

        if (items.length > 0) {
          return items.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            categoryId: p.categoryId ?? null,
            categoryName: categories.get(p.categoryId ?? "") ?? null,
            maxStock: stockMap.get(p.id) ?? 100,
            units:
              p.units && p.units.length > 0
                ? p.units.map((u) => ({
                    id: u.id,
                    unitName: u.unitName,
                    conversionFactor: u.conversionFactor,
                    isDefault: u.isDefault,
                  }))
                : [{ id: `${p.id}-u1`, unitName: "Cái", conversionFactor: 1, isDefault: true }],
          }));
        }
      } catch {
        // Fallback mock
      }
      await delay(400);
      return MOCK_INVENTORY_PRODUCTS;
    },
    staleTime: 60_000,
  });
}

/**
 * Bảng Stock Level — fetch toàn bộ tồn kho (backend không hỗ trợ search/filter,
 * nên lọc phía client). Dùng chung cho bảng 2D và ShelfViewer3D.
 */
export function useStockLevel(params: StockLevelParams = {}) {
  return useQuery({
    queryKey: inventoryKeys.stock,
    queryFn: async (): Promise<StockLevelRow[]> => {
      let rows: StockLevelRow[] = [];
      try {
        const [stockRes, transRes] = await Promise.all([
          apiClient.get<ApiResponseData<{ productId: string; totalQuantity: number }[]>>(
            "/inventory/stock",
          ),
          apiClient.get<ApiResponseData<{ productId: string; createdAt: string }[]>>(
            "/inventory/transactions",
          ),
        ]);
        const stockList = stockRes.data?.data ?? [];
        const stockMap = new Map(stockList.map((s) => [s.productId, s.totalQuantity]));
        // Ngày cập nhật gần nhất = createdAt lớn nhất của giao dịch theo sản phẩm
        const lastUpdatedMap = new Map<string, string>();
        for (const t of transRes.data?.data ?? []) {
          const cur = lastUpdatedMap.get(t.productId);
          if (!cur || new Date(t.createdAt) > new Date(cur)) {
            lastUpdatedMap.set(t.productId, t.createdAt);
          }
        }

        if (stockList.length > 0) {
          const catalog = await getCatalogReal();
          rows = stockList.map((s) => {
            const product = catalog.get(s.productId);
            if (!product) {
              return {
                productId: s.productId,
                productName: "Sản phẩm",
                code: "—",
                categoryId: null,
                categoryName: null,
                productUnitId: "",
                unitName: "Cái",
                currentStock: s.totalQuantity,
                maxStock: 100,
                minStock: LOW_STOCK_THRESHOLD,
                lastUpdated: lastUpdatedMap.get(s.productId) ?? new Date().toISOString(),
                status: computeStockStatus(s.totalQuantity),
                stockRatio: clampRatio(s.totalQuantity / 100),
              };
            }
            return toStockLevelRow(
              product,
              s.totalQuantity,
              lastUpdatedMap.get(s.productId) ?? new Date().toISOString(),
            );
          });
        }
      } catch {
        // Fallback mock
      }
      if (rows.length === 0) {
        await delay(400);
        rows = buildMockStockRows();
      }
      return filterStockRows(rows, params);
    },
    staleTime: 30_000,
  });
}

/** Lấy danh mục thật (1 lần) phục vụ gộp tên — không gây vòng lặp query */
async function getCatalogReal(): Promise<Map<string, InventoryProduct>> {
  const map = new Map<string, InventoryProduct>();
  try {
    const { data } = await apiClient.get<ApiResponseData<{ items: InventoryProduct[] }>>(
      "/products",
      { params: { limit: 500 } },
    );
    for (const p of data.data?.items ?? []) {
      map.set(p.id, {
        ...p,
        units: p.units?.length
          ? p.units
          : [{ id: `${p.id}-u1`, unitName: "Cái", conversionFactor: 1, isDefault: true }],
      });
    }
  } catch {
    // Bỏ qua — fallback sẽ dùng mock
  }
  return map;
}

/**
 * Lịch sử nhập/xuất kho.
 * Fetch toàn bộ giao dịch rồi lọc type/product/date/search phía client
 * (backend /inventory/transactions chỉ hỗ trợ lọc productId — không đủ cho
 * bộ lọc tổ hợp; filter client cũng đảm bảo nhất quán khi fallback mock).
 */
export function useTransactionHistory(params: TransactionHistoryParams = {}) {
  return useQuery({
    queryKey: inventoryKeys.transactions(params),
    queryFn: async (): Promise<InventoryTransaction[]> => {
      let items: InventoryTransaction[] = [];
      try {
        const { data } = await apiClient.get<ApiResponseData<InventoryTransaction[]>>(
          "/inventory/transactions",
        );
        if (data.data) items = data.data;
      } catch {
        // Fallback mock
      }
      if (items.length === 0) {
        await delay(400);
        items = MOCK_TRANSACTIONS;
      }

      // Gộp tên sản phẩm/đơn vị nếu API không trả (mock đã có sẵn)
      if (items.some((t) => !t.productName)) {
        const catalog = await getCatalogReal();
        items = items.map((t) => {
          const p = catalog.get(t.productId);
          if (!p) {
            return {
              ...t,
              productName:
                t.productName || `Sản phẩm ${t.productId.slice(0, 8)}`,
              unitName: t.unitName || "Cái",
            };
          }
          const u = p.units.find((u) => u.id === t.productUnitId);
          return { ...t, productName: t.productName || p.name, unitName: t.unitName || u?.unitName || "Cái" };
        });
      }

      // ── Lọc phía client ──
      if (params.productId && params.productId !== "all") {
        items = items.filter((t) => t.productId === params.productId);
      }
      if (params.type && params.type !== "all") {
        items = items.filter((t) => t.type === params.type);
      }
      if (params.from) {
        const fromMs = new Date(params.from).getTime();
        items = items.filter((t) => new Date(t.createdAt).getTime() >= fromMs);
      }
      if (params.to) {
        const toMs = new Date(params.to).getTime() + 86_400_000; // bao gồm hết ngày
        items = items.filter((t) => new Date(t.createdAt).getTime() <= toMs);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (t) =>
            t.productName.toLowerCase().includes(q) ||
            (t.note ?? "").toLowerCase().includes(q),
        );
      }

      return [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    staleTime: 30_000,
  });
}

/** Nhập kho (tạo inventory transaction type=import) */
export function useImportStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      productUnitId: string;
      quantity: number;
      note?: string;
    }): Promise<InventoryTransaction> => {
      try {
        const { data } = await apiClient.post<ApiResponseData<InventoryTransaction>>(
          "/inventory/import",
          input,
        );
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(700);
      const now = new Date().toISOString();
      const product =
        MOCK_INVENTORY_PRODUCTS.find((p) => p.id === input.productId) ??
        MOCK_INVENTORY_PRODUCTS[0];
      const unit = product.units.find((u) => u.id === input.productUnitId) ?? product.units[0];

      // Cập nhật tồn kho mock
      const cur = MOCK_STOCK[input.productId] ?? { qty: 0, lastUpdated: now };
      MOCK_STOCK[input.productId] = { qty: cur.qty + input.quantity, lastUpdated: now };

      const transaction: InventoryTransaction = {
        id: `t${Date.now()}`,
        productId: product.id,
        productName: product.name,
        unitName: unit?.unitName ?? "Cái",
        type: "import",
        quantity: input.quantity,
        referenceType: "purchase",
        referenceId: null,
        note: input.note || null,
        createdBy: "Nguyễn Văn An",
        createdAt: now,
      };
      MOCK_TRANSACTIONS.unshift(transaction);
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock });
      queryClient.invalidateQueries({ queryKey: ["inventory", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "low-stock"] });
    },
  });
}
