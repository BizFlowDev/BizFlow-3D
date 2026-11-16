"use client";

import AccountingReconciliation from "./AccountingReconciliation";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Warning = { code: string; severity: "warning" | "error"; message: string; count: number };

const guidance: Record<string, string[]> = {
  ORPHAN_POSTING: ["Bút toán vẫn còn nhưng không tìm thấy giao dịch gốc tương ứng.", "Cần chứng từ để khôi phục liên kết hoặc lập điều chỉnh đúng căn cứ. Công cụ không tự xóa bút toán này."],
  LEGACY_UNVERIFIED: [
    "Đối chiếu các đơn bán hàng, phiếu nhập kho và khoản thu nợ cũ với chứng từ gốc.",
    "Kiểm tra giá nhập và đơn vị quy đổi của hàng đã bán. Không lấy giá bán thay giá vốn còn thiếu.",
    "Bấm Đối soát dữ liệu cũ để kiểm tra khớp giữa giao dịch và sổ cái. Phần thiếu căn cứ giá vốn vẫn được giữ cảnh báo.",
  ],
  MISSING_POSTING: [
    "Xác định giao dịch thiếu bút toán trong kết quả đối soát, rồi kiểm tra đơn hàng, phiếu nhập hoặc khoản thu tương ứng.",
    "Nhờ người phụ trách kế toán bổ sung bút toán từ chứng từ gốc, bảo đảm tổng Nợ bằng tổng Có.",
    "Dùng Đối soát dữ liệu cũ để bổ sung phần ghi sổ có đủ căn cứ. Không tạo lại đơn, nhập kho hoặc thu nợ lần nữa vì có thể làm trùng giao dịch.",
  ],
  DEBT_MISMATCH: [
    "Mở báo cáo Công nợ: kiểm tra nợ đầu kỳ + phát sinh − đã thu = nợ cuối kỳ theo từng khách hàng.",
    "Đối chiếu đơn ghi nợ và khoản thu với tài khoản 131 trong bảng Cân đối phát sinh, cùng kỳ báo cáo.",
    "Công cụ đối soát có thể đồng bộ số dư đã lưu từ đơn và khoản thu. Dư âm vẫn cần kiểm tra chứng từ; công cụ không sửa số tiền giao dịch gốc.",
  ],
  MISSING_COST: [
    "Kiểm tra chứng từ nhập hàng và giá vốn của các sản phẩm liên quan đến đơn bán.",
    "Giá vốn thiếu làm lợi nhuận chưa đầy đủ. Nhập hàng mới không tự sửa giá vốn đã ghi nhận cho đơn cũ; cần đối soát riêng.",
  ],
  ESTIMATED_COST: [
    "Giá vốn đang tính theo bình quân lịch sử nhập, nên lợi nhuận được trình bày là ước tính.",
    "Đây là thông tin về mức độ xác minh giá vốn, không phải lỗi có thể xóa bằng nút xác nhận.",
  ],
};

export default function AccountingWarnings({ warnings, onViewDebt, onViewBalance }: {
  warnings: Warning[];
  onViewDebt: () => void;
  onViewBalance: () => void;
}) {
  if (!warnings.length) return null;

  return (
    <div className="space-y-2">
    <details className="group rounded-xl border border-amber-400/40 bg-amber-500/5">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 [&::-webkit-details-marker]:hidden">
        <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">Cảnh báo dữ liệu</span>
          <span className="ml-2 text-xs text-muted-foreground">{warnings.length} loại cảnh báo</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Xem chi tiết và hướng dẫn xử lý</span>
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-amber-400/20 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">Số lượng của các loại có thể trùng giao dịch. Thu gọn mục này chỉ thay đổi hiển thị; cảnh báo vẫn được giữ trong file xuất báo cáo.</p>
        <ul className="space-y-4">
          {warnings.map(w => (
            <li key={w.code} className="space-y-2 rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="flex items-start gap-2 text-sm font-medium">
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${w.severity === "error" ? "bg-red-500" : "bg-amber-500"}`} />
                <span className="min-w-0 flex-1">{w.message}</span>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums">{w.count}</span>
              </p>
              <ol className="ml-5 list-decimal space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                {(guidance[w.code] ?? ["Xuất báo cáo, đối chiếu chứng từ gốc và các dòng Nợ/Có trong kết quả đối soát.", "Nhờ người phụ trách kế toán kiểm tra phần chênh lệch trước khi điều chỉnh dữ liệu cũ."]).map(step => <li key={step}>{step}</li>)}
              </ol>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onViewDebt}>Xem công nợ</Button>
          <Button type="button" variant="outline" size="sm" onClick={onViewBalance}>Xem cân đối phát sinh</Button>
        </div>
        <p className="text-xs text-muted-foreground">Sau khi dữ liệu được xử lý, bấm nút Tải lại cạnh Xuất báo cáo để kiểm tra lại cảnh báo.</p>
      </div>
    </details>
    <AccountingReconciliation />
    </div>
  );
}
