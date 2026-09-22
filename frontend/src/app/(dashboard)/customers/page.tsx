"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import * as XLSX from "xlsx";
import {
  Search,
  UserPlus,
  RefreshCcw,
  Download,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Phone,
  ChevronLeft,
  ChevronRight,
  Users,
  Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerList, useDeleteCustomer } from "@/hooks/useCustomers";
import type { Customer, CustomerListParams } from "@/hooks/useCustomers";
import { CustomerFormDialog } from "./_components/CustomerFormDialog";
import { DebtPaymentDialog } from "./_components/DebtPaymentDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
} as const;

// ── Page Component ────────────────────────────────────────────────────────────

export default function CustomersPage() {
  // ── State ──
  const [params, setParams] = useState<CustomerListParams>({
    search: "",
    filter: "all",
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const deleteMutation = useDeleteCustomer();

  // Debounced search
  const debouncedSearch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setParams((p) => ({ ...p, search: value, page: 1 }));
      }, 300);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // ── Query ──
  const { data, isLoading, refetch, isFetching } = useCustomerList(params);
  const customers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  // ── Handlers ──
  const handleFilterChange = (value: string) => {
    setParams((p) => ({
      ...p,
      filter: value as CustomerListParams["filter"],
      page: 1,
    }));
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handlePayment = (customer: Customer) => {
    setPaymentCustomer(customer);
    setPaymentDialogOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setDeleteCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteCustomer) return;
    try {
      await deleteMutation.mutateAsync(deleteCustomer.id);
      setDeleteDialogOpen(false);
      setDeleteCustomer(null);
    } catch {
      // handled by mutation
    }
  };

  const handlePageChange = (newPage: number) => {
    setParams((p) => ({ ...p, page: newPage }));
  };

  const handleExport = useCallback(() => {
    if (!customers.length) return;

    const exportData = customers.map((c, i) => ({
      "STT": i + 1,
      "Mã khách hàng": c.code || c.id,
      "Tên khách hàng": c.name,
      "Điện thoại": c.phone || "",
      "Email": c.email || "",
      "Địa chỉ": c.address || "",
      "Tổng đơn hàng": c.totalPurchases,
      "Công nợ": c.debtBalance,
      "Hạn mức nợ": c.creditLimit ? c.creditLimit : "Không giới hạn",
      "Tình trạng nợ": c.isOverdue
        ? `Quá hạn ${c.overdueDays} ngày`
        : c.debtBalance > 0
        ? "Trong hạn"
        : "Không nợ",
      "Mua gần nhất": c.lastPurchaseDate
        ? new Date(c.lastPurchaseDate).toLocaleDateString("vi-VN")
        : "",
      "Trạng thái": c.isActive ? "Hoạt động" : "Ngừng",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Khách hàng");

    // Set column widths
    ws["!cols"] = [
      { wch: 5 },
      { wch: 38 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 35 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Danh-sach-khach-hang_${dateStr}.xlsx`);
  }, [customers]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Khách hàng
          </h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý hồ sơ khách hàng và công nợ.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setFormOpen(true);
          }}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
          id="add-customer-btn"
        >
          {/* Button shimmer */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 hover:translate-x-full" />
          <UserPlus className="h-4 w-4" />
          Thêm khách hàng
        </Button>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="customer-search"
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="pl-9"
            value={searchInput}
            onChange={handleSearchChange}
            aria-label="Tìm kiếm khách hàng"
          />
        </div>

        {/* Filter */}
        <Select
          value={params.filter}
          onValueChange={handleFilterChange}
        >
          <SelectTrigger className="w-[180px]" id="customer-filter">
            <SelectValue placeholder="Lọc khách hàng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="has_debt">Có nợ</SelectItem>
            <SelectItem value="overdue">Nợ quá hạn</SelectItem>
            <SelectItem value="no_debt">Không nợ</SelectItem>
          </SelectContent>
        </Select>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Tải lại"
            id="refresh-btn"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            disabled={!customers.length}
            aria-label="Xuất Excel"
            id="export-btn"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        {isLoading ? (
          /* Loading Skeleton */
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[140px]" />
                </div>
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-6 w-[100px]" />
                <Skeleton className="h-4 w-[90px]" />
                <Skeleton className="h-6 w-[60px]" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="rounded-full bg-muted p-6 mb-6"
            >
              <Users className="h-12 w-12 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold">Chưa có khách hàng</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Bắt đầu bằng cách thêm khách hàng đầu tiên để quản lý thông tin
              và công nợ.
            </p>
            <Button
              className="mt-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white"
              onClick={() => {
                setEditingCustomer(null);
                setFormOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Thêm khách hàng đầu tiên
            </Button>
          </div>
        ) : (
          /* Data Table */
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="sticky top-0 w-[280px] min-w-[220px]">
                      Khách hàng
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[130px]">
                      Điện thoại
                    </TableHead>
                    <TableHead className="sticky top-0 text-center min-w-[100px]">
                      Đơn hàng
                    </TableHead>
                    <TableHead className="sticky top-0 text-right min-w-[150px]">
                      Công nợ
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[130px]">
                      Mua gần nhất
                    </TableHead>
                    <TableHead className="sticky top-0 text-center min-w-[100px]">
                      Trạng thái
                    </TableHead>
                    <TableHead className="sticky top-0 text-center w-[80px]">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="group border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted"
                    >
                      {/* Customer Name + Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 transition-transform group-hover:scale-105">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
                              {getInitials(customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/customers/${customer.id}`}
                              className="font-medium hover:text-blue-600 hover:underline transition-colors"
                            >
                              {customer.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {customer.code}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-600 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {customer.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Total Purchases */}
                      <TableCell className="text-center">
                        <span className="font-medium">
                          {customer.totalPurchases}
                        </span>
                      </TableCell>

                      {/* Current Debt & Credit Limit */}
                      <TableCell className="text-right">
                        {customer.debtBalance > 0 ? (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => handlePayment(customer)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition-all hover:shadow-sm ${
                                customer.isOverdue
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-300"
                                  : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                              }`}
                              title="Nhấn để ghi nhận thanh toán nợ"
                            >
                              {customer.isOverdue ? (
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                              ) : (
                                <Banknote className="h-3.5 w-3.5" />
                              )}
                              {formatCurrency(customer.debtBalance)}
                            </button>

                            {/* Overdue tag */}
                            {customer.isOverdue && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                                Quá hạn {customer.overdueDays} ngày
                              </span>
                            )}

                            {/* Credit limit progress */}
                            {customer.creditLimit > 0 && (
                              <div className="w-28 text-[11px] text-muted-foreground flex flex-col items-end pt-0.5">
                                <div className="flex justify-between w-full text-[10px]">
                                  <span>H.mức:</span>
                                  <span>{formatCurrency(customer.creditLimit)}</span>
                                </div>
                                <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      customer.debtBalance > customer.creditLimit
                                        ? "bg-red-500"
                                        : customer.debtBalance / customer.creditLimit > 0.8
                                        ? "bg-amber-500"
                                        : "bg-blue-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.round(
                                          (customer.debtBalance / customer.creditLimit) * 100
                                        )
                                      )}%`,
                                    }}
                                  />
                                </div>
                                {customer.debtBalance > customer.creditLimit && (
                                  <span className="text-[10px] text-red-500 font-semibold mt-0.5">
                                    Vượt hạn mức
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đã thanh toán
                          </span>
                        )}
                      </TableCell>

                      {/* Last Purchase Date */}
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(customer.lastPurchaseDate)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            customer.isActive ? "default" : "secondary"
                          }
                          className={
                            customer.isActive
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {customer.isActive ? "Hoạt động" : "Ngừng"}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Thao tác"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link href={`/customers/${customer.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Xem chi tiết
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(customer)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            {customer.debtBalance > 0 && (
                              <DropdownMenuItem
                                onClick={() => handlePayment(customer)}
                              >
                                <Banknote className="mr-2 h-4 w-4" />
                                Thanh toán nợ
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(customer)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Hiển thị{" "}
                <span className="font-medium">{customers.length}</span> /{" "}
                <span className="font-medium">{total}</span> khách hàng
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </Button>
                <span className="px-3 text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* ── Dialogs ── */}
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editingCustomer}
      />
      <DebtPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customer={paymentCustomer}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xóa khách hàng"
        description={`Bạn có chắc chắn muốn xóa khách hàng "${deleteCustomer?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
}


