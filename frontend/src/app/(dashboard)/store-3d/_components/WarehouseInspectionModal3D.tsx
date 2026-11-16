"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  ClipboardList,
  Barcode,
  Search,
  ExternalLink,
  Package,
  Layers,
  Sparkles,
  ArrowDownToLine,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { useSpatialModalClose } from "./useSpatialModalClose";
import { Modal3DCard } from "./Modal3DCard";
import { useInventoryCatalog, type InventoryProduct, useStockLevel } from "@/hooks/useInventory";

interface WarehouseInspectionModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductId?: string | null;
  onOpenEditProduct3D: (productId: string) => void;
  onOpenImport3D: (productId: string) => void;
}

export function WarehouseInspectionModal3D({
  isOpen,
  onClose: requestClose,
  preselectedProductId,
  onOpenEditProduct3D,
  onOpenImport3D,
}: WarehouseInspectionModal3DProps) {
  const { close: onClose, closing } = useSpatialModalClose(isOpen, requestClose);
  const { data: catalog = [] } = useInventoryCatalog();
  const { data: stockItems = [] } = useStockLevel();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Chọn sản phẩm ban đầu
  const currentProduct = useMemo<InventoryProduct | null>(() => {
    if (!catalog || catalog.length === 0) return null;
    const targetId = preselectedProductId || selectedProductId;
    return catalog.find((p) => p.id === targetId) || catalog[0] || null;
  }, [catalog, preselectedProductId, selectedProductId]);

  const currentStockRow = useMemo(() => {
    if (!stockItems || !currentProduct) return null;
    return stockItems.find((s) => s.productId === currentProduct.id) || null;
  }, [stockItems, currentProduct]);

  if (!isOpen) return null;

  const filteredProducts = catalog.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const stockNow = currentStockRow?.currentStock ?? currentProduct?.currentStock ?? 0;
  const minSafe = currentStockRow?.minStock ?? 10;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:justify-end sm:pr-10 md:pr-14 p-4 overflow-hidden animate-in fade-in duration-300">
      <div
        className="pointer-events-auto fixed inset-0 -z-10 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-auto w-full max-w-lg">
        <Modal3DCard closing={closing}
          className="w-full my-auto border-sky-400/40 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(56,189,248,0.22)]"
          accentGlowColor="rgba(56, 189, 248, 0.45)"
          isFloating={true}
          showTechCorners={true}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-sky-400/20 bg-slate-950/85 px-5 py-3 text-[11px]"
            style={{ transform: "translateZ(30px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider uppercase text-sky-400 text-[11px]">
                  BÀN KIỂM HÀNG &bull; TRẠM SOÁT MÃ VẠCH QC 3D
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Máy quét laser &bull; Soát quy cách vật tư
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Đóng bàn kiểm hàng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div
            className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {/* Bộ chọn sản phẩm kiểm hàng */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs text-slate-300 hover:border-sky-400/40 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-sky-400" />
                  <span className="line-clamp-1">
                    {currentProduct ? `Đang soát: ${currentProduct.name}` : "Chọn sản phẩm để kiểm..."}
                  </span>
                </span>
                <span className="text-[10px] text-sky-400 font-semibold uppercase">Đổi kiện</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-sky-500/30 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên hoặc mã SKU..."
                      className="w-full rounded-lg border border-white/10 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none"
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
                          p.id === (currentProduct?.id)
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
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

            {/* Chi tiết thông số kiểm định */}
            {currentProduct && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs text-slate-400">Tên vật phẩm:</span>
                  <span className="text-xs font-bold text-white text-right max-w-[60%]">
                    {currentProduct.name}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs text-slate-400">Mã SKU / Barcode:</span>
                  <span className="text-xs font-mono font-bold text-sky-300">
                    {currentProduct.code}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs text-slate-400">Phân loại danh mục:</span>
                  <span className="text-xs text-slate-200">
                    {currentProduct.categoryName || "Chưa phân loại"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs text-slate-400">Vị trí lưu kho 3D:</span>
                  <span className="text-xs font-mono font-semibold text-amber-300">
                    KỆ CÔNG NGHIỆP • DÃY A / B
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Quy cách đơn vị tính:</span>
                  <div className="text-right text-xs space-y-0.5">
                    {currentProduct.units && currentProduct.units.length > 0 ? (
                      currentProduct.units.map((u) => (
                        <div key={u.id} className="text-slate-300 font-mono">
                          1 {u.unitName} = {u.conversionFactor} Cái
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 font-mono">1 Cái (Mặc định)</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hai nút hành động liên kết trạm 3D */}
            {currentProduct && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditProduct3D(currentProduct.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-600/30 hover:bg-sky-600/50 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.01] active:scale-95"
                >
                  <Pencil className="h-4 w-4 text-sky-300" />
                  <span>CHỈNH SỬA THÔNG SỐ TOÀN DIỆN (BÀN 3D)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenImport3D(currentProduct.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-600/20 hover:bg-amber-600/35 py-2.5 text-xs font-semibold text-amber-200 transition-all hover:scale-[1.01] active:scale-95"
                >
                  <ArrowDownToLine className="h-4 w-4 text-amber-300" />
                  <span>Chuyển Sang Trạm Nhập Kho Với Kiện Này</span>
                </button>
              </div>
            )}
          </div>
        </Modal3DCard>
      </div>
    </div>
  );
}
