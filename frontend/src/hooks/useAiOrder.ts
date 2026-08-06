"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DraftOrderStatus = "pending" | "confirmed" | "rejected";

export interface DraftOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitName?: string;
}

export interface DraftOrder {
  id: string;
  storeId: string;
  customerId: string | null;
  customerName: string | null;
  status: DraftOrderStatus;
  items: DraftOrderItem[];
  totalAmount: number;
  aiRawInput: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NLProcessResponse {
  message: string;
  draftOrder?: DraftOrder;
}

export interface VoiceProcessResponse {
  transcription: string;
  message: string;
  draftOrder?: DraftOrder;
}

export interface DraftOrderListParams {
  status?: DraftOrderStatus | "all";
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

// ── Mock Data ─────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_DRAFT_ORDERS: DraftOrder[] = [
  {
    id: "draft-001",
    storeId: "s1",
    customerId: "c1",
    customerName: "Nguyễn Văn An",
    status: "pending",
    items: [
      { productId: "p2", productName: "Áo thun cotton", quantity: 3, unitPrice: 150000, totalPrice: 450000, unitName: "Cái" },
      { productId: "p4", productName: "Kem chống nắng SPF50", quantity: 2, unitPrice: 250000, totalPrice: 500000, unitName: "Chai" },
    ],
    totalAmount: 950000,
    aiRawInput: "Bán cho anh An 3 áo thun cotton và 2 chai kem chống nắng",
    createdAt: "2026-08-06T09:30:00Z",
    updatedAt: "2026-08-06T09:30:00Z",
  },
  {
    id: "draft-002",
    storeId: "s1",
    customerId: null,
    customerName: null,
    status: "pending",
    items: [
      { productId: "p1", productName: "Bàn phím cơ Keychron K8", quantity: 1, unitPrice: 1850000, totalPrice: 1850000, unitName: "Cái" },
    ],
    totalAmount: 1850000,
    aiRawInput: "Tạo đơn 1 bàn phím Keychron K8",
    createdAt: "2026-08-06T08:15:00Z",
    updatedAt: "2026-08-06T08:15:00Z",
  },
  {
    id: "draft-003",
    storeId: "s1",
    customerId: "c3",
    customerName: "Lê Hoàng Cường",
    status: "confirmed",
    items: [
      { productId: "p6", productName: "Cà phê sạch rang xay", quantity: 5, unitPrice: 180000, totalPrice: 900000, unitName: "Gói 500g" },
    ],
    totalAmount: 900000,
    aiRawInput: "Bán cho Cường 5 gói cà phê rang xay",
    createdAt: "2026-08-05T14:20:00Z",
    updatedAt: "2026-08-05T15:00:00Z",
  },
  {
    id: "draft-004",
    storeId: "s1",
    customerId: "c5",
    customerName: "Hoàng Thị Nga",
    status: "rejected",
    items: [
      { productId: "p7", productName: "Giày sneaker trắng", quantity: 2, unitPrice: 850000, totalPrice: 1700000, unitName: "Đôi" },
      { productId: "p8", productName: "Tất cotton trắng", quantity: 4, unitPrice: 25000, totalPrice: 100000, unitName: "Đôi" },
    ],
    totalAmount: 1800000,
    aiRawInput: "Chị Nga mua 2 đôi giày sneaker trắng và 4 đôi tất",
    createdAt: "2026-08-05T11:40:00Z",
    updatedAt: "2026-08-05T12:10:00Z",
  },
  {
    id: "draft-005",
    storeId: "s1",
    customerId: null,
    customerName: null,
    status: "pending",
    items: [
      { productId: "p5", productName: "Ấm siêu tốc 1.8L", quantity: 1, unitPrice: 350000, totalPrice: 350000, unitName: "Cái" },
      { productId: "p2", productName: "Áo thun cotton", quantity: 2, unitPrice: 150000, totalPrice: 300000, unitName: "Cái" },
      { productId: "p8", productName: "Tất cotton trắng", quantity: 6, unitPrice: 25000, totalPrice: 150000, unitName: "Đôi" },
    ],
    totalAmount: 800000,
    aiRawInput: "Tạo đơn 1 ấm siêu tốc, 2 áo thun cotton, 6 đôi tất trắng",
    createdAt: "2026-08-04T16:05:00Z",
    updatedAt: "2026-08-04T16:05:00Z",
  },
];

// Mock AI responses cho chat demo
const MOCK_AI_RESPONSES: { patterns: RegExp; response: string; createDraft: boolean }[] = [
  {
    patterns: /bán|tạo đơn|mua|order/i,
    response: "Tôi đã tạo đơn nháp dựa trên yêu cầu của bạn. Vui lòng kiểm tra và xác nhận.",
    createDraft: true,
  },
  {
    patterns: /xin chào|hello|hi|hey/i,
    response: "Xin chào! Tôi là AI Order Assistant. Bạn có thể nói hoặc nhập yêu cầu tạo đơn hàng, ví dụ: \"Bán cho anh An 3 áo thun cotton\".",
    createDraft: false,
  },
  {
    patterns: /giúp|help|hướng dẫn/i,
    response: "Tôi có thể giúp bạn tạo đơn hàng bằng ngôn ngữ tự nhiên. Hãy thử:\n• \"Bán cho khách 2 áo thun và 1 chai kem chống nắng\"\n• \"Tạo đơn 5 gói cà phê cho anh Cường\"\n• Hoặc sử dụng giọng nói bằng nút microphone!",
    createDraft: false,
  },
];

function getMockAiResponse(input: string): NLProcessResponse {
  const match = MOCK_AI_RESPONSES.find((r) => r.patterns.test(input));

  if (match?.createDraft) {
    const now = new Date().toISOString();
    const draftId = `draft-${Date.now()}`;
    const newDraft: DraftOrder = {
      id: draftId,
      storeId: "s1",
      customerId: null,
      customerName: null,
      status: "pending",
      items: [
        { productId: "p2", productName: "Áo thun cotton", quantity: 2, unitPrice: 150000, totalPrice: 300000, unitName: "Cái" },
        { productId: "p4", productName: "Kem chống nắng SPF50", quantity: 1, unitPrice: 250000, totalPrice: 250000, unitName: "Chai" },
      ],
      totalAmount: 550000,
      aiRawInput: input,
      createdAt: now,
      updatedAt: now,
    };
    MOCK_DRAFT_ORDERS.unshift(newDraft);
    return { message: match.response, draftOrder: newDraft };
  }

  return {
    message:
      match?.response ??
      `Tôi đã nhận được yêu cầu: "${input}". Tuy nhiên tôi chưa xác định được sản phẩm cụ thể. Bạn có thể nói rõ hơn tên sản phẩm và số lượng không?`,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Gửi text tự nhiên để AI xử lý và tạo đơn nháp */
export function useProcessNaturalLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string): Promise<NLProcessResponse> => {
      try {
        const { data } = await apiClient.post<ApiResponseData<NLProcessResponse>>(
          "/ai-orders/natural-language",
          { text },
        );
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      // Mock response
      await delay(800 + Math.random() * 1200);
      return getMockAiResponse(text);
    },
    onSuccess: (data) => {
      if (data.draftOrder) {
        queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
      }
    },
  });
}

/** Gửi audio blob (voice) để AI xử lý STT + tạo đơn nháp */
export function useProcessVoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audioBlob: Blob): Promise<VoiceProcessResponse> => {
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const { data } = await apiClient.post<ApiResponseData<VoiceProcessResponse>>(
          "/ai-orders/voice",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      // Mock: giả lập STT + AI response
      await delay(1200 + Math.random() * 800);
      const mockTranscription = "Bán 2 áo thun cotton và 1 chai kem chống nắng";
      const nlResult = getMockAiResponse(mockTranscription);
      return {
        transcription: mockTranscription,
        message: nlResult.message,
        draftOrder: nlResult.draftOrder,
      };
    },
    onSuccess: (data) => {
      if (data.draftOrder) {
        queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
      }
    },
  });
}

/** Lấy danh sách draft orders với pagination + filter */
export function useDraftOrders(params: DraftOrderListParams = {}) {
  return useQuery({
    queryKey: ["draft-orders", params],
    queryFn: async (): Promise<PaginatedResponse<DraftOrder>> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<PaginatedResponse<DraftOrder>>
        >("/ai-orders/drafts", {
          params: {
            status: params.status === "all" || !params.status ? undefined : params.status,
            page: params.page,
            limit: params.limit,
          },
        });
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      // Mock response
      await delay(400);
      let filtered = [...MOCK_DRAFT_ORDERS];
      if (params.status && params.status !== "all") {
        filtered = filtered.filter((d) => d.status === params.status);
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
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      };
    },
    staleTime: 30_000,
  });
}

/** Xác nhận draft order → chuyển thành đơn chính thức */
export function useConfirmDraftOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DraftOrder> => {
      try {
        const { data } = await apiClient.patch<ApiResponseData<DraftOrder>>(
          `/ai-orders/drafts/${id}/confirm`,
        );
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(500);
      const draft = MOCK_DRAFT_ORDERS.find((d) => d.id === id);
      if (!draft) throw new Error("Draft order không tồn tại");
      draft.status = "confirmed";
      draft.updatedAt = new Date().toISOString();
      return { ...draft };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Từ chối draft order */
export function useRejectDraftOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<DraftOrder> => {
      try {
        const { data } = await apiClient.patch<ApiResponseData<DraftOrder>>(
          `/ai-orders/drafts/${id}/reject`,
        );
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }

      await delay(500);
      const draft = MOCK_DRAFT_ORDERS.find((d) => d.id === id);
      if (!draft) throw new Error("Draft order không tồn tại");
      draft.status = "rejected";
      draft.updatedAt = new Date().toISOString();
      return { ...draft };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft-orders"] });
    },
  });
}
