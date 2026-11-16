"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import apiClient, { type ApiResponseData } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Preview {
  fingerprint: string;
  actions: { kind: "verify" | "backfill" | "refresh_debt"; id: string; sourceType: string; before?: number; after?: number }[];
  unresolved: { id: string; sourceType: string; reason: string }[];
  auditId?: string | null;
  lastRun?: { auditId: string; verified: number; backfilled: number; refreshedDebt: number };
}
const money = (value: number) => new Intl.NumberFormat("vi-VN", {style:"currency",currency:"VND",maximumFractionDigits:0}).format(value);

export default function AccountingReconciliation() {
  const user = useAuthStore(state=>state.user);
  const queryClient = useQueryClient();
  const [open,setOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const [preview,setPreview] = useState<Preview | null>(null);
  const [applied,setApplied] = useState(false);
  const [error,setError] = useState<string | null>(null);
  if (!user || !["owner","manager"].includes(user.role)) return null;

  async function inspect() {
    setOpen(true);setBusy(true);setError(null);setPreview(null);setApplied(false);
    try {
      const {data}=await apiClient.get<ApiResponseData<Preview>>("/accounting/reconciliation",{timeout:120000});
      if (!data.data) throw new Error("Không tải được kết quả đối soát");
      setPreview(data.data);
    } catch(e) { setError(e instanceof Error ? e.message : "Không thể kiểm tra dữ liệu"); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!preview || busy) return;
    setBusy(true);setError(null);
    try {
      const {data}=await apiClient.post<ApiResponseData<Preview>>("/accounting/reconciliation",{fingerprint:preview.fingerprint},{timeout:120000});
      if (!data.data) throw new Error("Chưa nhận được kết quả xử lý. Hãy xem trước đối soát lại để kiểm tra trạng thái.");
      setPreview(data.data);setApplied(true);
      await Promise.all(["accounting","customers","customer","debts","dashboard"].map(key=>queryClient.invalidateQueries({queryKey:[key]})));
    } catch(e) { setError(e instanceof Error ? `${e.message}. Xem trước lại để kiểm tra dữ liệu hiện tại trước khi thử tiếp.` : "Không thể xử lý dữ liệu"); }
    finally { setBusy(false); }
  }
  const verificationCount=preview?.actions.filter(a=>a.kind==="verify").length ?? 0;
  const backfillCount=preview?.actions.filter(a=>a.kind==="backfill").length ?? 0;
  const debtCount=preview?.actions.filter(a=>a.kind==="refresh_debt").length ?? 0;
  return <>
    <Button type="button" variant="outline" size="sm" onClick={inspect}><ShieldCheck className="mr-2 h-4 w-4" />Đối soát dữ liệu cũ</Button>
    <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl" onEscapeKeyDown={event=>{if(busy)event.preventDefault();}} onPointerDownOutside={event=>{if(busy)event.preventDefault();}}>
        <DialogHeader><DialogTitle>Đối soát dữ liệu cũ</DialogTitle><DialogDescription>Đối chiếu giao dịch đã lưu với sổ cái. Công cụ không xác nhận chứng từ bên ngoài, không xóa giao dịch và không tự đặt giá vốn còn thiếu.</DialogDescription></DialogHeader>
        {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Đang kiểm tra hoặc xử lý dữ liệu…</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {preview && <div className="space-y-4 text-sm">
          {!applied && preview.lastRun && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs leading-relaxed"><p className="font-semibold">Lần đối soát gần nhất đã xử lý</p><p>{preview.lastRun.verified} giao dịch được đối soát nội bộ · {preview.lastRun.backfilled} đơn được bổ sung ghi sổ · {preview.lastRun.refreshedDebt} số dư khách hàng được đồng bộ.</p><p className="mt-1 break-all text-muted-foreground">Mã lịch sử: {preview.lastRun.auditId}</p></div>}
          <p className="font-semibold">{applied ? "Đã áp dụng và lưu lịch sử đối soát" : "Các thay đổi có thể thực hiện"}</p>
          <ul className="list-inside list-disc space-y-1"><li>Đối soát nội bộ: {verificationCount} giao dịch.</li><li>Bổ sung ghi sổ: {backfillCount} đơn hàng.</li><li>Đồng bộ số dư từ đơn và khoản thu: {debtCount} khách hàng.</li></ul>
          {preview.actions.filter(a=>a.kind!=="verify").map(a=><div key={`${a.kind}:${a.id}`} className="rounded-lg border p-2 text-xs"><p className="font-medium">{a.kind==="backfill" ? "Bổ sung doanh thu/công nợ từ đơn đã xác nhận" : "Đồng bộ số dư công nợ đã lưu"}</p><p className="mt-1 break-all text-muted-foreground">Mã: {a.id}</p>{a.kind==="refresh_debt" && <p className="mt-1">{money(a.before ?? 0)} → {money(a.after ?? 0)}</p>}</div>)}
          {preview.unresolved.length>0 && <div className="space-y-2"><p className="font-medium text-amber-700 dark:text-amber-400">Còn {preview.unresolved.length} giao dịch cần kiểm tra chứng từ</p><ul className="space-y-2">{preview.unresolved.map(item=><li key={`${item.sourceType}:${item.id}`} className="rounded-lg bg-muted/60 p-2 text-xs leading-relaxed"><p>{item.reason}</p><p className="mt-1 break-all text-muted-foreground">Mã: {item.id}</p></li>)}</ul></div>}
          {!preview.actions.length && <p>Không có thay đổi tự động nào cần áp dụng. Các phần thiếu chứng từ vẫn được giữ để đối soát.</p>}
          {applied && preview.auditId && <p className="break-all text-xs text-muted-foreground">Mã lịch sử đối soát: {preview.auditId}</p>}
        </div>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Đóng</Button>{(!preview || error) && <Button type="button" disabled={busy} onClick={inspect}>Xem trước lại</Button>}{preview && !applied && !error && preview.actions.length>0 && <Button type="button" disabled={busy} onClick={apply}>Áp dụng {preview.actions.length} thay đổi</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
