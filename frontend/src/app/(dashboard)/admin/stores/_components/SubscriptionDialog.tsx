"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Crown,
  Zap,
  Calendar,
  DollarSign,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUpdateSubscription } from "@/hooks/useAdmin";
import type { Store } from "@/hooks/useAdmin";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store | null;
  onSuccess?: () => void;
}

type PlanType = "basic" | "professional";

interface PlanInfo {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  features: string[];
  defaultPrice: number;
}

// ── Plan Config ───────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<PlanType, PlanInfo> = {
  basic: {
    name: "Basic",
    icon: Zap,
    color: "text-blue-600",
    gradientFrom: "from-blue-500",
    gradientTo: "to-cyan-500",
    features: [
      "Tối đa 3 nhân viên",
      "Quản lý sản phẩm cơ bản",
      "Báo cáo doanh thu",
      "Hỗ trợ qua email",
    ],
    defaultPrice: 199000,
  },
  professional: {
    name: "Professional",
    icon: Crown,
    color: "text-amber-600",
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-500",
    features: [
      "Tối đa 20 nhân viên",
      "AI Order Assistant",
      "Kế toán Thông tư 88",
      "3D Store View",
      "Hỗ trợ ưu tiên 24/7",
      "API mở rộng",
    ],
    defaultPrice: 499000,
  },
};

const DURATION_OPTIONS = [
  { value: 1, label: "1 tháng" },
  { value: 3, label: "3 tháng", discount: 10 },
  { value: 6, label: "6 tháng", discount: 15 },
  { value: 12, label: "12 tháng", discount: 20 },
];

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

// ── Component ─────────────────────────────────────────────────────────────────

export function SubscriptionDialog({
  open,
  onOpenChange,
  store,
  onSuccess,
}: SubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("basic");
  const [price, setPrice] = useState<number>(199000);
  const [duration, setDuration] = useState<number>(1);

  const { mutate: updateSubscription, isPending } = useUpdateSubscription();

  // Reset khi mở dialog
  useEffect(() => {
    if (open && store) {
      const otherPlan: PlanType =
        store.subscriptionPlan === "basic" ? "professional" : "basic";
      setSelectedPlan(otherPlan);
      setPrice(PLAN_CONFIG[otherPlan].defaultPrice);
      setDuration(1);
    }
  }, [open, store]);

  // Cập nhật giá khi đổi plan
  useEffect(() => {
    setPrice(PLAN_CONFIG[selectedPlan].defaultPrice);
  }, [selectedPlan]);

  const discountOption = DURATION_OPTIONS.find((d) => d.value === duration);
  const discountPercent = discountOption?.discount ?? 0;
  const totalPrice = price * duration * (1 - discountPercent / 100);

  const handleSubmit = () => {
    if (!store) return;
    updateSubscription(
      {
        storeId: store.id,
        data: {
          plan: selectedPlan,
          price,
          durationMonths: duration,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  if (!store) return null;

  const currentPlan = PLAN_CONFIG[store.subscriptionPlan];
  const CurrentIcon = currentPlan.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Thay đổi gói Subscription
          </DialogTitle>
          <DialogDescription>
            Cập nhật gói đăng ký cho{" "}
            <span className="font-semibold text-foreground">{store.name}</span>
          </DialogDescription>
        </DialogHeader>

        {/* ── Current Plan Info ── */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Gói hiện tại
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-lg bg-gradient-to-br ${currentPlan.gradientFrom} ${currentPlan.gradientTo} p-2`}
              >
                <CurrentIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold">{currentPlan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(currentPlan.defaultPrice)}/tháng
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant="default"
                className={
                  store.subscriptionStatus === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : store.subscriptionStatus === "trial"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                }
              >
                {store.subscriptionStatus === "active"
                  ? "Đang hoạt động"
                  : store.subscriptionStatus === "trial"
                  ? "Dùng thử"
                  : "Hết hạn"}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                Hết hạn: {formatDate(store.subscriptionExpiresAt)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Plan Selection ── */}
        <div>
          <Label className="mb-3 block text-sm font-semibold">
            Chọn gói mới
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PLAN_CONFIG) as PlanType[]).map((planKey) => {
              const plan = PLAN_CONFIG[planKey];
              const PlanIcon = plan.icon;
              const isSelected = selectedPlan === planKey;
              const isCurrent = store.subscriptionPlan === planKey;

              return (
                <motion.button
                  key={planKey}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPlan(planKey)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  } ${isCurrent ? "opacity-60" : ""}`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2 right-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Hiện tại
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`rounded-lg bg-gradient-to-br ${plan.gradientFrom} ${plan.gradientTo} p-2`}
                    >
                      <PlanIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold">{plan.name}</span>
                  </div>

                  <p className="mb-3 text-lg font-bold tabular-nums">
                    {formatCurrency(plan.defaultPrice)}
                    <span className="text-xs font-normal text-muted-foreground">
                      /tháng
                    </span>
                  </p>

                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1.5 -right-1.5"
                      >
                        <div className="rounded-full bg-primary p-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Price & Duration ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sub-price" className="mb-1.5 block text-sm font-medium">
              <DollarSign className="mr-1 inline h-3.5 w-3.5" />
              Giá mỗi tháng (VNĐ)
            </Label>
            <Input
              id="sub-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={0}
              step={1000}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              <Calendar className="mr-1 inline h-3.5 w-3.5" />
              Thời hạn
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    duration === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                  {opt.discount && (
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                      -{opt.discount}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {formatCurrency(price)} × {duration} tháng
            </span>
            {discountPercent > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                Giảm {discountPercent}%
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Tổng thanh toán</span>
            <span className="text-2xl font-bold tabular-nums bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              {formatCurrency(totalPrice)}
            </span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedPlan === store.subscriptionPlan}
            className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Cập nhật Subscription
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
