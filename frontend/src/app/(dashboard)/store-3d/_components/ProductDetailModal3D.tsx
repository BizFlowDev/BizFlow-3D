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
  CreditCard,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import type { Product, ProductUnit } from "@/hooks/useProducts";
import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard-keys";
import { Modal3DCard } from "./Modal3DCard";

export interface CartItem3D {
  productId: string;
  productName: string;
  code: string;
  imageUrl?: string | null;
  unitId: string;
  unitName: string;
  conversionFactor: number;
  unitPrice: number;
  quantity: number;
  availableStock: number;
}

interface ProductDetailModal3DProps {
  product: (Product & { stock: number; categoryName?: string | null }) | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem3D) => void;
  onBuyNow: (item: CartItem3D) => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProductDetailModal3D({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModal3DProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Đơn vị mặc định
  useEffect(() => {
    if (product?.units && product.units.length > 0) {
      const def = product.units.find((u) => u.isDefault) || product.units[0];
      setSelectedUnitId(def.id);
    } else {
      setSelectedUnitId("");
    }
    setQuantity(1);
    setAddedAnimation(false);
  }, [product]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const activeUnit = useMemo<ProductUnit | null>(() => {
    if (!product?.units || product.units.length === 0) return null;
    return product.units.find((u) => u.id === selectedUnitId) || product.units[0];
  }, [product, selectedUnitId]);

  if (!isOpen || !product) return null;

  const currentStock = product.stock ?? 0;
  const isOutOfStock = currentStock <= 0;
  const isLowStock = !isOutOfStock && currentStock <= LOW_STOCK_THRESHOLD;

  const unitPrice = activeUnit?.price ?? 0;
  const conversionFactor = activeUnit?.conversionFactor ?? 1;

  // Số lượng tối đa có thể mua theo đơn vị này
  const maxAllowedQty = Math.max(1, Math.floor(currentStock / conversionFactor));
  const subtotal = unitPrice * quantity;

  const handleAdd = () => {
    if (isOutOfStock) return;
    const cartItem: CartItem3D = {
      productId: product.id,
      productName: product.name,
      code: product.code,
      imageUrl: product.imageUrl,
      unitId: activeUnit?.id ?? "default",
      unitName: activeUnit?.unitName ?? "Cái",
      conversionFactor,
      unitPrice,
      quantity,
      availableStock: currentStock,
    };
    onAddToCart(cartItem);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const cartItem: CartItem3D = {
      productId: product.id,
      productName: product.name,
      code: product.code,
      imageUrl: product.imageUrl,
      unitId: activeUnit?.id ?? "default",
      unitName: activeUnit?.unitName ?? "Cái",
      conversionFactor,
      unitPrice,
      quantity,
      availableStock: currentStock,
    };
    onBuyNow(cartItem);
    onClose();
  };

  return (
    // ── CONTAINER HOÀN TOÀN TRONG SUỐT (KHÔNG LÀM TỐI & KHÔNG BLUR PHÒNG 3D PHÍA SAU) ──
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center sm:justify-end sm:pr-12 md:pr-16 p-4 overflow-hidden animate-in fade-in duration-300">
      {/* Vùng click ra ngoài để đóng modal (trong suốt hoàn toàn) */}
      <div
        className="pointer-events-auto fixed inset-0 -z-10 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── BẢNG HOLOGRAM LƠ LỬNG TRONG KHÔNG GIAN (SPATIAL FLOATING CARD) ── */}
      <div className="pointer-events-auto w-full max-w-lg">
        <Modal3DCard
          className="w-full my-auto"
          accentGlowColor="rgba(56, 189, 248, 0.45)"
          isFloating={true}
          showTechCorners={true}
        >
          {/* ── THANH CHỈ BÁO SPATIAL HUD PHÍA TRÊN ── */}
          <div
            className="flex items-center justify-between border-b border-white/10 bg-slate-900/60 px-5 py-2.5 text-[11px]"
            style={{ transform: "translateZ(30px)" }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              </span>
              <span className="font-bold tracking-wider uppercase text-sky-400">
                BIZFLOW SPATIAL HUD
              </span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-300 font-medium">
                {product.categoryName || "Sản Phẩm"}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Đóng bảng thông tin"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── NỘI DUNG CHÍNH CỦA THẺ HOLOGRAM ── */}
          <div
            className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto"
            style={{ transform: "translateZ(20px)" }}
          >
            {/* ── KHUNG TRƯNG BÀY HÌNH ẢNH SẢN PHẨM NỔI BẬT (Hero Showcase Gallery) ── */}
            <div className="relative overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Khung ảnh sản phẩm thực tế lớn, sắc nét */}
                <div className="relative h-36 w-36 sm:h-40 sm:w-40 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-slate-950 flex items-center justify-center shadow-2xl group">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 gap-1.5 p-3 text-center">
                      <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                        <Package className="h-6 w-6 text-sky-400" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">BizFlow Official</span>
                    </div>
                  )}

                  {/* Vệt sáng bóng kính trên ảnh */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-70" />

                  {/* Badge tem ảnh chính hãng */}
                  <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 backdrop-blur-sm border border-white/10">
                    Ảnh 3D
                  </span>
                </div>

                {/* Thông tin tên & giá tiền */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono text-sky-300 font-bold">
                      {product.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isOutOfStock
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : isLowStock
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {isOutOfStock ? (
                        <>
                          <AlertCircle className="h-3 w-3" /> Hết hàng
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Tồn kho: {currentStock}
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base sm:text-lg text-white mt-2 line-clamp-2 leading-snug">
                    {product.name}
                  </h3>

                  <div className="mt-2.5 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
                      {formatVND(unitPrice)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / {activeUnit?.unitName ?? "Đơn vị"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mô tả sản phẩm (nếu có) */}
            {product.description && (
              <p className="text-xs text-slate-300 line-clamp-2 px-1">
                {product.description}
              </p>
            )}

            {/* Chọn Đơn Vị Tính Quy Đổi (nếu có nhiều đơn vị) */}
            {product.units && product.units.length > 1 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Đơn vị tính quy đổi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {product.units.map((unit) => {
                    const isSelected = unit.id === selectedUnitId;
                    return (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => setSelectedUnitId(unit.id)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-sky-400 bg-sky-500/20 shadow-lg shadow-sky-500/25 text-white"
                            : "border-white/10 bg-slate-900/50 text-slate-300 hover:border-white/20"
                        }`}
                      >
                        <div className="font-bold text-xs">{unit.unitName}</div>
                        <div className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                          {formatVND(unit.price)}
                        </div>
                        {unit.conversionFactor > 1 && (
                          <div className="text-[10px] text-slate-400">
                            (Quy đổi: x{unit.conversionFactor})
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bộ chọn số lượng */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-3">
              <div>
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Số lượng mua
                </div>
                <div className="text-[10px] text-slate-400">
                  Tối đa: {maxAllowedQty} {activeUnit?.unitName ?? "đơn vị"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 transition-all active:scale-95 border border-white/10"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <input
                  type="number"
                  min={1}
                  max={maxAllowedQty}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setQuantity(Math.min(maxAllowedQty, Math.max(1, val)));
                    }
                  }}
                  disabled={isOutOfStock}
                  className="w-12 rounded-lg border border-white/10 bg-slate-950 py-1 text-center font-bold text-xs text-white focus:outline-none focus:border-sky-500"
                />

                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxAllowedQty, q + 1))}
                  disabled={quantity >= maxAllowedQty || isOutOfStock}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 transition-all active:scale-95 border border-white/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Tóm tắt tổng tiền */}
            <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
              <span className="text-xs font-semibold text-slate-400">
                Tổng cộng tạm tính:
              </span>
              <span className="text-xl font-black text-emerald-400 tabular-nums">
                {formatVND(subtotal)}
              </span>
            </div>
          </div>

          {/* ── ACTION FOOTER DẬP NỔI 3D ── */}
          <div
            className="border-t border-white/10 bg-slate-900/80 p-4 flex items-center gap-2.5"
            style={{ transform: "translateZ(30px)" }}
          >
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-bold text-xs text-white transition-all shadow-lg active:scale-95 ${
                addedAnimation
                  ? "bg-emerald-600 shadow-emerald-500/30"
                  : "bg-slate-800 hover:bg-slate-700 border border-white/10"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {addedAnimation ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white animate-bounce" />
                  Đã thêm vào đơn!
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-sky-400" />
                  Thêm vào đơn
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:from-sky-600 hover:to-teal-600 py-2.5 px-3 font-bold text-xs text-white shadow-lg shadow-sky-500/25 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-4 w-4" />
              Tạo đơn ngay
            </button>
          </div>
        </Modal3DCard>
      </div>
    </div>
  );
}
