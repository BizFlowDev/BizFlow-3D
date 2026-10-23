"use client";

import { useEffect, useState } from "react";
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
  Save,
  ShieldCheck,
  Loader2,
  Store,
  Zap,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  VIETNAM_BANKS,
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

  const [activeTab, setActiveTab] = useState<"store" | "bank" | "stripe">("store");

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
        phone: storePhone || null,
        address: storeAddress || null,
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
                Thiết lập thông tin cửa hàng, tài khoản kế toán và cổng thanh toán Stripe
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/10">
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
          <button
            type="button"
            onClick={() => setActiveTab("bank")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "bank"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Tài Khoản Kế Toán
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stripe")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "stripe"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4" />
            Cổng Stripe
          </button>
        </div>

        {activeTab === "store" ? (
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
              <Label className="text-xs text-slate-300">Hotline / Số điện thoại</Label>
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
                placeholder="Tầng 1, Tòa nhà BizFlow, Q.1, TP.HCM"
                className="mt-1 border-white/15 bg-slate-900 text-white"
              />
            </div>
            <Button
              onClick={handleSaveStore}
              disabled={updateProfile.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold mt-1"
            >
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : saveSuccess ? (
                <Check className="h-4 w-4 mr-1.5 text-white" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {saveSuccess ? "Đã Lưu Hồ Sơ!" : "Lưu Hồ Sơ Cửa Hàng"}
            </Button>
          </div>
        ) : activeTab === "bank" ? (
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs text-slate-300">Ngân hàng thụ hưởng</Label>
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
              <Label className="text-xs text-slate-300">Số tài khoản ngân hàng</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="VD: 1029384756"
                className="mt-1 border-white/15 bg-slate-900 text-white font-mono"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Tên chủ tài khoản (In hoa không dấu)</Label>
              <Input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                placeholder="VD: NGUYEN VAN A"
                className="mt-1 border-white/15 bg-slate-900 text-white uppercase"
              />
            </div>

            <Button
              onClick={handleSaveBank}
              disabled={updateBankInfo.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold mt-1"
            >
              {updateBankInfo.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : saveSuccess ? (
                <Check className="h-4 w-4 mr-1.5 text-white" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {saveSuccess ? "Đã Lưu Thành Công!" : "Lưu Tài Khoản Kế Toán"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3.5 pt-2 text-xs">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  Cổng Thanh Toán Quốc Tế Stripe
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" /> Đang Hoạt Động
                </Badge>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Tất cả quy trình thanh toán tại Quầy Thu Ngân 3D và Thu nợ khách hàng đã được tích hợp tự động qua Cổng Stripe với mã QR nét cao và đối soát tự động.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5 space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Phương thức hỗ trợ:</span>
                <span className="font-semibold text-white">Stripe QR · Visa · Master · Apple Pay</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Chuẩn bảo mật:</span>
                <span className="font-semibold text-white">PCI-DSS Level 1</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Cơ chế đối soát:</span>
                <span className="font-semibold text-emerald-400">Real-time Polling 2s</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
