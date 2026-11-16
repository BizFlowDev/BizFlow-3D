import type { ExportSection } from "@/components/shared/ExportButton";
import type { ReportType, FinancialReportOutput, RevenueLedgerReport, DebtReport, BusinessResultReport, TrialBalanceReport } from "@/hooks/useAccounting";

export function buildExportSections(
  data: FinancialReportOutput | undefined,
  reportType: ReportType,
): ExportSection[] {
  if (!data) return [];

  switch (reportType) {
    case "revenue_ledger": {
      const d = data as RevenueLedgerReport;
      return [
        {
          title: "Sổ cái doanh thu chi tiết",
          columns: ["STT", "Ngày", "Số đơn hàng", "Doanh thu (VND)", "Ghi chú"],
          rows: [
            ...d.rows.map((r, i) => [
              i + 1,
              r.date,
              r.orderCount,
              r.totalRevenue,
              "",
            ]),
            ["", "TỔNG CỘNG", d.totalOrders, d.totalRevenue, ""],
          ],
        },
      ];
    }
    case "debt_report": {
      const d = data as DebtReport;
      return [
        {
          title: "Báo cáo nợ chưa thanh toán",
          columns: [
            "STT",
            "Khách hàng",
            "SĐT",
            "Nợ đầu kỳ",
            "Phát sinh",
            "Đã thu",
            "Nợ cuối kỳ",
            "Trạng thái",
          ],
          rows: [
            ...d.rows.map((r, i) => [
              i + 1,
              r.customerName,
              r.customerPhone ?? "",
              r.openingDebt,
              r.accrued,
              r.collected,
              r.closingDebt,
              r.balanceStatus === "receivable" ? "Còn nợ" : r.balanceStatus === "credit" ? "Dư âm — cần đối soát" : "Đã thanh toán",
            ]),
            [
              "",
              "TỔNG CỘNG",
              "",
              d.totalOpeningDebt,
              d.totalAccrued,
              d.totalCollected,
              d.totalClosingDebt,
              "",
            ],
            ["", "TỔNG CÒN PHẢI THU", "", "", "", "", d.totalReceivable, ""],
            ["", "TỔNG DƯ ÂM CẦN ĐỐI SOÁT", "", "", "", "", -d.totalCreditBalance, ""],
          ],
        },
      ];
    }
    case "business_result": {
      const d = data as BusinessResultReport;
      return [
        {
          title: "Báo cáo kết quả hoạt động kinh doanh",
          columns: ["STT", "Chỉ tiêu", "Mã số", "Số tiền (VND)", "Ghi chú"],
          rows: [
            [1, "Doanh thu bán hàng và cung cấp dịch vụ", "01", d.totalRevenue, ""],
            [2, "Giá vốn hàng bán", "11", d.costOfGoods, ""],
            [3, "Lợi nhuận gộp", "20", d.grossProfit, d.grossProfit >= 0 ? "Lãi" : "Lỗ"],
            [
              4,
              "Chi phí bán hàng",
              "24",
              (d.rows.find((r) => r.accountCode === "641")?.debit ?? 0) - (d.rows.find((r) => r.accountCode === "641")?.credit ?? 0),
              "",
            ],
            [
              5,
              "Chi phí quản lý doanh nghiệp",
              "25",
              (d.rows.find((r) => r.accountCode === "642")?.debit ?? 0) - (d.rows.find((r) => r.accountCode === "642")?.credit ?? 0),
              "",
            ],
            [6, "Tổng chi phí hoạt động", "30", d.operatingExpenses, ""],
            [
              7,
              "Lợi nhuận thuần từ HĐKD",
              "50",
              d.netProfit,
              d.netProfit >= 0 ? "Lãi" : "Lỗ",
            ],
          ],
        },
      ];
    }
    case "trial_balance": {
      const d = data as TrialBalanceReport;
      return [
        {
          title: "Bảng cân đối phát sinh",
          columns: [
            "STT",
            "Tài khoản",
            "Mã TK",
            "Loại",
            "Nợ đầu kỳ",
            "Có đầu kỳ",
            "Nợ phát sinh",
            "Có phát sinh",
            "Nợ cuối kỳ",
            "Có cuối kỳ",
          ],
          rows: [...d.rows.map((r, i) => [
            i + 1,
            r.accountName,
            r.accountCode,
            r.accountType,
            r.openingDebit,
            r.openingCredit,
            r.debit,
            r.credit,
            r.closingDebit,
            r.closingCredit,
          ]), ["", "TỔNG CỘNG", "", "", d.totals.openingDebit, d.totals.openingCredit, d.totals.debit, d.totals.credit, d.totals.closingDebit, d.totals.closingCredit],
          ["", "CHÊNH LỆCH NỢ − CÓ", "", "", d.differences.opening, "", d.differences.movement, "", d.differences.closing, ""]],
        },
      ];
    }
    default:
      return [];
  }
}

