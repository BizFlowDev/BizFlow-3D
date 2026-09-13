"use client";

import {
  Globe,
  Package,
  Store,
  CreditCard,
  Bot,
  RotateCcw,
  MousePointer,
} from "lucide-react";
import type { CameraPreset } from "@/components/3d/CameraController";

interface CameraPresetsBarProps {
  currentPreset: CameraPreset;
  onSelectPreset: (preset: CameraPreset) => void;
}

export function CameraPresetsBar({
  currentPreset,
  onSelectPreset,
}: CameraPresetsBarProps) {
  const presets: {
    id: CameraPreset;
    label: string;
    icon: typeof Globe;
    shortLabel: string;
  }[] = [
      { id: "overview", label: "Toàn cảnh", icon: Globe, shortLabel: "Toàn cảnh" },
      { id: "shelfLeft", label: "Kệ hàng Trái (A)", icon: Package, shortLabel: "Kệ A" },
      { id: "shelfRight", label: "Kệ hàng Phải (B)", icon: Package, shortLabel: "Kệ B" },
      { id: "shelfSideLeft", label: "Kệ Hông Trái (C)", icon: Package, shortLabel: "Kệ C" },
      { id: "shelfSideRight", label: "Kệ Hông Phải (D)", icon: Package, shortLabel: "Kệ D" },
      { id: "posScreen", label: "Màn hình POS", icon: CreditCard, shortLabel: "Màn Hình POS" },
      { id: "avatar", label: "Trợ lý AI", icon: Bot, shortLabel: "Trợ lý AI" },
    ];

  return (
    <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-900/80 p-1.5 shadow-2xl backdrop-blur-xl">
      <div className="hidden sm:flex items-center gap-1 px-2 text-[11px] font-bold text-slate-400 border-r border-white/10 mr-1">
        <span>Góc nhìn:</span>
      </div>

      {presets.map((item) => {
        const Icon = item.icon;
        const isActive = currentPreset === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPreset(item.id)}
            title={item.label}
            className={`group relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
            <span className="hidden md:inline">{item.shortLabel}</span>
          </button>
        );
      })}

      {/* Nút reset về toàn cảnh */}
      <button
        type="button"
        onClick={() => onSelectPreset("overview")}
        title="Đặt lại góc nhìn"
        className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors ml-0.5"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
