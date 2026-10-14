"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Crown,
  Zap,
  Star,
  Check,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  Loader2,
  RefreshCw,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCurrentStore,
  useStoreSubscriptionPlans,
  useCreateStripeUpgradeSession,
  useSubscriptionOrderStatus,
  STORE_QUERY_KEY,
  type StripeUpgradeSessionData,
} from "@/hooks/useStore";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/components/ui/toast";
import { QRCodeSVG } from "qrcode.react";

export interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Zap,
  Star,
  Sparkles,
};

const DURATION_OPTIONS = [
  { value: 1, label: "1 tháng", discount: 0 },
  { value: 3, label: "3 tháng", discount: 10 },
  { value: 6, label: "6 tháng", discount: 15 },
  { value: 12, label: "12 tháng", discount: 20 },
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Không thời hạn";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function UpgradePlanModal({ open, onOpenChange }: UpgradePlanModalProps) {
  const queryClient = useQueryClient();
  const { data: store } = useCurrentStore();
  const { data: plansData, isLoading: isLoadingPlans } = useStoreSubscriptionPlans();
  const { mutate: createStripeSession, isPending: isCreatingStripeSession } = useCreateStripeUpgradeSession();
  const { socket } = useSocket();
  const { showToast } = useToast();

  const plans = useMemo(() => plansData ?? [], [plansData]);

  // Selected state
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("");
  const [durationMonths, setDurationMonths] = useState<number>(1);

  // Stripe Session State
  const [stripeSession, setStripeSession] = useState<StripeUpgradeSessionData | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ planName?: string; expiresAt?: string } | null>(null);

  // Giữ trạng thái modal đã khởi tạo để tránh store refetch làm reset selection hoặc nhảy sang gói khác
  const hasInitializedRef = useRef<boolean>(false);

  // Mặc định chọn gói khi modal mở lần đầu
  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      return;
    }

    if (open && !hasInitializedRef.current && plans.length > 0) {
      hasInitializedRef.current = true;
      setIsSuccess(false);
      setSuccessInfo(null);
      setStripeError(null);
      setStripeSession(null);

      // Nếu store đã có gói và gói đó nằm trong danh sách plans -> giữ nguyên gói hiện tại
      // Ngược lại chọn gói đầu tiên
      const currentStorePlan = store?.subscriptionPlan;
      if (currentStorePlan && plans.some((p) => p.slug === currentStorePlan)) {
        setSelectedPlanSlug(currentStorePlan);
      } else {
        setSelectedPlanSlug(plans[0].slug);
      }
    }
  }, [open, plans, store?.subscriptionPlan]);

  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.slug === selectedPlanSlug) ?? plans[0];
  }, [plans, selectedPlanSlug]);

  const durationOption = useMemo(() => {
    return DURATION_OPTIONS.find((d) => d.value === durationMonths) ?? DURATION_OPTIONS[0];
  }, [durationMonths]);

  // Tính số tiền thanh toán
  const basePrice = (Number(selectedPlan?.price) || 0) * durationMonths;
  const discountAmount = Math.round((basePrice * (durationOption.discount ?? 0)) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // Hàm làm mới / tạo lại phiên Stripe
  const initStripeSession = useCallback(() => {
    if (!selectedPlanSlug || finalPrice <= 0 || isSuccess) return;
    setStripeError(null);
    setStripeSession(null);
    createStripeSession(
      {
        plan: selectedPlanSlug,
        durationMonths,
      },
      {
        onSuccess: (data) => {
          setStripeSession(data);
          setStripeError(null);
        },
        onError: (err: any) => {
          const msg = err?.message || "Không thể khởi tạo cổng Stripe";
          setStripeError(msg);
          showToast("error", msg);
        },
      },
    );
  }, [selectedPlanSlug, durationMonths, finalPrice, isSuccess, createStripeSession, showToast]);

  // Tự động khởi tạo phiên Stripe mới khi người dùng chọn gói khác hoặc chu kỳ khác
  // (Nếu đang xem gói hiện tại với chu kỳ mặc định, không tự động tạo đơn rác mà để người dùng bấm nút chủ động)
  useEffect(() => {
    if (!open || isSuccess || !selectedPlanSlug || finalPrice <= 0) {
      return;
    }

    const isCurrentPlanDefaultView =
      store?.subscriptionPlan === selectedPlanSlug && durationMonths === 1;
    if (isCurrentPlanDefaultView) {
      return;
    }

    // Reset session cũ ngay lập tức để người dùng không quét nhầm mã QR giá cũ
    setStripeError(null);
    setStripeSession(null);

    let isSubscribed = true;
    const timer = setTimeout(() => {
      createStripeSession(
        {
          plan: selectedPlanSlug,
          durationMonths,
        },
        {
          onSuccess: (data) => {
            if (isSubscribed) {
              setStripeSession(data);
              setStripeError(null);
            }
          },
          onError: (err: any) => {
            if (isSubscribed) {
              const msg = err?.message || "Không thể khởi tạo cổng Stripe";
              setStripeError(msg);
              showToast("error", msg);
            }
          },
        },
      );
    }, 450);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [open, isSuccess, selectedPlanSlug, durationMonths, finalPrice, store?.subscriptionPlan]);

  const isStripeSessionValid = useMemo(() => {
    return Boolean(
      stripeSession &&
      Number(stripeSession.amount) === Number(finalPrice) &&
      stripeSession.planSlug === selectedPlanSlug &&
      Number(stripeSession.durationMonths) === Number(durationMonths)
    );
  }, [stripeSession, finalPrice, selectedPlanSlug, durationMonths]);

  // Fallback Polling đơn hàng
  const { data: orderStatus } = useSubscriptionOrderStatus(
    stripeSession?.orderId ?? null,
    open && !isSuccess,
  );

  useEffect(() => {
    if (orderStatus?.status === "completed" && !isSuccess) {
      setIsSuccess(true);
      setSuccessInfo({
        planName: selectedPlan?.name,
      });
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "subscription-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "subscription-orders"] });
      showToast("success", `Thanh toán thành công! Gói ${selectedPlan?.name} đã được kích hoạt.`);
    }
  }, [orderStatus?.status, isSuccess, selectedPlan?.name, queryClient, showToast]);

  // Lắng nghe Realtime qua Socket.IO
  useEffect(() => {
    if (!socket || !open) return;

    const handleUpgraded = (data: any) => {
      if (data?.storeId === store?.id || (stripeSession?.orderId && data?.orderId === stripeSession.orderId)) {
        setIsSuccess(true);
        setSuccessInfo({
          planName: data?.planName || selectedPlan?.name,
          expiresAt: data?.expiresAt,
        });
        queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["admin", "stores"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "subscription-history"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "subscription-orders"] });
        showToast("success", `Nâng cấp lên gói ${data?.planName || selectedPlan?.name} thành công!`);
      }
    };

    socket.on("subscription:upgraded", handleUpgraded);
    return () => {
      socket.off("subscription:upgraded", handleUpgraded);
    };
  }, [socket, open, store?.id, stripeSession?.orderId, selectedPlan?.name, queryClient, showToast]);

  const isCurrentPlanSelected = store?.subscriptionPlan === selectedPlanSlug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 shadow-2xl">
        {/* Header Gradient */}
        <div className="bg-gradient-to-r from-amber-500/15 via-primary/10 to-indigo-500/15 p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-amber-500 animate-pulse" />
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Nâng Cấp & Gia Hạn Gói Dịch Vụ
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-muted-foreground">
                Mở rộng hạn mức nhân sự, quản lý bán hàng POS, kế toán tự động và chế độ 3D tương tác.
              </DialogDescription>
            </div>

            {/* Current store plan badge */}
            {store && (
              <div className="hidden sm:flex flex-col items-end gap-1 bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border text-xs">
                <div className="text-muted-foreground">Gói hiện tại:</div>
                <div className="flex items-center gap-1.5 font-bold">
                  <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/30">
                    {store.subscriptionPlan || "Chưa có"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    ({formatDate(store.subscriptionExpiresAt)})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Màn hình thông báo thành công (Celebration Screen) */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <Sparkles className="h-6 w-6 text-amber-500 absolute -top-1 -right-1 animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">
                Kích Hoạt Gói Thành Công!
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Cửa hàng của bạn đã được nâng cấp lên gói{" "}
                <span className="font-bold text-primary">{successInfo?.planName || selectedPlan?.name}</span>.
                Toàn bộ tính năng cao cấp đã được mở khóa ngay lập tức.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 bg-muted/60 border rounded-lg px-4 py-2 text-xs font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              <span>
                Thời hạn mới: <strong>{formatDate(successInfo?.expiresAt || store?.subscriptionExpiresAt)}</strong>
              </span>
            </div>

            <div className="pt-4 flex justify-center">
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20"
              >
                Bắt Đầu Trải Nghiệm Ngay
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 1. Chọn gói dịch vụ */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                1. Chọn gói dịch vụ mong muốn:
              </Label>

              {isLoadingPlans ? (
                <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Đang tải danh sách các gói dịch vụ...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {plans.map((p) => {
                    const IconComponent = ICON_MAP[p.icon ?? "Zap"] ?? Zap;
                    const isSelected = selectedPlanSlug === p.slug;
                    const isCurrent = store?.subscriptionPlan === p.slug;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlanSlug(p.slug)}
                        className={`relative flex flex-col justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary"
                            : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                        }`}
                      >
                        {isCurrent && (
                          <Badge className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] h-5">
                            Đang dùng
                          </Badge>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-2 rounded-lg ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm leading-none">{p.name}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {p.maxEmployees ? `Tối đa ${p.maxEmployees} nhân viên` : "Không giới hạn nhân sự"}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="text-lg font-black text-foreground">
                              {p.price === 0 ? "Miễn phí" : `${formatVND(p.price)}/tháng`}
                            </div>
                            {p.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {p.description}
                              </p>
                            )}
                          </div>

                          {p.features && p.features.length > 0 && (
                            <ul className="pt-2 space-y-1 text-xs border-t mt-2">
                              {p.features.slice(0, 3).map((feat, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 text-muted-foreground">
                                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  <span className="line-clamp-1">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t">
                          <div
                            className={`text-center text-xs font-semibold py-1.5 rounded-md transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isSelected ? "Đang chọn gói này" : "Chọn gói"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Chọn thời hạn & Thanh toán */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Cột trái: Thời hạn & Tóm tắt chi phí (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2.5">
                    <Clock className="h-4 w-4 text-primary" />
                    2. Chọn chu kỳ thanh toán:
                  </Label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDurationMonths(opt.value)}
                        className={`relative flex flex-col items-center justify-center p-2.5 rounded-lg border-2 text-center transition-all ${
                          durationMonths === opt.value
                            ? "border-primary bg-primary/10 font-bold text-primary"
                            : "border-border hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {opt.discount > 0 && (
                          <span className="absolute -top-2 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            -{opt.discount}%
                          </span>
                        )}
                        <span className="text-xs">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tóm tắt bảng tính tiền */}
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5 text-xs">
                  <div className="font-semibold text-sm pb-1 border-b flex items-center justify-between">
                    <span>Chi tiết thanh toán</span>
                    <Badge variant="outline" className="text-xs font-normal">
                      {durationOption.label}
                    </Badge>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Đơn giá gói ({selectedPlan?.name}):</span>
                    <span>{formatVND(selectedPlan?.price ?? 0)}/tháng</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Thời hạn sử dụng:</span>
                    <span>{durationMonths} tháng</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Ưu đãi thanh toán dài hạn ({durationOption.discount}%):</span>
                      <span>-{formatVND(discountAmount)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t flex justify-between items-baseline font-bold text-sm text-foreground">
                    <span>Tổng thanh toán:</span>
                    <span className="text-lg text-primary">{formatVND(finalPrice)}</span>
                  </div>
                </div>

                {/* 3. Phương Thức Thanh Toán */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    3. Phương thức thanh toán:
                  </Label>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-primary bg-primary/5 shadow-sm">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">Cổng thanh toán Stripe</span>
                        <Badge className="bg-emerald-600 text-[10px] px-2 py-0 h-4 font-medium">
                          Tự động kích hoạt
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Hỗ trợ quét mã QR, thẻ quốc tế (Visa, MasterCard), Apple Pay, Google Pay. Hệ thống tự động kích hoạt tài khoản ngay sau khi thanh toán thành công.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cam kết & quyền lợi */}
                <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Thanh toán bảo mật:</span> Gói dịch vụ sẽ được kích hoạt tức thì ngay khi hệ thống nhận được tín hiệu thanh toán thành công.
                  </div>
                </div>
              </div>

              {/* Cột phải: Khung Mã QR Thanh Toán Stripe (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-between rounded-xl border bg-muted/20 p-4 text-center">
                <div className="w-full flex flex-col items-center justify-between h-full space-y-3">
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-foreground">
                      <QrCode className="h-4 w-4 text-indigo-500" />
                      Quét Mã QR Stripe Thanh Toán
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Dùng camera điện thoại quét mã QR để mở trang thanh toán bảo mật Stripe
                    </p>
                  </div>

                  {/* Thẻ hiển thị số tiền thanh toán chính xác */}
                  <div className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div className="text-left">
                      <span className="text-muted-foreground block text-[10px]">Gói & Kỳ hạn:</span>
                      <span className="font-bold text-foreground capitalize">
                        {selectedPlan?.name} · {durationMonths} tháng
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px]">Số tiền cần thanh toán:</span>
                      <span className="font-black text-sm text-indigo-600 dark:text-indigo-400 font-mono">
                        {formatVND(finalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Khung ảnh QR Code Stripe */}
                  <div className="my-1 bg-white p-3 rounded-xl shadow-md border relative">
                    {isCreatingStripeSession ? (
                      <div className="w-48 h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground p-2 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          Đang tạo mã QR {formatVND(finalPrice)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Đồng bộ đúng gói {selectedPlan?.name} ({durationMonths} tháng)...
                        </span>
                      </div>
                    ) : stripeError ? (
                      <div className="w-48 h-48 flex flex-col items-center justify-center gap-2 p-3 text-center">
                        <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                          <RefreshCw className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-medium text-destructive line-clamp-2">
                          {stripeError}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={initStripeSession}
                          className="text-xs h-7 mt-1"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Thử lại
                        </Button>
                      </div>
                    ) : isStripeSessionValid && stripeSession ? (
                      <div className="relative group flex items-center justify-center">
                        {stripeSession.qrCodeUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={stripeSession.qrCodeUrl}
                            alt={`Mã QR Stripe Checkout - ${formatVND(finalPrice)}`}
                            className="w-48 h-48 object-contain rounded"
                          />
                        ) : stripeSession.checkoutUrl ? (
                          <div className="p-2 bg-white rounded flex items-center justify-center">
                            <QRCodeSVG
                              value={stripeSession.checkoutUrl}
                              size={180}
                              level="M"
                            />
                          </div>
                        ) : null}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                          <a
                            href={stripeSession.checkoutUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-white text-xs font-bold flex items-center gap-1 bg-indigo-600 px-3 py-1.5 rounded-lg shadow"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Mở cổng Stripe
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="w-48 h-48 flex flex-col items-center justify-center gap-2 p-2 text-center">
                        {isCurrentPlanSelected ? (
                          <>
                            <Crown className="h-7 w-7 text-amber-500 animate-pulse" />
                            <div className="text-xs font-semibold text-foreground">Bạn đang dùng gói này</div>
                            <p className="text-[10px] text-muted-foreground">Nhấn bên dưới nếu muốn gia hạn</p>
                            <Button
                              size="sm"
                              onClick={initStripeSession}
                              disabled={isCreatingStripeSession}
                              className="text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm"
                            >
                              {isCreatingStripeSession ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                              )}
                              Tạo mã QR gia hạn
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">Chưa có mã QR</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={initStripeSession}
                              disabled={isCreatingStripeSession}
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${isCreatingStripeSession ? "animate-spin" : ""}`} /> Tạo mã QR thanh toán
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status pulsing bar */}
                  <div className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-background border text-[11px]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-muted-foreground font-medium">
                      Đang chờ bạn quét mã thanh toán đúng <strong>{formatVND(finalPrice)}</strong>...
                    </span>
                  </div>

                  {/* Direct link button if user prefers desktop */}
                  {isStripeSessionValid && stripeSession?.checkoutUrl && (
                    <div className="w-full pt-1">
                      <a
                        href={stripeSession.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        Hoặc mở trang Stripe ({formatVND(finalPrice)})
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!isSuccess && (
          <div className="p-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {isCurrentPlanSelected ? (
                <span>Gia hạn thêm {durationMonths} tháng cho gói hiện tại.</span>
              ) : (
                <span>
                  Nâng cấp từ gói <strong className="capitalize">{store?.subscriptionPlan || "Basic"}</strong> lên gói{" "}
                  <strong className="text-primary">{selectedPlan?.name}</strong>.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isCreatingStripeSession}
              >
                Hủy
              </Button>

              <Button
                size="sm"
                onClick={initStripeSession}
                disabled={isCreatingStripeSession}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${isCreatingStripeSession ? "animate-spin" : ""}`} />
                {isCreatingStripeSession ? "Đang tạo mã..." : "Tạo Lại Mã QR"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
