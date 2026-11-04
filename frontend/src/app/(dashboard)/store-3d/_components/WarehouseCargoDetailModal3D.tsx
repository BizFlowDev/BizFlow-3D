"use client";

import { useMemo, useEffect } from "react";
import {
  X,
  Package,
  Boxes,
  ArrowDownToLine,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Barcode,
  Sparkles,
  MapPin,
  Tag,
} from "lucide-react";
import { useSpatialModalClose } from "./useSpatialModalClose";
import { Modal3DCard } from "./Modal3DCard";
import type { StockLevelRow } from "@/hooks/useInventory";
import { useInventoryCatalog } from "@/hooks/useInventory";

export interface CargoLocationInfo {
  aisle: string;
  level: number;
  col: number;
}

interface WarehouseCargoDetailModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  cargoItem: StockLevelRow | null;
  location?: CargoLocationInfo | null;
  onRestock: (productId: string) => void;
  onInspect: (productId: string) => void;
}

export function WarehouseCargoDetailModal3D({
  isOpen,
  onClose: requestClose,
  cargoItem,
  location,
  onRestock,
  onInspect,
}: WarehouseCargoDetailModal3DProps) {
  const { close: onClose, closing } = useSpatialModalClose(isOpen, requestClose);
  const { data: catalog = [] } = useInventoryCatalog();

  const product = useMemo(() => {
    if (!cargoItem) return null;
    return catalog.find((p) => p.id === cargoItem.productId) || null;
  }, [catalog, cargoItem]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cargoItem) return null;

  const current = cargoItem.currentStock ?? 0;
  const min = cargoItem.minStock ?? 10;
  const isLow = current <= min;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:justify-end sm:pr-10 md:pr-14 p-4 overflow-hidden animate-in fade-in duration-300">
      <div
        className="pointer-events-auto fixed inset-0 -z-10 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-auto w-full max-w-md">
        <Modal3DCard closing={closing}
          className="w-full my-auto border-emerald-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.22)]"
          accentGlowColor="rgba(16, 185, 129, 0.45)"
          isFloating={true}
          showTechCorners={true}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-emerald-400/20 bg-slate-950/85 px-5 py-3 text-[11px]"
            style={{ transform: "translateZ(30px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider uppercase text-emerald-400 text-[11px]">
                  THÔNG SỐ Ô KỆ KHO 3D
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {location ? `${location.aisle} • Tầng ${location.level + 1} • Ô ${location.col + 1}` : "Kệ Hàng Công Nghiệp"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Đóng chi tiết kiện hàng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div
            className="p-5 space-y-4 max-h-[78vh] overflow-y-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {/* Thẻ Vị Trí & Tên Kiện */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-emerald-400/30 bg-emerald-950/40 flex items-center justify-center shadow-lg">
                    <Boxes className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {cargoItem.productName}
                    </h3>
                    <p className="text-xs text-emerald-300 font-mono mt-0.5">
                      SKU: {cargoItem.code}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase shrink-0 border ${
                    isLow
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}
                >
                  {current <= 0 ? "Hết hàng" : isLow ? "Tồn thấp" : "Còn hàng"}
                </span>
              </div>

              {/* Vị trí ô kệ */}
              {location && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 px-3 py-1.5 border border-white/5 text-[11px] text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Ô hiển thị ảo: <strong className="text-white">{location.aisle}</strong> &bull; Tầng{" "}
                    <strong className="text-white">{location.level + 1}</strong> &bull; Cột{" "}
                    <strong className="text-white">{location.col + 1}</strong>
                  </span>
                </div>
              )}

              {/* Thanh tồn kho */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tồn kho tại vị trí:</span>
                  <span className="font-bold text-white font-mono">
                    {current} {cargoItem.unitName || "Đơn vị"}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Mức tối thiểu: {min}</span>
                </div>
              </div>
            </div>

            {/* Chi tiết quy đổi & Danh mục */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Danh mục:</span>
                <span className="text-slate-200 font-semibold">
                  {cargoItem.categoryName || "Chung"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Đơn vị lưu kho:</span>
                <span className="text-slate-200 font-mono font-medium">
                  {cargoItem.unitName || "Cái"}
                </span>
              </div>
              {product?.units && product.units.length > 1 && (
                <div className="pt-1.5 border-t border-white/5">
                  <span className="text-[11px] text-slate-400 block mb-1">Quy cách đơn vị:</span>
                  <div className="space-y-1">
                    {product.units.map((u) => (
                      <div key={u.id} className="flex justify-between text-[11px] text-slate-300 font-mono">
                        <span>1 {u.unitName}</span>
                        <span>x{u.conversionFactor} Cái</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hai nút hành động nhanh kết nối các trạm 3D */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRestock(cargoItem.productId);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-600/25 hover:bg-amber-600/40 p-2.5 text-xs font-bold text-amber-200 shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span>Nhập Thêm Kiện</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInspect(cargoItem.productId);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-600/25 hover:bg-sky-600/40 p-2.5 text-xs font-bold text-sky-200 shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Bàn Kiểm Định 3D</span>
              </button>
            </div>
          </div>
        </Modal3DCard>
      </div>
    </div>
  );
}
