"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { Door3D } from "./Door3D";
import { type RoomId, ROOMS } from "./types";

interface HallwaySceneProps {
  activeRoom: RoomId;
  onEnterRoom: (room: RoomId) => void;
}

const HALLWAY_WIDTH = 32;
const HALLWAY_DEPTH = 8;
const HALLWAY_HEIGHT = 4.8;
const WALL_THICKNESS = 0.2;
const CENTER_Z = -14;

export function HallwayScene({ activeRoom, onEnterRoom }: HallwaySceneProps) {
  const wallBaseColor = "#090d16";
  const woodSlatColor = "#78350f";

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. SÀN HÀNH LANG (Luxury Polished Terrazzo Floor) ─────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, CENTER_Z]}
        receiveShadow
      >
        <planeGeometry args={[HALLWAY_WIDTH, HALLWAY_DEPTH]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.2}
          metalness={0.25}
        />
      </mesh>

      {/* Thảm lối đi chính (Central Aisle Runner) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, CENTER_Z]}
      >
        <planeGeometry args={[22, 2.4]} />
        <meshStandardMaterial
          color="#090d16"
          roughness={0.5}
        />
      </mesh>

      {/* Lối đi dọc nối từ Cửa A (Showroom) vào giữa */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.0035, CENTER_Z + 2]}
      >
        <planeGeometry args={[2.4, 4]} />
        <meshStandardMaterial
          color="#090d16"
          roughness={0.5}
        />
      </mesh>

      {/* ── Vạch LED Neon dẫn hướng trên sàn ───────────────────────── */}
      {/* Vạch dẫn tới Cửa A (Showroom - Indigo) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.006, CENTER_Z + 2]}
      >
        <planeGeometry args={[0.06, 3.8]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Vạch rẽ trái dẫn tới Cửa B (Kho Hàng - Amber) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-4, 0.006, CENTER_Z]}
      >
        <planeGeometry args={[8, 0.06]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.2}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-8, 0.006, CENTER_Z - 2]}
      >
        <planeGeometry args={[0.06, 4]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Vạch rẽ phải dẫn tới Cửa C (Văn Phòng - Emerald) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[4, 0.006, CENTER_Z]}
      >
        <planeGeometry args={[8, 0.06]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={1.2}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[8, 0.006, CENTER_Z - 2]}
      >
        <planeGeometry args={[0.06, 4]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* ── 2. TƯỜNG SAU HÀNH LANG (Back Wall z = -18) ─────────────── */}
      <group position={[0, 0, -18]}>
        {/* Tường sau bên trái (bên ngoài cửa Kho) */}
        <mesh position={[-12, HALLWAY_HEIGHT / 2, 0]}>
          <boxGeometry args={[8, HALLWAY_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.7} />
        </mesh>
        {/* Tường sau giữa hai cửa B & C (Khu trung tâm Hub) */}
        <mesh position={[0, HALLWAY_HEIGHT / 2, 0]}>
          <boxGeometry args={[12, HALLWAY_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.7} />
        </mesh>
        {/* Tường sau bên phải (bên ngoài cửa Văn phòng) */}
        <mesh position={[12, HALLWAY_HEIGHT / 2, 0]}>
          <boxGeometry args={[8, HALLWAY_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.7} />
        </mesh>

        {/* Mảng lam gỗ trang trí khu vực trung tâm */}
        {[-3.6, -3.0, -2.4, -1.8, 1.8, 2.4, 3.0, 3.6].map((x, i) => (
          <mesh
            key={`hub-slat-${i}`}
            position={[x, HALLWAY_HEIGHT / 2, 0.12]}
          >
            <boxGeometry args={[0.15, HALLWAY_HEIGHT * 0.88, 0.06]} />
            <meshStandardMaterial color={woodSlatColor} roughness={0.65} />
          </mesh>
        ))}

        {/* Biển hiệu trung tâm hành lang: BIZFLOW 3D HUB */}
        <group position={[0, HALLWAY_HEIGHT - 1.3, 0.14]}>
          <mesh>
            <boxGeometry args={[3.2, 1.1, 0.06]} />
            <meshStandardMaterial color="#0b1120" roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[3.26, 1.16, 0.02]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={0.8}
            />
          </mesh>
          <Text
            position={[0, 0.18, 0.04]}
            fontSize={0.28}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.08}
          >
            BIZFLOW 3D
          </Text>
          <Text
            position={[0, -0.15, 0.04]}
            fontSize={0.11}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.1}
          >
            CENTRAL CONNECTIVITY HUB
          </Text>
        </group>

        {/* ── CỬA B: KHO & SẢN PHẨM (x = -8) ───────────────────────── */}
        <Door3D
          position={[-8, 0, 0]}
          targetRoom="warehouse"
          label={ROOMS.warehouse.name}
          subLabel={ROOMS.warehouse.badge}
          isOpen={activeRoom === "warehouse"}
          onEnter={onEnterRoom}
          accentColor={ROOMS.warehouse.accentColor}
        />

        {/* ── CỬA C: VĂN PHÒNG QUẢN LÝ (x = 8) ────────────────────── */}
        <Door3D
          position={[8, 0, 0]}
          targetRoom="office"
          label={ROOMS.office.name}
          subLabel={ROOMS.office.badge}
          isOpen={activeRoom === "office"}
          onEnter={onEnterRoom}
          accentColor={ROOMS.office.accentColor}
        />
      </group>

      {/* ── 3. TƯỜNG TRƯỚC HÀNH LANG (Front Wall z = -10, giáp Showroom) ── */}
      <group position={[0, 0, -10]}>
        {/* Mảng tường trái */}
        <mesh position={[-9, HALLWAY_HEIGHT / 2, 0]}>
          <boxGeometry args={[14, HALLWAY_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.7} />
        </mesh>
        {/* Mảng tường phải */}
        <mesh position={[9, HALLWAY_HEIGHT / 2, 0]}>
          <boxGeometry args={[14, HALLWAY_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.7} />
        </mesh>

        {/* ── CỬA A: SHOWROOM & BÁN HÀNG (x = 0, xoay 180 độ quay về hành lang) ── */}
        <Door3D
          position={[0, 0, 0]}
          rotation={[0, Math.PI, 0]}
          targetRoom="showroom"
          label={ROOMS.showroom.name}
          subLabel={ROOMS.showroom.badge}
          isOpen={activeRoom === "showroom"}
          onEnter={onEnterRoom}
          accentColor={ROOMS.showroom.accentColor}
        />
      </group>

      {/* ── 4. TƯỜNG HAI ĐẦU HÀNH LANG (Left & Right Walls) ────────── */}
      {/* Tường trái x = -16 */}
      <mesh
        position={[-HALLWAY_WIDTH / 2, HALLWAY_HEIGHT / 2, CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[HALLWAY_DEPTH, HALLWAY_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.7} />
      </mesh>
      {/* Tường phải x = 16 */}
      <mesh
        position={[HALLWAY_WIDTH / 2, HALLWAY_HEIGHT / 2, CENTER_Z]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[HALLWAY_DEPTH, HALLWAY_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.7} />
      </mesh>

      {/* ── 5. TRẦN NHÀ & ĐÈN RAY HÀNH LANG ───────────────────────── */}
      {/* Trần thạch cao */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, HALLWAY_HEIGHT, CENTER_Z]}
      >
        <planeGeometry args={[HALLWAY_WIDTH, HALLWAY_DEPTH]} />
        <meshStandardMaterial color="#070b14" roughness={0.9} side={2} />
      </mesh>

      {/* Đèn ray LED tuyến tính dài dọc trần */}
      <mesh position={[0, HALLWAY_HEIGHT - 0.08, CENTER_Z]}>
        <boxGeometry args={[26, 0.06, 0.12]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#38bdf8"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Đèn điểm cho từng cửa */}
      {/* Đèn trên Cửa A */}
      <pointLight
        position={[0, HALLWAY_HEIGHT - 0.4, -10.8]}
        intensity={18}
        distance={7}
        color="#818cf8"
      />
      {/* Đèn trên Cửa B */}
      <pointLight
        position={[-8, HALLWAY_HEIGHT - 0.4, -17.2]}
        intensity={18}
        distance={7}
        color="#fbbf24"
      />
      {/* Đèn trên Cửa C */}
      <pointLight
        position={[8, HALLWAY_HEIGHT - 0.4, -17.2]}
        intensity={18}
        distance={7}
        color="#34d399"
      />
      {/* Đèn trung tâm Hub */}
      <pointLight
        position={[0, HALLWAY_HEIGHT - 0.4, CENTER_Z]}
        intensity={15}
        distance={8}
        color="#bae6fd"
      />

      {/* Ánh sáng ambient dịu cho hành lang */}
      <ambientLight intensity={0.55} color="#e2e8f0" />

      {/* ── 6. Chậu cây trang trí hành lang ───────────────────────── */}
      {[-4, 4, -13, 13].map((plantX, i) => (
        <group key={`hall-plant-${i}`} position={[plantX, 0, CENTER_Z + 2.8]}>
          {/* Chậu đá mài hình trụ */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.26, 0.2, 0.8, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
          {/* Cây cảnh xanh mướt */}
          <mesh position={[0, 0.95, 0]}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshStandardMaterial color="#166534" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
