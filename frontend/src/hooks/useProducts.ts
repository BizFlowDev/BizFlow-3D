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
        // Không có dữ liệu
      }

      return { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
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
        // Không có dữ liệu
      }

      return [];
    },
    staleTime: 60_000,
  });
}

/** Tạo sản phẩm mới */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductFormData): Promise<Product> => {
      const { data: res } = await apiClient.post<
        ApiResponseData<{ product: Product; units: ProductUnit[] }>
      >("/products", data);
      if (!res.data) throw new Error("Không thể tạo sản phẩm");
      return res.data.product;
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
      const { data: res } = await apiClient.put<
        ApiResponseData<{ product: Product; units: ProductUnit[] }>
      >(`/products/${id}`, data);
      if (!res.data) throw new Error("Không thể cập nhật sản phẩm");
      return res.data.product;
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
      const { data: res } = await apiClient.patch<
        ApiResponseData<Product>
      >(`/products/${id}/toggle`);
      if (!res.data) throw new Error("Không thể cập nhật trạng thái");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
