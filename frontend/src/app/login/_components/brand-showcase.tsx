"use client";

import { motion } from "motion/react";
import {
  BarChart3,
  ShoppingCart,
  Package,
  ArrowUpRight,
  DollarSign,
} from "lucide-react";
import { FloatingCard } from "./floating-card";

// ── Dashboard Mockup SVG ──────────────────────────────────────────────────────

function DashboardIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative mx-auto w-full max-w-md"
    >
      {/* Main dashboard card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
        {/* Header bar */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
            <div className="h-3 w-3 rounded-full bg-green-400/60" />
          </div>
          <div className="h-5 flex-1 rounded-md bg-white/5 px-3">
            <div className="flex h-full items-center">
              <span className="text-[10px] text-slate-500">
                bizflow3d.app/dashboard
              </span>
            </div>
          </div>
        </div>

        {/* Mini chart */}
        <div className="mb-4 rounded-xl bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Doanh thu tuần
            </span>
            <div className="flex items-center gap-1 text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              <span className="text-xs font-bold">+23%</span>
            </div>
          </div>
          {/* Bar chart visualization */}
          <div className="flex items-end gap-1.5" style={{ height: "60px" }}>
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-500/60 to-cyan-400/40"
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-slate-500">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span>CN</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Đơn hôm nay",
              value: "47",
              icon: ShoppingCart,
              color: "text-blue-400",
            },
            {
              label: "Sản phẩm",
              value: "186",
              icon: Package,
              color: "text-cyan-400",
            },
            {
              label: "Khách hàng",
              value: "1.2K",
              icon: DollarSign,
              color: "text-indigo-400",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1 + i * 0.1 }}
              className="rounded-lg bg-white/5 p-3 text-center"
            >
              <stat.icon className={`mx-auto mb-1 h-4 w-4 ${stat.color}`} />
              <p className="text-sm font-bold text-white">{stat.value}</p>
              <p className="text-[9px] text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Showcase Component ───────────────────────────────────────────────────

export function BrandShowcase() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 py-12 lg:px-12">
      {/* Brand header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white xl:text-4xl">
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            BizFlow 3D
          </span>
        </h1>
        <p className="mx-auto max-w-sm text-base text-slate-400 lg:text-lg">
          Nền tảng chuyển đổi số thông minh
          <br />
          <span className="text-slate-500">cho hộ kinh doanh Việt Nam</span>
        </p>
      </motion.div>

      {/* Dashboard illustration with floating cards */}
      <div className="relative w-full max-w-lg">

        <FloatingCard
          icon={BarChart3}
          title="Doanh thu hôm nay"
          value="12.5M ₫"
          trend="+18.2%"
          trendUp
          color="blue"
          delay={0.8}
          className="absolute -left-8 top-4 z-20 w-52 xl:-left-16"
        />

        <FloatingCard
          icon={ShoppingCart}
          title="Đơn hàng mới"
          value="47"
          trend="+12.5%"
          trendUp
          color="cyan"
          delay={1.0}
          className="absolute -right-6 top-1/3 z-20 w-48 xl:-right-14"
        />

        <FloatingCard
          icon={Package}
          title="Tồn kho thấp"
          value="8 SP"
          trend="-3 SP"
          trendUp={false}
          color="indigo"
          delay={1.2}
          className="absolute -left-4 bottom-12 z-20 w-44 xl:-left-10"
        />

        {/* Dashboard mockup */}
        <DashboardIllustration />
      </div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 2 }}
        className="mt-10 flex items-center gap-6 text-slate-500"
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs">SSL Encrypted</span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-xs">99.9% Uptime</span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-xs">GDPR Ready</span>
        </div>
      </motion.div>
    </div>
  );
}
