"use client";

import { Text } from "@react-three/drei";

// ── Potted Plant Component (Cây cảnh nội thất hiện đại) ──────────────────────
export function PottedPlant({
  position = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Đĩa lót chậu */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.42, 0.45, 0.06, 24]} />
        <meshStandardMaterial color="#2d3748" roughness={0.7} />
      </mesh>

      {/* Chậu gốm ceramic hiện đại */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.38, 0.28, 0.8, 24]} />
        <meshStandardMaterial
          color="#f1f5f9"
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>

      {/* Đất trong chậu */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.36, 0.35, 0.05, 24]} />
        <meshStandardMaterial color="#3f2e21" roughness={0.9} />
      </mesh>

      {/* Thân cây chính */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.9, 12]} />
        <meshStandardMaterial color="#4a3728" roughness={0.8} />
      </mesh>

      {/* Các tán lá xoay đa hướng (Monstera / Ficus) */}
      {[
        { pos: [-0.25, 1.4, 0.15], rot: [0.4, 0.3, -0.6], s: 0.9 },
        { pos: [0.28, 1.55, -0.1], rot: [-0.3, 1.2, 0.5], s: 1.0 },
        { pos: [0.05, 1.7, 0.3], rot: [0.6, -0.4, 0.1], s: 1.1 },
        { pos: [-0.15, 1.9, -0.25], rot: [-0.5, -0.8, -0.3], s: 0.95 },
        { pos: [0.2, 2.05, 0.15], rot: [0.2, 2.1, 0.4], s: 1.05 },
        { pos: [0, 2.2, 0], rot: [0, 0, 0], s: 0.85 },
      ].map((leaf, i) => (
        <group
          key={i}
          position={leaf.pos as [number, number, number]}
          rotation={leaf.rot as [number, number, number]}
          scale={leaf.s}
        >
          {/* Cuống lá */}
          <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.015, 0.02, 0.25, 8]} />
            <meshStandardMaterial color="#2d6a4f" roughness={0.6} />
          </mesh>
          {/* Phiến lá */}
          <mesh position={[0.12, 0.18, 0]} rotation={[0.2, 0, -0.4]}>
            <sphereGeometry args={[0.26, 16, 12]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#2d6a4f" : "#40916c"}
              roughness={0.4}
              metalness={0.05}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Thảm Chào Mừng Lối Vào (Welcome Mat) ────────────────────────────────────
export function WelcomeMat({
  position = [0, 0.005, 0],
}: {
  position?: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* Thảm cao su / nỉ xám đen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 1.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* Viền thảm sang trọng */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.4, 4]} />
        <meshStandardMaterial color="#6366f1" roughness={0.6} />
      </mesh>

      {/* Chữ Welcome bằng 3D Text phẳng trên sàn (không bị đè layer) */}
      <Text
        position={[0, 0.008, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.11}
        color="#818cf8"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        BIZFLOW STORE • WELCOME
      </Text>
    </group>
  );
}

// ── Toàn Bộ Đồ Trang Trí Showroom (StoreDecorations) ─────────────────────────
export function StoreDecorations() {
  return (
    <group>
      {/* Cây cảnh góc trước bên trái */}
      <PottedPlant position={[-6.8, 0, 4.5]} scale={1.1} />

      {/* Cây cảnh góc sau bên trái gần kệ A */}
      <PottedPlant position={[-7.0, 0, -5.5]} scale={0.95} />

      {/* Cây cảnh góc sau bên phải gần kệ B */}
      <PottedPlant position={[7.0, 0, -5.5]} scale={0.95} />

      {/* Cây cảnh góc trước bên phải */}
      <PottedPlant position={[6.8, 0, 4.5]} scale={1.1} />

      {/* Thảm chào mừng ở khu vực quầy thu ngân */}
      <WelcomeMat position={[0, 0.005, 0.2]} />
    </group>
  );
}
