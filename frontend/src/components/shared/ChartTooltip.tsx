"use client";

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: unknown;
  color?: string;
  stroke?: string;
  payload?: unknown;
}

interface ChartTooltipProps {
  /** true khi tooltip đang hiển thị (recharts inject) */
  active?: boolean;
  /** Danh sách dữ liệu tại điểm hover (recharts inject) */
  payload?: TooltipEntry[];
  /** Label tại điểm hover (recharts inject) */
  label?: unknown;
  /** Tên hiển thị cho chuỗi dữ liệu (thay cho dataKey mặc định) */
  name?: string;
  /** Format giá trị (VD: formatCurrency) */
  valueFormatter?: (value: number, row: Record<string, unknown>) => React.ReactNode;
  /** Format label (VD: ngày tháng) */
  labelFormatter?: (label: string) => React.ReactNode;
  /** Dòng số liệu phụ hiển thị ngay dưới, cùng style với dòng chính (VD: doanh thu) */
  footer?: (row: Record<string, unknown>) => {
    label: string;
    value: React.ReactNode;
    color?: string;
  } | null;
}

/**
 * Custom recharts Tooltip — nổi bật, dễ đọc trong cả light/dark theme:
 * nền đặc + backdrop blur + viền + shadow mạnh, chữ dùng màu theme (foreground).
 * Dùng với <Tooltip content={<ChartTooltip ... />} />.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  name,
  valueFormatter,
  labelFormatter,
  footer,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const first = payload[0];
  const row = (first?.payload ?? {}) as Record<string, unknown>;

  return (
    <div className="z-50 min-w-[160px] rounded-xl border border-border bg-background/95 px-3.5 py-2.5 shadow-xl shadow-black/10 backdrop-blur-md">
      {label !== undefined && label !== null && (
        <p className="mb-1.5 border-b border-border/60 pb-1.5 text-xs font-semibold text-foreground">
          {labelFormatter ? labelFormatter(String(label)) : String(label)}
        </p>
      )}

      <div className="space-y-1">
        {payload.map((entry) => {
          const itemRow = (entry.payload ?? {}) as Record<string, unknown>;
          const rawColor = entry.color ?? entry.stroke ?? "";
          const color =
            rawColor && !rawColor.startsWith("url(") ? rawColor : "#2563eb";
          return (
            <div
              key={String(entry.dataKey ?? entry.name)}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">
                {name ?? String(entry.name ?? "")}
              </span>
              <span className="ml-auto pl-4 font-semibold tabular-nums text-foreground">
                {valueFormatter
                  ? valueFormatter(Number(entry.value), itemRow)
                  : String(entry.value ?? "")}
              </span>
            </div>
          );
        })}
      </div>

      {footer && (() => {
        const extra = footer(row);
        if (!extra) return null;
        return (
          <div className="mt-1.5 flex items-center gap-2 border-t border-border/60 pt-1.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
              style={{ backgroundColor: extra.color ?? "#2563eb" }}
            />
            <span className="text-muted-foreground">{extra.label}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums text-foreground">
              {extra.value}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
