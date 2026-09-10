"use client";

import { CheckCircle2, Sparkles, Receipt, Store, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { getOrderCode, type Order } from "@/hooks/useOrders";
import { printInvoice } from "@/lib/invoice";

interface OrderSuccessModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OrderSuccessModal({
  order,
  isOpen,
  onClose,
}: OrderSuccessModalProps) {
  const router = useRouter();

  if (!isOpen || !order) return null;

  const orderCode = getOrderCode(order);
  const paymentLabels: Record<string, string> = {
    cash: "Tiền mặt",
    qr_code: "Chuyển khoản VietQR",
    debt: "Ghi nợ",
  };

  const handlePrint = async () => {
    try {
      await printInvoice(order);
    } catch (e) {
      console.error("Print invoice error:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 text-white shadow-2xl backdrop-blur-2xl text-center">
        {/* Vòng hào quang thành công */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/30">
          <CheckCircle2 className="h-9 w-9 animate-bounce" />
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
          <Sparkles className="h-3.5 w-3.5" /> Đặt Hàng Thành Công!
        </div>

        <h3 className="mt-2 text-xl font-black text-white">
          Đơn hàng đã được xác nhận
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Đơn hàng đã được lưu vào hệ thống và trừ kho thành công.
        </p>

        {/* Card chi tiết hoá đơn */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-left space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Mã đơn hàng:</span>
            <span className="font-mono font-bold text-sky-400">
              {orderCode}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Hình thức thanh toán:</span>
            <span className="font-semibold text-slate-200">
              {paymentLabels[order.paymentMethod || "cash"] || "Tiền mặt"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Khách hàng:</span>
            <span className="font-semibold text-slate-200">
              {order.customerName || "Khách lẻ"}
            </span>
          </div>

          <div className="border-t border-white/10 pt-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Tổng thanh toán:
            </span>
            <span className="text-lg font-black text-emerald-400 tabular-nums">
              {formatVND(order.finalAmount)}
            </span>
          </div>
        </div>

        {/* Các nút điều hướng */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 py-3 font-bold text-sm text-white shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Printer className="h-4 w-4" />
            In hóa đơn (PDF)
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 py-3 font-bold text-sm text-white shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Store className="h-4 w-4" />
            Tiếp tục mua sắm tại Showroom 3D
          </button>

          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-300 transition-colors"
          >
            <Receipt className="h-3.5 w-3.5" />
            Xem danh sách đơn hàng
          </button>
        </div>
      </div>
    </div>
  );
}
