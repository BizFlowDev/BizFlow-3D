"use client";

import { useState } from "react";
import { Html, Text } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import {
  QrCode,
  CreditCard,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Sparkles,
} from "lucide-react";

import { POSMonitorScreen } from "./POSMonitorScreen";
import type { CartItem3D } from "@/app/(dashboard)/store-3d/_components/ProductDetailModal3D";
import type { Order } from "@/hooks/useOrders";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const fallbackQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CounterProps {
  /** Số đơn hàng nháp đang chờ duyệt */
  pendingCount: number;
  /** Tổng doanh thu gần nhất (hiển thị trên màn hình quầy) */
  recentTotal: number;
  /** Callback khi click vào quầy — mở order summary */
  onOpenOrders?: () => void;
  /** Callback khi click trực tiếp vào màn hình máy tính POS */
  onOpenPOS?: () => void;
  /** Vị trí trong scene */
  position?: [number, number, number];
  /** Xoay (radian) */
  rotation?: [number, number, number];
  /** Query client bridge cho React Three Fiber Html portal */
  queryClient?: QueryClient;
  /** Trạng thái mở POS trực tiếp trong màn hình máy tính */
  isPOSActive?: boolean;
  onExitPOS?: () => void;
  orderLines?: CartItem3D[];
  onAddProduct?: (item: CartItem3D) => void;
  onUpdateQuantity?: (productId: string, unitId: string, quantity: number) => void;
  onRemoveItem?: (productId: string, unitId: string) => void;
  onClearOrder?: () => void;
  onOrderSuccess?: (order: Order) => void;
  recentOrders?: Order[];
}

// ── Hằng số quầy ─────────────────────────────────────────────────────────────

const COUNTER_W = 3.6;
const COUNTER_D = 1.35;
const COUNTER_H = 1.15;

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Counter (main) ────────────────────────────────────────────────────────────

export default function Counter({
  pendingCount,
  recentTotal,
  onOpenOrders,
  onOpenPOS,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  queryClient,
  isPOSActive,
  onExitPOS,
  orderLines = [],
  onAddProduct,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onOrderSuccess,
  recentOrders = [],
}: CounterProps) {
  const [hovered, setHovered] = useState(false);
  const [screenHovered, setScreenHovered] = useState(false);
  const hasPending = pendingCount > 0;

  // Spring animation cho hiệu ứng nhấp nháy phát sáng khi có đơn chờ
  const { pulseGlow } = useSpring({
    from: { pulseGlow: 0.2 },
    to: { pulseGlow: hasPending ? 0.9 : 0.2 },
    loop: hasPending ? { reverse: true } : false,
    config: { duration: 650 },
  });

  return (
    <group position={position} rotation={rotation}>
      {/* ── Thân quầy bo cong hiện đại (Base Cabinet) ──────────────── */}
      {/* Khối thân chính màu xám đen sang trọng */}
      <mesh position={[0, (COUNTER_H - 0.08) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[COUNTER_W - 0.1, COUNTER_H - 0.08, COUNTER_D - 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Tấm ốp lam gỗ sọc đứng phía trước quầy */}
      {[-1.5, -1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2, 1.5].map(
        (x, i) => (
          <mesh
            key={`counter-slat-${i}`}
            position={[x, (COUNTER_H - 0.08) / 2, COUNTER_D / 2 - 0.02]}
          >
            <boxGeometry args={[0.16, COUNTER_H - 0.14, 0.04]} />
            <meshStandardMaterial color="#78350f" roughness={0.65} />
          </mesh>
        ),
      )}

      {/* Chân đế quầy kim loại mờ */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[COUNTER_W, 0.06, COUNTER_D]} />
        <meshStandardMaterial color="#020617" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Dải LED phát sáng dưới chân quầy */}
      <mesh position={[0, 0.06, COUNTER_D / 2]}>
        <boxGeometry args={[COUNTER_W * 0.95, 0.02, 0.02]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* ── Mặt bàn quầy đá vân mây trắng cẩm thạch (Marble Countertop) ─ */}
      <mesh
        position={[0, COUNTER_H, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenOrders?.();
        }}
      >
        <boxGeometry args={[COUNTER_W, 0.08, COUNTER_D]} />
        <animated.meshStandardMaterial
          color={hovered ? "#e0e7ff" : "#f1f5f9"}
          roughness={0.15}
          metalness={0.12}
          emissive={hasPending ? "#22c55e" : hovered ? "#6366f1" : "#000000"}
          emissiveIntensity={hasPending ? pulseGlow : hovered ? 0.3 : 0.0}
        />
      </mesh>

      {/* ── Thiết Bị Bán Hàng Trên Quầy ───────────────────────────── */}

      {/* 1. Máy POS tính tiền cảm ứng màn hình lớn */}
      <group position={[0.55, COUNTER_H + 0.04, -0.05]}>
        {/* Chân đế máy POS xoay */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.14, 0.18, 0.16, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Khung viền màn hình cảm ứng nghiêng 40 độ — bấm vào mở giao diện bán hàng */}
        <group
          position={[0, 0.32, 0]}
          rotation={[-0.35, 0, 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setScreenHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setScreenHovered(false);
            document.body.style.cursor = "default";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenPOS?.();
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.75, 0.48, 0.04]} />
            <meshStandardMaterial
              color={screenHovered ? "#1e40af" : "#090d16"}
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
          {/* Màn hình phát sáng hiển thị giao diện bán hàng */}
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.7, 0.43]} />
            <animated.meshStandardMaterial
              color="#0284c7"
              emissive={screenHovered ? "#38bdf8" : hasPending ? "#10b981" : "#0284c7"}
              emissiveIntensity={screenHovered ? 1.5 : hasPending ? pulseGlow : 0.8}
            />
          </mesh>

          {/* Giao diện UI màn hình máy tính 3D (POS nhúng trực tiếp như ngoài đời) */}
          <Html
            transform
            occlude
            distanceFactor={0.62}
            position={[0, 0, 0.03]}
            style={{ pointerEvents: "auto" }}
          >
            <QueryClientProvider client={queryClient || fallbackQueryClient}>
              <POSMonitorScreen
                isActive={!!isPOSActive}
                onActivate={() => onOpenPOS?.()}
                onExit={() => onExitPOS?.()}
                orderLines={orderLines}
                onAddProduct={onAddProduct || (() => {})}
                onUpdateQuantity={onUpdateQuantity || (() => {})}
                onRemoveItem={onRemoveItem || (() => {})}
                onClearOrder={onClearOrder || (() => {})}
                onOrderSuccess={onOrderSuccess || (() => {})}
                recentOrders={recentOrders}
              />
            </QueryClientProvider>
          </Html>
        </group>
      </group>

      {/* 2. Máy in hoá đơn nhiệt (Receipt Thermal Printer) */}
      <group position={[-0.25, COUNTER_H + 0.1, -0.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.2, 0.35]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Khe ra giấy in */}
        <mesh position={[0, 0.105, 0.08]}>
          <boxGeometry args={[0.22, 0.01, 0.05]} />
          <meshStandardMaterial color="#020617" />
        </mesh>
        {/* Đèn báo nguồn xanh lá */}
        <mesh position={[0.1, 0.105, -0.1]}>
          <cylinderGeometry args={[0.015, 0.015, 0.01, 12]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
      </group>

      {/* 3. Máy quét mã vạch để bàn (Barcode Scanner) */}
      <group position={[1.25, COUNTER_H + 0.12, 0.1]}>
        {/* Giá cắm máy quét */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.22, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.6} />
        </mesh>
        {/* Đầu quét mã vạch nghiêng */}
        <mesh position={[0, 0.14, 0.05]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.1, 0.14, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
        {/* Tia laser đỏ mảnh chiếu xuống mặt bàn */}
        <mesh position={[0, -0.05, 0.18]} rotation={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.25, 8]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.65} />
        </mesh>
      </group>

      {/* 4. Đế cắm bảng VietQR thanh toán (QR Stand) */}
      <group position={[-1.15, COUNTER_H + 0.14, 0.18]} rotation={[0, 0.2, 0]}>
        {/* Đế mica trong */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.24, 0.02, 0.12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.2} transparent opacity={0.8} />
        </mesh>
        {/* Bảng đứng QR */}
        <mesh position={[0, 0.12, 0]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.2, 0.24, 0.01]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* Mã QR giả lập */}
        <mesh position={[0, 0.11, 0.008]} rotation={[-0.1, 0, 0]}>
          <planeGeometry args={[0.15, 0.15]} />
          <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* ── Màn Hình Phụ Hướng Ra Khách Hàng (Customer Display) ─────── */}
      <Html
        occlude
        position={[-0.6, COUNTER_H + 0.35, 0.45]}
        center
        distanceFactor={4.8}
        zIndexRange={[40, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex select-none items-center gap-2 rounded-xl border border-white/20 bg-slate-900/90 px-3.5 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-medium text-slate-300">
              Doanh thu hôm nay
            </div>
            <div className="font-extrabold text-xs text-emerald-400 tabular-nums">
              {formatVND(recentTotal)}
            </div>
          </div>
        </div>
      </Html>

      {/* ── Badge cảnh báo đơn chờ duyệt ───────────────────────────── */}
      {hasPending && (
        <Html
          occlude
          position={[0.55, COUNTER_H + 0.95, 0]}
          center
          distanceFactor={5.2}
          zIndexRange={[50, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="animate-bounce flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-xl shadow-red-500/40">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {pendingCount} đơn hàng chờ xử lý
          </div>
        </Html>
      )}

      {/* ── Tooltip khi hover quầy ─────────────────────────────────── */}
      {hovered && (
        <Html
          occlude
          position={[0, COUNTER_H + 0.75, 0.4]}
          center
          distanceFactor={5.2}
          zIndexRange={[60, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="animate-in fade-in zoom-in-95 flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xl">
            <CreditCard className="h-4 w-4" />
            Quầy Thu Ngân • Bấm để Tạo đơn &amp; Thanh toán
          </div>
        </Html>
      )}

      {/* ── Biển chỉ dẫn quầy dưới chân bằng 3D Text (không bị đè layer) ── */}
      <Text
        position={[0, 0.15, COUNTER_D / 2 + 0.02]}
        fontSize={0.11}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        QUẦY THU NGÂN & THANH TOÁN
      </Text>
    </group>
  );
}
