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
import { useUiPreferencesStore } from "@/lib/stores/uiPreferences";

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
  /**
   * Bản render 3D thay thế children (Recharts) khi bật chế độ 3D.
   * Widget cha chỉ truyền khi is3DEnabled && mounted (tránh hydration mismatch).
   */
  render3D?: React.ReactNode;
  /** Nếu true, không tự bọc children trong ResponsiveContainer của recharts */
  noResponsiveContainer?: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper biểu đồ — tự chọn render:
 * - bật chế độ 3D (is3DEnabled từ uiPreferences store) + có `render3D` → Canvas 3D
 * - ngược lại → children (Recharts)
 * Kèm trạng thái loading skeleton / empty state dùng chung cho cả 2 nhánh.
 */
export function ChartWrapper({
  title,
  subtitle,
  height = 280,
  action,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "Chưa có dữ liệu",
  render3D,
  noResponsiveContainer = false,
  children,
}: ChartWrapperProps) {
  const is3DEnabled = useUiPreferencesStore((state) => state.is3DEnabled);
  const show3D = is3DEnabled && Boolean(render3D);

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
        ) : show3D ? (
          <div className="w-full" style={{ height }}>
            {render3D}
          </div>
        ) : noResponsiveContainer ? (
          <div className="w-full min-w-0" style={{ minHeight: height }}>
            {children}
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
