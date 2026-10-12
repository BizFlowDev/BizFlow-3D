"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { StoreDecorations } from "../StoreDecorations";
import { Door3D } from "./Door3D";
import { type RoomId, ROOMS } from "./types";

interface ShowroomSceneProps {
  children?: React.ReactNode;
  onReturnToHallway?: () => void;
}

const STORE_WIDTH = 16;
const STORE_DEPTH = 13;
const STORE_HEIGHT = 5.2;
const WALL_THICKNESS = 0.18;

/**
 * ShowroomFloor — Sàn đá bóng men cao cấp có vạch LED dẫn hướng
 */
function ShowroomFloor() {
  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[STORE_WIDTH, STORE_DEPTH]} />
        <meshStandardMaterial
          color="#1e2433"
          roughness={0.22}
          metalness={0.18}
        />
      </mesh>

      {/* Lối đi chính giữa cửa hàng */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[3.2, STORE_DEPTH - 0.5]} />
        <meshStandardMaterial
          color="#161c28"
          roughness={0.45}
          metalness={0.08}
        />
      </mesh>

      {/* Vạch kẻ ánh sáng dẫn hướng neon hai bên lối đi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.6, 0.005, 0]}>
        <planeGeometry args={[0.04, STORE_DEPTH - 0.6]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#4f46e5"
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.6, 0.005, 0]}>
        <planeGeometry args={[0.04, STORE_DEPTH - 0.6]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#4f46e5"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

/**
 * ShowroomWalls — Tường ốp lam gỗ, bảng hiệu LED và Cửa kết nối ra Hành Lang
 */
function ShowroomWalls({ onReturnToHallway }: { onReturnToHallway?: () => void }) {
  const wallBaseColor = "#0f172a";
  const woodSlatColor = "#854d0e";

  return (
    <group>
      {/* ── Tường sau (Accent Back Wall) ── */}
      <mesh position={[0, STORE_HEIGHT / 2, -STORE_DEPTH / 2]}>
        <boxGeometry args={[STORE_WIDTH, STORE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
      </mesh>

      {/* Mảng ốp lam gỗ dọc trang trí hai bên tường sau */}
      {[-5.8, -5.2, -4.6, -4.0, -3.4, -2.8, 2.8, 3.4, 4.0, 4.6, 5.2, 5.8].map(
        (x, i) => (
          <mesh
            key={`slat-${i}`}
            position={[x, STORE_HEIGHT / 2, -STORE_DEPTH / 2 + 0.12]}
          >
            <boxGeometry args={[0.15, STORE_HEIGHT * 0.92, 0.06]} />
            <meshStandardMaterial color={woodSlatColor} roughness={0.65} />
          </mesh>
        ),
      )}

      {/* Tấm phông trung tâm màu navy sậm cho biển hiệu */}
      <mesh position={[0, STORE_HEIGHT - 1.2, -STORE_DEPTH / 2 + 0.12]}>
        <boxGeometry args={[5.2, 1.4, 0.08]} />
        <meshStandardMaterial color="#1e1b4b" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Viền LED phát sáng quanh bảng hiệu */}
      <mesh position={[0, STORE_HEIGHT - 1.2, -STORE_DEPTH / 2 + 0.17]}>
        <boxGeometry args={[5.26, 1.46, 0.02]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#818cf8"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* Biển hiệu 3D LED "BIZFLOW 3D STORE" */}
      <group position={[0, STORE_HEIGHT - 1.2, -STORE_DEPTH / 2 + 0.19]}>
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.44}
          color="#e0e7ff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
        >
          BIZFLOW 3D STORE
        </Text>
        <Text
          position={[0, -0.22, 0]}
          fontSize={0.15}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          SMART RETAIL & WAREHOUSE SHOWROOM
        </Text>
      </group>

      {/* ── CỬA THÔNG RA HÀNH LANG (Tường sau) ── */}
      {onReturnToHallway && (
        <Door3D
          position={[0, 0, -STORE_DEPTH / 2 + 0.1]}
          targetRoom="hallway"
          label={ROOMS.hallway.name}
          subLabel="LỐI RA"
          onEnter={() => onReturnToHallway()}
          accentColor="#38bdf8"
        />
      )}

      {/* ── Tường trái ── */}
      <mesh
        position={[-STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
      </mesh>

      {/* ── Tường phải ── */}
      <mesh
        position={[STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
      </mesh>

      {/* ── Mặt tiền cửa kính Showroom phía trước ── */}
      <mesh position={[0, STORE_HEIGHT - 0.2, STORE_DEPTH / 2]}>
        <boxGeometry args={[STORE_WIDTH, 0.4, 0.2]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-STORE_WIDTH / 2 + 0.1, STORE_HEIGHT / 2, STORE_DEPTH / 2]}>
        <boxGeometry args={[0.2, STORE_HEIGHT, 0.2]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[STORE_WIDTH / 2 - 0.1, STORE_HEIGHT / 2, STORE_DEPTH / 2]}>
        <boxGeometry args={[0.2, STORE_HEIGHT, 0.2]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * ShowroomCeilingAndLights — Dàn đèn ray chiếu sáng & trần thạch cao
 */
function ShowroomCeilingAndLights() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, STORE_HEIGHT, 0]}>
        <planeGeometry args={[STORE_WIDTH, STORE_DEPTH]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.9} side={2} />
      </mesh>

      {/* Thanh ray đèn */}
      <mesh position={[0, STORE_HEIGHT - 0.12, -2.5]}>
        <boxGeometry args={[11, 0.08, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, STORE_HEIGHT - 0.12, 2.5]}>
        <boxGeometry args={[11, 0.08, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Rọi đèn LED */}
      {[-4, -2, 0, 2, 4].map((x, i) => (
        <group key={`track-light-${i}`} position={[x, STORE_HEIGHT - 0.2, -2.5]}>
          <mesh rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.13, 0.2, 16]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.09, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.08, 16]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#fef08a"
              emissiveIntensity={1.2}
            />
          </mesh>
        </group>
      ))}

      {/* Ánh sáng đa lớp */}
      <ambientLight intensity={0.65} color="#e0e7ff" />
      <directionalLight
        position={[4, STORE_HEIGHT - 0.5, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color="#ffffff"
      />
      <directionalLight
        position={[-5, STORE_HEIGHT - 0.6, -3]}
        intensity={0.55}
        color="#93c5fd"
      />

      {/* Đèn điểm cho các khu vực kệ */}
      <pointLight
        position={[-3.5, STORE_HEIGHT - 0.5, -3.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />
      <pointLight
        position={[3.5, STORE_HEIGHT - 0.5, -3.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />
      <pointLight
        position={[-5.2, STORE_HEIGHT - 0.5, -0.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />
      <pointLight
        position={[5.2, STORE_HEIGHT - 0.5, -0.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />
      <pointLight
        position={[0, STORE_HEIGHT - 0.5, 2]}
        intensity={18}
        distance={8}
        color="#f0f9ff"
      />
      <pointLight
        position={[0, STORE_HEIGHT - 1.2, -STORE_DEPTH / 2 + 1.2]}
        intensity={14}
        distance={6}
        color="#c084fc"
      />
    </group>
  );
}

function ShowroomFloorTrim() {
  const trimColor = "#334155";
  const trimH = 0.14;
  return (
    <group>
      <mesh position={[0, trimH / 2, -STORE_DEPTH / 2 + 0.08]}>
        <boxGeometry args={[STORE_WIDTH, trimH, 0.08]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-STORE_WIDTH / 2 + 0.08, trimH / 2, 0]}>
        <boxGeometry args={[0.08, trimH, STORE_DEPTH]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[STORE_WIDTH / 2 - 0.08, trimH / 2, 0]}>
        <boxGeometry args={[0.08, trimH, STORE_DEPTH]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * ShowroomScene — Phòng 1: Showroom trưng bày sản phẩm & Bán hàng POS
 */
export function ShowroomScene({ children, onReturnToHallway }: ShowroomSceneProps) {
  return (
    <group position={[0, 0, 0]}>
      <ShowroomCeilingAndLights />
      <ShowroomFloor />
      <ShowroomWalls onReturnToHallway={onReturnToHallway} />
      <ShowroomFloorTrim />
      <StoreDecorations />
      {/* ProductShelf x 4 & Counter (chứa POS) */}
      {children}
    </group>
  );
}
