import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

/**
 * Tạo 1 QueryClient duy nhất cho mỗi request (SSR).
 * Dùng để prefetch dữ liệu trên server trước khi dehydrate.
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    }),
);
