"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Text } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CameraController, type CameraPreset } from "./CameraController";
import { StoreDecorations } from "./StoreDecorations";
import { Sparkles, Store } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoreViewerProps {
  children: React.ReactNode;
  /** Chiều cao viewport — mặc định 100vh */
  height?: string;
  /** Preset góc nhìn camera */
  currentPreset?: CameraPreset;
  /** Trạng thái đang ở màn hình thanh toán POS */
  isPOSActive?: boolean;
  /** Tọa độ mục tiêu cần focus (khi chọn sản phẩm cụ thể) */
  targetFocusPoint?: [number, number, number] | null;
}

// ── Kích thước cửa hàng ───────────────────────────────────────────────────────

const STORE_WIDTH = 16;
const STORE_DEPTH = 13;
const STORE_HEIGHT = 5.2;
const WALL_THICKNESS = 0.18;

// ── Component phụ: Sàn nhà Showroom Cao Cấp ─────────────────────────────────

function StoreFloor() {
  return (
    <group position={[0, 0, 0]}>
      {/* Sàn đá bóng men cao cấp (polished marble/terrazzo finish) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[STORE_WIDTH, STORE_DEPTH]} />
        <meshStandardMaterial
          color="#1e2433"
          roughness={0.22}
          metalness={0.18}
        />
      </mesh>

      {/* Lối đi chính giữa cửa hàng (Center Aisle Carpet/Stripe) */}
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

// ── Component phụ: Tường & Lam Gỗ & Biển Hiệu Neon ────────────────────────────

function StoreWalls() {
  const wallBaseColor = "#0f172a";
  const woodSlatColor = "#854d0e"; // Màu gỗ sồi sậm ấm áp

  return (
    <group>
      {/* ── Tường sau chính (Accent Back Wall) ────────────────────────── */}
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

      {/* Biển hiệu 3D LED "BIZFLOW STORE" bằng 3D Text (không bị đè layer) */}
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

      {/* ── Tường trái ──────────────────────────────────────────────── */}
      <mesh
        position={[-STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
      </mesh>

      {/* ── Tường phải ──────────────────────────────────────────────── */}
      <mesh
        position={[STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallBaseColor} roughness={0.8} />
      </mesh>

      {/* ── Mặt tiền cửa kính Showroom phía trước ──────────────────────── */}
      {/* Khung nhôm đen mặt trước */}
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

// ── Component phụ: Trần nhà & Dàn Đèn Ray Chiếu Sáng (Track Lights) ──────────

function StoreCeilingAndLights() {
  return (
    <group>
      {/* Trần thạch cao showroom màu tối hiện đại */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, STORE_HEIGHT, 0]}>
        <planeGeometry args={[STORE_WIDTH, STORE_DEPTH]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.9} side={2} />
      </mesh>

      {/* Thanh ray đèn (Track Light Rails) */}
      <mesh position={[0, STORE_HEIGHT - 0.12, -2.5]}>
        <boxGeometry args={[11, 0.08, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, STORE_HEIGHT - 0.12, 2.5]}>
        <boxGeometry args={[11, 0.08, 0.08]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Các rọi đèn LED (Spotlight fixtures) */}
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

      {/* Ánh sáng tổng quan ấm áp và đa lớp */}
      <ambientLight intensity={0.65} color="#e0e7ff" />

      {/* Đèn chính chiếu rọi từ góc trên cao */}
      <directionalLight
        position={[4, STORE_HEIGHT - 0.5, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color="#ffffff"
      />

      {/* Đèn thứ cấp màu lạnh bù sáng góc sau */}
      <directionalLight
        position={[-5, STORE_HEIGHT - 0.6, -3]}
        intensity={0.55}
        color="#93c5fd"
      />

      {/* Đèn điểm (PointLight) tập trung chiếu sáng Kệ A (trái) */}
      <pointLight
        position={[-3.5, STORE_HEIGHT - 0.5, -3.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />

      {/* Đèn điểm tập trung chiếu sáng Kệ B (phải) */}
      <pointLight
        position={[3.5, STORE_HEIGHT - 0.5, -3.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />

      {/* Đèn điểm tập trung chiếu sáng Kệ C (hông trái) */}
      <pointLight
        position={[-5.2, STORE_HEIGHT - 0.5, -0.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />

      {/* Đèn điểm tập trung chiếu sáng Kệ D (hông phải) */}
      <pointLight
        position={[5.2, STORE_HEIGHT - 0.5, -0.5]}
        intensity={20}
        distance={9}
        color="#fffbeb"
      />

      {/* Đèn điểm chiếu sáng Quầy thu ngân */}
      <pointLight
        position={[0, STORE_HEIGHT - 0.5, 2]}
        intensity={18}
        distance={8}
        color="#f0f9ff"
      />

      {/* Đèn điểm neon hắt sáng biển hiệu trung tâm */}
      <pointLight
        position={[0, STORE_HEIGHT - 1.2, -STORE_DEPTH / 2 + 1.2]}
        intensity={14}
        distance={6}
        color="#c084fc"
      />
    </group>
  );
}

// ── Viền Chân Tường Kim Loại (Floor Trim) ────────────────────────────────────

function FloorTrim() {
  const trimColor = "#334155";
  const trimH = 0.14;
  return (
    <group>
      {/* Viền tường sau */}
      <mesh position={[0, trimH / 2, -STORE_DEPTH / 2 + 0.08]}>
        <boxGeometry args={[STORE_WIDTH, trimH, 0.08]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Viền tường trái */}
      <mesh position={[-STORE_WIDTH / 2 + 0.08, trimH / 2, 0]}>
        <boxGeometry args={[0.08, trimH, STORE_DEPTH]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Viền tường phải */}
      <mesh position={[STORE_WIDTH / 2 - 0.08, trimH / 2, 0]}>
        <boxGeometry args={[0.08, trimH, STORE_DEPTH]} />
        <meshStandardMaterial color={trimColor} roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

// ── StoreViewer (main) ────────────────────────────────────────────────────────

/**
 * StoreViewer — Showroom 3D cao cấp mô phỏng cửa hàng bán lẻ thông minh BizFlow.
 * Bao gồm sàn đá phản chiếu, tường ốp lam gỗ, biển hiệu neon 3D, hệ thống đèn ray tracklight,
 * trang trí cây xanh, standee quảng cáo và camera điều khiển chuyển góc nhìn mượt mà.
 */
export default function StoreViewer({
  children,
  height = "100vh",
  currentPreset = "overview",
  isPOSActive = false,
  targetFocusPoint = null,
}: StoreViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isInteractingWithPOS = isPOSActive || currentPreset === "posScreen";

  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{
          position: [0, 5.8, 9.8],
          fov: 48,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        shadows
        style={{ position: "absolute", inset: 0, background: "#090d16" }}
      >
        <StoreCeilingAndLights />
        <StoreFloor />
        <StoreWalls />
        <FloorTrim />
        <StoreDecorations />

        {/* Fog nhẹ tạo chiều sâu không gian huyền ảo */}
        <fog attach="fog" args={["#090d16", 16, 32]} />

        {/* Environment map cân bằng phản chiếu vật liệu bóng */}
        <Environment preset="city" environmentIntensity={0.25} />

        {/* Camera controller cho phép chuyển đổi góc nhìn mượt mà */}
        <CameraController
          currentPreset={currentPreset}
          controlsRef={controlsRef}
          targetFocusPoint={targetFocusPoint}
        />

        {/* OrbitControls: Tự động khóa xoay khi đang ở màn hình POS để người dùng thao tác bấm nút thoải mái */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 1.2, 0]}
          minPolarAngle={Math.PI * 0.08}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={0.5}
          maxDistance={18}
          enableDamping
          dampingFactor={0.08}
          enablePan={!isInteractingWithPOS}
          enableRotate={!isInteractingWithPOS}
          panSpeed={0.5}
        />

        {/* Nội dung bên trong: ProductShelf, Counter, Avatar3D */}
        {children}
      </Canvas>
    </div>
  );
}
