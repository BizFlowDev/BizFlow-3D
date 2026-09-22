"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  QrCode,
  Save,
  Check,
  Copy,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Building2,
  Info,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  VIETNAM_BANKS,
  generateVietQRUrl,
  getBankByCode,
  sanitizeAccountHolder,
} from "@/lib/vietqr";
import { useSystemConfig, useUpdateSystemConfig } from "@/hooks/useAdmin";
import { useQueryClient } from "@tanstack/react-query";

export function PaymentQrSettingsSection() {
  const { data: configs, isLoading, refetch, isFetching } = useSystemConfig();
  const { mutate: updateConfig, isPending: isSaving } = useUpdateSystemConfig();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Form State
  const [bankCode, setBankCode] = useState<string>("MB");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");
  const [memoPrefix, setMemoPrefix] = useState<string>("BF");

  // Demo Preview State
  const [demoAmount, setDemoAmount] = useState<number>(499000);
  const [demoStoreCode, setDemoStoreCode] = useState<string>("SHOP123");
  const [copied, setCopied] = useState<string | null>(null);

  // Sync from loaded system configs
  useEffect(() => {
    if (configs && configs.length > 0) {
      const getCfg = (k: string) => configs.find((c) => c.key === k)?.value;

      const loadedBank = getCfg("payment.bank_code");
      const loadedAcc = getCfg("payment.bank_account_number");
      const loadedHolder = getCfg("payment.bank_account_holder");
      const loadedPrefix = getCfg("payment.bank_memo_prefix");

      if (loadedBank) setBankCode(loadedBank);
      if (loadedAcc) setAccountNumber(loadedAcc);
      if (loadedHolder) setAccountHolder(loadedHolder);
      if (loadedPrefix) setMemoPrefix(loadedPrefix);
    }
  }, [configs]);

  const selectedBank = getBankByCode(bankCode);

  const demoMemo = `${memoPrefix || "BF"} ${demoStoreCode} PRO 1M`;

  const previewQrUrl = generateVietQRUrl({
    bankCode,
    accountNumber,
    accountName: accountHolder,
    amount: demoAmount,
    memo: demoMemo,
    template: "compact2",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankCode) {
      showToast("error", "Vui lòng chọn ngân hàng thụ hưởng");
      return;
    }
    if (!accountNumber.trim()) {
      showToast("error", "Vui lòng nhập số tài khoản ngân hàng");
      return;
    }
    if (!accountHolder.trim()) {
      showToast("error", "Vui lòng nhập tên chủ tài khoản");
      return;
    }

    const payload = [
      { key: "payment.bank_code", value: bankCode },
      { key: "payment.bank_account_number", value: accountNumber.trim() },
      { key: "payment.bank_account_holder", value: sanitizeAccountHolder(accountHolder) },
      { key: "payment.bank_memo_prefix", value: (memoPrefix || "BF").trim().toUpperCase() },
    ];

    updateConfig(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["stores", "subscription-payment-bank"] });
        showToast("success", "Cập nhật thành công!", "Tài khoản VietQR nhận tiền gói dịch vụ đã được lưu trên toàn hệ thống.");
      },
      onError: (err: any) => {
        showToast("error", "Lưu cấu hình thất bại", err?.message || "Có lỗi xảy ra");
      },
    });
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopied(fieldName);
    setTimeout(() => setCopied(null), 2000);
    showToast("info", `Đã sao chép ${fieldName}`);
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <Skeleton className="h-[460px] lg:col-span-7 rounded-xl" />
        <Skeleton className="h-[460px] lg:col-span-5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* ── Cột trái: Cấu hình tài khoản VietQR (7 cols) ── */}
      <div className="space-y-6 lg:col-span-7">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Tài khoản nhận thanh toán gói (VietQR)</CardTitle>
                  <CardDescription className="text-xs">
                    Cấu hình tài khoản ngân hàng để các Chủ cửa hàng (Owner) chuyển khoản khi nâng cấp/gia hạn gói
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Tải lại dữ liệu"
                >
                  <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                </Button>
                <Badge variant="secondary" className="text-xs font-semibold text-blue-600 bg-blue-500/10 border-blue-500/20">
                  Chuẩn Napas247
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleSave} className="space-y-4">
              {/* Chọn Ngân hàng */}
              <div className="space-y-1.5">
                <Label htmlFor="adminBankSelect" className="text-xs font-semibold uppercase text-muted-foreground">
                  Ngân hàng thụ hưởng trung tâm <span className="text-red-500">*</span>
                </Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger id="adminBankSelect" className="h-10">
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
                <Label htmlFor="adminAccountNumber" className="text-xs font-semibold uppercase text-muted-foreground">
                  Số tài khoản ngân hàng nhận tiền <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="adminAccountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ""))}
                    placeholder="VD: 099988889999, 1903..."
                    className="pl-9 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Tên chủ tài khoản */}
              <div className="space-y-1.5">
                <Label htmlFor="adminAccountHolder" className="text-xs font-semibold uppercase text-muted-foreground">
                  Tên chủ tài khoản / Công ty (In hoa không dấu) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adminAccountHolder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  onBlur={(e) => setAccountHolder(sanitizeAccountHolder(e.target.value))}
                  placeholder="VD: CONG TY CONG NGHE BIZFLOW"
                  className="uppercase font-semibold tracking-wide"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tên sẽ được in hoa không dấu chuẩn định dạng ngân hàng Napas247
                </p>
              </div>

              {/* Tiền tố nội dung chuyển khoản */}
              <div className="space-y-1.5">
                <Label htmlFor="adminMemoPrefix" className="text-xs font-semibold uppercase text-muted-foreground">
                  Tiền tố nội dung chuyển khoản (Prefix)
                </Label>
                <Input
                  id="adminMemoPrefix"
                  value={memoPrefix}
                  onChange={(e) => setMemoPrefix(e.target.value.replace(/\s+/g, "").toUpperCase())}
                  placeholder="VD: BF, BIZFLOW, UPGRADE"
                  className="font-mono font-bold uppercase tracking-wider"
                />
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống tự động ghép theo cấu trúc: <code>[TIỀN TỐ] [MÃ CỬA HÀNG] [TÊN GÓI] [SỐ THÁNG]M</code>
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Lưu cấu hình VietQR thanh toán
                </Button>
              </div>
            </form>

            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Cơ chế hoạt động:</span> Khi bất kỳ Chủ cửa hàng (Owner) nào bấm <strong>Nâng cấp gói</strong> trên thanh Header hoặc trang Bán hàng, mã QR VietQR sẽ tự động lấy thông tin tài khoản bạn vừa cấu hình ở đây để hiển thị. Tiền thanh toán sẽ chuyển thẳng vào tài khoản này.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Cột phải: Xem trước mã VietQR trung tâm (5 cols) ── */}
      <div className="space-y-6 lg:col-span-5">
        <Card className="sticky top-20 border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-blue-600/10 via-indigo-500/10 to-transparent pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base font-semibold">Xem trước mã QR Owner quét</CardTitle>
              </div>
              <Badge variant="outline" className="text-[11px] bg-background">
                Real-time
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Mã QR này sẽ hiển thị trong Modal &quot;Nâng cấp gói&quot; của các Chủ cửa hàng
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
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
                    src={previewQrUrl}
                    alt="Mã VietQR hệ thống xem trước"
                    className="max-h-[280px] w-auto rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </motion.div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <QrCode className="mx-auto h-12 w-12 opacity-30" />
                  <p className="mt-2 text-sm">Vui lòng chọn Ngân hàng và nhập Số tài khoản</p>
                </div>
              )}

              {/* Thông tin tài khoản dạng text */}
              {bankCode && accountNumber && (
                <div className="mt-4 w-full space-y-2 rounded-lg border bg-background p-3 text-left text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ngân hàng:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {selectedBank?.shortName || bankCode}
                    </span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nội dung mẫu:</span>
                    <span className="font-mono font-bold text-primary truncate max-w-[170px]">{demoMemo}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Khung Test thử số tiền */}
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Thử nghiệm quét QR thực tế
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Số tiền thử nghiệm</Label>
                  <Input
                    type="number"
                    min={0}
                    step={100000}
                    value={demoAmount}
                    onChange={(e) => setDemoAmount(Number(e.target.value))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Mã Shop test</Label>
                  <Input
                    value={demoStoreCode}
                    onChange={(e) => setDemoStoreCode(e.target.value)}
                    className="h-8 text-xs font-mono uppercase"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Quét thử bằng ứng dụng ngân hàng trên điện thoại để kiểm tra tính chính xác của tài khoản và tên thụ hưởng.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
