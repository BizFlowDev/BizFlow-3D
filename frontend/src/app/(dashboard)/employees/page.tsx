"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  UserPlus,
  RefreshCcw,
  Download,
  MoreHorizontal,
  Phone,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  History,
  Clock,
  X,
  UserCog,
  Mail,
  Crown,
  Trash2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEmployeeList,
  useToggleEmployeeStatus,
  useEmployeeAuditLog,
} from "@/hooks/useEmployees";
import type { Employee, EmployeeListParams } from "@/hooks/useEmployees";
import { EmployeeFormDialog } from "./_components/EmployeeFormDialog";
import { ResetPasswordDialog } from "./_components/ResetPasswordDialog";
import { DeleteEmployeeDialog } from "./_components/DeleteEmployeeDialog";
import { useCurrentStore, useStoreSubscriptionPlans } from "@/hooks/useStore";
import { UpgradePlanModal } from "@/components/shared/UpgradePlanModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "Chưa đăng nhập";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function getActionLabel(action: string): {
  label: string;
  color: string;
} {
  switch (action) {
    case "employee_created":
      return {
        label: "Tạo tài khoản",
        color:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      };
    case "status_deactivated":
      return {
        label: "Vô hiệu hóa",
        color:
          "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
      };
    case "status_activated":
      return {
        label: "Kích hoạt",
        color:
          "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
      };
    case "password_reset":
      return {
        label: "Đặt lại mật khẩu",
        color:
          "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      };
    case "employee_deleted":
      return {
        label: "Xóa nhân viên",
        color:
          "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
      };
    default:
      return {
        label: action,
        color:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      };
  }
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

export default function EmployeesPage() {
  // ── State ──
  const [params, setParams] = useState<EmployeeListParams>({
    search: "",
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmployee, setResetEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [auditEmployeeId, setAuditEmployeeId] = useState<string | null>(null);
  const [auditEmployeeName, setAuditEmployeeName] = useState<string>("");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const { data: store } = useCurrentStore();
  const { data: plans } = useStoreSubscriptionPlans();

  const currentPlan = plans?.find((p) => p.slug === store?.subscriptionPlan);
  const maxEmployees = currentPlan?.maxEmployees ?? 1;

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

  // ── Queries ──
  const { data, isLoading, refetch, isFetching } = useEmployeeList(params);
  const employees = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  const isLimitReached = total >= maxEmployees;
  const isExpired =
    store?.subscriptionStatus === "expired" ||
    Boolean(
      store?.subscriptionExpiresAt &&
        new Date(store.subscriptionExpiresAt) < new Date()
    );

  const toggleStatusMutation = useToggleEmployeeStatus();

  const { data: auditLogs, isLoading: auditLoading } =
    useEmployeeAuditLog(auditEmployeeId);

  // ── Handlers ──
  const handlePageChange = (newPage: number) => {
    setParams((p) => ({ ...p, page: newPage }));
  };

  const handleToggleStatus = (employee: Employee) => {
    toggleStatusMutation.mutate({
      employeeId: employee.id,
      activate: !employee.isActive,
    });
  };

  const handleResetPassword = (employee: Employee) => {
    setResetEmployee(employee);
    setResetDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setDeleteEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleViewAuditLog = (employee: Employee) => {
    if (auditEmployeeId === employee.id) {
      setAuditEmployeeId(null);
      setAuditEmployeeName("");
    } else {
      setAuditEmployeeId(employee.id);
      setAuditEmployeeName(employee.fullName);
    }
  };

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
            Nhân viên
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm">
              Quản lý tài khoản nhân viên cửa hàng.
            </p>
            <Badge
              variant="outline"
              onClick={() => setUpgradeModalOpen(true)}
              className={`cursor-pointer transition-all hover:scale-102 gap-1.5 py-0.5 px-2 text-xs font-medium ${
                isExpired
                  ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                  : isLimitReached
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-border/60 bg-muted/40"
              }`}
              title="Nhấp để nâng cấp gói dịch vụ"
            >
              <Crown className={`h-3 w-3 ${isLimitReached || isExpired ? "text-amber-500 animate-pulse" : "text-muted-foreground"}`} />
              <span>
                Hạn mức: <strong>{total}/{maxEmployees}</strong> ({currentPlan?.name || store?.subscriptionPlan || "Basic"})
              </span>
              {(isLimitReached || isExpired) && (
                <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                  {isExpired ? "Hết hạn" : "Đạt giới hạn"}
                </span>
              )}
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
          size="lg"
          id="add-employee-btn"
        >
          {/* Button shimmer */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 hover:translate-x-full" />
          <UserPlus className="h-4 w-4" />
          Thêm nhân viên
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
            id="employee-search"
            placeholder="Tìm theo tên hoặc email..."
            className="pl-9"
            value={searchInput}
            onChange={handleSearchChange}
            aria-label="Tìm kiếm nhân viên"
          />
        </div>

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
        ) : employees.length === 0 ? (
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
            <h3 className="text-lg font-semibold">Chưa có nhân viên</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Bắt đầu bằng cách thêm nhân viên đầu tiên để quản lý tài khoản
              đăng nhập.
            </p>
            <Button
              className="mt-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white"
              onClick={() => setFormOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Thêm nhân viên đầu tiên
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
                      Nhân viên
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[130px]">
                      Điện thoại
                    </TableHead>
                    <TableHead className="sticky top-0 text-center min-w-[100px]">
                      Vai trò
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[160px]">
                      Đăng nhập cuối
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
                  {employees.map((employee, index) => (
                    <motion.tr
                      key={employee.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`group border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted ${
                        auditEmployeeId === employee.id
                          ? "bg-blue-50/50 dark:bg-blue-950/20"
                          : ""
                      }`}
                    >
                      {/* Employee Name + Avatar + Email */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 transition-transform group-hover:scale-105">
                            <AvatarFallback
                              className={`text-xs font-bold text-white ${
                                employee.isActive
                                  ? "bg-gradient-to-br from-violet-500 to-indigo-500"
                                  : "bg-gradient-to-br from-gray-400 to-gray-500"
                              }`}
                            >
                              {getInitials(employee.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.fullName}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        {employee.phone ? (
                          <a
                            href={`tel:${employee.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-600 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {employee.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Role */}
                      <TableCell className="text-center">
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400">
                          Nhân viên
                        </Badge>
                      </TableCell>

                      {/* Last Login */}
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(employee.lastLoginAt)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant={employee.isActive ? "default" : "secondary"}
                          className={
                            employee.isActive
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {employee.isActive ? "Hoạt động" : "Vô hiệu"}
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
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(employee)}
                              disabled={toggleStatusMutation.isPending}
                            >
                              {employee.isActive ? (
                                <>
                                  <ShieldOff className="mr-2 h-4 w-4" />
                                  Vô hiệu hóa
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Kích hoạt
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(employee)}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Đặt lại mật khẩu
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleViewAuditLog(employee)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              {auditEmployeeId === employee.id
                                ? "Ẩn lịch sử"
                                : "Xem lịch sử"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteEmployee(employee)}
                              className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa nhân viên
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
                <span className="font-medium">{employees.length}</span> /{" "}
                <span className="font-medium">{total}</span> nhân viên
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

      {/* ── Audit Log Panel ── */}
      <AnimatePresence>
        {auditEmployeeId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm p-6">
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-950/40">
                    <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Lịch sử thay đổi</h3>
                    <p className="text-sm text-muted-foreground">
                      <UserCog className="mr-1 inline h-3.5 w-3.5" />
                      {auditEmployeeName}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAuditEmployeeId(null);
                    setAuditEmployeeName("");
                  }}
                  aria-label="Đóng lịch sử"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Audit Timeline */}
              {auditLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-3 w-3 rounded-full mt-1.5" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[300px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !auditLogs || auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Chưa có lịch sử thay đổi.
                </p>
              ) : (
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                  <div className="space-y-6">
                    {auditLogs.map((log, index) => {
                      const actionInfo = getActionLabel(log.action);
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08 }}
                          className="relative flex gap-4"
                        >
                          {/* Timeline dot */}
                          <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/40" />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${actionInfo.color}`}
                              >
                                {actionInfo.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm">{log.details}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Bởi:{" "}
                              <span className="font-medium text-foreground">
                                {log.performedByName}
                              </span>
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dialogs ── */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        currentEmployeeCount={total}
      />
      <ResetPasswordDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        employee={resetEmployee}
      />
      <DeleteEmployeeDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        employee={deleteEmployee}
      />
      <UpgradePlanModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </motion.div>
  );
}
