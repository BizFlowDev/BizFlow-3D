"use client";

import { useState } from "react";
import {
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  User,
  Mail,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteEmployee } from "@/hooks/useEmployees";
import type { Employee } from "@/hooks/useEmployees";
import { useToast } from "@/components/ui/toast";

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
}: DeleteEmployeeDialogProps) {
  const deleteMutation = useDeleteEmployee();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!employee) return null;

  const handleDelete = async () => {
    try {
      setErrorMessage(null);
      await deleteMutation.mutateAsync(employee.id);
      showToast(
        "success",
        "Xóa nhân viên thành công",
        `Đã xóa nhân viên ${employee.fullName}. Hạn mức nhân sự đã được giải phóng.`
      );
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Có lỗi xảy ra khi xóa nhân viên. Vui lòng thử lại.";
      setErrorMessage(msg);
      showToast("error", "Không thể xóa nhân viên", msg);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!deleteMutation.isPending) {
          setErrorMessage(null);
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Xác nhận xóa nhân viên
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Thao tác xóa mềm (Soft Delete) bảo toàn toàn bộ dữ liệu nghiệp vụ
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Thông tin nhân viên */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2 text-sm mt-1">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <User className="h-4 w-4 text-blue-500" />
            <span>{employee.fullName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>{employee.email}</span>
          </div>
          {employee.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{employee.phone}</span>
            </div>
          )}
        </div>

        {/* Thông báo nghiệp vụ xóa mềm */}
        <div className="space-y-2 text-xs text-muted-foreground mt-1">
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span>
              Tài khoản này sẽ bị <strong>vô hiệu hóa</strong> và ẩn khỏi danh sách làm việc. Suất nhân viên trong gói dịch vụ sẽ được <strong>giải phóng ngay</strong> để thêm nhân viên khác.
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-800 dark:text-blue-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <span>
              <strong>Bảo toàn dữ liệu:</strong> Toàn bộ lịch sử đơn hàng POS, phiếu nhập kho và chứng từ kế toán do nhân viên này tạo vẫn được lưu giữ an toàn.
            </span>
          </div>
        </div>

        {/* Lỗi server nếu có */}
        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Xác nhận xóa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
