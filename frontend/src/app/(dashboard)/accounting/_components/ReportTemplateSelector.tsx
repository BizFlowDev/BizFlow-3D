"use client";

import {
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Scale,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReportType } from "@/hooks/useAccounting";

// ── Report template options (báo cáo nội bộ) ────────────────────────

interface ReportTemplate {
  value: ReportType;
  label: string;
  description: string;
  icon: typeof BookOpen;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    value: "revenue_ledger",
    label: "Sổ cái doanh thu chi tiết",
    description: "Chi tiết doanh thu theo ngày",
    icon: BookOpen,
  },
  {
    value: "debt_report",
    label: "Báo cáo nợ chưa thanh toán",
    description: "Công nợ phải thu theo khách hàng",
    icon: AlertTriangle,
  },
  {
    value: "business_result",
    label: "Kết quả hoạt động kinh doanh",
    description: "Báo cáo lãi/lỗ theo kỳ",
    icon: TrendingUp,
  },
  {
    value: "trial_balance",
    label: "Bảng cân đối phát sinh",
    description: "Cân đối tài khoản đầu kỳ/cuối kỳ",
    icon: Scale,
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReportTemplateSelectorProps {
  value: ReportType;
  onValueChange: (value: ReportType) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportTemplateSelector({
  value,
  onValueChange,
}: ReportTemplateSelectorProps) {
  const selected = REPORT_TEMPLATES.find((t) => t.value === value);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Mẫu báo cáo
      </label>
      <Select
        value={value}
        onValueChange={(v) => onValueChange(v as ReportType)}
      >
        <SelectTrigger
          className="w-full max-w-full sm:w-[340px] h-auto min-h-[56px] px-3.5 py-2.5 text-left [&>span]:line-clamp-none hover:bg-muted/30 transition-colors"
          aria-label="Chọn mẫu báo cáo"
          id="report-template-selector"
        >
          <SelectValue placeholder="Chọn mẫu báo cáo" />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)] w-[360px] p-1.5">
          {REPORT_TEMPLATES.map((template) => (
            <SelectItem
              key={template.value}
              value={template.value}
              className="py-2.5 px-3 cursor-pointer rounded-lg my-0.5"
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <template.icon className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">{template.label}</span>
                </div>
                <span className="text-xs text-muted-foreground pl-[22px]">
                  {template.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { REPORT_TEMPLATES };
export type { ReportTemplate };
