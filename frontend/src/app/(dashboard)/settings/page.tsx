"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe2,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast, ToastViewport } from "@/components/ui/toast";
import {
  VIETNAM_BANKS,
  getBankByCode,
  sanitizeAccountHolder,
} from "@/lib/vietqr";
import { useCurrentStore, useUpdateStoreBankInfo, useUpdateStoreProfile } from "@/hooks/useStore";

export default function SettingsPage() {
  const { data: store, isLoading } = useCurrentStore();
  const updateBankInfo = useUpdateStoreBankInfo();
  const updateProfile = useUpdateStoreProfile();
  const { toasts, showToast, dismiss } = useToast();

  // ── State: Bank Settings (Dành cho Kế toán & Lưu trữ) ──
  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  // ── State: General Store Profile ──
  const [storeName, setStoreName] = useState<string>("");
  const [storePhone, setStorePhone] = useState<string>("");
  const [storeEmail, setStoreEmail] = useState<string>("");
  const [storeAddress, setStoreAddress] = useState<string>("");
  const [storeTaxCode, setStoreTaxCode] = useState<string>("");

  // Populate data when store is loaded
  useEffect(() => {
    if (store) {
      setBankCode(store.bankCode || "MB");
      setAccountNumber(store.bankAccountNumber || "");
      setAccountHolder(store.bankAccountHolder || "");

      setStoreName(store.name || "");
      setStorePhone(store.phone || "");
      setStoreEmail(store.email || "");
      setStoreAddress(store.address || "");
      setStoreTaxCode(store.taxCode || "");
    }
  }, [store]);

  const selectedBank = getBankByCode(bankCode);

  // Handle Save Bank Info
  const handleSaveBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankCode) {
      showToast("error", "Vui lòng chọn ngân hàng");
      return;
    }
    if (!accountNumber.trim()) {
      showToast("error", "Vui lòng nhập số tài khoản");
      return;
    }
    if (!accountHolder.trim()) {
      showToast("error", "Vui lòng nhập tên chủ tài khoản");
      return;
    }

    try {
      await updateBankInfo.mutateAsync({
        bankCode,
        bankAccountNumber: accountNumber.trim(),
        bankAccountHolder: sanitizeAccountHolder(accountHolder),
      });

      showToast("success", "Cập nhật thành công!", "Thông tin tài khoản doanh nghiệp đã được lưu");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      showToast("error", "Cập nhật thất bại", errorMsg);
    }
  };

  // Handle Save Store Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      showToast("error", "Tên cửa hàng không được để trống");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        name: storeName.trim(),
        phone: storePhone.trim() || null,
        email: storeEmail.trim() || null,
        address: storeAddress.trim() || null,
        taxCode: storeTaxCode.trim() || null,
      });

      showToast("success", "Cập nhật thành công!", "Thông tin cửa hàng đã được lưu");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      showToast("error", "Cập nhật thất bại", errorMsg);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopied(fieldName);
    setTimeout(() => setCopied(null), 2000);
    showToast("info", `Đã sao chép ${fieldName}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cài đặt Cửa hàng & Thanh toán</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý hồ sơ cửa hàng, tài khoản kế toán doanh nghiệp và cấu hình Cổng thanh toán trực tuyến Stripe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 py-1 px-3">
            <ShieldCheck className="h-4 w-4" />
            Cổng Stripe PCI-DSS Sẵn Sàng
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[480px] rounded-xl" />
          <Skeleton className="h-[480px] rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* ── Cột trái: Thông tin Cửa hàng & Tài khoản Doanh nghiệp (7 cols) ── */}
          <div className="space-y-6 lg:col-span-7">
            {/* ── 1. Thông tin chung Cửa hàng ── */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Thông tin cửa hàng</CardTitle>
                    <CardDescription className="text-xs">
                      Tên và thông tin liên hệ hiển thị trên phiếu in hóa đơn bán lẻ và chứng từ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="storeName" className="text-xs font-semibold uppercase text-muted-foreground">
                        Tên cửa hàng <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="storeName"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="VD: Cửa hàng Tiện lợi BizFlow"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="storePhone" className="text-xs font-semibold uppercase text-muted-foreground">
                        Số điện thoại
                      </Label>
                      <Input
                        id="storePhone"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="0912345678"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="storeEmail" className="text-xs font-semibold uppercase text-muted-foreground">
                        Email cửa hàng
                      </Label>
                      <Input
                        id="storeEmail"
                        type="email"
                        value={storeEmail}
                        onChange={(e) => setStoreEmail(e.target.value)}
                        placeholder="store@example.com"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="storeAddress" className="text-xs font-semibold uppercase text-muted-foreground">
                        Địa chỉ cửa hàng
                      </Label>
                      <Input
                        id="storeAddress"
                        value={storeAddress}
                        onChange={(e) => setStoreAddress(e.target.value)}
                        placeholder="Số 123 đường ABC, Quận XYZ, TP.HCM"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="storeTaxCode" className="text-xs font-semibold uppercase text-muted-foreground">
                        Mã số thuế (nếu có)
                      </Label>
                      <Input
                        id="storeTaxCode"
                        value={storeTaxCode}
                        onChange={(e) => setStoreTaxCode(e.target.value)}
                        placeholder="0312345678"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={updateProfile.isPending}
                      className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-400"
                    >
                      {updateProfile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Lưu thông tin cửa hàng
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* ── 2. Tài khoản Ngân hàng Doanh nghiệp (Kế toán & Đối soát) ── */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Tài khoản ngân hàng doanh nghiệp</CardTitle>
                      <CardDescription className="text-xs">
                        Thông tin tài khoản ngân hàng chính thức dùng cho hạch toán nội bộ & đối soát kế toán
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium">
                    Kế toán & Sổ quỹ
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                <form onSubmit={handleSaveBankInfo} className="space-y-4">
                  {/* Chọn Ngân hàng */}
                  <div className="space-y-1.5">
                    <Label htmlFor="bankSelect" className="text-xs font-semibold uppercase text-muted-foreground">
                      Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                    </Label>
                    <Select value={bankCode} onValueChange={setBankCode}>
                      <SelectTrigger id="bankSelect" className="h-10">
                        <SelectValue placeholder="Chọn ngân hàng..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {VIETNAM_BANKS.map((b) => (
                          <SelectItem key={b.code} value={b.code} className="py-2">
                            <div className="flex items-center gap-2.5">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{b.shortName}</span>
                              <span className="text-xs text-muted-foreground truncate">({b.name})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Số tài khoản */}
                  <div className="space-y-1.5">
                    <Label htmlFor="accountNumber" className="text-xs font-semibold uppercase text-muted-foreground">
                      Số tài khoản ngân hàng <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="accountNumber"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
                        placeholder="VD: 0987654321, 1903..."
                        className="pl-9 font-mono font-medium"
                      />
                    </div>
                  </div>

                  {/* Tên chủ tài khoản */}
                  <div className="space-y-1.5">
                    <Label htmlFor="accountHolder" className="text-xs font-semibold uppercase text-muted-foreground">
                      Tên chủ tài khoản (In hoa không dấu) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="accountHolder"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      onBlur={(e) => setAccountHolder(sanitizeAccountHolder(e.target.value))}
                      placeholder="VD: NGUYEN VAN A"
                      className="uppercase font-semibold tracking-wide"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={updateBankInfo.isPending}
                      variant="outline"
                      className="w-full gap-2 font-semibold"
                    >
                      {updateBankInfo.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Lưu thông tin tài khoản doanh nghiệp
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* ── Cột phải: Cổng thanh toán trực tuyến Stripe (5 cols) ── */}
          <div className="space-y-6 lg:col-span-5">
            <Card className="sticky top-20 border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-600/10 via-purple-500/10 to-transparent pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <CardTitle className="text-base font-semibold">Cổng thanh toán Stripe</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Đang hoạt động
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Xử lý thanh toán trực tuyến tự động cho toàn bộ hệ thống POS, Store 3D và Thu nợ
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {/* Feature highlight card */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Tính năng thanh toán</span>
                  </div>

                  <ul className="space-y-2 text-xs text-foreground/80">
                    <li className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Stripe Checkout QR Code:</strong> Khách quét mã thanh toán tức thì bằng ứng dụng ngân hàng.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Thẻ quốc tế & Ví điện tử:</strong> Hỗ trợ Visa, MasterCard, JCB, Apple Pay, Google Pay.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Đối soát Real-time:</strong> Polling 2s và Webhook tự động ghi nhận tiền vào không cần kiểm tra thủ công.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Khóa chống chốt khống:</strong> Nút xác nhận bị khóa tuyệt đối cho đến khi tiền thực sự đã vào tài khoản.</span>
                    </li>
                  </ul>
                </div>

                {/* Security Standards */}
                <div className="space-y-2 rounded-lg border bg-background p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                      Chuẩn bảo mật:
                    </span>
                    <span className="font-semibold text-foreground">PCI-DSS Level 1 & SSL 256-bit</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Globe2 className="h-3.5 w-3.5 text-slate-500" />
                      Tiền tệ xử lý:
                    </span>
                    <span className="font-semibold text-foreground">VND & Đa ngoại tệ</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                      Phân hệ áp dụng:
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">POS 2D · Showroom 3D · Thu nợ</span>
                  </div>
                </div>

                {/* Account info summary */}
                {bankCode && accountNumber && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
                    <span className="text-muted-foreground block text-[11px] font-medium">Tài khoản kế toán đã lưu:</span>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{selectedBank?.shortName} - {accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(accountNumber, "Số tài khoản")}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
                      >
                        {copied === "Số tài khoản" ? (
                          <span className="text-emerald-500 flex items-center gap-0.5"><Check className="h-3 w-3" /> Đã chép</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><Copy className="h-3 w-3" /> Sao chép</span>
                        )}
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground block uppercase font-mono">{accountHolder}</span>
                  </div>
                )}

                {/* Link to Stripe Dashboard */}
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  >
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      Truy cập Stripe Dashboard <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
