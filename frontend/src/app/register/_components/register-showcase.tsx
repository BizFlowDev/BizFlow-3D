"use client";

import { motion } from "motion/react";
import {
  Sparkles,
  Store,
  ShoppingCart,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Layers,
  Clock,
} from "lucide-react";
import Image from "next/image";

const benefits = [
  {
    icon: ShoppingCart,
    title: "Bán hàng POS trực quan",
    desc: "Tạo đơn hàng nhanh chóng, tích hợp quầy thu ngân 3D và hóa đơn PDF.",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
  },
  {
    icon: FileSpreadsheet,
    title: "Kế toán tự động",
    desc: "Tự động sinh sổ sách thu chi, giá vốn COGS và báo cáo thuế chuẩn luật.",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
  },
  {
    icon: Layers,
    title: "Gian hàng 3D tương tác",
    desc: "Mô phỏng kệ hàng và cửa hàng 3D sống động trực tiếp trên trình duyệt.",
    color: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400",
  },
  {
    icon: TrendingUp,
    title: "Quản lý kho & nợ khách hàng",
    desc: "Kiểm soát tồn kho real-time, theo dõi công nợ và mã VietQR động.",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
  },
];

export function RegisterShowcase() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-8 lg:p-12 xl:p-16">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-lg shadow-blue-500/25">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">BizFlow 3D</span>
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                PRO PLATFORM
              </span>
            </div>
            <p className="text-xs text-slate-400">Nền tảng chuyển đổi số hộ kinh doanh</p>
          </div>
        </div>

        {/* Hero Pitch */}
        <div className="mt-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-400 mb-4"
          >
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            14 ngày trải nghiệm trọn gói miễn phí
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl"
          >
            Khởi đầu số hóa cửa hàng của bạn ngay hôm nay
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-3 text-sm text-slate-300 leading-relaxed"
          >
            Không cần kiến thức kế toán hay phần mềm phức tạp. BizFlow 3D giúp bạn tự động hóa bán hàng, quản lý kho và báo cáo thuế chỉ trong một nền tảng.
          </motion.p>
        </div>

        {/* 4 Feature Cards */}
        <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-all hover:bg-white/[0.07] hover:border-white/20"
              >
                <div className={`mb-3 inline-flex rounded-lg border p-2 bg-gradient-to-br ${b.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">{b.title}</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Trust & Guarantee Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-8 rounded-xl border border-white/10 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/40 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Không rủi ro, không ràng buộc thẻ</h4>
            <p className="text-[11px] text-slate-400">
              Đăng ký kích hoạt ngay lập tức trong 30 giây. Toàn bộ dữ liệu được mã hóa và bảo mật chuẩn ngân hàng.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
