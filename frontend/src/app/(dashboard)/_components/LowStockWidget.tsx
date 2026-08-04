"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/StatCard";
import { useUiPreferencesStore } from "@/lib/stores/uiPreferences";
import type { LowStockItem } from "@/lib/dashboard-keys";

// Lazy-load scene 3D — chỉ tải bundle three.js khi bật chế độ 3D
const MiniShelf3D = dynamic(
  () => import("@/components/dashboard3d/MiniShelf3D"),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

interface LowStockWidgetProps {
  lowStock: LowStockItem[] | undefined;
  isLoading: boolean;
}

/**
 * Widget Sản phẩm sắp hết hàng.
 * - Chế độ 2D: StatCard thuần (giữ nguyên widget gốc).
 * - Chế độ 3D: mô hình kệ hàng thu nhỏ (MiniShelf3D) — các ô dưới ngưỡng tồn
 *   tối thiểu nhấp nháy đỏ nhẹ. Click ô → điều hướng sang trang Kho hàng (B7)
 *   kèm ?highlight=<productId> để scroll/focus tới sản phẩm đó.
 */
export default function LowStockWidget({
  lowStock,
  isLoading,
}: LowStockWidgetProps) {
  const is3DEnabled = useUiPreferencesStore((state) => state.is3DEnabled);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = lowStock ?? [];
  const count = items.length;

  // Chờ mount + không có sản phẩm thiếu → StatCard thuần
  if (!mounted || !is3DEnabled || count === 0) {
    return (
      <StatCard
        index={4}
        title="Sản phẩm sắp hết hàng"
        value={`${count}`}
        icon={AlertTriangle}
        color="violet"
        sub="cần nhập thêm"
        href="/inventory"
        loading={isLoading}
      />
    );
  }

  const handleCell = (productId: string) =>
    router.push(`/inventory?highlight=${productId}`);
  const handleOpenInventory = () => router.push("/inventory");

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">Sản phẩm sắp hết hàng</p>
          <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 p-2.5 text-white shadow-lg shadow-violet-500/30">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col items-start">
            <p className="text-2xl font-bold tracking-tight">{count}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              sản phẩm cần nhập thêm
            </p>
            <button
              type="button"
              onClick={handleOpenInventory}
              className="mt-2 inline-flex cursor-pointer items-center gap-0.5 text-xs font-medium text-blue-600 transition-colors hover:gap-1.5 dark:text-blue-400"
            >
              Mở kho hàng
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-28 w-full sm:h-32 sm:w-36">
            <MiniShelf3D items={items} onSelectItem={handleCell} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
