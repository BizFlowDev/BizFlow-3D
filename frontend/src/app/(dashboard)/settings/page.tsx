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
  QrCode,
  Save,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
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
  generateVietQRUrl,
  getBankByCode,
  sanitizeAccountHolder,
  formatPaymentMemo,
} from "@/lib/vietqr";
import { useCurrentStore, useUpdateStoreBankInfo, useUpdateStoreProfile } from "@/hooks/useStore";

export default function SettingsPage() {
  const { data: store, isLoading } = useCurrentStore();
  const updateBankInfo = useUpdateStoreBankInfo();
  const updateProfile = useUpdateStoreProfile();
  const { toasts, showToast, dismiss } = useToast();

  // ── State: Bank Settings ──
  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");

  // ── State: Demo QR Preview ──
  const [demoAmount, setDemoAmount] = useState<number>(50000);
  const [demoMemo, setDemoMemo] = useState<string>("BF3D DEMO");
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

  // Selected Bank Object
  const selectedBank = getBankByCode(bankCode);

  // Live QR Preview URL
  const qrPreviewUrl = generateVietQRUrl({
    bankCode,
    accountNumber,
    accountName: accountHolder,
    amount: demoAmount,
    memo: demoMemo,
    template: "compact2",
  });

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

      showToast("success", "Cập nhật thành công!", "Thông tin tài khoản VietQR đã được lưu");
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
          <h1 className="text-2xl font-bold tracking-tight">Cài đặt Cửa hàng</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình thông tin nhận tiền chuyển khoản qua mã QR Napas247 (Miễn phí 100%) và thông tin cửa hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            VietQR Napas247 Chuẩn Quốc Gia
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
          {/* ── Cột trái: Cài đặt Tài khoản VietQR (7 cols) ── */}
          <div className="space-y-6 lg:col-span-7">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Tài khoản nhận tiền (VietQR)</CardTitle>
                      <CardDescription className="text-xs">
                        Mã QR động sẽ tự động sinh khi thanh toán tại quầy POS mà không mất phí dịch vụ
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    0đ Phí giao dịch
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
                    <p className="text-[11px] text-muted-foreground">
                      Hệ thống tự động chuyển thành chữ hoa không dấu chuẩn định dạng ngân hàng Napas
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={updateBankInfo.isPending}
                      className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400"
                    >
                      {updateBankInfo.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Lưu cấu hình VietQR
                    </Button>
                  </div>
                </form>

                {/* Hướng dẫn ngắn */}
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Cơ chế hoạt động:</span> Khi bạn chọn thanh toán mã QR tại quầy POS, hệ thống sẽ tự động chèn đúng số tiền và mã hóa đơn vào mã QR. Khách hàng dùng bất kỳ ứng dụng ngân hàng nào (Vietcombank, MB, Techcombank, MoMo,...) quét mã là tiền sẽ chuyển thẳng vào tài khoản của bạn.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Thông tin chung Cửa hàng ── */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Thông tin cửa hàng</CardTitle>
                    <CardDescription className="text-xs">
                      Tên và thông tin liên hệ hiển thị trên phiếu in hóa đơn bán lẻ
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
                      variant="outline"
                      className="w-full gap-2 font-semibold"
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
          </div>

          {/* ── Cột phải: Live Preview Mã VietQR (5 cols) ── */}
          <div className="space-y-6 lg:col-span-5">
            <Card className="sticky top-20 border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-transparent pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-base font-semibold">Xem trước mã VietQR mẫu</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px] bg-background">
                    Real-time
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Mã QR sẽ hiển thị thế này cho khách hàng quét khi thanh toán
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {/* Khung ảnh QR Code */}
                <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/30 p-4 text-center">
                  {bankCode && accountNumber ? (
                    <motion.div
                      key={`${bankCode}-${accountNumber}-${accountHolder}-${demoAmount}-${demoMemo}`}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="relative rounded-lg bg-white p-2 shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrPreviewUrl}
                        alt="Mã VietQR xem trước"
                        className="max-h-[290px] w-auto rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </motion.div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <QrCode className="mx-auto h-12 w-12 opacity-30" />
                      <p className="mt-2 text-sm">Vui lòng chọn Ngân hàng và nhập Số tài khoản để tạo mã QR</p>
                    </div>
                  )}

                  {/* Thông tin tài khoản dạng text */}
                  {bankCode && accountNumber && (
                    <div className="mt-4 w-full space-y-2 rounded-lg border bg-background p-3 text-left text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ngân hàng:</span>
                        <span className="font-semibold">{selectedBank?.shortName || bankCode}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold">
                          <span>{accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(accountNumber, "Số tài khoản")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copied === "Số tài khoản" ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Chủ tài khoản:</span>
                        <span className="font-semibold uppercase">{accountHolder || "Chưa nhập"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Khung Test thử số tiền & nội dung Demo */}
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Thử nghiệm quét QR
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Số tiền thử nghiệm</Label>
                      <Input
                        type="number"
                        min={0}
                        step={10000}
                        value={demoAmount}
                        onChange={(e) => setDemoAmount(Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Nội dung thử nghiệm</Label>
                      <Input
                        value={demoMemo}
                        onChange={(e) => setDemoMemo(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Bạn có thể mở app ngân hàng trên điện thoại để quét thử ngay mã QR ở trên!
                  </p>
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
