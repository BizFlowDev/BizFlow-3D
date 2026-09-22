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
  price?: number;
  isDefault: boolean;
}

/** Danh mục sản phẩm dùng chung cho module kho */
export interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  /** Tồn kho hiện tại */
  currentStock: number;
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



// ── Helpers ───────────────────────────────────────────────────────────────────

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
              units?: { id: string; unitName: string; conversionFactor: number; price?: number; isDefault: boolean }[];
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
            currentStock: stockMap.get(p.id) ?? 0,
            maxStock: 100,
            units:
              p.units && p.units.length > 0
                ? p.units.map((u) => ({
                    id: u.id,
                    unitName: u.unitName,
                    conversionFactor: u.conversionFactor,
                    price: typeof u.price === "number" ? u.price : 0,
                    isDefault: u.isDefault,
                  }))
                : [{ id: `${p.id}-u1`, unitName: "Cái", conversionFactor: 1, price: 0, isDefault: true }],
          }));
        }
      } catch {
        // Không có dữ liệu
      }
      return [];
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
    // Bỏ qua
  }
  return map;
}

/**
 * Lịch sử nhập/xuất kho.
 * Fetch toàn bộ giao dịch rồi lọc type/product/date/search phía client
 * (backend /inventory/transactions chỉ hỗ trợ lọc productId — không đủ cho
 * bộ lọc tổ hợp).
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
      // Gộp tên sản phẩm/đơn vị nếu API không trả
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
      unitCost?: number;
      note?: string;
    }): Promise<InventoryTransaction> => {
      const { data } = await apiClient.post<ApiResponseData<InventoryTransaction>>(
        "/inventory/import",
        input,
      );
      if (!data.data) throw new Error("Không thể nhập kho");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock });
      queryClient.invalidateQueries({ queryKey: ["inventory", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
  });
}
