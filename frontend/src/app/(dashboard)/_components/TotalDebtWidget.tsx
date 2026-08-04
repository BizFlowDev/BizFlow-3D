"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/StatCard";
import { useUiPreferencesStore } from "@/lib/stores/uiPreferences";
import { DEBT_ALERT_THRESHOLD, type DebtSummary } from "@/lib/dashboard-keys";

// Lazy-load scene 3D — chỉ tải bundle three.js khi bật chế độ 3D
const DebtStack3D = dynamic(
  () => import("@/components/dashboard3d/DebtStack3D"),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface TotalDebtWidgetProps {
  debtSummary: DebtSummary | undefined;
  isLoading: boolean;
}

/**
 * Widget Tổng nợ chưa thu.
 * - Chế độ 2D: StatCard thuần (giữ nguyên widget gốc).
 * - Chế độ 3D: "chồng thùng nợ" (DebtStack3D) + số tiền nợ chính xác hiển thị
 *   to, rõ bên cạnh scene 3D (nguyên tắc #1: 3D chỉ bổ trợ trực quan).
 */
export default function TotalDebtWidget({
  debtSummary,
  isLoading,
}: TotalDebtWidgetProps) {
  const is3DEnabled = useUiPreferencesStore((state) => state.is3DEnabled);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const totalRemaining = debtSummary?.totalRemaining ?? 0;
  const customerCount = debtSummary?.customerCount ?? 0;
  const overThreshold = totalRemaining > DEBT_ALERT_THRESHOLD;

  // Chờ mount để tránh hydration mismatch + tôn trọng preference thiết bị
  if (!mounted || !is3DEnabled) {
    return (
      <StatCard
        index={3}
        title="Tổng nợ chưa thu"
        value={formatCurrency(totalRemaining)}
        icon={Banknote}
        color="red"
        sub={`${customerCount} khách hàng còn nợ`}
        loading={isLoading}
      />
    );
  }

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">Tổng nợ chưa thu</p>
          <div className="rounded-xl bg-gradient-to-br from-red-500 to-rose-400 p-2.5 text-white shadow-lg shadow-red-500/30">
            <Banknote className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-2xl font-bold tracking-tight">
              {formatCurrency(totalRemaining)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customerCount} khách hàng còn nợ
            </p>
            {overThreshold && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                Vượt ngưỡng cảnh báo
              </span>
            )}
          </div>
          <div className="h-28 w-full sm:h-32 sm:w-36">
            <DebtStack3D totalRemaining={totalRemaining} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
