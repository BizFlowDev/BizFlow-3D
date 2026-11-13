"use client";

import { useState } from "react";
import { useThree } from "@react-three/fiber";
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
  const { size } = useThree();
  const screenWidth = isPOSActive ? Math.max(800, Math.min(1440, size.width - 48)) : 1200;
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

      {/* 1. Máy POS tính tiền cảm ứng màn hình lớn (kích thước lớn tương đương modal bán hàng) */}
      <group position={[0.45, COUNTER_H + 0.04, -0.05]}>
        {/* Chân đế máy POS xoay vững chắc */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.2, 0.26, 0.24, 24]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Khung viền màn hình cảm ứng nghiêng 20 độ — to bằng modal bán hàng */}
        <group
          position={[0, 0.62, 0]}
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
          {/* Vỏ khung màn hình viền mỏng bo góc */}
          <mesh castShadow>
            <boxGeometry args={[1.6, 1.024, 0.05]} />
            <meshStandardMaterial
              color={screenHovered ? "#1e40af" : "#090d16"}
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
          {/* Màn hình phát sáng hiển thị giao diện bán hàng */}
          <mesh position={[0, 0, 0.026]}>
            <planeGeometry args={[1.40, 0.875]} />
            <animated.meshStandardMaterial
              color="#0284c7"
              emissive={screenHovered ? "#38bdf8" : hasPending ? "#10b981" : "#0284c7"}
              emissiveIntensity={screenHovered ? 1.5 : hasPending ? pulseGlow : 0.8}
            />
          </mesh>

          {/* Giao diện UI màn hình máy tính 3D (POS nhúng trực tiếp chuẩn tỷ lệ modal 1200x750) */}
          <Html
            transform
            occlude
            distanceFactor={624 / screenWidth}
            position={[0, 0, 0.03]}
            zIndexRange={[10, 0]}
            style={{ pointerEvents: "auto" }}
          >
            <QueryClientProvider client={queryClient || fallbackQueryClient}>
              <POSMonitorScreen
                screenWidth={screenWidth}
                isActive={!!isPOSActive}
                onActivate={() => onOpenPOS?.()}
                onExit={() => onExitPOS?.()}
                orderLines={orderLines}
                onAddProduct={onAddProduct || (() => { })}
                onUpdateQuantity={onUpdateQuantity || (() => { })}
                onRemoveItem={onRemoveItem || (() => { })}
                onClearOrder={onClearOrder || (() => { })}
                onOrderSuccess={onOrderSuccess || (() => { })}
                recentOrders={recentOrders}
              />
            </QueryClientProvider>
          </Html>
        </group>
      </group>

      {/* 2. Máy in hoá đơn nhiệt (Receipt Thermal Printer) */}
      <group position={[-0.55, COUNTER_H + 0.1, -0.2]}>
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
      <group position={[1.38, COUNTER_H + 0.12, 0.1]}>
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

      {/* 4. Đế cắm bảng mã QR thanh toán Stripe / POS (QR Stand) */}
      <group position={[-1.30, COUNTER_H + 0.14, 0.18]} rotation={[0, 0.2, 0]}>
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


      {/* ── Badge cảnh báo đơn chờ duyệt ───────────────────────────── */}
      {hasPending && (
        <Html
          occlude
          position={[0.55, COUNTER_H + 0.95, 0]}
          center
          distanceFactor={5.2}
          zIndexRange={[45, 25]}
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
