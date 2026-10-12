"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { type RoomId, ROOMS } from "./types";

interface Door3DProps {
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
      <group position={[0, 0, -0.6]} scale={0.25}>
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
      <group position={[0, 0, -0.6]} scale={0.25}>
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
      <group position={[0, 0, -0.6]} scale={0.25}>
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
    <group position={[0, 0, -0.6]} scale={0.25}>
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
export function Door3D({
  position,
  rotation = [0, 0, 0],
  targetRoom,
  label,
  subLabel,
  isOpen = false,
  onEnter,
  accentColor,
}: Door3DProps) {
  const [hovered, setHovered] = useState(false);
  const hingeRef = useRef<THREE.Group>(null);
  const currentAngleRef = useRef(0);

  const roomConfig = ROOMS[targetRoom] || ROOMS.showroom;
  const effectiveAccent = accentColor || roomConfig.accentColor;

  // Kích thước chuẩn cửa 3D
  const DOOR_WIDTH = 1.9;
  const DOOR_HEIGHT = 2.9;
  const DOOR_DEPTH = 0.08;
  const FRAME_THICKNESS = 0.12;

  // Animation bản lề mở/đóng cửa qua useFrame (lerp mượt)
  useFrame((_, delta) => {
    if (!hingeRef.current) return;
    const targetAngle = isOpen ? -Math.PI * 0.45 : 0; // Xoay ~80 độ
    const step = delta * 5.0;
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
      <group position={[0, DOOR_HEIGHT + 0.38, 0.08]}>
        {/* Tấm nền biển hiệu */}
        <mesh>
          <boxGeometry args={[DOOR_WIDTH + 0.3, 0.44, 0.06]} />
          <meshStandardMaterial
            color="#0b0f19"
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>

        {/* Viền LED phát sáng quanh bảng tên */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[DOOR_WIDTH + 0.34, 0.48, 0.02]} />
          <meshStandardMaterial
            color={effectiveAccent}
            emissive={effectiveAccent}
            emissiveIntensity={hovered ? 1.4 : 0.8}
          />
        </mesh>

        {/* Text phụ (ví dụ: PHÒNG 1) */}
        {subLabel && (
          <Text
            position={[0, 0.1, 0.04]}
            fontSize={0.09}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.12}
          >
            {subLabel.toUpperCase()}
          </Text>
        )}

        {/* Text chính (ví dụ: SHOWROOM & BÁN HÀNG) */}
        <Text
          position={[0, subLabel ? -0.06 : 0, 0.04]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
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
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onEnter(targetRoom);
        }}
      >
        {/* Cánh cửa dịch sang phải DOOR_WIDTH / 2 so với pivot */}
        <group position={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, 0]}>
          {/* Tấm cửa chính màu xám than sang trọng */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[DOOR_WIDTH - 0.04, DOOR_HEIGHT - 0.04, DOOR_DEPTH]} />
            <meshStandardMaterial
              color="#131b2e"
              roughness={0.4}
              metalness={0.3}
            />
          </mesh>

          {/* Họa tiết phay dọc trang trí trên cánh cửa */}
          <mesh position={[0, 0, 0.042]}>
            <planeGeometry args={[DOOR_WIDTH - 0.2, DOOR_HEIGHT - 0.2]} />
            <meshStandardMaterial
              color="#0d1322"
              roughness={0.6}
            />
          </mesh>

          {/* Ô kính nhìn xuyên (Observation Window Cutout) */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.7, 1.0, DOOR_DEPTH + 0.02]} />
            <meshStandardMaterial
              color="#38bdf8"
              roughness={0.05}
              metalness={0.1}
              transparent
              opacity={0.38}
            />
          </mesh>

          {/* Khung viền ô kính */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.76, 1.06, DOOR_DEPTH + 0.03]} />
            <meshStandardMaterial
              color={hovered ? effectiveAccent : "#334155"}
              metalness={0.8}
              roughness={0.2}
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
              <cylinderGeometry args={[0.016, 0.016, 0.08, 0.08]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
          </group>

          {/* Đèn báo trạng thái cửa (Indicator Light) */}
          <mesh position={[DOOR_WIDTH / 2 - 0.22, 0.65, 0.045]}>
            <circleGeometry args={[0.035, 16]} />
            <meshStandardMaterial
              color={hovered ? "#22c55e" : effectiveAccent}
              emissive={hovered ? "#22c55e" : effectiveAccent}
              emissiveIntensity={1.5}
            />
          </mesh>

          {/* LOD Preview của phòng đích hiển thị sau ô kính khi cửa đóng */}
          {!isOpen && <DoorLODPreview room={targetRoom} />}
        </group>
      </group>

      {/* ── 4. Floating Interactive Prompt khi hover hoặc khi đến gần ── */}
      {hovered && (
        <Html
          position={[0, DOOR_HEIGHT / 2, 0.6]}
          center
          distanceFactor={9}
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
