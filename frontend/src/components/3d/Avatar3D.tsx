"use client";

import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import type { Group } from "three";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Avatar3DProps {
  /** Avatar đang xử lý giọng nói */
  isProcessing?: boolean;
  /** Tin nhắn hiển thị trong speech bubble */
  message?: string | null;
  /** Vị trí trong scene */
  position?: [number, number, number];
  /** Xoay (radian) */
  rotation?: [number, number, number];
}

// ── Hằng số ───────────────────────────────────────────────────────────────────

const HEAD_RADIUS = 0.35;
const BODY_RADIUS = 0.28;
const BODY_HEIGHT = 0.7;
const EYE_RADIUS = 0.06;

// ── Avatar3D (main) ───────────────────────────────────────────────────────────

/**
 * Avatar3D — Trợ lý AI 3D hình geometric.
 *
 * - Mô hình: Sphere (đầu) + Cylinder (thân) + 2 Sphere (mắt)
 * - Animation idle: bobbing nhẹ lên xuống (sine wave)
 * - Animation processing: glow pulse nhanh + scale breathing
 * - Speech bubble: Html overlay hiển thị message
 */
export default function Avatar3D({
  isProcessing = false,
  message = null,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: Avatar3DProps) {
  const groupRef = useRef<Group>(null);

  // Bobbing animation — lên xuống nhẹ
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const bobSpeed = isProcessing ? 3.5 : 1.2;
    const bobAmp = isProcessing ? 0.08 : 0.04;
    groupRef.current.position.y = Math.sin(t * bobSpeed) * bobAmp;
  });

  // Emissive glow khi processing
  const { emissiveIntensity, scale } = useSpring({
    emissiveIntensity: isProcessing ? 0.6 : 0.1,
    scale: isProcessing ? 1.08 : 1.0,
    config: { duration: 400 },
    loop: isProcessing ? { reverse: true } : false,
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={groupRef}>
        <animated.group scale={scale}>
          {/* ── Thân (cylinder) ────────────────────────────── */}
          <mesh position={[0, BODY_HEIGHT / 2, 0]}>
            <cylinderGeometry
              args={[BODY_RADIUS * 0.85, BODY_RADIUS, BODY_HEIGHT, 16]}
            />
            <animated.meshStandardMaterial
              color="#6366f1"
              emissive="#818cf8"
              emissiveIntensity={emissiveIntensity}
              roughness={0.5}
              metalness={0.1}
            />
          </mesh>

          {/* ── Đầu (sphere) ──────────────────────────────── */}
          <mesh position={[0, BODY_HEIGHT + HEAD_RADIUS * 0.85, 0]}>
            <sphereGeometry args={[HEAD_RADIUS, 24, 24]} />
            <animated.meshStandardMaterial
              color="#818cf8"
              emissive="#a5b4fc"
              emissiveIntensity={emissiveIntensity}
              roughness={0.4}
              metalness={0.15}
            />
          </mesh>

          {/* ── Mắt trái ──────────────────────────────────── */}
          <mesh
            position={[
              -HEAD_RADIUS * 0.38,
              BODY_HEIGHT + HEAD_RADIUS * 0.95,
              HEAD_RADIUS * 0.82,
            ]}
          >
            <sphereGeometry args={[EYE_RADIUS, 12, 12]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.4}
              roughness={0.3}
            />
          </mesh>

          {/* ── Con ngươi trái ─────────────────────────────── */}
          <mesh
            position={[
              -HEAD_RADIUS * 0.38,
              BODY_HEIGHT + HEAD_RADIUS * 0.95,
              HEAD_RADIUS * 0.82 + EYE_RADIUS * 0.6,
            ]}
          >
            <sphereGeometry args={[EYE_RADIUS * 0.5, 8, 8]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.2} />
          </mesh>

          {/* ── Mắt phải ──────────────────────────────────── */}
          <mesh
            position={[
              HEAD_RADIUS * 0.38,
              BODY_HEIGHT + HEAD_RADIUS * 0.95,
              HEAD_RADIUS * 0.82,
            ]}
          >
            <sphereGeometry args={[EYE_RADIUS, 12, 12]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.4}
              roughness={0.3}
            />
          </mesh>

          {/* ── Con ngươi phải ─────────────────────────────── */}
          <mesh
            position={[
              HEAD_RADIUS * 0.38,
              BODY_HEIGHT + HEAD_RADIUS * 0.95,
              HEAD_RADIUS * 0.82 + EYE_RADIUS * 0.6,
            ]}
          >
            <sphereGeometry args={[EYE_RADIUS * 0.5, 8, 8]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.2} />
          </mesh>

          {/* ── Miệng (cười) ──────────────────────────────── */}
          <mesh
            position={[0, BODY_HEIGHT + HEAD_RADIUS * 0.6, HEAD_RADIUS * 0.88]}
            rotation={[0.15, 0, 0]}
          >
            <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.3} />
          </mesh>

          {/* ── "Ăng-ten" antenna ──────────────────────────── */}
          <mesh
            position={[0, BODY_HEIGHT + HEAD_RADIUS * 2.1, 0]}
          >
            <sphereGeometry args={[0.05, 8, 8]} />
            <animated.meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={emissiveIntensity}
              roughness={0.3}
            />
          </mesh>
          <mesh
            position={[0, BODY_HEIGHT + HEAD_RADIUS * 1.75, 0]}
          >
            <cylinderGeometry args={[0.015, 0.015, HEAD_RADIUS * 0.5, 6]} />
            <meshStandardMaterial color="#a1a1aa" roughness={0.5} />
          </mesh>
        </animated.group>

        {/* ── Processing indicator ────────────────────────── */}
        {isProcessing && (
          <Html
            position={[0, BODY_HEIGHT + HEAD_RADIUS * 2.6, 0]}
            center
            zIndexRange={[45, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
              <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
            </div>
          </Html>
        )}

        {/* ── Speech bubble ───────────────────────────────── */}
        {message && (
          <Html
            position={[HEAD_RADIUS + 0.6, BODY_HEIGHT + HEAD_RADIUS * 1.2, 0.3]}
            center
            zIndexRange={[50, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="relative max-w-[200px] rounded-xl bg-white/95 px-3 py-2 text-xs text-slate-800 shadow-xl backdrop-blur-sm">
              {/* Tam giác speech bubble */}
              <div className="absolute -left-2 top-3 h-0 w-0 border-y-[6px] border-r-[8px] border-y-transparent border-r-white/95" />
              {message}
            </div>
          </Html>
        )}

        {/* ── Nhãn "Trợ lý AI" ────────────────────────────── */}
        <Html
          position={[0, -0.25, 0.5]}
          center
          zIndexRange={[20, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="whitespace-nowrap rounded bg-indigo-600/80 px-2 py-0.5 text-[10px] font-medium text-white shadow">
            🤖 Trợ lý AI
          </div>
        </Html>
      </group>
    </group>
  );
}
