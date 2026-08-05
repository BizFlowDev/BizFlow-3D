"use client";

import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ReportRange } from "@/lib/report-utils";

const OPTIONS: { value: ReportRange; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chỉnh" },
];

interface DateRangeSelectorProps {
  value: ReportRange;
  customFrom: string;
  customTo: string;
  onValueChange: (value: ReportRange) => void;
  onCustomChange: (from: string, to: string) => void;
}

/**
 * Chọn khoảng thời gian báo cáo (Hôm nay / Tuần / Tháng / Quý / Năm / Tùy chỉnh).
 * Khi chọn "Tùy chỉnh" hiện thêm 2 ô chọn ngày từ-đến.
 */
export default function DateRangeSelector({
  value,
  customFrom,
  customTo,
  onValueChange,
  onCustomChange,
}: DateRangeSelectorProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Select
          value={value}
          onValueChange={(v) => onValueChange(v as ReportRange)}
        >
          <SelectTrigger className="w-[168px]" aria-label="Khoảng thời gian báo cáo">
            <SelectValue placeholder="Chọn khoảng thời gian" />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            aria-label="Từ ngày"
            className="w-[150px]"
          />
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <Input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            aria-label="Đến ngày"
            className="w-[150px]"
          />
        </div>
      )}
    </div>
  );
}
