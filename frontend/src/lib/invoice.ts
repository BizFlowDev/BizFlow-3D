"use client";

import type { Order } from "@/hooks/useOrders";
import { getOrderCode } from "@/hooks/useOrders";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
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

/**
 * Tạo hóa đơn PDF từ đơn hàng và mở print dialog.
 * Nếu trình duyệt chặn popup → fallback tải file PDF.
 */
export async function printInvoice(order: Order): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Load Vietnamese Unicode font (Roboto) ──
  const [regularBase64, boldBase64] = await Promise.all([
    loadFontBase64("/fonts/Roboto-Regular.ttf"),
    loadFontBase64("/fonts/Roboto-Bold.ttf"),
  ]);
  doc.addFileToVFS("Roboto-Regular.ttf", regularBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto");

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 24;

  // ── Tiêu đề ──
  doc.setFontSize(17);
  doc.setTextColor(20, 30, 60);
  doc.text("BizFlow 3D", margin, y);
  y += 5.5;
  doc.setFontSize(11);
  doc.setTextColor(90, 100, 120);
  doc.text("HÓA ĐƠN BÁN HÀNG", margin, y);
  y += 3.5;
  doc.setFontSize(8.5);
  doc.setTextColor(150, 155, 165);
  doc.text(
    `In lúc: ${new Date().toLocaleString("vi-VN")} · Hệ thống bán hàng`,
    margin,
    y,
  );
  y += 8;

  // ── Thông tin đơn ──
  const paymentMethodText =
    order.paymentMethod === "qr_code"
      ? "Chuyển khoản VietQR"
      : order.paymentMethod === "debt"
      ? "Ghi nợ"
      : "Tiền mặt";

  autoTable(doc, {
    startY: y,
    theme: "plain",
    body: [
      ["Mã đơn", getOrderCode(order)],
      ["Ngày tạo", formatDateTime(order.createdAt)],
      ["Khách hàng", order.customerName || "Khách lẻ"],
      ["Loại đơn", order.orderType === "counter" ? "Bán tại quầy" : "Khác"],
      ["Hình thức TT", paymentMethodText],
      ["Ghi chú", order.note || "—"],
    ],
    margin: { left: margin, right: margin },
    styles: { font: "Roboto", fontSize: 9, cellPadding: 1.6, textColor: [60, 70, 90] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [120, 130, 150], cellWidth: 40 },
    },
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y;
  y += 6;

  // ── Chi tiết sản phẩm ──
  autoTable(doc, {
    startY: y,
    head: [["Sản phẩm", "ĐVT", "SL", "Đơn giá", "Thành tiền"]],
    body: (order.items ?? []).map((it) => [
      it.productName ?? "Sản phẩm",
      it.unitName ?? "—",
      String(it.quantity),
      formatCurrency(it.unitPrice),
      formatCurrency(it.totalPrice),
    ]),
    margin: { left: margin, right: margin },
    styles: { font: "Roboto", fontSize: 9, cellPadding: 2.5, textColor: [40, 45, 60] },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [243, 246, 251] },
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y;
  y += 5;

  // ── Tổng tiền & Thanh toán ──
  const summaryBody: string[][] = [
    ["Tạm tính", `${formatCurrency(order.totalAmount)} đ`],
  ];

  if (order.discountAmount > 0) {
    summaryBody.push(["Giảm giá", `−${formatCurrency(order.discountAmount)} đ`]);
  }

  summaryBody.push(["Tổng cộng", `${formatCurrency(order.finalAmount)} đ`]);
  summaryBody.push(["Hình thức TT", paymentMethodText]);

  if (order.paymentMethod === "cash" && (order.paidAmount !== undefined || order.changeAmount !== undefined)) {
    const cashGiven = (order.paidAmount || 0) + (order.changeAmount || 0);
    if (cashGiven > 0) {
      summaryBody.push(["Tiền khách đưa", `${formatCurrency(cashGiven)} đ`]);
      summaryBody.push(["Tiền thối lại", `${formatCurrency(order.changeAmount || 0)} đ`]);
    }
  } else if (order.paymentMethod === "qr_code") {
    summaryBody.push(["Đã thanh toán (QR)", `${formatCurrency(order.finalAmount)} đ`]);
  }

  if (order.debtAmount > 0) {
    summaryBody.push(["Còn nợ", `${formatCurrency(order.debtAmount)} đ`]);
  }

  autoTable(doc, {
    startY: y,
    theme: "plain",
    body: summaryBody,
    margin: { left: margin, right: pageW - margin - 75 },
    styles: { font: "Roboto", fontSize: 9.5, cellPadding: 1.8, textColor: [40, 45, 60] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [90, 100, 120] },
      1: { halign: "right", fontStyle: "bold" },
    },
  });

  // ── Footer ──
  const footerY = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? y;
  doc.setFontSize(8);
  doc.setTextColor(150, 155, 165);
  doc.text(
    "Cảm ơn quý khách đã mua hàng tại BizFlow 3D!",
    margin,
    footerY + 12,
  );

  // ── Mở print dialog (autoPrint) ──
  doc.autoPrint();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    doc.save(`hoa-don-${getOrderCode(order)}.pdf`);
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
