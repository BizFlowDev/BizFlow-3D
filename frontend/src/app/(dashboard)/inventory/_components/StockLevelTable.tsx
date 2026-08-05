"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Package, Boxes, ArrowDownToLine } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockLevelRow, StockStatus } from "@/hooks/useInventory";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  StockStatus,
  { label: string; className: string }
> = {
  in_stock: {
    label: "Còn hàng",
    className:
      "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  low_stock: {
    label: "Sắp hết",
    className:
      "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400",
  },
  out_of_stock: {
    label: "Hết hàng",
    className:
      "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400",
  },
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StockLevelTableProps {
  rows: StockLevelRow[];
  isLoading: boolean;
  /** Sản phẩm đang được chọn (từ 3D hoặc ?highlight) — highlight + scroll tới */
  selectedProductId: string | null;
  onImport: (row: StockLevelRow) => void;
  /** Click dòng → focus ô tương ứng trong 3D (đồng bộ 2 chiều) */
  onSelectRow: (row: StockLevelRow) => void;
  /** Chế độ thu gọn cho cột bên phải khi bật kệ 3D */
  compact?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StockLevelTable({
  rows,
  isLoading,
  selectedProductId,
  onImport,
  onSelectRow,
  compact = false,
}: StockLevelTableProps) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Tự cuộn tới dòng được chọn (từ click ô 3D hoặc ?highlight=)
  useEffect(() => {
    if (selectedProductId) {
      const el = rowRefs.current[selectedProductId];
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selectedProductId]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: compact ? 5 : 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Boxes className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">Không có sản phẩm trong kho</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="min-w-[200px]">Tên sản phẩm</TableHead>
            <TableHead className="min-w-[90px]">Đơn vị</TableHead>
            <TableHead className="min-w-[90px] text-right">Tồn kho</TableHead>
            {!compact && (
              <TableHead className="min-w-[150px]">Cập nhật lần cuối</TableHead>
            )}
            <TableHead className="min-w-[90px] text-center">Trạng thái</TableHead>
            {!compact && (
              <TableHead className="w-[80px] text-center">Thao tác</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const meta = STATUS_META[row.status];
            const isSelected = row.productId === selectedProductId;
            return (
              <motion.tr
                key={row.productId}
                ref={(el) => {
                  rowRefs.current[row.productId] = el;
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => onSelectRow(row)}
                data-product-id={row.productId}
                className={`group cursor-pointer border-b transition-colors ${
                  isSelected
                    ? "bg-blue-50/70 ring-1 ring-inset ring-blue-300 dark:bg-blue-950/30"
                    : "hover:bg-muted/40"
                }`}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {row.code}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.unitName}
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`inline-flex min-w-[56px] justify-end text-sm font-bold tabular-nums ${
                      row.status === "in_stock"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : row.status === "low_stock"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {row.currentStock}
                  </span>
                </TableCell>
                {!compact && (
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.lastUpdated)}
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <Badge variant="secondary" className={meta.className}>
                    {meta.label}
                  </Badge>
                </TableCell>
                {!compact && (
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImport(row);
                      }}
                      aria-label={`Nhập kho ${row.productName}`}
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Nhập kho
                    </Button>
                  </TableCell>
                )}
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}