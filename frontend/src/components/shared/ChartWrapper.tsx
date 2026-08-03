"use client";

import { ResponsiveContainer } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  /** Chiều cao vùng biểu đồ (px) */
  height?: number;
  /** Nút thao tác bên phải tiêu đề (VD: link xem thêm) */
  action?: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

/**
 * Wrapper recharts — Card chứa header + ResponsiveContainer,
 * kèm trạng thái loading skeleton / empty state.
 */
export function ChartWrapper({
  title,
  subtitle,
  height = 280,
  action,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "Chưa có dữ liệu",
  children,
}: ChartWrapperProps) {
  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && (
            <CardDescription className="mt-0.5">{subtitle}</CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div
            className="flex flex-col gap-4"
            style={{ height }}
            aria-busy="true"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-full w-full flex-1 rounded-xl" />
          </div>
        ) : isEmpty ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed"
            style={{ height }}
          >
            <div className="rounded-full bg-muted p-4">
              <BarChart3 className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className={cn("w-full")} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
