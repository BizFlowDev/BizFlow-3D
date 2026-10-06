"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  Zap,
  Star,
  Loader2,
  CheckCircle2,
  Sparkles,
  Palette,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
} from "@/hooks/useAdmin";
import type { SubscriptionPlan } from "@/hooks/useAdmin";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null; // null = create mode
}

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  "Quản lý sản phẩm cơ bản",
  "Báo cáo doanh thu",
  "Kế toán tự động",
];

const ICON_OPTIONS = [
  { value: "Zap", label: "Zap ⚡", component: Zap },
  { value: "Crown", label: "Crown 👑", component: Crown },
  { value: "Star", label: "Star ⭐", component: Star },
];

const GRADIENT_PRESETS = [
  { from: "from-blue-500", to: "to-cyan-500", label: "Blue → Cyan" },
  { from: "from-amber-500", to: "to-orange-500", label: "Amber → Orange" },
  { from: "from-violet-500", to: "to-purple-500", label: "Violet → Purple" },
  { from: "from-emerald-500", to: "to-teal-500", label: "Emerald → Teal" },
  { from: "from-rose-500", to: "to-pink-500", label: "Rose → Pink" },
  { from: "from-indigo-500", to: "to-blue-500", label: "Indigo → Blue" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanEditorDialog({
  open,
  onOpenChange,
  plan,
}: PlanEditorDialogProps) {
  const isEdit = !!plan;

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(199000);
  const [maxEmployees, setMaxEmployees] = useState<number>(3);
  const [features, setFeatures] = useState<string[]>(DEFAULT_FEATURES);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [icon, setIcon] = useState("Zap");
  const [gradientIdx, setGradientIdx] = useState(0);

  const { mutate: createPlan, isPending: isCreating } =
    useCreateSubscriptionPlan();
  const { mutate: updatePlan, isPending: isUpdating } =
    useUpdateSubscriptionPlan();

  const isPending = isCreating || isUpdating;

  // Reset form on open
  useEffect(() => {
    if (!open) return;
    if (plan) {
      setName(plan.name);
      setSlug(plan.slug);
      setDescription(plan.description ?? "");
      setPrice(plan.price);
      setMaxEmployees(plan.maxEmployees);
      setFeatures(
        plan.features && plan.features.length > 0
          ? plan.features
          : DEFAULT_FEATURES
      );
      setIsActive(plan.isActive);
      setSortOrder(plan.sortOrder ?? 0);
      setIcon(plan.icon ?? "Zap");
      const gIdx = GRADIENT_PRESETS.findIndex(
        (g) => g.from === plan.colorFrom && g.to === plan.colorTo
      );
      setGradientIdx(gIdx >= 0 ? gIdx : 0);
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setPrice(199000);
      setMaxEmployees(3);
      setFeatures(DEFAULT_FEATURES);
      setIsActive(true);
      setSortOrder(0);
      setIcon("Zap");
      setGradientIdx(0);
    }
  }, [open, plan]);

  // Auto-generate slug from name (only in create mode)
  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
      );
    }
  };

  const handleSubmit = () => {
    const gradient = GRADIENT_PRESETS[gradientIdx];

    const finalFeatures = [
      ...DEFAULT_FEATURES,
      `Tối đa ${maxEmployees} nhân viên`,
    ];

    if (isEdit && plan) {
      updatePlan(
        {
          planId: plan.id,
          data: {
            name,
            description: description || undefined,
            price,
            features: finalFeatures,
            maxEmployees,
            isActive,
            sortOrder,
            colorFrom: gradient.from,
            colorTo: gradient.to,
            icon,
          },
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createPlan(
        {
          name,
          slug,
          description: description || undefined,
          price,
          features: finalFeatures,
          maxEmployees,
          sortOrder: 0,
          colorFrom: gradient.from,
          colorTo: gradient.to,
          icon,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  const gradient = GRADIENT_PRESETS[gradientIdx];
  const SelectedIcon =
    ICON_OPTIONS.find((i) => i.value === icon)?.component ?? Zap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {isEdit ? "Chỉnh sửa gói đăng ký" : "Tạo gói đăng ký mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Cập nhật thông tin gói "${plan?.name}"`
              : "Tạo một gói đăng ký mới cho nền tảng BizFlow 3D"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Preview ── */}
          <div
            className={`rounded-xl bg-gradient-to-r ${gradient.from} ${gradient.to} p-4 text-white`}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <SelectedIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-lg">{name || "Tên gói"}</p>
                <p className="text-sm text-white/80">
                  {formatCurrency(price)}/tháng • Tối đa {maxEmployees} NV
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Basic Info ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan-name" className="mb-1.5 block text-sm font-medium">
                Tên gói *
              </Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="VD: Professional"
              />
            </div>
            <div>
              <Label htmlFor="plan-slug" className="mb-1.5 block text-sm font-medium">
                Slug *
              </Label>
              <Input
                id="plan-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="VD: professional"
                disabled={isEdit}
                className={isEdit ? "opacity-60" : ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="plan-desc" className="mb-1.5 block text-sm font-medium">
              Mô tả
            </Label>
            <Input
              id="plan-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn về gói"
            />
          </div>

          {/* ── Price & Limits ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan-price" className="mb-1.5 block text-sm font-medium">
                Giá/tháng (VNĐ) *
              </Label>
              <Input
                id="plan-price"
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                min={0}
                step={1000}
              />
            </div>
            <div>
              <Label htmlFor="plan-max-emp" className="mb-1.5 block text-sm font-medium">
                NV tối đa *
              </Label>
              <Input
                id="plan-max-emp"
                type="number"
                value={maxEmployees}
                onChange={(e) => setMaxEmployees(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>

          {/* ── Appearance ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium">
                <Palette className="mr-1 inline h-3.5 w-3.5" />
                Màu gradient
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {GRADIENT_PRESETS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setGradientIdx(i)}
                    className={`h-8 rounded-lg bg-gradient-to-r ${g.from} ${g.to} transition-all ${
                      gradientIdx === i
                        ? "ring-2 ring-primary ring-offset-2"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title={g.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.component className="h-4 w-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Default Features & Limits ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Tính năng & Hạn mức áp dụng
              </Label>
              <span className="text-xs text-muted-foreground">Tự động áp dụng</span>
            </div>
            <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">
              {DEFAULT_FEATURES.map((feature) => (
                <Badge
                  key={feature}
                  variant="secondary"
                  className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-normal bg-background/80 border"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {feature}
                </Badge>
              ))}
              <Badge
                variant="secondary"
                className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-background/80 border text-blue-600 dark:text-blue-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Tối đa {maxEmployees} nhân viên
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Gói hiển thị 3 tính năng mặc định (Quản lý sản phẩm, Báo cáo doanh thu, Kế toán tự động) cùng hạn mức nhân viên tương ứng.
            </p>
          </div>

          {/* ── Active Toggle ── */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
            <div>
              <p className="text-sm font-medium">Trạng thái hoạt động</p>
              <p className="text-xs text-muted-foreground">
                Gói không hoạt động sẽ không hiển thị cho người dùng mới
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Separator />

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !name.trim() || !slug.trim()}
              className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-400 hover:shadow-blue-500/40"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {isEdit ? "Cập nhật" : "Tạo gói"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
