"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatColor = "blue" | "emerald" | "amber" | "red" | "violet" | "cyan";

export interface StatTrend {
  /** % thay đổi so với kỳ trước */
  value: number;
  label: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color?: StatColor;
  /** Thay đổi so với kỳ trước — badge xanh nếu tăng, đỏ nếu giảm */
  trend?: StatTrend;
  /** Dòng mô tả phụ bên dưới value */
  sub?: string;
  /** Link điều hướng (VD: Pending Drafts → /ai-orders) */
  href?: string;
  /** Stagger delay (giây) cho animation */
  index?: number;
  loading?: boolean;
}

const COLOR_CONFIG: Record<
  StatColor,
  { icon: string; bar: string; glow: string }
> = {
  blue: {
    icon: "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30",
    bar: "from-blue-500 to-cyan-500",
    glow: "hover:shadow-blue-500/10",
  },
  emerald: {
    icon: "bg-gradient-to-br from-emerald-500 to-green-400 text-white shadow-lg shadow-emerald-500/30",
    bar: "from-emerald-500 to-green-400",
    glow: "hover:shadow-emerald-500/10",
  },
  amber: {
    icon: "bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-lg shadow-amber-500/30",
    bar: "from-amber-500 to-orange-400",
    glow: "hover:shadow-amber-500/10",
  },
  red: {
    icon: "bg-gradient-to-br from-red-500 to-rose-400 text-white shadow-lg shadow-red-500/30",
    bar: "from-red-500 to-orange-400",
    glow: "hover:shadow-red-500/10",
  },
  violet: {
    icon: "bg-gradient-to-br from-violet-500 to-purple-400 text-white shadow-lg shadow-violet-500/30",
    bar: "from-violet-500 to-purple-400",
    glow: "hover:shadow-violet-500/10",
  },
  cyan: {
    icon: "bg-gradient-to-br from-cyan-500 to-teal-400 text-white shadow-lg shadow-cyan-500/30",
    bar: "from-cyan-500 to-teal-400",
    glow: "hover:shadow-cyan-500/10",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  trend,
  sub,
  href,
  index = 0,
  loading = false,
}: StatCardProps) {
  const config = COLOR_CONFIG[color];
  const isUp = (trend?.value ?? 0) >= 0;

  const content = (
    <Card
      className={cn(
        "group relative h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        config.glow,
      )}
    >
      <CardContent className="flex h-full flex-col p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className={cn("shrink-0 rounded-xl p-2.5", config.icon)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-2 truncate text-2xl font-bold tracking-tight">
              {value}
            </p>

            <div className="mt-auto flex items-center gap-2 pt-2">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    isUp
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
                  )}
                >
                  {isUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isUp ? "+" : ""}
                  {trend.value.toLocaleString("vi-VN")}%
                </span>
              )}
              {sub && (
                <span className="truncate text-xs text-muted-foreground">
                  {sub}
                </span>
              )}
            </div>

            {href && (
              <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 transition-colors group-hover:gap-1.5 dark:text-blue-400">
                Xem chi tiết
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            )}
          </>
        )}
      </CardContent>

      {/* Decorative bottom gradient */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r",
          config.bar,
        )}
      />
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
      className="h-full"
    >
      {href ? (
        <Link href={href} className="block h-full">
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.div>
  );
}
