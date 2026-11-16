"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  CheckCircle2,
  ArrowDownToLine,
  Boxes,
  Search,
  Loader2,
  Warehouse,
  Sparkles,
} from "lucide-react";
import {
  useInventoryCatalog,
  useStockLevel,
  useImportStock,
  type InventoryProduct,
  type StockLevelRow,
} from "@/hooks/useInventory";
import { useQueryClient } from "@tanstack/react-query";
import { useSpatialModalClose } from "./useSpatialModalClose";
import { Modal3DCard } from "./Modal3DCard";

interface WarehouseImportModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductId?: string | null;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function WarehouseImportModal3D({
  isOpen,
  onClose: requestClose,
  preselectedProductId,
}: WarehouseImportModal3DProps) {
  const { close: onClose, closing } = useSpatialModalClose(isOpen, requestClose);
  const queryClient = useQueryClient();
  const { data: catalog = [] } = useInventoryCatalog();
  const { data: stockItems = [], refetch: refetchStock } = useStockLevel();
  const importMutation = useImportStock();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [note, setNote] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (preselectedProductId) {
      setSelectedProductId(preselectedProductId);
    } else if (catalog.length > 0 && !selectedProductId) {
      setSelectedProductId(catalog[0].id);
    }
    setShowSuccess(false);
  }, [preselectedProductId, catalog, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const currentProduct = useMemo<InventoryProduct | null>(() => {
    if (!catalog || catalog.length === 0) return null;
    return catalog.find((p) => p.id === selectedProductId) || catalog[0] || null;
  }, [catalog, selectedProductId]);

  const currentStockRow = useMemo<StockLevelRow | null>(() => {
    if (!stockItems || !currentProduct) return null;
    return stockItems.find((s) => s.productId === currentProduct.id) || null;
  }, [stockItems, currentProduct]);

  useEffect(() => {
    if (currentProduct?.units && currentProduct.units.length > 0) {
      const def = currentProduct.units.find((u) => u.isDefault) || currentProduct.units[0];
      setSelectedUnitId(def.id);
      setUnitCost("");
    } else {
      setSelectedUnitId("");
      setUnitCost("");
    }
    setQuantity(10);
  }, [currentProduct]);

  const activeUnit = useMemo(() => {
    if (!currentProduct?.units || currentProduct.units.length === 0) return null;
    return currentProduct.units.find((u) => u.id === selectedUnitId) || currentProduct.units[0];
  }, [currentProduct, selectedUnitId]);

  if (!isOpen) return null;

  const stockNow = currentStockRow?.currentStock ?? currentProduct?.currentStock ?? 0;
  const minSafe = currentStockRow?.minStock ?? 10;
  const isLowStock = stockNow <= minSafe;

  const totalImportCost = (quantity || 0) * (unitCost || 0);

  const filteredProducts = catalog.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const handleQuickAddQty = (amount: number) => {
    setQuantity((q) => Math.max(1, q + amount));
  };

  const handleConfirmImport = async () => {
    if (!currentProduct || !activeUnit) return;
    if (!Number.isFinite(quantity) || quantity <= 0 || unitCost === "" || !Number.isFinite(unitCost) || unitCost < 0) return;

    try {
      await importMutation.mutateAsync({
        productId: currentProduct.id,
        productUnitId: activeUnit.id,
        quantity,
        unitCost,
        note: note.trim() || `Nhập hàng 3D WMS lúc ${new Date().toLocaleTimeString("vi-VN")}`,
      });

      setShowSuccess(true);
      await refetchStock();
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      setTimeout(() => {
        setShowSuccess(false);
      }, 1600);
    } catch {
      // Handled by hook
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:justify-end sm:pr-10 md:pr-14 p-4 overflow-hidden animate-in fade-in duration-300">
      <div
        className="pointer-events-auto fixed inset-0 -z-10 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-auto w-full max-w-lg">
        <Modal3DCard closing={closing}
          className="w-full my-auto border-amber-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.75),0_0_40px_rgba(245,158,11,0.22)]"
          accentGlowColor="rgba(245, 158, 11, 0.45)"
          isFloating={true}
          showTechCorners={true}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-amber-500/20 bg-slate-950/85 px-5 py-3 text-[11px]"
            style={{ transform: "translateZ(30px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider uppercase text-amber-400 text-[11px]">
                  TRẠM TIẾP NHẬN &bull; NHẬP KHO PALLET 3D
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Khu tiếp nhận Dock 01 &bull; {currentProduct?.categoryName || "Hàng Tiêu Dùng"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Đóng trạm nhập kho"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div
            className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 backdrop-blur-md animate-in zoom-in-95 duration-200">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/30 blur-lg animate-pulse" />
                  <CheckCircle2 className="relative h-14 w-14 text-emerald-400" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">Nhập Kho Thành Công!</h3>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Đã bổ sung +{quantity} {activeUnit?.unitName || "đơn vị"} vào kiện hàng trên kệ
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30">
                  <Warehouse className="h-3.5 w-3.5" />
                  <span>Tồn kho mới: {stockNow + quantity}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Thẻ tóm tắt kiện hàng & Trạng thái kệ */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-inner space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-amber-400/30 bg-amber-950/40 flex items-center justify-center shadow-lg">
                        <Boxes className="h-8 w-8 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white line-clamp-1">
                          {currentProduct?.name || "Chọn mặt hàng..."}
                        </h3>
                        <p className="text-xs text-amber-300 font-mono mt-0.5">
                          SKU: {currentProduct?.code || "WH-SKU"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase shrink-0 border ${
                        isLowStock
                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      }`}
                    >
                      {stockNow <= 0 ? "Hết hàng" : isLowStock ? "Tồn thấp" : "Còn hàng"}
                    </span>
                  </div>

                  {/* Số lượng tồn hiện tại */}
                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Tồn kho hiện có:</span>
                      <span className="font-bold text-white font-mono">
                        {stockNow} {activeUnit?.unitName || "Đơn vị"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Mức an toàn: {minSafe}</span>
                    </div>
                  </div>
                </div>

                {/* Bộ chọn sản phẩm khác */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-3.5 py-2 text-xs text-slate-300 hover:border-amber-400/40 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-amber-400" />
                      <span className="line-clamp-1">
                        {currentProduct ? `Đổi sản phẩm: ${currentProduct.name}` : "Chọn sản phẩm khác..."}
                      </span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold uppercase">Thay đổi</span>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-amber-500/30 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Tìm theo tên hoặc SKU..."
                          className="w-full rounded-lg border border-white/10 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                              p.id === selectedProductId
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <span className="line-clamp-1">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">
                              {p.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chọn Đơn vị tính & Số lượng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Đơn vị nhập kho:
                    </label>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                    >
                      {currentProduct?.units?.map((u) => (
                        <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                          {u.unitName} (x{u.conversionFactor})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Số lượng nhập:
                    </label>
                    <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/80 p-0.5">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-transparent text-center text-sm font-bold text-white font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nút cộng nhanh */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400">Cộng nhanh:</span>
                  {[+10, +25, +50, +100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickAddQty(amt)}
                      className="rounded-lg border border-white/10 bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/30 transition-all active:scale-95 font-mono"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                {/* Đơn giá nhập & Thành tiền */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-slate-300 font-medium">Đơn giá nhập (VNĐ):</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-36 rounded-lg border border-white/10 bg-slate-950 px-2.5 py-1 text-right text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs font-semibold text-slate-300">Tổng giá trị lô hàng:</span>
                    <span className="text-base font-extrabold text-amber-400 font-mono">
                      {formatVND(totalImportCost)}
                    </span>
                  </div>
                </div>

                {/* Ghi chú */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Ghi chú tiếp nhận:</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Nhập thêm từ nhà cung cấp, bổ sung kệ A..."
                    className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Nút xác nhận */}
                <button
                  type="button"
                  disabled={importMutation.isPending || !currentProduct || unitCost === "" || !Number.isFinite(unitCost) || unitCost < 0}
                  onClick={handleConfirmImport}
                  className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-3 text-center font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-2">
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                        <span>Đang cập nhật kho...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="h-4 w-4 text-slate-950 stroke-[2.5]" />
                        <span>XÁC NHẬN NHẬP KHO PALLET 3D</span>
                      </>
                    )}
                  </div>
                </button>
              </>
            )}
          </div>
        </Modal3DCard>
      </div>
    </div>
  );
}
