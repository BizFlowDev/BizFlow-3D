"use client";

import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FloatingCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  color: "blue" | "cyan" | "indigo" | "emerald";
  delay?: number;
  className?: string;
}

// ── Color Map ─────────────────────────────────────────────────────────────────

const colorMap = {
  blue: {
    bg: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/20",
    icon: "text-blue-400",
    glow: "shadow-blue-500/10",
  },
  cyan: {
    bg: "from-cyan-500/20 to-cyan-600/10",
    border: "border-cyan-500/20",
    icon: "text-cyan-400",
    glow: "shadow-cyan-500/10",
  },
  indigo: {
    bg: "from-indigo-500/20 to-indigo-600/10",
    border: "border-indigo-500/20",
    icon: "text-indigo-400",
    glow: "shadow-indigo-500/10",
  },
  emerald: {
    bg: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-400",
    glow: "shadow-emerald-500/10",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FloatingCard({
  icon: Icon,
  title,
  value,
  trend,
  trendUp,
  color,
  delay = 0,
  className = "",
}: FloatingCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -8, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay + 0.6,
        },
      }}
      className={`group relative ${className}`}
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl border ${colors.border}
          bg-gradient-to-br ${colors.bg} backdrop-blur-xl
          px-5 py-4 shadow-lg ${colors.glow}
          transition-all duration-300
          hover:scale-105 hover:shadow-xl
        `}
      >
        {/* Subtle shimmer effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        <div className="relative flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ${colors.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-400">
              {title}
            </p>
            <p className="text-lg font-bold text-white">{value}</p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          )}
          <span
            className={`text-xs font-medium ${
              trendUp ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend}
          </span>
          <span className="text-xs text-slate-500">so với tháng trước</span>
        </div>
      </div>
    </motion.div>
  );
}
