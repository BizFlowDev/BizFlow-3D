"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Check,
  CreditCard,
  QrCode,
  Save,
  ShieldCheck,
  Loader2,
  Store,
} from "lucide-react";
import {
  VIETNAM_BANKS,
  generateVietQRUrl,
  sanitizeAccountHolder,
} from "@/lib/vietqr";
import {
  useCurrentStore,
  useUpdateStoreBankInfo,
  useUpdateStoreProfile,
} from "@/hooks/useStore";

interface OfficeSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfficeSettingsModal({
  open,
  onOpenChange,
}: OfficeSettingsModalProps) {
  const { data: store, isLoading } = useCurrentStore();
  const updateBankInfo = useUpdateStoreBankInfo();
  const updateProfile = useUpdateStoreProfile();

  const [activeTab, setActiveTab] = useState<"vietqr" | "store">("vietqr");

  // Bank Info state
  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>("");

  // Store profile state
  const [storeName, setStoreName] = useState<string>("");
  const [storePhone, setStorePhone] = useState<string>("");
  const [storeAddress, setStoreAddress] = useState<string>("");

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (store) {
      setBankCode(store.bankCode || "VCB");
      setAccountNumber(store.bankAccountNumber || "");
      setAccountHolder(store.bankAccountHolder || "");
      setStoreName(store.name || "");
      setStorePhone(store.phone || "");
      setStoreAddress(store.address || "");
    }
  }, [store]);

  const previewQR =
    bankCode && accountNumber && accountHolder
      ? generateVietQRUrl({
          bankCode,
          accountNumber,
          accountName: sanitizeAccountHolder(accountHolder),
          amount: 100000,
          memo: "THANH TOAN BIZFLOW",
        })
      : null;

  const handleSaveBank = async () => {
    try {
      await updateBankInfo.mutateAsync({
        bankCode,
        bankAccountNumber: accountNumber,
        bankAccountHolder: sanitizeAccountHolder(accountHolder),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      // handled by mutation error
    }
  };

  const handleSaveStore = async () => {
    try {
      await updateProfile.mutateAsync({
        name: storeName,
        phone: storePhone,
        address: storeAddress,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      // handled by mutation error
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/20 bg-slate-950/95 text-white backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Bàn Giám Đốc &bull; Cấu Hình Doanh Nghiệp
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Thiết lập tài khoản nhận tiền VietQR và thông tin cửa hàng
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("vietqr")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "vietqr"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="h-4 w-4" />
            Tài Khoản VietQR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "store"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Store className="h-4 w-4" />
            Hồ Sơ Cửa Hàng
          </button>
        </div>

        {activeTab === "vietqr" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-300">Ngân hàng</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger className="mt-1 border-white/15 bg-slate-900 text-white">
                    <SelectValue placeholder="Chọn ngân hàng" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-slate-900 border-white/15 text-white">
                    {VIETNAM_BANKS.map((b) => (
                      <SelectItem key={b.code} value={b.code}>
                        {b.shortName} - {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Số tài khoản</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="VD: 1029384756"
                  className="mt-1 border-white/15 bg-slate-900 text-white"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Tên chủ tài khoản</Label>
                <Input
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="VD: NGUYEN VAN A"
                  className="mt-1 border-white/15 bg-slate-900 text-white"
                />
              </div>

              <Button
                onClick={handleSaveBank}
                disabled={updateBankInfo.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {updateBankInfo.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : saveSuccess ? (
                  <Check className="h-4 w-4 mr-1.5 text-white" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                {saveSuccess ? "Đã Lưu Thành Công!" : "Lưu Thông Tin VietQR"}
              </Button>
            </div>

            {/* QR Preview Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center">
              {previewQR ? (
                <>
                  <div className="rounded-xl bg-white p-2 shadow-xl">
                    <img
                      src={previewQR}
                      alt="VietQR Preview"
                      className="h-36 w-36 object-contain"
                    />
                  </div>
                  <Badge className="mt-2.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3 mr-1" /> NAPAS 24/7 Chuẩn
                  </Badge>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Mã QR thanh toán tự động cho khách tại quầy POS
                  </p>
                </>
              ) : (
                <div className="text-center text-slate-400 text-xs py-8">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-40 text-emerald-400" />
                  Nhập đủ thông tin để tạo mã VietQR
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs text-slate-300">Tên cửa hàng / Hộ kinh doanh</Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="BizFlow Store"
                className="mt-1 border-white/15 bg-slate-900 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Số điện thoại liên hệ</Label>
              <Input
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="0901234567"
                className="mt-1 border-white/15 bg-slate-900 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Địa chỉ kinh doanh</Label>
              <Input
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Số 123 Đường ABC, Quận XYZ"
                className="mt-1 border-white/15 bg-slate-900 text-white"
              />
            </div>

            <Button
              onClick={handleSaveStore}
              disabled={updateProfile.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : saveSuccess ? (
                <Check className="h-4 w-4 mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {saveSuccess ? "Đã Lưu Thành Công!" : "Lưu Hồ Sơ Cửa Hàng"}
            </Button>
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/15 text-slate-300 hover:bg-white/10"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
