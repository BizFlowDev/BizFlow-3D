"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoreViewerProps {
  children: React.ReactNode;
  /** Chiều cao viewport — mặc định 100vh */
  height?: string;
}

// ── Kích thước cửa hàng ───────────────────────────────────────────────────────

const STORE_WIDTH = 16;
const STORE_DEPTH = 12;
const STORE_HEIGHT = 5;
const WALL_THICKNESS = 0.15;

// ── Component phụ: Sàn nhà ───────────────────────────────────────────────────

function StoreFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[STORE_WIDTH, STORE_DEPTH]} />
      <meshStandardMaterial color="#e8e0d4" roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

// ── Component phụ: Tường ──────────────────────────────────────────────────────

function StoreWalls() {
  const wallColor = "#f5f0eb";
  return (
    <group>
      {/* Tường sau */}
      <mesh position={[0, STORE_HEIGHT / 2, -STORE_DEPTH / 2]}>
        <boxGeometry
          args={[STORE_WIDTH, STORE_HEIGHT, WALL_THICKNESS]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* Tường trái */}
      <mesh
        position={[-STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry
          args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* Tường phải */}
      <mesh
        position={[STORE_WIDTH / 2, STORE_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry
          args={[STORE_DEPTH, STORE_HEIGHT, WALL_THICKNESS]}
        />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── Component phụ: Trần nhà ──────────────────────────────────────────────────

function StoreCeiling() {
  return (
    <mesh
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, STORE_HEIGHT, 0]}
    >
      <planeGeometry args={[STORE_WIDTH, STORE_DEPTH]} />
      <meshStandardMaterial
        color="#faf8f5"
        roughness={0.95}
        side={2}
      />
    </mesh>
  );
}

// ── Component phụ: Đèn cửa hàng ─────────────────────────────────────────────

function StoreLights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, STORE_HEIGHT - 0.5, 3]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-4, STORE_HEIGHT - 0.5, -2]}
        intensity={0.4}
        color="#b8c6ff"
      />
      {/* Đèn điểm trên trần — mô phỏng đèn downlight */}
      <pointLight
        position={[-3, STORE_HEIGHT - 0.3, -2]}
        intensity={15}
        distance={8}
        color="#fff5e6"
      />
      <pointLight
        position={[3, STORE_HEIGHT - 0.3, -2]}
        intensity={15}
        distance={8}
        color="#fff5e6"
      />
      <pointLight
        position={[0, STORE_HEIGHT - 0.3, 2]}
        intensity={12}
        distance={8}
        color="#fff5e6"
      />
    </>
  );
}

// ── Component phụ: Viền sàn trang trí ────────────────────────────────────────

function FloorTrim() {
  const trimColor = "#b09070";
  const trimH = 0.12;
  return (
    <group>
      {/* Viền sàn tường sau */}
      <mesh position={[0, trimH / 2, -STORE_DEPTH / 2 + 0.06]}>
        <boxGeometry args={[STORE_WIDTH, trimH, 0.08]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
      {/* Viền sàn tường trái */}
      <mesh position={[-STORE_WIDTH / 2 + 0.06, trimH / 2, 0]}>
        <boxGeometry args={[0.08, trimH, STORE_DEPTH]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
      {/* Viền sàn tường phải */}
      <mesh position={[STORE_WIDTH / 2 - 0.06, trimH / 2, 0]}>
        <boxGeometry args={[0.08, trimH, STORE_DEPTH]} />
        <meshStandardMaterial color={trimColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

// ── StoreViewer (main) ────────────────────────────────────────────────────────

/**
 * StoreViewer — Scene 3D chính mô phỏng cửa hàng.
 *
 * Bao gồm sàn, tường, trần, đèn, OrbitControls.
 * Children (ProductShelf, Counter, Avatar3D) được render bên trong scene.
 *
 * Dùng `frameloop="always"` vì OrbitControls cần render liên tục khi xoay.
 */
export default function StoreViewer({
  children,
  height = "100vh",
}: StoreViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{
          position: [0, 4, 10],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: false,
          powerPreference: "low-power",
          alpha: false,
        }}
        shadows
        style={{ position: "absolute", inset: 0, background: "#1a1a2e" }}
      >
        <StoreLights />
        <StoreFloor />
        <StoreWalls />
        <StoreCeiling />
        <FloorTrim />

        {/* Fog để tạo chiều sâu */}
        <fog attach="fog" args={["#1a1a2e", 15, 30]} />

        {/* Environment map nhẹ cho reflection */}
        <Environment preset="city" environmentIntensity={0.15} />

        {/* OrbitControls — giới hạn góc để không xuyên tường/sàn */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 1.5, 0]}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={3}
          maxDistance={18}
          enableDamping
          dampingFactor={0.08}
          enablePan
          panSpeed={0.5}
        />

        {/* Slot cho ProductShelf, Counter, Avatar3D */}
        {children}
      </Canvas>
    </div>
  );
}
