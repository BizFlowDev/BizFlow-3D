"use client";

import { AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import type { LowStockItem } from "@/lib/dashboard-keys";

interface LowStockWidgetProps {
  lowStock: LowStockItem[] | undefined;
  isLoading: boolean;
}

export default function LowStockWidget({
  lowStock,
  isLoading,
}: LowStockWidgetProps) {
  const count = (lowStock ?? []).length;

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
