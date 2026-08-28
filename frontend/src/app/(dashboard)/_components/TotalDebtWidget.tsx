"use client";

import { Banknote } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { DEBT_ALERT_THRESHOLD, type DebtSummary } from "@/lib/dashboard-keys";

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

export default function TotalDebtWidget({
  debtSummary,
  isLoading,
}: TotalDebtWidgetProps) {
  const totalRemaining = debtSummary?.totalRemaining ?? 0;
  const customerCount = debtSummary?.customerCount ?? 0;

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
