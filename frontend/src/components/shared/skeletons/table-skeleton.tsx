import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  title?: string;
  description?: string;
  rows?: number;
  columns?: number;
  showToolbar?: boolean;
}

/**
 * TableSkeleton — Khung xương giao diện hiển thị tức thì khi tải trang danh sách dữ liệu (Đơn hàng, Kho, Sản phẩm, Khách hàng).
 */
export function TableSkeleton({
  title = "Danh sách",
  description = "Đang tải dữ liệu...",
  rows = 6,
  columns = 6,
  showToolbar = true,
}: TableSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* ── Toolbar ── */}
      {showToolbar && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Skeleton className="h-10 w-full lg:w-[240px] rounded-lg" />
          <Skeleton className="h-10 w-full lg:w-[180px] rounded-lg" />
          <div className="flex items-center gap-2 lg:ml-auto">
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-sm">
        {/* Table Header skeleton */}
        <div className="border-b bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4"
                style={{
                  width: `${Math.max(60, 140 - (i % 3) * 30)}px`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Table Rows skeleton */}
        <div className="divide-y divide-border/40 p-2">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="flex items-center justify-between gap-4 p-4 transition-colors"
            >
              {Array.from({ length: columns }).map((_, colIndex) => {
                // Biến đổi độ dài tự nhiên của skeleton theo cột
                if (colIndex === 0) {
                  return (
                    <div key={colIndex} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-sm" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  );
                }
                if (colIndex === columns - 1) {
                  return (
                    <Skeleton
                      key={colIndex}
                      className="h-7 w-16 rounded-full"
                    />
                  );
                }
                return (
                  <Skeleton
                    key={colIndex}
                    className="h-4"
                    style={{
                      width: `${Math.max(50, 110 - (colIndex * 15) + (rowIndex % 3) * 20)}px`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 bg-card/30">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
