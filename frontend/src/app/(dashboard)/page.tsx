import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { prefetchDashboard } from "@/lib/dashboard-server";
import DashboardPage from "./_components/dashboard-page";

// Luôn render động (SSR) để đọc cookie token và prefetch dữ liệu theo người dùng
export const dynamic = "force-dynamic";

/**
 * Dashboard — Server Component.
 * Prefetch dữ liệu server-side bằng Tanstack Query (dehydrate) rồi hydrate
 * sang client component; client vẫn tự refetch khi cần.
 */
export default async function Dashboard() {
  const queryClient = getQueryClient();
  await prefetchDashboard(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardPage />
    </HydrationBoundary>
  );
}
