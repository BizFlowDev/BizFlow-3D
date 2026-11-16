"use client";

import { Door3D, DOOR_TOTAL_HEIGHT } from "./Door3D";
import { type RoomId, ROOMS, type DoorId } from "./types";
import { SmartOcclusionGroup } from "./SmartOcclusion";
import { RoomLighting } from "./RoomLighting";
import { LogoutKiosk } from "./LogoutKiosk";

import { ALL_ROOMS } from "./roomAccess";

interface HallwaySceneProps {
  allowedRooms?: readonly RoomId[];
  activeRoom: RoomId;
  onEnterRoom: (room: RoomId) => void;
  openDoor?: DoorId | null;
  onRequestLogout?: () => void;
  canLogout?: boolean;
}

const HALLWAY_WIDTH = 16;
const HALLWAY_DEPTH = 8;
const HALLWAY_HEIGHT = 4.8;
const WALL_THICKNESS = 0.2;
const CENTER_Z = -14;

// Kích thước chuẩn cho mảng tường trên khung cửa
const DOOR_OPENING_WIDTH = 1.6;
const WALL_ABOVE_DOOR_HEIGHT = HALLWAY_HEIGHT - DOOR_TOTAL_HEIGHT;
const WALL_ABOVE_DOOR_Y = DOOR_TOTAL_HEIGHT + WALL_ABOVE_DOOR_HEIGHT / 2;

export function HallwayScene({
  activeRoom,
  allowedRooms = ALL_ROOMS,
  onEnterRoom,
  openDoor = null,
  onRequestLogout,
  canLogout = false,
}: HallwaySceneProps) {
  const wallBaseColor = "#eeeae3";
  const woodSlatColor = "#c5ab87";

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
          color="#dfc9a8"
          roughness={0.3}
          metalness={0.15}
        />
      </mesh>

      {/* Thảm lối đi chính (Central Aisle Runner) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, CENTER_Z]}
      >
        <planeGeometry args={[16, 2.4]} />
        <meshStandardMaterial
          color="#788890"
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
          color="#788890"
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
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Vạch rẽ trái dẫn tới Cửa B (Kho Hàng - Amber) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-1.6, 0.006, CENTER_Z]}
      >
        <planeGeometry args={[3.2, 0.06]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-3.2, 0.006, CENTER_Z - 2]}
      >
        <planeGeometry args={[0.06, 4]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Vạch rẽ phải dẫn tới Cửa C (Văn Phòng - Emerald) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[1.6, 0.006, CENTER_Z]}
      >
        <planeGeometry args={[3.2, 0.06]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[3.2, 0.006, CENTER_Z - 2]}
      >
        <planeGeometry args={[0.06, 4]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* ── 2. TƯỜNG SAU HÀNH LANG (Back Wall z = -18) — Tự động làm mờ khi xem kho hoặc văn phòng ─────────────── */}
      <SmartOcclusionGroup
        checkOcclusion={(pos) =>
          pos.z < -17.8 ||
          (activeRoom === "warehouse" && pos.x < 0) ||
          (activeRoom === "office" && pos.x > 0)
        }
      >
        <group position={[0, 0, -18]}>
          {/* Tường trên cửa B (Kho & Sản Phẩm) */}
          <mesh position={[-3.2, WALL_ABOVE_DOOR_Y, 0]}>
            <boxGeometry args={[DOOR_OPENING_WIDTH, WALL_ABOVE_DOOR_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>
          {/* Tường trên cửa C (Văn Phòng Quản Lý) */}
          <mesh position={[3.2, WALL_ABOVE_DOOR_Y, 0]}>
            <boxGeometry args={[DOOR_OPENING_WIDTH, WALL_ABOVE_DOOR_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>
          {/* Tường sau bên trái (bên ngoài cửa Kho) */}
          <mesh position={[-6.0, HALLWAY_HEIGHT / 2, 0]}>
            <boxGeometry args={[4.0, HALLWAY_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>
          {/* Tường sau giữa hai cửa B & C (Khu trung tâm Hub) */}
          <mesh position={[0, HALLWAY_HEIGHT / 2, 0]}>
            <boxGeometry args={[4.8, HALLWAY_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>
          {/* Tường sau bên phải (bên ngoài cửa Văn phòng) */}
          <mesh position={[6.0, HALLWAY_HEIGHT / 2, 0]}>
            <boxGeometry args={[4.0, HALLWAY_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>

          {/* Mảng lam gỗ trang trí khu vực trung tâm */}
          {[-1.8, -1.3, 1.3, 1.8].map((x, i) => (
            <mesh
              key={`hub-slat-${i}`}
              position={[x, HALLWAY_HEIGHT / 2, 0.12]}
            >
              <boxGeometry args={[0.15, HALLWAY_HEIGHT * 0.88, 0.06]} />
              <meshStandardMaterial color={woodSlatColor} roughness={0.65} />
            </mesh>
          ))}

          {/* ── CỬA B: KHO & SẢN PHẨM (x = -3.2) ───────────────────────── */}
          <Door3D
            position={[-3.2, 0, 0]}
            doorId="hallway_door_warehouse"
            targetRoom="warehouse"
            locked={!allowedRooms.includes("warehouse")}
            label={ROOMS.warehouse.name}
            subLabel={ROOMS.warehouse.badge}
            isOpen={openDoor === "hallway_door_warehouse"}
            onEnter={onEnterRoom}
            accentColor={ROOMS.warehouse.accentColor}
          />

          {/* ── CỬA C: VĂN PHÒNG QUẢN LÝ (x = 3.2) ────────────────────── */}
          <Door3D
            position={[3.2, 0, 0]}
            doorId="hallway_door_office"
            targetRoom="office"
            locked={!allowedRooms.includes("office")}
            label={ROOMS.office.name}
            subLabel={ROOMS.office.badge}
            isOpen={openDoor === "hallway_door_office"}
            onEnter={onEnterRoom}
            accentColor={ROOMS.office.accentColor}
          />
        </group>
      </SmartOcclusionGroup>

      {onRequestLogout && (
        <LogoutKiosk enabled={canLogout && activeRoom === "hallway"} onRequestLogout={onRequestLogout} />
      )}

      {/* ── 3. TƯỜNG TRƯỚC HÀNH LANG (Front Wall z = -10, giáp Showroom) — Tự động làm mờ khi nhìn từ Showroom ── */}
      <SmartOcclusionGroup preset="wall-front" threshold={-10.2}>
        <group position={[0, 0, -10]}>
          {/* Tường trên cửa A (Showroom) */}
          <mesh position={[0, WALL_ABOVE_DOOR_Y, 0]}>
            <boxGeometry args={[DOOR_OPENING_WIDTH, WALL_ABOVE_DOOR_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>
          {/* Mảng tường trái */}
          <mesh position={[-4.4, HALLWAY_HEIGHT / 2, 0]}>
            <boxGeometry args={[7.2, HALLWAY_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>
          {/* Mảng tường phải */}
          <mesh position={[4.4, HALLWAY_HEIGHT / 2, 0]}>
            <boxGeometry args={[7.2, HALLWAY_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
          </mesh>

          {/* ── CỬA A: SHOWROOM & BÁN HÀNG (x = 0, xoay 180 độ quay về hành lang) ── */}
          <Door3D
            position={[0, 0, 0]}
            rotation={[0, Math.PI, 0]}
            doorId="hallway_door_showroom"
            targetRoom="showroom"
            label={ROOMS.showroom.name}
            subLabel={ROOMS.showroom.badge}
            isOpen={openDoor === "hallway_door_showroom"}
            onEnter={onEnterRoom}
            accentColor={ROOMS.showroom.accentColor}
          />
        </group>
      </SmartOcclusionGroup>

      {/* ── 4. TƯỜNG HAI ĐẦU HÀNH LANG (Left & Right Walls) ────────── */}
      {/* Tường trái x = -16 */}
      <SmartOcclusionGroup preset="wall-left" threshold={-7.8}>
        <mesh
          position={[-HALLWAY_WIDTH / 2, HALLWAY_HEIGHT / 2, CENTER_Z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[HALLWAY_DEPTH, HALLWAY_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
        </mesh>
      </SmartOcclusionGroup>
      {/* Tường phải x = 16 */}
      <SmartOcclusionGroup preset="wall-right" threshold={7.8}>
        <mesh
          position={[HALLWAY_WIDTH / 2, HALLWAY_HEIGHT / 2, CENTER_Z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <boxGeometry args={[HALLWAY_DEPTH, HALLWAY_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallBaseColor} roughness={0.75} />
        </mesh>
      </SmartOcclusionGroup>

      {/* ── 5. TRẦN NHÀ & ĐÈN RAY HÀNH LANG — Tự động làm mờ khi nhìn từ trên cao ───────────────────────── */}
      <SmartOcclusionGroup preset="ceiling" threshold={4.4}>
        {/* Trần thạch cao */}
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, HALLWAY_HEIGHT, CENTER_Z]}
        >
          <planeGeometry args={[HALLWAY_WIDTH, HALLWAY_DEPTH]} />
          <meshStandardMaterial color="#ece9e2" roughness={0.9} side={2} />
        </mesh>

        {/* Đèn ray LED tuyến tính dài dọc trần */}
        <mesh position={[0, HALLWAY_HEIGHT - 0.08, CENTER_Z]}>
          <boxGeometry args={[16, 0.06, 0.12]} />
          <meshStandardMaterial
            color="#fef3c7"
            emissive="#fef3c7"
            emissiveIntensity={0.6}
          />
        </mesh>
      </SmartOcclusionGroup>

      <RoomLighting center={[0, 0, CENTER_Z]} height={HALLWAY_HEIGHT} depth={HALLWAY_DEPTH} />

      {/* ── 6. Chậu cây trang trí hành lang ───────────────────────── */}
      {[-4, 4].map((plantX, i) => (
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
