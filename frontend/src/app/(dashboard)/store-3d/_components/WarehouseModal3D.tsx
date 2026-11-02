"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  ArrowDownToLine,
  Boxes,
  Layers,
  Search,
  Loader2,
  Coins,
  Warehouse,
  Barcode,
  ExternalLink,
  ShieldCheck,
  Tag,
  Sparkles,
} from "lucide-react";
import {
  useInventoryCatalog,
  useStockLevel,
  useImportStock,
  type InventoryProduct,
  type StockLevelRow,
} from "@/hooks/useInventory";
import { useCategoryList } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";
import { Modal3DCard } from "./Modal3DCard";

interface WarehouseModal3DProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductId?: string | null;
  defaultTab?: "import" | "inspection" | "category";
  onOpenProductFormAdvanced?: () => void;
  onOpenCategoryManageAdvanced?: () => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function WarehouseModal3D({
  isOpen,
  onClose,
  preselectedProductId,
  defaultTab = "import",
  onOpenProductFormAdvanced,
  onOpenCategoryManageAdvanced,
}: WarehouseModal3DProps) {
  const queryClient = useQueryClient();
  const { data: catalog = [], isLoading: isCatalogLoading } = useInventoryCatalog();
  const { data: stockItems = [], refetch: refetchStock } = useStockLevel();
  const { data: categories = [] } = useCategoryList();
  const importMutation = useImportStock();

  const [activeTab, setActiveTab] = useState<"import" | "inspection" | "category">(defaultTab);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Khi modal mở hoặc đổi preselectedProductId
  useEffect(() => {
    if (!isOpen) return;
    if (preselectedProductId) {
      setSelectedProductId(preselectedProductId);
    } else if (catalog.length > 0 && !selectedProductId) {
      setSelectedProductId(catalog[0].id);
    }
    setActiveTab(defaultTab);
    setShowSuccess(false);
  }, [preselectedProductId, catalog, defaultTab, isOpen]);

  // Tìm thông tin sản phẩm và dữ liệu tồn kho hiện tại
  const currentProduct = useMemo<InventoryProduct | null>(() => {
    if (!catalog || catalog.length === 0) return null;
    return catalog.find((p) => p.id === selectedProductId) || catalog[0] || null;
  }, [catalog, selectedProductId]);

  const currentStockRow = useMemo<StockLevelRow | null>(() => {
    if (!stockItems || !currentProduct) return null;
    return stockItems.find((s) => s.productId === currentProduct.id) || null;
  }, [stockItems, currentProduct]);

  // Cập nhật đơn vị mặc định và đơn giá khi đổi sản phẩm
  useEffect(() => {
    if (currentProduct?.units && currentProduct.units.length > 0) {
      const def = currentProduct.units.find((u) => u.isDefault) || currentProduct.units[0];
      setSelectedUnitId(def.id);
      setUnitCost(def.price ? Math.round(def.price * 0.7) : 50000); // Gợi ý giá vốn nhập kho
    } else {
      setSelectedUnitId("");
      setUnitCost(50000);
    }
    setQuantity(10);
  }, [currentProduct]);

  const activeUnit = useMemo(() => {
    if (!currentProduct?.units || currentProduct.units.length === 0) return null;
    return currentProduct.units.find((u) => u.id === selectedUnitId) || currentProduct.units[0];
  }, [currentProduct, selectedUnitId]);

  if (!isOpen) return null;

  // Tính toán số liệu tồn kho
  const stockNow = currentStockRow?.currentStock ?? currentProduct?.currentStock ?? 0;
  const minSafe = currentStockRow?.minStock ?? 10;
  const isLowStock = stockNow <= minSafe;

  const totalImportCost = (quantity || 0) * (unitCost || 0);

  // Lọc sản phẩm cho dropdown tìm kiếm
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
    if (quantity <= 0) return;

    try {
      await importMutation.mutateAsync({
        productId: currentProduct.id,
        productUnitId: activeUnit.id,
        quantity,
        unitCost: unitCost > 0 ? unitCost : undefined,
        note: note.trim() || `Nhập hàng 3D WMS lúc ${new Date().toLocaleTimeString("vi-VN")}`,
      });

      setShowSuccess(true);
      await refetchStock();
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      setTimeout(() => {
        setShowSuccess(false);
      }, 1600);
    } catch {
      // lỗi đã được xử lý bởi query hook
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:justify-end sm:pr-12 md:pr-16 p-4 overflow-hidden animate-in fade-in duration-300">
      {/* Vùng click ra ngoài để đóng modal (trong suốt hoàn toàn không che mờ không gian kho) */}
      <div
        className="pointer-events-auto fixed inset-0 -z-10 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── BẢNG HOLOGRAM KHO HÀNG 3D LƠ LỬNG TRONG KHÔNG GIAN ── */}
      <div className="pointer-events-auto w-full max-w-lg">
        <Modal3DCard
          className="w-full my-auto border-amber-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.75),0_0_40px_rgba(245,158,11,0.2)]"
          accentGlowColor="rgba(245, 158, 11, 0.45)"
          isFloating={true}
          showTechCorners={true}
        >
          {/* ── THANH TIÊU ĐỀ SPATIAL WMS HUD ── */}
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
                  BIZFLOW WMS 3D • KHO HÀNG THÔNG MINH
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {currentProduct?.categoryName || "Kiện Hàng Kho Vật Tư"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Đóng bảng điều khiển kho"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── NAVIGATION TABS CHUYÊN NGHIỆP ── */}
          <div
            className="flex items-center border-b border-white/10 bg-slate-900/60 px-3 py-1.5 gap-1.5 text-xs font-semibold"
            style={{ transform: "translateZ(25px)" }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === "import"
                  ? "bg-amber-500/25 border border-amber-500/40 text-amber-300 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span>Nhập Kho Hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inspection")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === "inspection"
                  ? "bg-amber-500/25 border border-amber-500/40 text-amber-300 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Kiểm Tra Kiện Hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("category")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === "category"
                  ? "bg-amber-500/25 border border-amber-500/40 text-amber-300 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Danh Mục Kho</span>
            </button>
          </div>

          {/* ── NỘI DUNG CHÍNH CỦA THẺ 3D ── */}
          <div
            className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {/* THÔNG BÁO THÀNH CÔNG VỚI HIỆU ỨNG HOLOGRAM */}
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 backdrop-blur-md animate-in zoom-in-95 duration-200">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-emerald-500/30 blur-lg animate-pulse" />
                  <CheckCircle2 className="relative h-14 w-14 text-emerald-400" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">Nhập Kho Thành Công!</h3>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Đã bổ sung +{quantity} {activeUnit?.unitName || "đơn vị"} vào kệ kho
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30">
                  <Warehouse className="h-3.5 w-3.5" />
                  <span>Tồn kho mới: {stockNow + quantity}</span>
                </div>
              </div>
            ) : (
              <>
                {/* ── TAB 1: NHẬP KHO HÀNG ── */}
                {activeTab === "import" && (
                  <>
                    {/* Hàng 1: Thẻ tóm tắt kiện hàng & Trạng thái kệ */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-inner space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Khối biểu tượng kiện hàng 3D */}
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-amber-400/30 bg-amber-950/40 flex items-center justify-center shadow-lg">
                            <Boxes className="h-8 w-8 text-amber-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white line-clamp-1">
                                {currentProduct?.name || "Chọn mặt hàng..."}
                              </h3>
                            </div>
                            <p className="text-xs text-amber-300 font-mono mt-0.5">
                              MÃ SKU: {currentProduct?.code || "WH-SKU"}
                            </p>
                          </div>
                        </div>

                        {/* Badge trạng thái tồn kho */}
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
                          <span>Mức tối thiểu: {minSafe}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bộ chọn sản phẩm khác (nếu muốn đổi SKU) */}
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
                              placeholder="Tìm theo tên hoặc mã SKU..."
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

                    {/* Hàng 2: Chọn Đơn vị tính & Số lượng */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Đơn vị tính */}
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

                      {/* Số lượng nhập với nút Stepper */}
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

                    {/* Các nút bấm nhanh số lượng */}
                    <div className="flex items-center gap-1.5 pt-1">
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

                    {/* Hàng 3: Đơn giá nhập & Thành tiền dự kiến */}
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-slate-300 font-medium">Đơn giá nhập (VNĐ):</label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={unitCost}
                          onChange={(e) => setUnitCost(Math.max(0, parseInt(e.target.value) || 0))}
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

                    {/* Ghi chú nhập kho */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-400">Ghi chú nhập kho:</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="VD: Nhập thêm từ nhà cung cấp, bổ sung kệ A..."
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* Nút thực hiện Nhập kho Hologram */}
                    <button
                      type="button"
                      disabled={importMutation.isPending || !currentProduct}
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
                            <span>XÁC NHẬN NHẬP KHO 3D</span>
                          </>
                        )}
                      </div>
                    </button>
                  </>
                )}

                {/* ── TAB 2: KIỂM TRA KIỆN HÀNG & THÔNG TIN VẬT TƯ ── */}
                {activeTab === "inspection" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="text-xs text-slate-400">Tên vật phẩm:</span>
                        <span className="text-xs font-bold text-white text-right">
                          {currentProduct?.name || "Chưa chọn"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="text-xs text-slate-400">Mã SKU / Barcode:</span>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {currentProduct?.code || "WH-SKU"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="text-xs text-slate-400">Danh mục phân loại:</span>
                        <span className="text-xs text-slate-200">
                          {currentProduct?.categoryName || "Chung"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="text-xs text-slate-400">Vị trí lưu kho 3D:</span>
                        <span className="text-xs font-mono font-semibold text-sky-400">
                          KỆ THÉP CÔNG NGHIỆP • DÃY A / B
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Đơn vị quy đổi:</span>
                        <div className="text-right text-xs space-y-0.5">
                          {currentProduct?.units?.map((u) => (
                            <div key={u.id} className="text-slate-300 font-mono">
                              1 {u.unitName} = {u.conversionFactor} Cái
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Nút liên kết mở form nâng cao 2D */}
                    {onOpenProductFormAdvanced && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenProductFormAdvanced();
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 py-2.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25 transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Mở Bàn Kiểm Hàng Đầy Đủ (Sửa ảnh, đơn vị nâng cao)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* ── TAB 3: DANH MỤC KHO HÀNG ── */}
                {activeTab === "category" && (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-300 font-medium">
                      Các phân loại danh mục hàng trong kho 3D:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-xs font-semibold text-white">{cat.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {catalog.filter((p) => p.categoryId === cat.id).length} SP
                          </span>
                        </div>
                      ))}
                    </div>

                    {onOpenCategoryManageAdvanced && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCategoryManageAdvanced();
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Mở Bảng Quản Lý Danh Mục Nâng Cao</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Modal3DCard>
      </div>
    </div>
  );
}
