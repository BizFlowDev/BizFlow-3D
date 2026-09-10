"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Package,
  Plus,
  Minus,
  ShoppingCart,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
} from "lucide-react";
import type { Product, ProductUnit } from "@/hooks/useProducts";
import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard-keys";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-slate-900/95 shadow-2xl backdrop-blur-2xl">
        {/* Header viền gradient */}
        <div className="relative flex items-center justify-between border-b border-white/10 bg-slate-800/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                {product.categoryName || "Sản phẩm Showroom"}
              </div>
              <h3 className="font-bold text-base text-white line-clamp-1">
                {product.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Card hình ảnh và thông tin cơ bản */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start bg-slate-800/40 rounded-2xl p-4 border border-white/5">
            {/* Ảnh sản phẩm */}
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-800 flex items-center justify-center shadow-inner">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                  <Package className="h-10 w-10 text-indigo-400/60" />
                  <span className="text-[10px]">BizFlow 3D</span>
                </div>
              )}
            </div>

            {/* Thông tin nhanh */}
            <div className="flex-1 w-full text-left">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-slate-300">
                  {product.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
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

              <div className="mt-3">
                <div className="text-xs text-slate-400">Đơn giá bán</div>
                <div className="text-2xl font-black text-emerald-400 tabular-nums">
                  {formatVND(unitPrice)}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    / {activeUnit?.unitName ?? "Đơn vị"}
                  </span>
                </div>
              </div>

              {product.description && (
                <p className="mt-2 text-xs text-slate-300 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Chọn Đơn Vị Tính (nếu có nhiều đơn vị) */}
          {product.units && product.units.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Đơn vị tính quy đổi
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {product.units.map((unit) => {
                  const isSelected = unit.id === selectedUnitId;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-600/20 shadow-lg shadow-indigo-500/20 text-white"
                          : "border-white/10 bg-slate-800/40 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      <div className="font-bold text-xs">{unit.unitName}</div>
                      <div className="text-[11px] font-semibold text-emerald-400 mt-1">
                        {formatVND(unit.price)}
                      </div>
                      {unit.conversionFactor > 1 && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          (Quy đổi: x{unit.conversionFactor})
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chọn Số Lượng */}
          <div className="flex items-center justify-between bg-slate-800/40 rounded-2xl p-4 border border-white/5">
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Số lượng mua
              </div>
              <div className="text-[11px] text-slate-400">
                Tối đa: {maxAllowedQty} {activeUnit?.unitName ?? "đơn vị"}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || isOutOfStock}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-40 transition-colors"
              >
                <Minus className="h-4 w-4" />
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
                className="w-14 rounded-xl border border-white/10 bg-slate-900 py-1.5 text-center font-bold text-sm text-white focus:outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxAllowedQty, q + 1))}
                disabled={quantity >= maxAllowedQty || isOutOfStock}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tóm tắt thanh toán tạm tính */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-sm font-medium text-slate-300">
              Tổng thành tiền:
            </span>
            <span className="text-2xl font-black text-emerald-400 tabular-nums">
              {formatVND(subtotal)}
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="border-t border-white/10 bg-slate-800/80 p-5 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`flex-1 w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 font-bold text-sm text-white transition-all shadow-lg ${
              addedAnimation
                ? "bg-emerald-600 shadow-emerald-500/30"
                : "bg-slate-700 hover:bg-slate-600"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {addedAnimation ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-white animate-bounce" />
                Đã thêm vào đơn!
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-indigo-400" />
                Thêm vào đơn hàng
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="flex-1 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-3 px-4 font-bold text-sm text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CreditCard className="h-4 w-4" />
            Tạo đơn &amp; Thanh toán ngay
          </button>
        </div>
      </div>
    </div>
  );
}
