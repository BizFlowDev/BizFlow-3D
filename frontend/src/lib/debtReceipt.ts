"use client";

export interface DebtReceiptData {
  receiptCode?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  previousDebt: number;
  paidAmount: number;
  remainingDebt: number;
  paymentMethod: "cash" | "transfer";
  note?: string | null;
  operator?: string | null;
  createdAt?: string | Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(dateStr?: string | Date | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Chuyển số tiền thành chữ tiếng Việt */
export function numberToVietnameseWords(n: number): string {
  if (n === 0) return "Không đồng";
  if (n < 0) return "Âm " + numberToVietnameseWords(Math.abs(n));

  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

  function readThreeDigits(num: number, isLast: boolean): string {
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;
    let res = "";

    if (h > 0 || !isLast) {
      res += digits[h] + " trăm ";
    }

    if (t > 1) {
      res += digits[t] + " mươi ";
      if (o === 1) res += "mốt ";
      else if (o === 5) res += "lăm ";
      else if (o > 0) res += digits[o] + " ";
    } else if (t === 1) {
      res += "mười ";
      if (o === 5) res += "lăm ";
      else if (o > 0) res += digits[o] + " ";
    } else {
      if ((h > 0 || !isLast) && o > 0) {
        res += "lẻ " + digits[o] + " ";
      } else if (o > 0) {
        res += digits[o] + " ";
      }
    }
    return res.trim();
  }

  const str = Math.round(n).toString();
  const groups: number[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    groups.unshift(parseInt(str.substring(Math.max(0, i - 3), i), 10));
  }

  let words = "";
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g > 0) {
      const gWords = readThreeDigits(g, i === 0);
      const unit = units[groups.length - 1 - i];
      words += gWords + (unit ? " " + unit : "") + " ";
    }
  }

  words = words.trim();
  // Viết hoa chữ cái đầu và thêm "đồng chẵn"
  return words.charAt(0).toUpperCase() + words.slice(1) + " đồng chẵn.";
}

/** Convert ArrayBuffer to base64 string */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Load font file from public/ and return base64 string */
async function loadFontBase64(path: string): Promise<string> {
  const res = await fetch(path);
  const buffer = await res.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

// ── 1. Xuất PDF Khổ A5/A4 ─────────────────────────────────────────────────────

export async function printDebtReceiptPDF(data: DebtReceiptData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  // Format A5 portrait: 148mm x 210mm
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

  try {
    const [regularBase64, boldBase64] = await Promise.all([
      loadFontBase64("/fonts/Roboto-Regular.ttf"),
      loadFontBase64("/fonts/Roboto-Bold.ttf"),
    ]);
    doc.addFileToVFS("Roboto-Regular.ttf", regularBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.setFont("Roboto");
  } catch {
    // fallback to standard fonts if custom font fails
  }

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 14;

  const receiptCode =
    data.receiptCode ||
    `PT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

  // Header Cửa hàng
  doc.setFontSize(13);
  doc.setFont("Roboto", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(data.storeName || "BizFlow 3D Store", margin, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFont("Roboto", "normal");
  doc.setTextColor(100, 116, 139);
  if (data.storeAddress) {
    doc.text(`Địa chỉ: ${data.storeAddress}`, margin, y);
    y += 4;
  }
  if (data.storePhone) {
    doc.text(`Điện thoại: ${data.storePhone}`, margin, y);
    y += 4;
  }

  y += 3;
  // Tiêu đề Phiếu thu
  doc.setFontSize(15);
  doc.setFont("Roboto", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("PHIẾU THU TIỀN CÔNG NỢ", pageW / 2, y, { align: "center" });
  y += 4.5;

  doc.setFontSize(8);
  doc.setFont("Roboto", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Mã phiếu: ${receiptCode}   ·   Ngày thu: ${formatDateTime(data.createdAt)}`,
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 6;

  // Bảng thông tin khách hàng & lý do
  const paymentMethodLabel =
    data.paymentMethod === "transfer" ? "Chuyển khoản (VietQR / Ngân hàng)" : "Tiền mặt";

  autoTable(doc, {
    startY: y,
    theme: "plain",
    body: [
      ["Người nộp tiền:", data.customerName],
      ["Số điện thoại:", data.customerPhone || "—"],
      ["Địa chỉ:", data.customerAddress || "—"],
      ["Hình thức thu:", paymentMethodLabel],
      ["Lý do nộp:", data.note || "Thanh toán công nợ mua hàng"],
    ],
    margin: { left: margin, right: margin },
    styles: { font: "Roboto", fontSize: 8.5, cellPadding: 1.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
    },
  });

  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y + 25;
  y += 4;

  // Bảng số liệu tiền nợ & thanh toán
  autoTable(doc, {
    startY: y,
    head: [["Khoản mục", "Số tiền (VNĐ)"]],
    body: [
      ["1. Số nợ trước thanh toán", formatCurrency(data.previousDebt)],
      ["2. Số tiền thanh toán kỳ này", formatCurrency(data.paidAmount)],
      ["3. Số nợ còn lại sau thanh toán", formatCurrency(data.remainingDebt)],
    ],
    margin: { left: margin, right: margin },
    styles: { font: "Roboto", fontSize: 9, cellPadding: 2.2, textColor: [30, 41, 59] },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: "normal" },
      1: { halign: "right", fontStyle: "bold" },
    },
  });

  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y + 30;
  y += 4;

  // Viết bằng chữ
  doc.setFontSize(8.5);
  doc.setFont("Roboto", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Viết bằng chữ: ${numberToVietnameseWords(data.paidAmount)}`,
    margin,
    y
  );
  y += 10;

  // Chữ ký các bên
  const colWidth = (pageW - margin * 2) / 3;
  const sigY = y;

  doc.setFontSize(8.5);
  doc.setFont("Roboto", "bold");
  doc.setTextColor(30, 41, 59);

  // Cột 1: Người nộp tiền
  doc.text("Người nộp tiền", margin + colWidth * 0.5, sigY, { align: "center" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("(Ký, ghi rõ họ tên)", margin + colWidth * 0.5, sigY + 4, { align: "center" });

  // Cột 2: Người lập phiếu
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Người lập phiếu", margin + colWidth * 1.5, sigY, { align: "center" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("(Ký, ghi rõ họ tên)", margin + colWidth * 1.5, sigY + 4, { align: "center" });

  // Cột 3: Thủ quỹ / Đại diện
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Thủ quỹ / Cửa hàng", margin + colWidth * 2.5, sigY, { align: "center" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("(Ký, đóng dấu)", margin + colWidth * 2.5, sigY + 4, { align: "center" });

  // Tên người ký ở chân (nếu có)
  if (data.operator) {
    doc.setFontSize(8);
    doc.setFont("Roboto", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(data.operator, margin + colWidth * 1.5, sigY + 24, { align: "center" });
  }

  // Tên khách hàng ở cột người nộp
  doc.setFontSize(8);
  doc.setFont("Roboto", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text(data.customerName, margin + colWidth * 0.5, sigY + 24, { align: "center" });

  // Mở print dialog
  doc.autoPrint();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    doc.save(`phieu-thu-${receiptCode}.pdf`);
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── 2. In Nhiệt K80 (80mm Thermal Receipt) ────────────────────────────────────

export function printDebtReceiptThermal(data: DebtReceiptData): void {
  const receiptCode =
    data.receiptCode ||
    `PT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

  const paymentMethodLabel =
    data.paymentMethod === "transfer" ? "Chuyển khoản (VietQR)" : "Tiền mặt";

  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Phiếu thu nợ - ${receiptCode}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, -apple-system;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            font-size: 12px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .store-name { font-size: 15px; font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; margin: 8px 0 2px 0; }
          .receipt-code { font-size: 10px; color: #444; }
          .info-table, .money-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          .info-table td { padding: 2px 0; vertical-align: top; }
          .info-table td.label { width: 35%; color: #444; font-size: 11px; }
          .money-table { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; }
          .money-table td { padding: 3px 0; }
          .paid-amount { font-size: 14px; font-weight: bold; }
          .words { font-style: italic; font-size: 10.5px; margin: 6px 0; }
          .signatures { display: flex; justify-content: space-between; margin-top: 14px; text-align: center; }
          .sig-box { width: 48%; }
          .sig-title { font-weight: bold; font-size: 11px; }
          .sig-hint { font-size: 9px; color: #555; }
          .sig-space { height: 35px; }
          .footer { text-align: center; font-size: 10px; margin-top: 14px; border-top: 1px dashed #ccc; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div class="store-name">${data.storeName || "BizFlow 3D"}</div>
          ${data.storeAddress ? `<div>${data.storeAddress}</div>` : ""}
          ${data.storePhone ? `<div>Hotline: ${data.storePhone}</div>` : ""}
          <div class="title">PHIẾU THU CÔNG NỢ</div>
          <div class="receipt-code">Số: ${receiptCode} · ${formatDateTime(data.createdAt)}</div>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">Khách hàng:</td>
            <td class="bold">${data.customerName}</td>
          </tr>
          ${data.customerPhone ? `<tr><td class="label">Điện thoại:</td><td>${data.customerPhone}</td></tr>` : ""}
          <tr>
            <td class="label">Hình thức:</td>
            <td>${paymentMethodLabel}</td>
          </tr>
          ${data.note ? `<tr><td class="label">Ghi chú:</td><td>${data.note}</td></tr>` : ""}
        </table>

        <table class="money-table">
          <tr>
            <td>Nợ trước thanh toán:</td>
            <td class="text-right">${formatCurrency(data.previousDebt)}</td>
          </tr>
          <tr>
            <td class="bold">Số tiền thanh toán:</td>
            <td class="text-right paid-amount">${formatCurrency(data.paidAmount)}</td>
          </tr>
          <tr>
            <td>Nợ còn lại:</td>
            <td class="text-right bold">${formatCurrency(data.remainingDebt)}</td>
          </tr>
        </table>

        <div class="words">Bằng chữ: ${numberToVietnameseWords(data.paidAmount)}</div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Người nộp</div>
            <div class="sig-hint">(Ký tên)</div>
            <div class="sig-space"></div>
            <div class="bold" style="font-size: 10px;">${data.customerName}</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Người thu tiền</div>
            <div class="sig-hint">(Ký tên)</div>
            <div class="sig-space"></div>
            <div class="bold" style="font-size: 10px;">${data.operator || "Thu ngân"}</div>
          </div>
        </div>

        <div class="footer">
          Cảm ơn quý khách đã tin tưởng và hợp tác!
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
