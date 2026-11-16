"use client";
import { useRoomFrame } from "./roomActivity";

import { useRef, useState } from "react";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { type RoomId, ROOMS, type DoorId } from "./types";

interface Door3DProps {
  locked?: boolean;
  /** Vị trí cửa */
  position: [number, number, number];
  /** Góc xoay cửa (rotation Y) */
  rotation?: [number, number, number];
  /** Phòng đích khi bước qua cửa */
  targetRoom: RoomId;
  /** Tiêu đề hiển thị trên biển cửa */
  label: string;
  /** Biển phụ (số phòng, ví dụ: PHÒNG 1) */
  subLabel?: string;
  /** Cửa đang mở hay đóng */
  isOpen?: boolean;
  /** Mã định danh cánh cửa */
  doorId?: DoorId;
  /** Callback khi click vào cửa */
  onEnter: (room: RoomId) => void;
  /** Màu nhấn chủ đạo */
  accentColor?: string;
}

/**
 * Low-Poly LOD Preview hiển thị qua ô kính cửa khi đứng ở ngoài nhìn vào.
 * Cực nhẹ (chỉ ~3-5 mesh khối cơ bản) để gợi ý không gian bên trong.
 */
function DoorLODPreview({ room }: { room: RoomId }) {
  if (room === "showroom") {
    return (
      <group position={[0, 0.22, -0.45]} scale={0.25}>
        {/* Kệ hàng mini LOD */}
        <mesh position={[-1.2, 0.4, 0]}>
          <boxGeometry args={[0.8, 1.2, 0.4]} />
          <meshStandardMaterial color="#4f46e5" roughness={0.5} />
        </mesh>
        <mesh position={[1.2, 0.4, 0]}>
          <boxGeometry args={[0.8, 1.2, 0.4]} />
          <meshStandardMaterial color="#0ea5e9" roughness={0.5} />
        </mesh>
        {/* Quầy thu ngân mini */}
        <mesh position={[0, 0.2, 0.8]}>
          <boxGeometry args={[1.2, 0.6, 0.5]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Ánh sáng ấm nội bộ preview */}
        <pointLight position={[0, 1.5, 0]} intensity={4} distance={3} color="#fef08a" />
      </group>
    );
  }

  if (room === "warehouse") {
    return (
      <group position={[0, 0.22, -0.45]} scale={0.25}>
        {/* Thùng hàng mini trên pallet */}
        <mesh position={[-0.8, 0.3, 0]}>
          <boxGeometry args={[0.9, 0.8, 0.9]} />
          <meshStandardMaterial color="#b45309" roughness={0.8} />
        </mesh>
        <mesh position={[0.8, 0.5, -0.2]}>
          <boxGeometry args={[0.8, 1.4, 0.4]} />
          <meshStandardMaterial color="#059669" roughness={0.6} />
        </mesh>
        <mesh position={[0.2, 0.25, 0.6]}>
          <boxGeometry args={[0.6, 0.5, 0.6]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} />
        </mesh>
        {/* Đèn vàng công nghiệp */}
        <pointLight position={[0, 1.5, 0]} intensity={4} distance={3} color="#fbbf24" />
      </group>
    );
  }

  if (room === "office") {
    return (
      <group position={[0, 0.22, -0.45]} scale={0.25}>
        {/* Bàn giám đốc mini */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.6, 0.6, 0.8]} />
          <meshStandardMaterial color="#475569" roughness={0.4} />
        </mesh>
        {/* TV phát sáng mini */}
        <mesh position={[0, 1.2, -0.8]}>
          <boxGeometry args={[1.4, 0.8, 0.05]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.2}
          />
        </mesh>
        {/* Đèn ánh sáng lạnh văn phòng */}
        <pointLight position={[0, 1.5, 0]} intensity={4} distance={3} color="#93c5fd" />
      </group>
    );
  }

  // Preview ra Hành lang
  return (
    <group position={[0, 0.22, -0.45]} scale={0.25}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 2.5]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.5}
        />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={3} distance={2.5} color="#38bdf8" />
    </group>
  );
}

/**
 * Door3D — Cánh cửa tương tác 3D với cơ chế:
 * - Khung cửa kim loại hiện đại + biển hiệu phát sáng
 * - Bản lề xoay êm ái khi mở
 * - Cửa sổ kính trong suốt có LOD Preview phòng đích
 * - Hiệu ứng hover viền neon + tooltip mời vào
 */
// Kích thước chuẩn cửa 3D (cân đối, không bị quá to hay va chạm biển hiệu tường)
export const DOOR_WIDTH = 1.4;
export const DOOR_HEIGHT = 2.4;
export const DOOR_DEPTH = 0.07;
export const FRAME_THICKNESS = 0.09;
/** Tổng chiều cao toàn bộ cụm cửa bao gồm khung và biển hiệu LED */
export const DOOR_TOTAL_HEIGHT = 2.8;

export function Door3D({
  position,
  rotation = [0, 0, 0],
  targetRoom,
  label,
  subLabel,
  isOpen = false,
  locked = false,
  onEnter,
  accentColor,
}: Door3DProps) {
  const [hovered, setHovered] = useState(false);
  const hingeRef = useRef<THREE.Group>(null);
  const currentAngleRef = useRef(0);

  const roomConfig = ROOMS[targetRoom] || ROOMS.showroom;
  const effectiveAccent = accentColor || roomConfig.accentColor;

  // Animation bản lề mở/đóng cửa êm ái, chuyển động đầm chắc tự nhiên (~0.65s)
  useRoomFrame((_, delta) => {
    if (!hingeRef.current) return;
    const targetAngle = isOpen && !locked ? -Math.PI * 0.48 : 0; // Xoay ~86 độ
    const step = Math.min(1, delta * 4.2);
    currentAngleRef.current = THREE.MathUtils.lerp(
      currentAngleRef.current,
      targetAngle,
      step,
    );
    hingeRef.current.rotation.y = currentAngleRef.current;
  });

  return (
    <group position={position} rotation={rotation}>
      {/* ── 1. Khung cửa ngoài cố định (Fixed Frame) ───────────────── */}
      <group>
        {/* Khung trên */}
        <mesh position={[0, DOOR_HEIGHT + FRAME_THICKNESS / 2, 0]}>
          <boxGeometry
            args={[
              DOOR_WIDTH + FRAME_THICKNESS * 2,
              FRAME_THICKNESS,
              FRAME_THICKNESS * 2,
            ]}
          />
          <meshStandardMaterial
            color={hovered ? effectiveAccent : "#1e293b"}
            metalness={0.7}
            roughness={0.3}
            emissive={hovered ? effectiveAccent : "#000000"}
            emissiveIntensity={hovered ? 0.35 : 0}
          />
        </mesh>

        {/* Khung trụ bên trái */}
        <mesh
          position={[
            -DOOR_WIDTH / 2 - FRAME_THICKNESS / 2,
            DOOR_HEIGHT / 2,
            0,
          ]}
        >
          <boxGeometry
            args={[FRAME_THICKNESS, DOOR_HEIGHT, FRAME_THICKNESS * 2]}
          />
          <meshStandardMaterial
            color={hovered ? effectiveAccent : "#1e293b"}
            metalness={0.7}
            roughness={0.3}
            emissive={hovered ? effectiveAccent : "#000000"}
            emissiveIntensity={hovered ? 0.35 : 0}
          />
        </mesh>

        {/* Khung trụ bên phải */}
        <mesh
          position={[
            DOOR_WIDTH / 2 + FRAME_THICKNESS / 2,
            DOOR_HEIGHT / 2,
            0,
          ]}
        >
          <boxGeometry
            args={[FRAME_THICKNESS, DOOR_HEIGHT, FRAME_THICKNESS * 2]}
          />
          <meshStandardMaterial
            color={hovered ? effectiveAccent : "#1e293b"}
            metalness={0.7}
            roughness={0.3}
            emissive={hovered ? effectiveAccent : "#000000"}
            emissiveIntensity={hovered ? 0.35 : 0}
          />
        </mesh>

        {/* Bậc ngưỡng cửa (Threshold) */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry
            args={[
              DOOR_WIDTH + FRAME_THICKNESS * 2,
              0.04,
              FRAME_THICKNESS * 2.2,
            ]}
          />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 2. Biển hiệu LED trên đỉnh cửa (Room Signboard) ────────── */}
      <group position={[0, DOOR_HEIGHT + 0.22, 0.08]}>
        {/* Tấm nền biển hiệu */}
        <mesh>
          <boxGeometry args={[DOOR_WIDTH + 0.16, 0.34, 0.05]} />
          <meshStandardMaterial
            color="#090e1a"
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>

        {/* Viền LED phát sáng quanh bảng tên */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[DOOR_WIDTH + 0.2, 0.38, 0.02]} />
          <meshStandardMaterial
            color={effectiveAccent}
            emissive={effectiveAccent}
            emissiveIntensity={hovered ? 1.5 : 0.85}
          />
        </mesh>

        {/* Text phụ (ví dụ: PHÒNG 1 / LỐI RA) */}
        {subLabel && (
          <Text
            position={[0, 0.07, 0.035]}
            fontSize={0.065}
            color="#93c5fd"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.12}
            outlineWidth={0.01}
            outlineColor="#3d3d3d"
            outlineOpacity={0.3}
            outlineBlur={0}
          >
            {locked ? "ĐÃ KHÓA · CHỦ CỬA HÀNG" : subLabel.toUpperCase()}
          </Text>
        )}

        {/* Text chính (ví dụ: SHOWROOM & BÁN HÀNG) */}
        <Text
          position={[0, subLabel ? -0.05 : 0, 0.035]}
          fontSize={0.088}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.02}
          maxWidth={DOOR_WIDTH}
          outlineWidth={0.01}
          outlineColor="#3d3d3d"
          outlineOpacity={0.3}
          outlineBlur={0}
        >
          {label}
        </Text>
      </group>

      {/* ── 3. Cánh cửa bản lề (Hinged Door Leaf) ───────────────────── */}
      {/* Pivot đặt tại cạnh trái của cửa (-DOOR_WIDTH / 2) để xoay chuẩn */}
      <group
        ref={hingeRef}
        position={[-DOOR_WIDTH / 2, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(!locked);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!locked) onEnter(targetRoom);
        }}
      >
        {/* Cánh cửa dịch sang phải DOOR_WIDTH / 2 so với pivot */}
        <group position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]}>
          {/* ── 4 Mảng cánh cửa chính tạo ô thoáng rỗng ở giữa (không bị che kính) ── */}
          {/* Mảng trên ô kính */}
          <mesh castShadow receiveShadow position={[0, 0.99, 0]}>
            <boxGeometry args={[DOOR_WIDTH - 0.04, 0.38, DOOR_DEPTH]} />
            <meshStandardMaterial color="#131b2e" roughness={0.4} metalness={0.3} />
          </mesh>

          {/* Mảng dưới ô kính */}
          <mesh castShadow receiveShadow position={[0, -0.67, 0]}>
            <boxGeometry args={[DOOR_WIDTH - 0.04, 1.02, DOOR_DEPTH]} />
            <meshStandardMaterial color="#131b2e" roughness={0.4} metalness={0.3} />
          </mesh>

          {/* Đố cửa bên trái ô kính */}
          <mesh castShadow receiveShadow position={[-0.475, 0.32, 0]}>
            <boxGeometry args={[0.41, 0.96, DOOR_DEPTH]} />
            <meshStandardMaterial color="#131b2e" roughness={0.4} metalness={0.3} />
          </mesh>

          {/* Đố cửa bên phải ô kính */}
          <mesh castShadow receiveShadow position={[0.475, 0.32, 0]}>
            <boxGeometry args={[0.41, 0.96, DOOR_DEPTH]} />
            <meshStandardMaterial color="#131b2e" roughness={0.4} metalness={0.3} />
          </mesh>

          {/* Họa tiết trang trí phay rãnh mặt trước & sau (chỉ ốp ở phần dưới, không che kính) */}
          <mesh position={[0, -0.67, DOOR_DEPTH / 2 + 0.002]}>
            <planeGeometry args={[DOOR_WIDTH - 0.2, 0.86]} />
            <meshStandardMaterial color="#0d1322" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.67, -DOOR_DEPTH / 2 - 0.002]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[DOOR_WIDTH - 0.2, 0.86]} />
            <meshStandardMaterial color="#0d1322" roughness={0.6} />
          </mesh>

          {/* ── Khung nẹp viền bao quanh ô kính (4 thanh nẹp rỗng) ── */}
          {/* Nẹp trên */}
          <mesh position={[0, 0.812, 0]}>
            <boxGeometry args={[0.54 + 0.048, 0.024, DOOR_DEPTH + 0.016]} />
            <meshStandardMaterial
              color={hovered ? effectiveAccent : "#334155"}
              metalness={0.8}
              roughness={0.2}
              emissive={hovered ? effectiveAccent : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>
          {/* Nẹp dưới */}
          <mesh position={[0, -0.172, 0]}>
            <boxGeometry args={[0.54 + 0.048, 0.024, DOOR_DEPTH + 0.016]} />
            <meshStandardMaterial
              color={hovered ? effectiveAccent : "#334155"}
              metalness={0.8}
              roughness={0.2}
              emissive={hovered ? effectiveAccent : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>
          {/* Nẹp trái */}
          <mesh position={[-0.282, 0.32, 0]}>
            <boxGeometry args={[0.024, 0.96, DOOR_DEPTH + 0.016]} />
            <meshStandardMaterial
              color={hovered ? effectiveAccent : "#334155"}
              metalness={0.8}
              roughness={0.2}
              emissive={hovered ? effectiveAccent : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>
          {/* Nẹp phải */}
          <mesh position={[0.282, 0.32, 0]}>
            <boxGeometry args={[0.024, 0.96, DOOR_DEPTH + 0.016]} />
            <meshStandardMaterial
              color={hovered ? effectiveAccent : "#334155"}
              metalness={0.8}
              roughness={0.2}
              emissive={hovered ? effectiveAccent : "#000000"}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>

          {/* ── Tấm kính nhìn xuyên thực sự (Không bị bất cứ vật thể nào che khuất) ── */}
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.54, 0.96, 0.012]} />
            <meshStandardMaterial
              color="#baeafdf5"
              roughness={0.05}
              metalness={0.6}
              transparent
              opacity={0.85}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Tay nắm cửa kim loại dọc dài hiện đại (Handle) */}
          <group position={[DOOR_WIDTH / 2 - 0.22, 0, 0.08]}>
            <mesh>
              <cylinderGeometry args={[0.02, 0.02, 0.7, 16]} />
              <meshStandardMaterial
                color="#e2e8f0"
                metalness={0.9}
                roughness={0.15}
              />
            </mesh>
            {/* Chốt gắn tay nắm trên & dưới */}
            <mesh position={[0, 0.28, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.08, 12]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
            <mesh position={[0, -0.28, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.08, 12]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
          </group>

          {/* Đèn báo trạng thái cửa (Indicator Light) */}
          <mesh position={[DOOR_WIDTH / 2 - 0.22, 0.65, 0.045]}>
            <circleGeometry args={[0.035, 16]} />
            <meshStandardMaterial
              color={isOpen || hovered ? "#22c55e" : effectiveAccent}
              emissive={isOpen || hovered ? "#22c55e" : effectiveAccent}
              emissiveIntensity={isOpen ? 2.5 : hovered ? 1.8 : 0.9}
            />
          </mesh>

          {/* LOD Preview của phòng đích hiển thị sau ô kính khi cửa đóng */}
          {!isOpen && <DoorLODPreview room={targetRoom} />}

          {/* Ánh sáng tràn qua ngưỡng cửa khi mở (Doorway Light Beam) */}
          {isOpen && (
            <pointLight
              position={[0, 1.2, -0.2]}
              intensity={5.5}
              distance={4.2}
              color={effectiveAccent}
            />
          )}
        </group>
      </group>

      {/* ── 4. Floating Interactive Prompt khi hover hoặc khi đến gần ── */}
      {hovered && (
        <Html
          position={[0, DOOR_HEIGHT / 2, 0.6]}
          center
          distanceFactor={9}
          zIndexRange={[35, 15]}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/90 px-3.5 py-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <span
              className="h-2 w-2 rounded-full animate-ping"
              style={{ backgroundColor: effectiveAccent }}
            />
            <p className="whitespace-nowrap text-xs font-bold text-white drop-shadow">
              Click để mở cửa &bull; Vào {label}
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}
