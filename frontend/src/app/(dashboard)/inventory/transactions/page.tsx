"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Search,
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  RefreshCcw,
  History,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTransactionHistory,
} from "@/hooks/useInventory";
import type {
  InventoryTransaction,
  TransactionType,
  TransactionTypeFilter,
} from "@/hooks/useInventory";

// ── Meta loại giao dịch ───────────────────────────────────────────────────────

const TYPE_META: Record<
  TransactionType,
  { label: string; badge: string; icon: typeof ArrowDownToLine }
> = {
  import: {
    label: "Nhập kho",
    badge:
      "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: ArrowDownToLine,
  },
  export: {
    label: "Xuất kho",
    badge:
      "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400",
    icon: ArrowUpFromLine,
  },
  adjustment: {
    label: "Điều chỉnh",
    badge:
      "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400",
    icon: SlidersHorizontal,
  },
};

function formatDate(iso: string): string {
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryTransactionsPage() {
  const [type, setType] = useState<TransactionTypeFilter>("all");
  const [productId, setProductId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const debouncedSearch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setSearch(value), 300);
    };
  }, []);

  // Fetch toàn bộ giao dịch 1 lần; lọc type/product/date/search phía client
  // để dropdown sản phẩm luôn khớp với dữ liệu thực (không bị lệch catalog).
  const { data: allTransactions = [], isLoading, refetch, isFetching } =
    useTransactionHistory();

  const transactions = useMemo(() => {
    let rows = allTransactions;
    if (type !== "all") rows = rows.filter((t) => t.type === type);
    if (productId !== "all") rows = rows.filter((t) => t.productId === productId);
    if (from) {
      const fromMs = new Date(from).getTime();
      rows = rows.filter((t) => new Date(t.createdAt).getTime() >= fromMs);
    }
    if (to) {
      const toMs = new Date(to).getTime() + 86_400_000; // bao gồm hết ngày
      rows = rows.filter((t) => new Date(t.createdAt).getTime() <= toMs);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.productName.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [allTransactions, type, productId, from, to, search]);

  // Danh sách sản phẩm cho dropdown filter — lấy từ chính dữ liệu giao dịch
  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of allTransactions) {
      if (t.productId && !map.has(t.productId)) {
        map.set(t.productId, t.productName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allTransactions]);

  // ── Thống kê nhanh ──
  const summary = useMemo(() => {
    const totals = { import: 0, export: 0, adjustment: 0 };
    let net = 0;
    for (const t of transactions) {
      totals[t.type] += Math.abs(t.quantity);
      net += t.type === "import" ? t.quantity : -t.quantity;
    }
    return {
      importQty: totals.import,
      exportQty: totals.export,
      adjustQty: totals.adjustment,
      net,
      count: transactions.length,
    };
  }, [transactions]);

  const StatChip = ({
    icon: Icon,
    label,
    value,
    className,
  }: {
    icon: typeof ArrowDownToLine;
    label: string;
    value: number;
    className: string;
  }) => (
    <div className="flex items-center gap-2.5 rounded-xl border bg-card/60 px-3 py-2">
      <div className={`rounded-lg p-1.5 text-white ${className}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
        <p className="text-sm font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="-ml-2">
              <Link href="/inventory" aria-label="Quay lại kho hàng">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Lịch sử nhập / xuất kho
              </h1>
              <p className="mt-1 text-muted-foreground">
                Theo dõi toàn bộ giao dịch tồn kho của cửa hàng.
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Tải lại"
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── Thống kê nhanh ── */}
      <div className="flex flex-wrap gap-3">
        <StatChip
          icon={ArrowDownToLine}
          label="Tổng nhập"
          value={summary.importQty}
          className="bg-emerald-500"
        />
        <StatChip
          icon={ArrowUpFromLine}
          label="Tổng xuất"
          value={summary.exportQty}
          className="bg-blue-500"
        />
        <StatChip
          icon={SlidersHorizontal}
          label="Điều chỉnh"
          value={summary.adjustQty}
          className="bg-amber-500"
        />
        <div className="flex items-center gap-2.5 rounded-xl border bg-card/60 px-3 py-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground tabular-nums">
              {summary.count}
            </span>{" "}
            giao dịch
          </p>
        </div>
      </div>

      {/* ── Bộ lọc ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSearch(e.target.value);
            }}
            placeholder="Tìm theo sản phẩm hoặc ghi chú..."
            className="pl-9"
            aria-label="Tìm kiếm giao dịch"
          />
        </div>

        <Select value={type} onValueChange={(v) => setType(v as TransactionTypeFilter)}>
          <SelectTrigger className="w-[150px]" id="tx-type-filter">
            <SelectValue placeholder="Loại giao dịch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="import">Nhập kho</SelectItem>
            <SelectItem value="export">Xuất kho</SelectItem>
            <SelectItem value="adjustment">Điều chỉnh</SelectItem>
          </SelectContent>
        </Select>

        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-[220px]" id="tx-product-filter">
            <SelectValue placeholder="Chọn sản phẩm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả sản phẩm</SelectItem>
            {productOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
            aria-label="Từ ngày"
          />
          <span className="text-xs text-muted-foreground">đến</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
            aria-label="Đến ngày"
          />
        </div>
      </div>

      {/* ── Bảng ── */}
      <div className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <History className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">Không có giao dịch</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="min-w-[130px]">Ngày</TableHead>
                  <TableHead className="min-w-[200px]">Sản phẩm</TableHead>
                  <TableHead className="min-w-[110px] text-center">Loại</TableHead>
                  <TableHead className="min-w-[90px] text-right">Số lượng</TableHead>
                  <TableHead className="min-w-[150px]">Tham chiếu</TableHead>
                  <TableHead className="min-w-[160px]">Ghi chú</TableHead>
                  <TableHead className="min-w-[120px]">Người thực hiện</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: InventoryTransaction) => {
                  const meta = TYPE_META[tx.type];
                  const TypeIcon = meta.icon;
                  return (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.unitName}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={meta.badge}>
                          <TypeIcon className="mr-1 h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-bold tabular-nums ${
                          tx.type === "import"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : tx.type === "export"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {tx.type === "adjustment" ? "" : tx.type === "import" ? "+" : "−"}
                        {tx.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.referenceId ? (
                          <span className="inline-flex rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {tx.referenceId}
                          </span>
                        ) : tx.referenceType === "purchase" ? (
                          <span className="text-xs">Lô nhập hàng</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                        {tx.note || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.createdBy || "—"}
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </motion.div>
  );
}