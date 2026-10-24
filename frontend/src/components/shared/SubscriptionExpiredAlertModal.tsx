"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  Crown,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldAlert,
  Store,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentStore } from "@/hooks/useStore";
import { useAuthStore } from "@/stores/auth-store";
import { UpgradePlanModal } from "@/components/shared/UpgradePlanModal";

const DISMISSED_SESSION_KEY = "bizflow_expired_alert_dismissed_session";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Chưa xác định";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function SubscriptionExpiredAlertModal() {
  const { user, isAuthenticated } = useAuthStore();
  const { data: store, isLoading } = useCurrentStore();

  const [alertOpen, setAlertOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    // Không hiển thị nếu chưa đăng nhập, đang tải hoặc tài khoản là admin hệ thống
    if (!isAuthenticated || isLoading || !store || user?.role === "admin") {
      return;
    }

    const isExpired =
      store.subscriptionStatus === "expired" ||
      (store.subscriptionExpiresAt &&
        new Date(store.subscriptionExpiresAt).getTime() < Date.now());

    if (!isExpired) {
      setAlertOpen(false);
      return;
    }

    // Kiểm tra xem đã từng tắt cảnh báo trong phiên này chưa
    const isDismissed = sessionStorage.getItem(DISMISSED_SESSION_KEY);
    if (!isDismissed) {
      setAlertOpen(true);
    }
  }, [isAuthenticated, isLoading, store, user?.role]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, "true");
    setAlertOpen(false);
  };

  const handleOpenUpgrade = () => {
    setAlertOpen(false);
    setUpgradeModalOpen(true);
  };

  if (!store) return null;

  return (
    <>
      <Dialog open={alertOpen} onOpenChange={(open) => {
        if (!open) handleDismiss();
        else setAlertOpen(true);
      }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-rose-500/30 shadow-2xl shadow-rose-950/20">
          {/* Header với gradient cảnh báo nổi bật */}
          <div className="relative bg-gradient-to-br from-rose-600 via-rose-500 to-amber-600 p-6 text-white overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-28 h-28 bg-black/10 rounded-full blur-lg pointer-events-none" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner ring-1 ring-white/30 animate-bounce">
                <ShieldAlert className="h-8 w-8 text-white drop-shadow-md" />
              </div>

              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/25 hover:bg-white/30 text-white text-[11px] font-bold border-none px-2 py-0.5 tracking-wide uppercase">
                    Cảnh báo tài khoản
                  </Badge>
                  <span className="flex h-2 w-2 rounded-full bg-amber-300 animate-ping" />
                </div>
                <DialogTitle className="text-xl font-black tracking-tight text-white">
                  Gói Dịch Vụ Đã Hết Hạn!
                </DialogTitle>
                <DialogDescription className="text-white/90 text-xs font-medium">
                  Vui lòng gia hạn ngay. Nếu không thanh toán, tài khoản sẽ bị khóa và không thể đăng nhập!
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Thân thông báo & Chi tiết gói */}
          <div className="p-6 space-y-5 bg-background">
            {/* Thẻ tóm tắt trạng thái cửa hàng */}
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-rose-100 dark:border-rose-900/40 pb-2">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Store className="h-3.5 w-3.5 text-rose-500" />
                  Cửa hàng:
                </span>
                <span className="font-bold text-foreground">{store.name}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-rose-100 dark:border-rose-900/40 pb-2">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Gói hiện tại:
                </span>
                <Badge variant="outline" className="font-bold capitalize border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  {store.subscriptionPlan || "Basic"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <Clock className="h-3.5 w-3.5 text-rose-500" />
                  Thời điểm hết hạn:
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {formatDate(store.subscriptionExpiresAt)}
                </span>
              </div>
            </div>

            {/* Thông điệp nhắc đóng tiền & cảnh báo khóa tài khoản */}
            <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 dark:bg-red-950/30 p-3 text-red-600 dark:text-red-400 font-semibold flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5 animate-pulse" />
                <span>
                  <strong>CẢNH BÁO QUAN TRỌNG:</strong> Thời hạn gói dịch vụ của cửa hàng đã kết thúc. Nếu không thực hiện thanh toán gia hạn, <strong>tài khoản của bạn sẽ bị khóa</strong> và <strong>không thể đăng nhập</strong> vào hệ thống BizFlow 3D.
                </span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/60 border text-[11px] font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Thanh toán tự động 24/7 qua <strong>Cổng Stripe</strong> (Thẻ Visa/Mastercard hoặc Quét mã QR) để duy trì hoạt động và tránh bị khóa tài khoản.
                </span>
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="pt-2 space-y-2.5">
              <Button
                type="button"
                onClick={handleOpenUpgrade}
                className="w-full h-11 text-sm font-bold bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] gap-2 cursor-pointer"
              >
                <CreditCard className="h-4 w-4" />
                <span>Thanh Toán Gia Hạn Ngay (Cổng Stripe)</span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleDismiss}
                className="w-full h-9 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Để sau, tôi sẽ thanh toán sau
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nâng cấp / Thanh toán gói dịch vụ Stripe */}
      <UpgradePlanModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </>
  );
}
