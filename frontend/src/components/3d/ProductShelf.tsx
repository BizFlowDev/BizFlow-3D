"use client";

import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard-keys";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShelfProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  categoryName?: string | null;
}

interface ProductShelfProps {
  /** Danh sách sản phẩm hiển thị trên kệ */
  products: ShelfProduct[];
  /** Callback khi click sản phẩm */
  onSelectProduct?: (productId: string) => void;
  /** Vị trí kệ trong scene */
  position?: [number, number, number];
  /** Xoay kệ (radian) */
  rotation?: [number, number, number];
}

// ── Hằng số kệ hàng ──────────────────────────────────────────────────────────

const ROWS = 4;
const COLS = 5;
const MAX_SLOTS = ROWS * COLS;

const SHELF_WIDTH = 5.5;
const SHELF_DEPTH = 1.0;
const SHELF_HEIGHT = 3.8;

const ROW_GAP = SHELF_HEIGHT / (ROWS + 1);
const COL_GAP = SHELF_WIDTH / (COLS + 1);

const PRODUCT_SIZE: [number, number, number] = [0.55, 0.45, 0.45];

const WOOD_COLOR = "#8B5E3C";
const WOOD_DARK = "#6B4226";

// ── Helper: tọa độ từng slot ──────────────────────────────────────────────────

function slotPosition(
  row: number,
  col: number,
): [number, number, number] {
  const x = -SHELF_WIDTH / 2 + (col + 1) * COL_GAP;
  const y = (row + 1) * ROW_GAP;
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

// ── InstancedProducts: dùng InstancedMesh cho sản phẩm đủ hàng ───────────────

function InstancedProducts({
  products,
  onSelectProduct,
}: {
  products: { product: ShelfProduct; pos: [number, number, number]; index: number }[];
  onSelectProduct?: (id: string) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Cập nhật instance transforms và màu
  useFrame(() => {
    if (!meshRef.current) return;

    products.forEach(({ pos }, i) => {
      tempObj.position.set(pos[0], pos[1], pos[2]);
      const scale = hovered === i ? 1.1 : 1.0;
      tempObj.scale.set(scale, scale, scale);
      tempObj.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObj.matrix);

      // Màu: xanh lá mặc định, sáng hơn khi hover
      if (hovered === i) {
        tempColor.set("#4ade80");
      } else {
        tempColor.set("#10b981");
      }
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor)
      meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, products.length]}
        onPointerOver={(e) => {
          e.stopPropagation();
          const idx = e.instanceId;
          if (idx !== undefined) setHovered(idx);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          const idx = e.instanceId;
          if (idx !== undefined) {
            const p = products[idx].product;
            setSelected((prev) => (prev === p.id ? null : p.id));
            onSelectProduct?.(p.id);
          }
        }}
      >
        <boxGeometry args={PRODUCT_SIZE} />
        <meshStandardMaterial
          roughness={0.5}
          metalness={0.05}
        />
      </instancedMesh>

      {/* Popup cho sản phẩm được chọn */}
      {selected &&
        (() => {
          const entry = products.find((p) => p.product.id === selected);
          if (!entry) return null;
          const { product, pos } = entry;
          return (
            <Html
              position={[pos[0], pos[1] + PRODUCT_SIZE[1] + 0.35, pos[2] + 0.3]}
              center
              zIndexRange={[50, 0]}
              style={{ pointerEvents: "auto" }}
            >
              <div
                className="min-w-[180px] rounded-xl border border-border bg-background/95 p-3 text-sm shadow-2xl backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-1 font-bold text-foreground">
                  {product.name}
                </div>
                {product.categoryName && (
                  <div className="mb-1 text-xs text-muted-foreground">
                    {product.categoryName}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {formatVND(product.price)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      product.stock <= 0
                        ? "bg-gray-200 text-gray-500"
                        : product.stock <= LOW_STOCK_THRESHOLD
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    Tồn: {product.stock}
                  </span>
                </div>
                <button
                  className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90"
                  onClick={() => setSelected(null)}
                >
                  Đóng
                </button>
              </div>
            </Html>
          );
        })()}
    </>
  );
}

// ── OutOfStockProduct: sản phẩm hết hàng — xám + trong suốt ──────────────────

function OutOfStockProduct({
  product,
  position: pos,
  onSelect,
}: {
  product: ShelfProduct;
  position: [number, number, number];
  onSelect?: (id: string) => void;
}) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <group position={pos}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          setShowPopup((v) => !v);
          onSelect?.(product.id);
        }}
      >
        <boxGeometry args={PRODUCT_SIZE} />
        <meshStandardMaterial
          color="#9ca3af"
          transparent
          opacity={0.3}
          roughness={0.8}
        />
      </mesh>

      {showPopup && (
        <Html
          position={[0, PRODUCT_SIZE[1] + 0.35, 0.3]}
          center
          zIndexRange={[50, 0]}
          style={{ pointerEvents: "auto" }}
        >
          <div className="min-w-[180px] rounded-xl border border-border bg-background/95 p-3 text-sm shadow-2xl backdrop-blur-md">
            <div className="mb-1 font-bold text-foreground">
              {product.name}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-muted-foreground tabular-nums">
                {formatVND(product.price)}
              </span>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-500">
                Hết hàng
              </span>
            </div>
            <button
              className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90"
              onClick={() => setShowPopup(false)}
            >
              Đóng
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── LowStockProduct: sản phẩm sắp hết — nhấp nháy đỏ ────────────────────────

function LowStockProduct({
  product,
  position: pos,
  onSelect,
}: {
  product: ShelfProduct;
  position: [number, number, number];
  onSelect?: (id: string) => void;
}) {
  const [showPopup, setShowPopup] = useState(false);

  const { opacity } = useSpring({
    from: { opacity: 0.4 },
    to: { opacity: 1 },
    loop: { reverse: true },
    config: { duration: 800 },
  });

  return (
    <group position={pos}>
      <animated.mesh
        onClick={(e) => {
          e.stopPropagation();
          setShowPopup((v) => !v);
          onSelect?.(product.id);
        }}
      >
        <boxGeometry args={PRODUCT_SIZE} />
        <animated.meshStandardMaterial
          color="#ef4444"
          transparent
          opacity={opacity}
          emissive="#ef4444"
          emissiveIntensity={0.2}
          roughness={0.5}
        />
      </animated.mesh>

      {showPopup && (
        <Html
          position={[0, PRODUCT_SIZE[1] + 0.35, 0.3]}
          center
          zIndexRange={[50, 0]}
          style={{ pointerEvents: "auto" }}
        >
          <div className="min-w-[180px] rounded-xl border border-border bg-background/95 p-3 text-sm shadow-2xl backdrop-blur-md">
            <div className="mb-1 font-bold text-foreground">
              {product.name}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-orange-600 tabular-nums">
                {formatVND(product.price)}
              </span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                Tồn: {product.stock}
              </span>
            </div>
            <button
              className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90"
              onClick={() => setShowPopup(false)}
            >
              Đóng
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── ProductShelf (main) ───────────────────────────────────────────────────────

/**
 * ProductShelf — Kệ hàng 3D đầy đủ (4 tầng × 5 cột = 20 slot).
 *
 * - InstancedMesh cho sản phẩm đủ hàng (tối ưu draw calls)
 * - Sản phẩm hết hàng: màu xám, opacity 0.3
 * - Sản phẩm sắp hết (≤ LOW_STOCK_THRESHOLD): nhấp nháy đỏ
 * - Click → popup hiển thị name, price, stock
 */
export default function ProductShelf({
  products,
  onSelectProduct,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: ProductShelfProps) {
  const visible = products.slice(0, MAX_SLOTS);

  // Phân loại sản phẩm
  const { normalProducts, lowStockProducts, outOfStockProducts } = useMemo(() => {
    const normal: { product: ShelfProduct; pos: [number, number, number]; index: number }[] = [];
    const low: { product: ShelfProduct; pos: [number, number, number] }[] = [];
    const out: { product: ShelfProduct; pos: [number, number, number] }[] = [];

    visible.forEach((product, index) => {
      const row = Math.floor(index / COLS);
      const col = index % COLS;
      const pos = slotPosition(row, col);

      if (product.stock <= 0) {
        out.push({ product, pos });
      } else if (product.stock <= LOW_STOCK_THRESHOLD) {
        low.push({ product, pos });
      } else {
        normal.push({ product, pos, index });
      }
    });

    return { normalProducts: normal, lowStockProducts: low, outOfStockProducts: out };
  }, [visible]);

  return (
    <group position={position} rotation={rotation}>
      {/* Khung kệ gỗ */}
      <ShelfFrame />

      {/* Sản phẩm đủ hàng — InstancedMesh */}
      {normalProducts.length > 0 && (
        <InstancedProducts
          products={normalProducts}
          onSelectProduct={onSelectProduct}
        />
      )}

      {/* Sản phẩm sắp hết — nhấp nháy đỏ */}
      {lowStockProducts.map(({ product, pos }) => (
        <LowStockProduct
          key={product.id}
          product={product}
          position={pos}
          onSelect={onSelectProduct}
        />
      ))}

      {/* Sản phẩm hết hàng — xám trong suốt */}
      {outOfStockProducts.map(({ product, pos }) => (
        <OutOfStockProduct
          key={product.id}
          product={product}
          position={pos}
          onSelect={onSelectProduct}
        />
      ))}

      {/* Nhãn kệ */}
      <Html
        position={[0, SHELF_HEIGHT + 0.3, 0.5]}
        center
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="whitespace-nowrap rounded-lg bg-primary/90 px-3 py-1 text-xs font-bold text-primary-foreground shadow-lg">
          Kệ hàng ({visible.length} sản phẩm)
        </div>
      </Html>
    </group>
  );
}

// ── ShelfFrame: khung kệ gỗ ──────────────────────────────────────────────────

function ShelfFrame() {
  return (
    <group>
      {/* Cột trái */}
      <mesh position={[-SHELF_WIDTH / 2 - 0.06, SHELF_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.12, SHELF_HEIGHT, SHELF_DEPTH]} />
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.8} />
      </mesh>

      {/* Cột phải */}
      <mesh position={[SHELF_WIDTH / 2 + 0.06, SHELF_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.12, SHELF_HEIGHT, SHELF_DEPTH]} />
        <meshStandardMaterial color={WOOD_COLOR} roughness={0.8} />
      </mesh>

      {/* Tấm lưng kệ */}
      <mesh position={[0, SHELF_HEIGHT / 2, -SHELF_DEPTH / 2 - 0.04]}>
        <boxGeometry args={[SHELF_WIDTH + 0.24, SHELF_HEIGHT, 0.06]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
      </mesh>

      {/* Các tầng kệ (bao gồm sàn kệ dưới cùng) */}
      {Array.from({ length: ROWS + 1 }, (_, i) => {
        const y = i * ROW_GAP;
        return (
          <mesh key={i} position={[0, y, 0]}>
            <boxGeometry args={[SHELF_WIDTH + 0.24, 0.08, SHELF_DEPTH]} />
            <meshStandardMaterial color={WOOD_COLOR} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
