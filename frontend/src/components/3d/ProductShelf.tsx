"use client";

import { useMemo, useState } from "react";
import { Html, Text } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";
import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard-keys";
import {
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShelfProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  categoryId?: string | null;
  categoryName?: string | null;
  code?: string;
  imageUrl?: string | null;
}

interface ProductShelfProps {
  /** Danh sách sản phẩm hiển thị trên kệ */
  products: ShelfProduct[];
  /** Callback khi click sản phẩm */
  onSelectProduct?: (productId: string) => void;
  /** ID sản phẩm đang được chọn mở modal */
  selectedProductId?: string | null;
  /** Vị trí kệ trong scene */
  position?: [number, number, number];
  /** Xoay kệ (radian) */
  rotation?: [number, number, number];
  /** Tiêu đề bảng tên kệ */
  title?: string;
  /** Trang cục bộ hiện tại của kệ này */
  shelfCurrentPage?: number;
  /** Tổng số trang cục bộ của kệ này */
  shelfTotalPages?: number;
  /** Chuyển về trang trước của kệ này */
  onPrevShelfPage?: () => void;
  /** Chuyển sang trang sau của kệ này */
  onNextShelfPage?: () => void;
  /** Cờ cho biết kệ hàng này có đang được người dùng ấn vào xem hay không */
  isFocused?: boolean;
  /** Callback khi click vào kệ để chuyển góc nhìn đến kệ đó */
  onClickShelf?: () => void;
}

// ── Hằng số cấu hình kệ hàng ──────────────────────────────────────────────────

const ROWS = 4;
const COLS = 5;
const MAX_SLOTS = ROWS * COLS;

const SHELF_WIDTH = 5.6;
const SHELF_DEPTH = 1.0;
const SHELF_HEIGHT = 3.8;

const ROW_GAP = SHELF_HEIGHT / (ROWS + 1);
const COL_GAP = SHELF_WIDTH / (COLS + 1);

const PRODUCT_SIZE: [number, number, number] = [0.58, 0.48, 0.48];

// Bảng màu bao bì bán lẻ sang trọng (Retail Packaging Palettes)
const PACKAGING_PALETTES = [
  { main: "#3b82f6", accent: "#93c5fd", label: "Blue" },
  { main: "#10b981", accent: "#a7f3d0", label: "Green" },
  { main: "#8b5cf6", accent: "#c4b5fd", label: "Purple" },
  { main: "#f59e0b", accent: "#fde68a", label: "Amber" },
  { main: "#ec4899", accent: "#fbcfe8", label: "Rose" },
  { main: "#06b6d4", accent: "#a5f3fc", label: "Cyan" },
];

function getPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PACKAGING_PALETTES.length;
  return PACKAGING_PALETTES[idx];
}

// ── Helper: tọa độ từng slot ──────────────────────────────────────────────────

function slotPosition(row: number, col: number): [number, number, number] {
  const x = -SHELF_WIDTH / 2 + (col + 1) * COL_GAP;
  const y = (row + 1) * ROW_GAP + PRODUCT_SIZE[1] / 2 + 0.04;
  const z = 0;
  return [x, y, z];
}

// ── Format VND ────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Single Product Box on Shelf (Sản phẩm bán lẻ 3D đơn lẻ) ─────────────────

function ProductBoxItem({
  product,
  position,
  onSelect,
  isSelected = false,
}: {
  product: ShelfProduct;
  position: [number, number, number];
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const palette = useMemo(() => getPalette(product.id), [product.id]);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= LOW_STOCK_THRESHOLD;

  // Spring animation khi hover hoặc được chọn: nhấc bổng nhẹ lên và phát sáng
  const { posY, scale, glowIntensity } = useSpring({
    posY: isSelected ? position[1] + 0.12 : hovered ? position[1] + 0.08 : position[1],
    scale: isSelected ? 1.12 : hovered ? 1.06 : 1.0,
    glowIntensity: isSelected ? 1.0 : hovered ? 0.6 : isLowStock ? 0.35 : 0.0,
    config: { tension: 350, friction: 20 },
  });

  // Low stock pulsing loop
  const { lowStockGlow } = useSpring({
    from: { lowStockGlow: 0.2 },
    to: { lowStockGlow: isLowStock ? 0.9 : 0.2 },
    loop: isLowStock ? { reverse: true } : false,
    config: { duration: 700 },
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Khối sản phẩm chính */}
      <animated.group
        position-y={posY}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(product.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        {/* Vỏ hộp sản phẩm */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={PRODUCT_SIZE} />
          <animated.meshStandardMaterial
            color={
              isOutOfStock
                ? "#64748b"
                : isLowStock
                  ? "#ea580c"
                  : palette.main
            }
            roughness={0.35}
            metalness={0.15}
            transparent={isOutOfStock}
            opacity={isOutOfStock ? 0.45 : 1}
            emissive={
              isSelected
                ? "#38bdf8"
                : isLowStock
                ? "#ef4444"
                : hovered
                ? palette.accent
                : "#000000"
            }
            emissiveIntensity={isSelected ? 1.2 : isLowStock ? lowStockGlow : glowIntensity}
          />
        </mesh>

        {/* Dải nẹp trang trí bao bì (Branding Stripe) */}
        {!isOutOfStock && (
          <mesh position={[0, 0, PRODUCT_SIZE[2] / 2 + 0.005]}>
            <planeGeometry args={[PRODUCT_SIZE[0] * 0.9, PRODUCT_SIZE[1] * 0.38]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.2}
              metalness={0.1}
            />
          </mesh>
        )}

        {/* Nắp đỉnh hộp sản phẩm */}
        {!isOutOfStock && (
          <mesh position={[0, PRODUCT_SIZE[1] / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[PRODUCT_SIZE[0] * 0.85, PRODUCT_SIZE[2] * 0.85]} />
            <meshStandardMaterial
              color={palette.accent}
              roughness={0.3}
            />
          </mesh>
        )}

        {/* Vòng hào quang dưới đáy khi hover hoặc được chọn */}
        {(hovered || isSelected) && (
          <mesh position={[0, -PRODUCT_SIZE[1] / 2 - 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.48, 32]} />
            <meshBasicMaterial
              color={isSelected ? "#38bdf8" : "#93c5fd"}
              transparent
              opacity={isSelected ? 0.9 : 0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </animated.group>

      {/* Thẻ giá gắn ở gờ kệ (Shelf Price Tag) */}
      <mesh position={[0, position[1] - PRODUCT_SIZE[1] / 2 - 0.04, PRODUCT_SIZE[2] / 2 + 0.04]}>
        <boxGeometry args={[0.42, 0.06, 0.02]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </mesh>

      {/* Floating Card khi hover sản phẩm */}
      {hovered && (
        <Html
          occlude
          position={[0, position[1] + PRODUCT_SIZE[1] / 2 + 0.4, 0.3]}
          center
          distanceFactor={5.2}
          zIndexRange={[15, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="animate-in fade-in zoom-in-95 pointer-events-none flex min-w-[190px] flex-col rounded-xl border border-white/20 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-2">
              <span className="line-clamp-1 font-bold text-xs text-white">
                {product.name}
              </span>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${isOutOfStock
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : isLowStock
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
              >
                {isOutOfStock ? (
                  "Hết hàng"
                ) : (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5" /> Tồn: {product.stock}
                  </>
                )}
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-extrabold text-sm text-emerald-400">
                {formatVND(product.price)}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-sky-300">
                <Eye className="h-3 w-3" /> Bấm để xem
              </span>
            </div>

            <div className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-indigo-600/80 py-1 text-[10px] font-semibold text-white">
              <ShoppingBag className="h-3 w-3" /> Chi tiết &amp; Mua hàng
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── ShelfFrame: Khung Kệ Kim Loại & Gỗ Sồi Hiện Đại Kèm Đèn LED Tầng ────────

function ShelfFrame({
  title,
  shelfCurrentPage,
  shelfTotalPages,
  isFocused = false,
}: {
  title: string;
  shelfCurrentPage?: number;
  shelfTotalPages?: number;
  isFocused?: boolean;
}) {
  const metalColor = "#1e293b";
  const woodColor = "#78350f"; // Gỗ sồi ấm áp

  return (
    <group>
      {/* Cột trụ kim loại góc trước - trái */}
      <mesh position={[-SHELF_WIDTH / 2, SHELF_HEIGHT / 2, SHELF_DEPTH / 2 - 0.05]}>
        <boxGeometry args={[0.08, SHELF_HEIGHT, 0.08]} />
        <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Cột trụ kim loại góc sau - trái */}
      <mesh position={[-SHELF_WIDTH / 2, SHELF_HEIGHT / 2, -SHELF_DEPTH / 2 + 0.05]}>
        <boxGeometry args={[0.08, SHELF_HEIGHT, 0.08]} />
        <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Cột trụ kim loại góc trước - phải */}
      <mesh position={[SHELF_WIDTH / 2, SHELF_HEIGHT / 2, SHELF_DEPTH / 2 - 0.05]}>
        <boxGeometry args={[0.08, SHELF_HEIGHT, 0.08]} />
        <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Cột trụ kim loại góc sau - phải */}
      <mesh position={[SHELF_WIDTH / 2, SHELF_HEIGHT / 2, -SHELF_DEPTH / 2 + 0.05]}>
        <boxGeometry args={[0.08, SHELF_HEIGHT, 0.08]} />
        <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Thanh giằng chéo sau lưng kệ */}
      <mesh position={[0, SHELF_HEIGHT / 2, -SHELF_DEPTH / 2 + 0.02]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[SHELF_WIDTH * 1.1, 0.03, 0.03]} />
        <meshStandardMaterial color={metalColor} metalness={0.7} />
      </mesh>
      <mesh position={[0, SHELF_HEIGHT / 2, -SHELF_DEPTH / 2 + 0.02]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[SHELF_WIDTH * 1.1, 0.03, 0.03]} />
        <meshStandardMaterial color={metalColor} metalness={0.7} />
      </mesh>

      {/* Các tầng mặt kệ gỗ sồi & dải LED hắt sáng âm tầng */}
      {Array.from({ length: ROWS + 1 }, (_, i) => {
        const y = (i + 1) * ROW_GAP;
        return (
          <group key={i} position={[0, y, 0]}>
            {/* Đợt kệ gỗ */}
            <mesh position={[0, 0, 0]} receiveShadow>
              <boxGeometry args={[SHELF_WIDTH + 0.1, 0.07, SHELF_DEPTH]} />
              <meshStandardMaterial color={woodColor} roughness={0.6} />
            </mesh>

            {/* Dải LED âm tầng chiếu sáng sản phẩm hàng dưới */}
            {i > 0 && (
              <mesh position={[0, -0.04, 0]}>
                <boxGeometry args={[SHELF_WIDTH * 0.96, 0.02, 0.04]} />
                <meshStandardMaterial
                  color="#fef08a"
                  emissive="#fde047"
                  emissiveIntensity={1.4}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Bảng tên danh mục trên đỉnh kệ (Header Marquee Sign) */}
      <group position={[0, SHELF_HEIGHT + 0.38, 0]}>
        {/* Khung biển tên */}
        <mesh>
          <boxGeometry args={[3.8, 0.48, 0.08]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Viền LED phát sáng */}
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[3.7, 0.40]} />
          <meshStandardMaterial
            color={isFocused ? "#0284c7" : "#3b82f6"}
            emissive={isFocused ? "#38bdf8" : "#1d4ed8"}
            emissiveIntensity={isFocused ? 0.9 : 0.5}
          />
        </mesh>

        {/* Biển hiệu LED 3D cố định trên mặt biển hiệu (transform), không xoay theo camera, chữ có viền đen */}
        <Html
          occlude
          transform
          position={[0, 0, 0.048]}
          center
          distanceFactor={5.5}
          zIndexRange={[18, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            className="flex select-none items-center justify-center gap-2.5 px-3 py-1 font-black"
            style={{
              whiteSpace: "nowrap",
              color: "#ffffff",
              WebkitTextStroke: "0.4px #000000",
            }}
          >
            <span className="text-sm font-black tracking-wider text-white">
              {title}
            </span>
            {shelfTotalPages && shelfTotalPages > 1 && (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black shadow-md border ${isFocused
                  ? "border-amber-300 bg-amber-500/90 text-white ring-2 ring-amber-400"
                  : "border-white/30 bg-slate-900/85 text-amber-300"
                  }`}
                style={{
                  WebkitTextStroke: "0.6px #000000",
                  textShadow: "1px 1px 0 #000, -1px -1px 0 #000",
                }}
              >
                <span>Trang</span>
                <span className="text-white font-black">{shelfCurrentPage}</span>
                <span>/</span>
                <span>{shelfTotalPages}</span>
              </span>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
}

// ── ProductShelf (main) ───────────────────────────────────────────────────────

/**
 * ProductShelf — Kệ hàng bán lẻ 3D thông minh và hiện đại.
 * - Khung thép sơn tĩnh điện đen + đợt gỗ sồi cao cấp + đèn LED hắt sáng từng tầng.
 * - Hộp sản phẩm có bao bì phong phú theo màu danh mục, hiệu ứng nhấc bổng khi hover.
 * - Nhấp vào sản phẩm gọi callback mở modal chi tiết sản phẩm và thêm vào giỏ hàng.
 * - Mũi tên phân trang (label nổi) CHỈ HIỂN THỊ KHI ĐANG ẤN VÀO XEM KỆ ĐÓ.
 */
export default function ProductShelf({
  products,
  onSelectProduct,
  selectedProductId,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  title = "KỆ HÀNG TRƯNG BÀY",
  shelfCurrentPage,
  shelfTotalPages,
  onPrevShelfPage,
  onNextShelfPage,
  isFocused = false,
  onClickShelf,
}: ProductShelfProps) {
  const visible = products.slice(0, MAX_SLOTS);
  // Mũi tên chuyển trang chỉ hiển thị khi có > 1 trang VÀ người dùng đang ấn vào xem kệ hàng đó
  const hasMultiplePages = Boolean(shelfTotalPages && shelfTotalPages > 1);
  const showPagination = hasMultiplePages && isFocused;

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        // Khi click vào kệ hàng (không phải hộp sản phẩm) và chưa focus, chuyển góc nhìn đến kệ này
        if (!isFocused && onClickShelf) {
          e.stopPropagation();
          onClickShelf();
        }
      }}
    >
      {/* Khung kệ hiện đại */}
      <ShelfFrame
        title={title}
        shelfCurrentPage={shelfCurrentPage}
        shelfTotalPages={shelfTotalPages}
        isFocused={isFocused}
      />

      {/* ── Label nổi phân trang Trái & Phải Kệ Hàng: CHỈ HIỂN THỊ KHI ĐANG ẤN VÀO XEM KỆ ĐÓ ── */}
      {showPagination && (
        <>
          {/* Label Nổi Bên Trái: [ ◀ Trang trước ] */}
          <Html
            position={[-SHELF_WIDTH / 2 - 0.42, 1.45, 0.2]}
            center
            distanceFactor={7.5}
            zIndexRange={[22, 0]}
            style={{ pointerEvents: "auto", userSelect: "none" }}
          >
            <button
              type="button"
              disabled={!shelfCurrentPage || shelfCurrentPage <= 1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPrevShelfPage?.();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-xl transition-all duration-200 ${!shelfCurrentPage || shelfCurrentPage <= 1
                ? "border-white/10 bg-slate-900/70 text-slate-500 opacity-35 cursor-not-allowed"
                : "border-sky-400/60 bg-slate-950/90 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:scale-110 hover:border-sky-300 hover:bg-sky-600/90 active:scale-95 cursor-pointer"
                }`}
              title="Xem trang trước của kệ này"
            >
              <ChevronLeft className="h-5 w-5 text-sky-400 group-hover:text-white transition-colors" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 group-hover:text-sky-100">
                  Trang trước
                </span>
                <span className="text-xs font-black text-white">
                  {shelfCurrentPage && shelfCurrentPage > 1
                    ? `Trang ${shelfCurrentPage - 1}`
                    : `Trang 1`}
                </span>
              </div>
            </button>
          </Html>

          {/* Label Nổi Bên Phải: [ Trang sau ▶ ] */}
          <Html
            position={[SHELF_WIDTH / 2 + 0.42, 1.45, 0.2]}
            center
            distanceFactor={7.5}
            zIndexRange={[22, 0]}
            style={{ pointerEvents: "auto", userSelect: "none" }}
          >
            <button
              type="button"
              disabled={!shelfCurrentPage || shelfCurrentPage >= (shelfTotalPages || 1)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNextShelfPage?.();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-xl transition-all duration-200 ${!shelfCurrentPage || shelfCurrentPage >= (shelfTotalPages || 1)
                ? "border-white/10 bg-slate-900/70 text-slate-500 opacity-35 cursor-not-allowed"
                : "border-sky-400/60 bg-slate-950/90 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:scale-110 hover:border-sky-300 hover:bg-sky-600/90 active:scale-95 cursor-pointer"
                }`}
              title="Xem trang sau của kệ này"
            >
              <div className="flex flex-col text-right leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 group-hover:text-sky-100">
                  Trang sau
                </span>
                <span className="text-xs font-black text-white">
                  {shelfCurrentPage && shelfCurrentPage < (shelfTotalPages || 1)
                    ? `Trang ${shelfCurrentPage + 1}`
                    : `Trang ${shelfTotalPages}`}
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-sky-400 group-hover:text-white transition-colors" />
            </button>
          </Html>
        </>
      )}

      {/* Từng hộp sản phẩm bán lẻ */}
      {visible.map((product, index) => {
        const row = Math.floor(index / COLS);
        const col = index % COLS;
        const pos = slotPosition(row, col);

        return (
          <ProductBoxItem
            key={product.id}
            product={product}
            position={pos}
            onSelect={onSelectProduct}
            isSelected={selectedProductId === product.id}
          />
        );
      })}
    </group>
  );
}
