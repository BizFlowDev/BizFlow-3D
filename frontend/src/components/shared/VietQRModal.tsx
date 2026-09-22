"use client";

import { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface VietQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrUrl?: string | null;
  bankName?: string | null;
  bankShortName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  amount?: number | null;
  memo?: string | null;
  title?: string;
  description?: string;
  confirmButtonText?: string;
  onConfirm?: () => void;
  confirmLoading?: boolean;
}

function formatCurrency(val?: number): string {
  if (typeof val !== "number") return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val);
}

export function VietQRModal({
  open,
  onOpenChange,
  qrUrl,
  bankName,
  bankShortName,
  accountNumber,
  accountHolder,
  amount,
  memo,
  title = "Thanh toán qua mã VietQR",
  description = "Quét mã qua bất kỳ ứng dụng ngân hàng nào (Napas247 miễn phí)",
  confirmButtonText,
  onConfirm,
  confirmLoading = false,
}: VietQRModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const copyText = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadQR = async () => {
    if (!qrUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VietQR_${accountNumber || "payment"}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(qrUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const hasConfig = Boolean(qrUrl && accountNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 max-h-[95vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasConfig ? (
          <div className="space-y-4 pt-1">
            {/* Khung ảnh QR Code nét cao */}
            <div className="flex flex-col items-center justify-center rounded-2xl border bg-muted/20 p-4 text-center">
              <div className="relative rounded-xl bg-white p-3 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl || ""}
                  alt="Mã VietQR thanh toán"
                  className="max-h-[280px] w-auto rounded-lg object-contain"
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between w-full px-2 text-xs">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Napas247 · Chuyển khoản tức thì 24/7
                </span>
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  disabled={downloading}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Tải ảnh QR về máy"
                >
                  <Download className="h-3 w-3" />
                  {downloading ? "Đang tải..." : "Tải ảnh QR"}
                </button>
              </div>
            </div>

            {/* Chi tiết chuyển khoản có nút Copy */}
            <div className="space-y-2 rounded-xl border bg-background p-3.5 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Ngân hàng:</span>
                <span className="font-semibold text-foreground">
                  {bankShortName || bankName || "Napas247"}
                  {bankName && bankShortName ? ` (${bankName})` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground text-sm">
                    {accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(accountNumber || "", "stk")}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === "stk" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {accountHolder && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-semibold uppercase text-foreground">
                    {accountHolder}
                  </span>
                </div>
              )}

              {typeof amount === "number" && amount > 0 && (
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-muted-foreground">Số tiền:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                      {formatCurrency(amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(amount.toString(), "amount")}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      title="Sao chép số tiền"
                    >
                      {copiedField === "amount" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {memo && (
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-muted-foreground">Nội dung CK:</span>
                  <div className="flex items-center gap-2 max-w-[65%]">
                    <span className="font-mono font-semibold truncate bg-muted/60 px-1.5 py-0.5 rounded text-foreground">
                      {memo}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(memo, "memo")}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
                      title="Sao chép nội dung"
                    >
                      {copiedField === "memo" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Nút hành động */}
            <div className="grid gap-2 pt-1">
              {onConfirm && (
                <Button
                  onClick={onConfirm}
                  disabled={confirmLoading}
                  className="h-11 bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500"
                >
                  {confirmLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {confirmButtonText || "Xác nhận đã nhận tiền & Hoàn tất"}
                </Button>
              )}
              <Button
                variant={onConfirm ? "ghost" : "outline"}
                onClick={() => onOpenChange(false)}
                className="h-10 text-xs"
              >
                Đóng cửa sổ
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <p className="text-sm font-semibold">Chưa cấu hình tài khoản VietQR</p>
            <p className="text-xs text-muted-foreground">
              Vui lòng vào Cài đặt để điền thông tin ngân hàng thụ hưởng của cửa hàng.
            </p>
            <Button asChild className="w-full">
              <Link href="/settings">
                Đi đến Cài đặt Cửa hàng
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
