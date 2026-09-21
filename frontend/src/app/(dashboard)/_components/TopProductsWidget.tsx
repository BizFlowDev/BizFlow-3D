"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  DollarSign,
  Package,
  ListOrdered,
  BarChart3,
  Award,
  Tag,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartWrapper } from "@/components/shared/ChartWrapper";
import { ChartTooltip } from "@/components/shared/ChartTooltip";
import { useTopProducts } from "@/hooks/useDashboard";
import type { TopProductRow } from "@/lib/dashboard-keys";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function shortName(name: string, max = 22): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

// ── Rank Badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 font-bold text-xs ring-1 ring-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400">
        <Award className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300/40 text-slate-700 font-bold text-xs ring-1 ring-slate-400/30 dark:bg-slate-700/40 dark:text-slate-200">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-700 font-bold text-xs ring-1 ring-orange-500/30 dark:bg-orange-500/20 dark:text-orange-300">
        3
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-xs">
      {rank}
    </span>
  );
}

// ── Props & Component ─────────────────────────────────────────────────────────

interface TopProductsWidgetProps {
  is3D?: boolean;
  render3D?: React.ReactNode;
}

export function TopProductsWidget({
  is3D,
  render3D,
}: TopProductsWidgetProps) {
  const topProducts = useTopProducts();
  const [metric, setMetric] = useState<"revenue" | "quantity">("revenue");
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");

  const rawItems = topProducts.data ?? [];

  // Sắp xếp dữ liệu theo chỉ số đang chọn
  const sortedItems = useMemo(() => {
    const items = [...rawItems];
    if (metric === "revenue") {
      items.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else {
      items.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);
    }
    return items.slice(0, 5).map((item, idx) => ({
      ...item,
      rank: idx + 1,
      displayName: shortName(item.name),
    }));
  }, [rawItems, metric]);

  const maxValue = useMemo(() => {
    if (sortedItems.length === 0) return 1;
    return metric === "revenue"
      ? Math.max(...sortedItems.map((p) => p.totalRevenue), 1)
      : Math.max(...sortedItems.map((p) => p.totalQuantitySold), 1);
  }, [sortedItems, metric]);

  return (
    <ChartWrapper
      title="Sản phẩm bán chạy"
      subtitle={`Top 5 theo ${metric === "revenue" ? "doanh thu cao nhất" : "số lượng bán chạy nhất"}`}
      height={310}
      noResponsiveContainer={true}
      isLoading={topProducts.isLoading}
      isEmpty={!topProducts.isLoading && sortedItems.length === 0}
      render3D={is3D ? render3D : undefined}
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!is3D && (
            <>
              {/* Chuyển đổi Doanh thu vs Số lượng */}
              <Tabs
                value={metric}
                onValueChange={(v) => setMetric(v as "revenue" | "quantity")}
              >
                <TabsList className="h-8 bg-muted/70 p-0.5">
                  <TabsTrigger value="revenue" className="gap-1 px-2.5 text-xs">
                    <DollarSign className="h-3 w-3" />
                    <span className="hidden sm:inline">Doanh thu</span>
                  </TabsTrigger>
                  <TabsTrigger value="quantity" className="gap-1 px-2.5 text-xs">
                    <Package className="h-3 w-3" />
                    <span className="hidden sm:inline">Số lượng</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Chuyển đổi Xem dạng Danh sách thẻ vs Biểu đồ */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setViewMode((prev) => (prev === "list" ? "chart" : "list"))
                }
                title={
                  viewMode === "list"
                    ? "Chuyển sang biểu đồ cột"
                    : "Chuyển sang danh sách xếp hạng"
                }
                aria-label="Đổi chế độ xem"
              >
                {viewMode === "list" ? (
                  <BarChart3 className="h-4 w-4" />
                ) : (
                  <ListOrdered className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      }
    >
      {viewMode === "list" ? (
        // ── View 1: Leaderboard Cards với progress bar & rank badges ──
        <div className="flex flex-col gap-2 w-full py-0.5">
          {sortedItems.map((product) => {
            const currentVal =
              metric === "revenue"
                ? product.totalRevenue
                : product.totalQuantitySold;
            const pct = Math.min(
              100,
              Math.max(5, Math.round((currentVal / maxValue) * 100)),
            );

            return (
              <div
                key={product.productId}
                className="group relative w-full rounded-xl border border-border/40 bg-muted/25 px-3 py-2 transition-all hover:border-border/70 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <RankBadge rank={product.rank} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="truncate text-xs font-semibold text-foreground max-w-[140px] sm:max-w-[170px]"
                          title={product.name}
                        >
                          {product.name}
                        </span>
                        {product.categoryName && (
                          <Badge
                            variant="outline"
                            className="shrink-0 px-1.5 py-0 text-[10px] font-normal text-muted-foreground border-border/60"
                          >
                            <Tag className="mr-0.5 h-2.5 w-2.5" />
                            {product.categoryName}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Mã: <span className="font-mono">{product.code}</span>
                      </span>
                    </div>
                  </div>

                  {/* Giá trị hiển thị */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold tabular-nums text-foreground">
                      {metric === "revenue"
                        ? formatCurrency(product.totalRevenue)
                        : `${product.totalQuantitySold.toLocaleString("vi-VN")} sp`}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      {metric === "revenue"
                        ? `${product.totalQuantitySold.toLocaleString("vi-VN")} sp • ${product.orderCount} đơn`
                        : `${formatCurrency(product.totalRevenue)} • ${product.orderCount} đơn`}
                    </div>
                  </div>
                </div>

                {/* Progress bar nhỏ phía dưới */}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      metric === "revenue"
                        ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"
                        : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ── View 2: Biểu đồ thanh ngang BarChart ──
        <div className="h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={sortedItems}
              margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient id="barRevGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="barQtyGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="displayName"
                width={120}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(100, 116, 139, 0.08)" }}
                content={
                  <ChartTooltip
                    name={metric === "revenue" ? "Doanh thu:" : "Đã bán:"}
                    labelFormatter={(label) => shortName(label, 28)}
                    valueFormatter={(value) =>
                      metric === "revenue"
                        ? formatCurrency(Number(value) || 0)
                        : `${Number(value || 0).toLocaleString("vi-VN")} sp`
                    }
                    footer={(row: Record<string, unknown>) => ({
                      label: metric === "revenue" ? "Đã bán:" : "Doanh thu:",
                      value:
                        metric === "revenue"
                          ? `${(row.totalQuantitySold as number || 0).toLocaleString("vi-VN")} sp`
                          : formatCurrency((row.totalRevenue as number) || 0),
                    })}
                  />
                }
              />
              <Bar
                dataKey={metric === "revenue" ? "totalRevenue" : "totalQuantitySold"}
                fill={metric === "revenue" ? "url(#barRevGrad)" : "url(#barQtyGrad)"}
                radius={[0, 6, 6, 0]}
                barSize={20}
              >
                {sortedItems.map((p) => (
                  <Cell
                    key={p.productId}
                    fill={
                      metric === "revenue"
                        ? "url(#barRevGrad)"
                        : "url(#barQtyGrad)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartWrapper>
  );
}
