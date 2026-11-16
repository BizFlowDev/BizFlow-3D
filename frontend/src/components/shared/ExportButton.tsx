"use client";

import { useRef, useState } from "react";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ExportSection {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

interface ExportButtonProps {
  title?: string;
  subtitle?: string;
  sections: ExportSection[];
  filename?: string;
  disabled?: boolean;
  warnings?: string[];
  orientation?: "portrait" | "landscape";
  /**
   * Chụp snapshot Canvas 3D hiện tại (dataURL PNG) nếu widget đang ở chế độ 3D
   * — ghép ảnh + bảng số liệu 2D vào file PDF.
   */
  getSnapshot?: () => string | null;
}

type BusyKind = "pdf" | "excel" | null;

/**
 * Nút xuất báo cáo (PDF / Excel).
 * - PDF: jsPDF + jspdf-autotable (bảng số liệu). Nếu có snapshot Canvas 3D
 *   (widget Revenue Overview đang ở chế độ 3D) → chụp bằng canvas.toDataURL()
 *   và ghép ảnh cùng bảng số liệu 2D vào PDF.
 * - Excel: xlsx (SheetJS). Nếu runtime không tải được xlsx → fallback CSV
 *   (UTF-8 BOM) mở đúng dấu tiếng Việt trong Excel.
 * Các thư viện nặng chỉ dynamic-import khi người dùng bấm nút (lazy-load).
 */
export default function ExportButton({
  title = "Báo cáo kinh doanh BizFlow 3D",
  subtitle,
  sections,
  filename = "bao-cao-kinh-doanh",
  getSnapshot,
  disabled = false,
  warnings = [],
  orientation = "portrait",
}: ExportButtonProps) {
  const [exportError, setExportError] = useState<string | null>(null);
  const reportSections = warnings.length ? [...sections, { title: "Lưu ý và đối soát", columns: ["Nội dung"], rows: warnings.map(w => [w]) }] : sections;
  const [busy, setBusy] = useState<BusyKind>(null);
  const busyRef = useRef<BusyKind>(null);
  busyRef.current = busy;

  const sanitizeFilename = () => filename.replace(/[^a-zA-Z0-9-_]/g, "-");

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const exportPDF = async () => {
    if (disabled || busyRef.current) return;
    setExportError(null);
    busyRef.current = "pdf";
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
      for (const [style, file] of [["normal", "Roboto-Regular.ttf"], ["bold", "Roboto-Bold.ttf"]] as const) {
        const response = await fetch(`/fonts/${file}`);
        if (!response.ok) throw new Error("Không tải được font tiếng Việt");
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        doc.addFileToVFS(file, btoa(binary));
        doc.addFont(file, "Roboto", style);
      }
      doc.setFont("Roboto", "normal");
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 20;

      // ── Tiêu đề ──
      doc.setFontSize(16);
      doc.setTextColor(20, 30, 60);
      doc.text(title, margin, y);
      y += 6.5;
      if (subtitle) {
        doc.setFontSize(10.5);
        doc.setTextColor(90, 100, 120);
        doc.text(subtitle, margin, y);
        y += 5.5;
      }
      doc.setFontSize(8.5);
      doc.setTextColor(140, 145, 155);
      doc.text(
        `Xuất lúc: ${new Date().toLocaleString("vi-VN")} · Nguồn: BizFlow 3D`,
        margin,
        y,
      );
      y += 8;

      // ── Snapshot Canvas 3D (khi đang ở chế độ 3D) ──
      const snapshot = getSnapshot?.();
      if (snapshot) {
        const aspect = await new Promise<number>((resolve) => {
          const img = new window.Image();
          img.onload = () =>
            resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1.8);
          img.onerror = () => resolve(1.8);
          img.src = snapshot;
        });
        const imgW = pageW - margin * 2;
        const imgH = imgW / aspect;
        doc.addImage(snapshot, "PNG", margin, y, imgW, imgH);
        y += imgH + 8;
        doc.setFontSize(11.5);
        doc.setTextColor(20, 30, 60);
        doc.text("Số liệu chi tiết:", margin, y);
        y += 6;
      }

      // ── Các bảng số liệu 2D ──
      let startY = y;
      for (const section of reportSections) {
        doc.setFontSize(11.5);
        doc.setTextColor(20, 30, 60);
        if (startY + 20 > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          startY = margin + 6;
        }
        const sectionTitleY = Math.max(startY, margin + 6);
        doc.text(section.title, margin, sectionTitleY);

        autoTable(doc, {
          startY: sectionTitleY + 5,
          head: [section.columns],
          body: section.rows,
          margin: { left: margin, right: margin },
          styles: { font: "Roboto", fontSize: 8.5, cellPadding: 2.4, textColor: [40, 45, 60] },
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontSize: 8.8,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [243, 246, 251] },
        });

        const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
          .lastAutoTable?.finalY;
        startY = (finalY ?? startY) + 10;
      }

      doc.save(`${sanitizeFilename()}.pdf`);
    } catch (error) {
      console.error("[ExportButton] Xuất PDF thất bại:", error);
      setExportError("Không thể xuất PDF. Vui lòng thử lại.");
    } finally {
      busyRef.current = null;
      setBusy(null);
    }
  };

  const exportExcel = async () => {
    if (disabled || busyRef.current) return;
    setExportError(null);
    busyRef.current = "excel";
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      for (const section of reportSections) {
        const rows = [section.columns, ...section.rows];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = section.columns.map((_, i) => ({
          wch: Math.max(
            12,
            ...rows.map((r) => String(r[i] ?? "").length + 2),
          ),
        }));
        const sheetName = section.title.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Báo cáo";
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      XLSX.writeFile(wb, `${sanitizeFilename()}.xlsx`);
    } catch (error) {
      console.warn("[ExportButton] Không tải được thư viện Excel, fallback CSV:", error);
      exportCSV();
    } finally {
      busyRef.current = null;
      setBusy(null);
    }
  };

  const csvCell = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const exportCSV = () => {
    const lines: string[] = [];
    for (const section of reportSections) {
      lines.push(csvCell(section.title));
      lines.push(section.columns.map(csvCell).join(","));
      for (const r of section.rows) lines.push(r.map(csvCell).join(","));
      lines.push("");
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, `${sanitizeFilename()}.csv`);
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || busy !== null}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {busy === "pdf"
            ? "Đang xuất PDF…"
            : busy === "excel"
              ? "Đang xuất Excel…"
              : "Xuất báo cáo"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Xuất PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Xuất Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {exportError && <span role="alert" className="text-xs text-red-600">{exportError}</span>}
    </>
  );
}
