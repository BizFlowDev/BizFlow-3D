import type { QueryClient } from "@tanstack/react-query";

/** Product details are also cached by the warehouse and dashboard views. */
export function refreshProductQueries(queryClient: QueryClient): Promise<void[]> {
  return Promise.all(
    ["products", "inventory", "dashboard"].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}
