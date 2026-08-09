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

// ── Report template options (Thông tư 88/2021/TT-BTC) ────────────────────────

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
    description: "Mẫu S01-HKD: Chi tiết doanh thu theo ngày",
    icon: BookOpen,
  },
  {
    value: "debt_report",
    label: "Báo cáo nợ chưa thanh toán",
    description: "Mẫu S02-HKD: Công nợ phải thu theo khách hàng",
    icon: AlertTriangle,
  },
  {
    value: "business_result",
    label: "Kết quả hoạt động kinh doanh",
    description: "Mẫu B02-HKD: Báo cáo lãi/lỗ theo kỳ",
    icon: TrendingUp,
  },
  {
    value: "trial_balance",
    label: "Bảng cân đối phát sinh",
    description: "Mẫu F01-HKD: Cân đối tài khoản đầu kỳ/cuối kỳ",
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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        Mẫu báo cáo (Thông tư 88)
      </label>
      <Select
        value={value}
        onValueChange={(v) => onValueChange(v as ReportType)}
      >
        <SelectTrigger
          className="w-[320px]"
          aria-label="Chọn mẫu báo cáo"
          id="report-template-selector"
        >
          <SelectValue placeholder="Chọn mẫu báo cáo" />
        </SelectTrigger>
        <SelectContent className="w-[360px]">
          {REPORT_TEMPLATES.map((template) => (
            <SelectItem
              key={template.value}
              value={template.value}
              className="py-3"
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
