"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  AlertTriangle,
  Loader2,
  Store as StoreIcon,
  Users,
} from "lucide-react";
import { useDeleteSubscriptionPlan } from "@/hooks/useAdmin";
import type { SubscriptionPlan } from "@/hooks/useAdmin";

interface DeletePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DeletePlanDialog({
  open,
  onOpenChange,
  plan,
}: DeletePlanDialogProps) {
  const { mutate: deletePlan, isPending } = useDeleteSubscriptionPlan();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!plan) return null;

  const totalStores = plan.storeCount ?? 0;
  const canDelete = totalStores === 0;

  const handleDelete = () => {
    if (!canDelete || isPending) return;
    setErrorMsg(null);
    deletePlan(plan.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
      onError: (err: any) => {
        setErrorMsg(
          err?.response?.data?.message || err?.message || "Không thể xoá gói đăng ký"
        );
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-2.5 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Xác nhận xoá gói đăng ký</DialogTitle>
              <DialogDescription className="text-xs">
                Thao tác này sẽ xoá gói khỏi hệ thống cấu hình
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Thông tin gói */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-base">{plan.name}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {plan.slug}
              </Badge>
            </div>

            <div className="text-sm font-bold text-foreground">
              {formatCurrency(plan.price)}
              <span className="text-xs font-normal text-muted-foreground">/tháng</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>Tối đa {plan.maxEmployees} nhân viên</span>
              </div>
              <div className="flex items-center gap-1.5">
                <StoreIcon className="h-3.5 w-3.5" />
                <span>{totalStores} cửa hàng đang dùng</span>
              </div>
            </div>
          </div>

          {/* Cảnh báo */}
          {!canDelete ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                Gói này hiện đang có <strong>{totalStores} cửa hàng</strong> sử dụng. Bạn không thể xoá gói khi vẫn còn cửa hàng đang kích hoạt. Vui lòng chuyển các cửa hàng này sang gói khác trước.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>
                Bạn có chắc chắn muốn xoá gói <strong className="text-foreground">"{plan.name}"</strong>? Sau khi xoá, người dùng mới sẽ không thể đăng ký gói này nữa.
              </span>
            </div>
          )}

          {/* Lỗi nếu có */}
          {errorMsg && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-400">
              {errorMsg}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isPending}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xoá...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Xác nhận xoá
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
