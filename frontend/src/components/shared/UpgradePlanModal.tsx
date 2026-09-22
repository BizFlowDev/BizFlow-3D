"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Crown,
  Zap,
  Star,
  Check,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
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
import {
  useCurrentStore,
  useStoreSubscriptionPlans,
  useUpgradeStoreSubscription,
  useSubscriptionPaymentBank,
  type SubscriptionPlanItem,
} from "@/hooks/useStore";
import { generateVietQRUrl, getBankByCode } from "@/lib/vietqr";
import { useToast } from "@/components/ui/toast";

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

function formatDate(dateStr: string | null): string {
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
  const { data: store } = useCurrentStore();
  const { data: plansData, isLoading: isLoadingPlans } = useStoreSubscriptionPlans();
  const { data: paymentBankConfig } = useSubscriptionPaymentBank();
  const { mutate: upgradeSub, isPending } = useUpgradeStoreSubscription();
  const { showToast } = useToast();

  const paymentBank = useMemo(() => ({
    bankCode: paymentBankConfig?.bankCode || "MB",
    accountNumber: paymentBankConfig?.accountNumber || "099988889999",
    accountHolder: paymentBankConfig?.accountHolder || "CONG TY CONG NGHE BIZFLOW",
    memoPrefix: paymentBankConfig?.memoPrefix || "BF",
  }), [paymentBankConfig]);

  const bankInfo = getBankByCode(paymentBank.bankCode);

  const plans = useMemo(() => plansData ?? [], [plansData]);

  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mặc định chọn gói cao hơn gói hiện tại hoặc gói đầu tiên
  useEffect(() => {
    if (open && plans.length > 0) {
      if (store?.subscriptionPlan) {
        const nextPlan = plans.find((p) => p.slug !== store.subscriptionPlan && p.isActive);
        setSelectedPlanSlug(nextPlan?.slug ?? store.subscriptionPlan);
      } else {
        setSelectedPlanSlug(plans[0].slug);
      }
    }
  }, [open, plans, store]);

  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.slug === selectedPlanSlug) ?? plans[0];
  }, [plans, selectedPlanSlug]);

  const durationOption = useMemo(() => {
    return DURATION_OPTIONS.find((d) => d.value === durationMonths) ?? DURATION_OPTIONS[0];
  }, [durationMonths]);

  // Tính số tiền thanh toán
  const basePrice = (selectedPlan?.price ?? 0) * durationMonths;
  const discountAmount = Math.round((basePrice * (durationOption.discount ?? 0)) / 100);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // Sinh mã VietQR
  const paymentMemo = useMemo(() => {
    const storeCode = store?.id ? store.id.slice(0, 8).toUpperCase() : "STORE";
    const planCode = (selectedPlan?.slug ?? "PRO").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const prefix = paymentBank.memoPrefix || "BF";
    return `${prefix} ${storeCode} ${planCode} ${durationMonths}M`;
  }, [store?.id, selectedPlan?.slug, durationMonths, paymentBank.memoPrefix]);

  const qrUrl = useMemo(() => {
    return generateVietQRUrl({
      bankCode: paymentBank.bankCode,
      accountNumber: paymentBank.accountNumber,
      accountName: paymentBank.accountHolder,
      amount: finalPrice > 0 ? finalPrice : undefined,
      memo: paymentMemo,
      template: "compact2",
    });
  }, [paymentBank, finalPrice, paymentMemo]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast("success", `Đã sao chép ${label}`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleConfirmUpgrade = () => {
    if (!selectedPlanSlug) {
      showToast("error", "Vui lòng chọn gói dịch vụ");
      return;
    }

    upgradeSub(
      {
        plan: selectedPlanSlug,
        durationMonths,
        paymentMethod: "vietqr",
      },
      {
        onSuccess: () => {
          showToast("success", `Nâng cấp lên gói ${selectedPlan?.name ?? selectedPlanSlug} thành công!`);
          onOpenChange(false);
        },
        onError: (err: any) => {
          showToast("error", err?.message || "Có lỗi xảy ra khi nâng cấp gói");
        },
      },
    );
  };

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
                Mở rộng tính năng bán hàng POS, quản lý chi nhánh, kế toán tự động và đồ họa 3D tương tác.
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

        <div className="p-6 space-y-6">
          {/* 1. Chọn gói dịch vụ */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              1. Chọn gói dịch vụ mong muốn:
            </Label>

            {isLoadingPlans ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
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

              {/* Cam kết & quyền lợi */}
              <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Kích hoạt tức thì:</span> Gói dịch vụ sẽ được cập nhật tự động ngay khi bạn quét mã VietQR và xác nhận bên dưới.
                </div>
              </div>
            </div>

            {/* Cột phải: Khung VietQR Thanh Toán (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-between rounded-xl border bg-muted/20 p-4 text-center">
              <div className="w-full space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-foreground">
                  <QrCode className="h-4 w-4 text-primary" />
                  Quét Mã VietQR Thanh Toán
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Mở ứng dụng ngân hàng hoặc MoMo quét mã chuyển khoản nhanh
                </p>
              </div>

              {/* Khung ảnh QR */}
              <div className="my-3 bg-white p-2 rounded-lg shadow-sm border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Mã VietQR nâng cấp gói"
                  className="w-48 h-48 object-contain rounded"
                />
              </div>

              {/* Thông tin tài khoản & memo */}
              <div className="w-full space-y-1.5 text-left text-[11px] bg-background border rounded-lg p-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {bankInfo?.shortName || paymentBank.bankCode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span>{paymentBank.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentBank.accountNumber, "Số tài khoản")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedField === "Số tài khoản" ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-semibold uppercase">{paymentBank.accountHolder}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nội dung:</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-primary">
                    <span className="truncate max-w-[140px]">{paymentMemo}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentMemo, "Nội dung chuyển khoản")}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copiedField === "Nội dung chuyển khoản" ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
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
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmUpgrade}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isPending ? "Đang xử lý..." : "Xác Nhận Đã Thanh Toán"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
