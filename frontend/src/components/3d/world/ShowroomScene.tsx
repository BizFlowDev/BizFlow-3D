"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { StoreDecorations } from "../StoreDecorations";
import { Door3D, DOOR_TOTAL_HEIGHT } from "./Door3D";
import { type RoomId, ROOMS, type DoorId } from "./types";
import { SmartOcclusionGroup } from "./SmartOcclusion";

interface ShowroomSceneProps {
  children?: React.ReactNode;
  onReturnToHallway?: () => void;
  openDoor?: DoorId | null;
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
          color="#dfc9a8"
          roughness={0.3}
          metalness={0.15}
        />
      </mesh>

      {/* Lối đi chính giữa cửa hàng */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[3.2, STORE_DEPTH - 0.5]} />
        <meshStandardMaterial
          color="#aaa99f"
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
function ShowroomWalls({
  onReturnToHallway,
  openDoor,
}: {
  onReturnToHallway?: () => void;
  openDoor?: DoorId | null;
}) {
  const wallBaseColor = "#eeeae3";
  const woodSlatColor = "#c5ab87";

  return (
    <group>
      {/* ── Tường sau có ô cửa mở thông ra Hành Lang — Tự động làm mờ khi nhìn từ phía sau ── */}
      <SmartOcclusionGroup preset="wall-back" threshold={-6.7}>
        {/* Mảng tường sau bên trái */}
        <mesh position={[-4.4, STORE_HEIGHT / 2, -STORE_DEPTH / 2]}>
          <boxGeometry args={[7.2, STORE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
        </mesh>
        {/* Mảng tường sau bên phải */}
        <mesh position={[4.4, STORE_HEIGHT / 2, -STORE_DEPTH / 2]}>
          <boxGeometry args={[7.2, STORE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
        </mesh>
        {/* Mảng tường phía trên khung cửa */}
        <mesh
          position={[
            0,
            DOOR_TOTAL_HEIGHT + (STORE_HEIGHT - DOOR_TOTAL_HEIGHT) / 2,
            -STORE_DEPTH / 2,
          ]}
        >
          <boxGeometry
            args={[1.6, STORE_HEIGHT - DOOR_TOTAL_HEIGHT, WALL_THICKNESS]}
          />
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

        {/* Khung mảnh và mặt biển hiệu navy mờ */}
        <mesh position={[0, STORE_HEIGHT - 0.8, -STORE_DEPTH / 2 + 0.12]}>
          <boxGeometry args={[2.2, 1, 0.08]} />
          <meshStandardMaterial color="#475569" roughness={0.8} metalness={0.1} />
        </mesh>

        <mesh position={[0, STORE_HEIGHT - 0.8, -STORE_DEPTH / 2 + 0.17]}>
          <boxGeometry args={[2.14, 0.94, 0.02]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>

        {/* Chữ phẳng, sắc nét với hai cấp kích thước */}
        <group position={[0, STORE_HEIGHT - 0.8, -STORE_DEPTH / 2 + 0.19]}>
          <Text
            position={[0, 0.14, 0]}
            font="/fonts/Roboto-Bold.ttf"
            fontSize={0.28}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.06}
          >
            BIZFLOW 3D
          </Text>
          <Text
            position={[0, -0.2, 0]}
            font="/fonts/Roboto-Regular.ttf"
            fontSize={0.18}
            color="#cbd5e1"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.22}
          >
            STORE
          </Text>
        </group>

        {/* ── CỬA THÔNG RA HÀNH LANG (Tường sau) ── */}
        {onReturnToHallway && (
          <Door3D
            position={[0, 0, -STORE_DEPTH / 2 + 0.1]}
            doorId="showroom_exit"
            targetRoom="hallway"
            label={ROOMS.hallway.name}
            subLabel="LỐI RA"
            isOpen={openDoor === "showroom_exit"}
            onEnter={() => onReturnToHallway()}
            accentColor="#38bdf8"
          />
        )}
      </SmartOcclusionGroup>

      {/* ── Tường trái — Tự động làm mờ khi camera nhìn từ bên trái ── */}
      <SmartOcclusionGroup preset="wall-left" threshold={-7.8}>
        <mesh
          position={[-STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
        </mesh>
      </SmartOcclusionGroup>

      {/* ── Tường phải — Tự động làm mờ khi camera nhìn từ bên phải ── */}
      <SmartOcclusionGroup preset="wall-right" threshold={7.8}>
        <mesh
          position={[STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
        </mesh>
      </SmartOcclusionGroup>

      {/* ── Mặt tiền cửa kính Showroom phía trước — Tự động làm mờ khi nhìn từ ngoài ── */}
      <SmartOcclusionGroup preset="wall-front" threshold={6.2}>
        <mesh position={[0, STORE_HEIGHT - 0.2, STORE_DEPTH / 2]}>
          <boxGeometry args={[STORE_WIDTH, 0.4, 0.2]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[-STORE_WIDTH / 2 + 0.1, STORE_HEIGHT / 2, STORE_DEPTH / 2]}>
          <boxGeometry args={[0.2, STORE_HEIGHT, 0.2]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[STORE_WIDTH / 2 - 0.1, STORE_HEIGHT / 2, STORE_DEPTH / 2]}>
          <boxGeometry args={[0.2, STORE_HEIGHT, 0.2]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.7} />
        </mesh>
      </SmartOcclusionGroup>
    </group>
  );
}

/**
 * ShowroomCeilingAndLights — Dàn đèn ray chiếu sáng & trần thạch cao
 */
function ShowroomCeilingAndLights() {
  return (
    <group>
      {/* Trần thạch cao & Đèn ray — Tự động làm mờ khi camera nhìn từ trên cao xuống */}
      <SmartOcclusionGroup preset="ceiling" threshold={4.8}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, STORE_HEIGHT, 0]}>
          <planeGeometry args={[STORE_WIDTH, STORE_DEPTH]} />
          <meshStandardMaterial color="#ece9e2" roughness={0.9} side={2} />
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
      </SmartOcclusionGroup>

      {/* Ánh sáng đa lớp */}
      <ambientLight intensity={0.52} color="#ffffff" />
      <directionalLight
        position={[4, STORE_HEIGHT - 0.5, 4]}
        intensity={0.88}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color="#ffffff"
      />
      <directionalLight
        position={[-5, STORE_HEIGHT - 0.6, -3]}
        intensity={0.44}
        color="#ffffff"
      />

      {/* Đèn điểm cho các khu vực kệ */}
      <pointLight
        position={[-3.5, STORE_HEIGHT - 0.5, -3.5]}
        intensity={16}
        distance={9}
        color="#fff4e6"
      />
      <pointLight
        position={[3.5, STORE_HEIGHT - 0.5, -3.5]}
        intensity={16}
        distance={9}
        color="#fff4e6"
      />
      <pointLight
        position={[-5.2, STORE_HEIGHT - 0.5, -0.5]}
        intensity={16}
        distance={9}
        color="#fff4e6"
      />
      <pointLight
        position={[5.2, STORE_HEIGHT - 0.5, -0.5]}
        intensity={16}
        distance={9}
        color="#fff4e6"
      />
      <pointLight
        position={[0, STORE_HEIGHT - 0.5, 2]}
        intensity={14.4}
        distance={8}
        color="#fff4e6"
      />
      <pointLight
        position={[0, STORE_HEIGHT - 1.2, -STORE_DEPTH / 2 + 1.2]}
        intensity={3.2}
        distance={6}
        color="#fff4e6"
      />
    </group>
  );
}

function ShowroomFloorTrim() {
  const trimColor = "#94a3b8";
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
export function ShowroomScene({
  children,
  onReturnToHallway,
  openDoor = null,
}: ShowroomSceneProps) {
  return (
    <group position={[0, 0, 0]}>
      <ShowroomCeilingAndLights />
      <ShowroomFloor />
      <ShowroomWalls onReturnToHallway={onReturnToHallway} openDoor={openDoor} />
      <ShowroomFloorTrim />
      <StoreDecorations />
      {/* ProductShelf x 4 & Counter (chứa POS) */}
      {children}
    </group>
  );
}
