"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductUnit {
  id: string;
  productId: string;
  unitName: string;
  conversionFactor: number;
  price: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  code: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  hasMultipleUnits: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  units?: ProductUnit[];
}

export interface ProductCategory {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductStatusFilter = "all" | "active" | "inactive";

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  status?: ProductStatusFilter;
  page?: number;
  limit?: number;
}

export interface ProductFormUnit {
  unitName: string;
  conversionFactor: number;
  price: number;
  isDefault: boolean;
}

export interface ProductFormData {
  name: string;
  code: string;
  categoryId?: string;
  description?: string;
  imageUrl?: string;
  units: ProductFormUnit[];
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES: ProductCategory[] = [
  {
    id: "cat1",
    storeId: "s1",
    name: "Thời trang",
    description: "Quần áo, phụ kiện thời trang",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "cat2",
    storeId: "s1",
    name: "Điện tử",
    description: "Thiết bị điện tử, linh kiện",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "cat3",
    storeId: "s1",
    name: "Thực phẩm",
    description: "Đồ ăn, thức uống, thực phẩm khô",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "cat4",
    storeId: "s1",
    name: "Đồ gia dụng",
    description: "Dụng cụ nhà bếp, đồ dùng gia đình",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "cat5",
    storeId: "s1",
    name: "Mỹ phẩm",
    description: "Mỹ phẩm, chăm sóc da, nước hoa",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
    updatedAt: "2026-01-01T08:00:00Z",
  },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    storeId: "s1",
    categoryId: "cat2",
    code: "SP-001",
    name: "Bàn phím cơ Keychron K8",
    imageUrl:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200&q=80",
    description: "Bàn phím cơ 87 phím, switch Gateron, có dây",
    hasMultipleUnits: false,
    isActive: true,
    createdAt: "2026-07-01T08:00:00Z",
    updatedAt: "2026-07-28T10:30:00Z",
    units: [
      {
        id: "u1",
        productId: "p1",
        unitName: "Cái",
        conversionFactor: 1,
        price: 1850000,
        isDefault: true,
        createdAt: "2026-07-01T08:00:00Z",
      },
    ],
  },
  {
    id: "p2",
    storeId: "s1",
    categoryId: "cat1",
    code: "SP-002",
    name: "Áo thun cotton",
    imageUrl:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&q=80",
    description: "Áo thun cotton 100% thoáng mát, nhiều màu sắc",
    hasMultipleUnits: true,
    isActive: true,
    createdAt: "2026-07-02T08:00:00Z",
    updatedAt: "2026-07-28T10:30:00Z",
    units: [
      {
        id: "u2",
        productId: "p2",
        unitName: "Cái",
        conversionFactor: 1,
        price: 150000,
        isDefault: true,
        createdAt: "2026-07-02T08:00:00Z",
      },
      {
        id: "u3",
        productId: "p2",
        unitName: "Lố (10 cái)",
        conversionFactor: 10,
        price: 1350000,
        isDefault: false,
        createdAt: "2026-07-02T08:00:00Z",
      },
    ],
  },
  {
    id: "p3",
    storeId: "s1",
    categoryId: "cat1",
    code: "SP-003",
    name: "Quần jean slim",
    imageUrl:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&q=80",
    description: "Quần jean slim fit chất liệu denim cao cấp",
    hasMultipleUnits: false,
    isActive: true,
    createdAt: "2026-07-03T08:00:00Z",
    updatedAt: "2026-07-27T14:00:00Z",
    units: [
      {
        id: "u4",
        productId: "p3",
        unitName: "Cái",
        conversionFactor: 1,
        price: 420000,
        isDefault: true,
        createdAt: "2026-07-03T08:00:00Z",
      },
    ],
  },
  {
    id: "p4",
    storeId: "s1",
    categoryId: "cat5",
    code: "SP-004",
    name: "Kem chống nắng SPF50",
    imageUrl:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80",
    description: "Kem chống nắng quang phổ rộng, không nhờn",
    hasMultipleUnits: false,
    isActive: true,
    createdAt: "2026-07-05T08:00:00Z",
    updatedAt: "2026-07-30T16:45:00Z",
    units: [
      {
        id: "u5",
        productId: "p4",
        unitName: "Chai",
        conversionFactor: 1,
        price: 250000,
        isDefault: true,
        createdAt: "2026-07-05T08:00:00Z",
      },
    ],
  },
  {
    id: "p5",
    storeId: "s1",
    categoryId: "cat4",
    code: "SP-005",
    name: "Ấm siêu tốc 1.8L",
    imageUrl:
      "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=200&q=80",
    description: "Ấm siêu tốc inox 1.8L, tự ngắt an toàn",
    hasMultipleUnits: false,
    isActive: true,
    createdAt: "2026-07-08T08:00:00Z",
    updatedAt: "2026-07-20T09:15:00Z",
    units: [
      {
        id: "u6",
        productId: "p5",
        unitName: "Cái",
        conversionFactor: 1,
        price: 350000,
        isDefault: true,
        createdAt: "2026-07-08T08:00:00Z",
      },
    ],
  },
  {
    id: "p6",
    storeId: "s1",
    categoryId: "cat3",
    code: "SP-006",
    name: "Cà phê sạch rang xay",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80",
    description: "Cà phê rang xay nguyên chất 100%",
    hasMultipleUnits: true,
    isActive: true,
    createdAt: "2026-07-10T08:00:00Z",
    updatedAt: "2026-07-29T11:20:00Z",
    units: [
      {
        id: "u7",
        productId: "p6",
        unitName: "Gói 500g",
        conversionFactor: 1,
        price: 180000,
        isDefault: true,
        createdAt: "2026-07-10T08:00:00Z",
      },
      {
        id: "u8",
        productId: "p6",
        unitName: "Thùng (10 gói)",
        conversionFactor: 10,
        price: 1700000,
        isDefault: false,
        createdAt: "2026-07-10T08:00:00Z",
      },
    ],
  },
  {
    id: "p7",
    storeId: "s1",
    categoryId: "cat1",
    code: "SP-007",
    name: "Giày sneaker trắng",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80",
    description: "Giày sneaker trắng phong cách thể thao",
    hasMultipleUnits: false,
    isActive: true,
    createdAt: "2026-07-12T08:00:00Z",
    updatedAt: "2026-07-27T08:45:00Z",
    units: [
      {
        id: "u9",
        productId: "p7",
        unitName: "Đôi",
        conversionFactor: 1,
        price: 850000,
        isDefault: true,
        createdAt: "2026-07-12T08:00:00Z",
      },
    ],
  },
  {
    id: "p8",
    storeId: "s1",
    categoryId: "cat1",
    code: "SP-008",
    name: "Tất cotton trắng",
    imageUrl: null,
    description: "Tất cotton trắng dày dặn, thấm hút tốt",
    hasMultipleUnits: false,
    isActive: false,
    createdAt: "2026-07-18T08:00:00Z",
    updatedAt: "2026-07-22T10:00:00Z",
    units: [
      {
        id: "u10",
        productId: "p8",
        unitName: "Đôi",
        conversionFactor: 1,
        price: 25000,
        isDefault: true,
        createdAt: "2026-07-18T08:00:00Z",
      },
    ],
  },
];

// ── Helper: simulate API delay ────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Lấy danh sách sản phẩm với search, filter (category/status), pagination */
export function useProductList(params: ProductListParams = {}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async (): Promise<PaginatedResponse<Product>> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<Product>>
        >("/products", {
          params: {
            search: params.search || undefined,
            categoryId:
              params.categoryId && params.categoryId !== "all"
                ? params.categoryId
                : undefined,
            isActive:
              params.status && params.status !== "all"
                ? params.status === "active"
                : undefined,
            page: params.page,
            limit: params.limit,
          },
        });
        if (data.data) return data.data;
      } catch {
        // Fallback to mock data khi API chưa sẵn sàng
      }

      // Mock implementation
      await delay(600);
      let filtered = [...MOCK_PRODUCTS];

      // Search by name or code/SKU
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        );
      }

      // Filter by category
      if (params.categoryId && params.categoryId !== "all") {
        filtered = filtered.filter((p) => p.categoryId === params.categoryId);
      }

      // Filter by status
      if (params.status === "active") {
        filtered = filtered.filter((p) => p.isActive);
      } else if (params.status === "inactive") {
        filtered = filtered.filter((p) => !p.isActive);
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

/** Lấy danh sách danh mục sản phẩm */
export function useCategoryList() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<ProductCategory[]> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<ProductCategory[]>
        >("/products/categories");
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(300);
      return MOCK_CATEGORIES.filter((c) => c.isActive);
    },
    staleTime: 60_000,
  });
}

/** Tạo sản phẩm mới */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductFormData): Promise<Product> => {
      try {
        const { data: res } = await apiClient.post<
          ApiResponseData<{ product: Product; units: ProductUnit[] }>
        >("/products", data);
        if (res.data) return res.data.product;
      } catch {
        // Fallback mock
      }

      await delay(800);
      const now = new Date().toISOString();
      const productId = `p${Date.now()}`;
      const units: ProductUnit[] = data.units.map((u, i) => ({
        id: `${productId}-u${i + 1}`,
        productId,
        unitName: u.unitName,
        conversionFactor: u.conversionFactor,
        price: u.price,
        isDefault: u.isDefault,
        createdAt: now,
      }));
      const newProduct: Product = {
        id: productId,
        storeId: "s1",
        categoryId: data.categoryId || null,
        code: data.code,
        name: data.name,
        imageUrl: data.imageUrl || null,
        description: data.description || null,
        hasMultipleUnits: data.units.length > 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        units,
      };
      MOCK_PRODUCTS.unshift(newProduct);
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Cập nhật sản phẩm */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ProductFormData;
    }): Promise<Product> => {
      try {
        const { data: res } = await apiClient.put<
          ApiResponseData<{ product: Product; units: ProductUnit[] }>
        >(`/products/${id}`, data);
        if (res.data) return res.data.product;
      } catch {
        // Fallback mock
      }

      await delay(800);
      const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Product not found");
      const existing = MOCK_PRODUCTS[idx];
      const now = new Date().toISOString();
      const units: ProductUnit[] = data.units.map((u, i) => ({
        id: `${id}-u${i + 1}`,
        productId: id,
        unitName: u.unitName,
        conversionFactor: u.conversionFactor,
        price: u.price,
        isDefault: u.isDefault,
        createdAt: now,
      }));
      MOCK_PRODUCTS[idx] = {
        ...existing,
        categoryId: data.categoryId || null,
        code: data.code,
        name: data.name,
        imageUrl: data.imageUrl || null,
        description: data.description || null,
        hasMultipleUnits: data.units.length > 1,
        updatedAt: now,
        units,
      };
      return MOCK_PRODUCTS[idx];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/** Bật/tắt trạng thái sản phẩm (active/inactive) */
export function useToggleProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Product> => {
      try {
        const { data: res } = await apiClient.patch<
          ApiResponseData<Product>
        >(`/products/${id}/toggle`);
        if (res.data) return res.data;
      } catch {
        // Fallback mock
      }

      await delay(500);
      const product = MOCK_PRODUCTS.find((p) => p.id === id);
      if (!product) throw new Error("Product not found");
      product.isActive = !product.isActive;
      product.updatedAt = new Date().toISOString();
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
