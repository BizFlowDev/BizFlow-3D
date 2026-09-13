"use client";

import { useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useSpring, animated } from "@react-spring/three";
import type { Group } from "three";
import { Bot, Sparkles, MessageSquareQuote } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Avatar3DProps {
  /** Avatar đang xử lý */
  isProcessing?: boolean;
  /** Tin nhắn hiển thị trong speech bubble */
  message?: string | null;
  /** Vị trí trong scene */
  position?: [number, number, number];
  /** Xoay (radian) */
  rotation?: [number, number, number];
  /** Callback khi click vào AI Bot */
  onClick?: () => void;
  /** Ẩn bong bóng thoại khi đang mở modal hoặc màn hình POS */
  hideBubble?: boolean;
}

// ── Hằng số cấu tạo Robot ───────────────────────────────────────────────────

const HEAD_RADIUS = 0.42;

// ── Avatar3D (main) ───────────────────────────────────────────────────────────

/**
 * Avatar3D — Robot Trợ Lý AI 3D Bán Lẻ Thông Minh (Floating AI Retail Bot).
 * - Thân hình cầu bay lơ lửng, chất liệu bóng công nghệ cao.
 * - Màn hình khuôn mặt kỹ thuật số với đôi mắt LED biểu cảm.
 * - Vòng hào quang holographic xoay quanh thân.
 * - Động cơ phản lực antigravity phát sáng neon phía dưới.
 * - Bong bóng thoại tương tác thông minh hỗ trợ khách mua hàng.
 */
export default function Avatar3D({
  isProcessing = false,
  message = null,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onClick,
  hideBubble = false,
}: Avatar3DProps) {
  const groupRef = useRef<Group>(null);
  const haloRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [customTip, setCustomTip] = useState<string | null>(null);

  // Bobbing animation bay lơ lửng mượt mà
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      const bobSpeed = isProcessing ? 3.5 : 1.8;
      const bobAmp = isProcessing ? 0.08 : 0.05;
      groupRef.current.position.y = Math.sin(t * bobSpeed) * bobAmp;
      groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.15;
    }
    // Xoay vòng hào quang lơ lửng
    if (haloRef.current) {
      haloRef.current.rotation.z = t * 0.8;
      haloRef.current.rotation.x = 1.2 + Math.sin(t * 1.2) * 0.1;
    }
  });

  // Spring animation cho hiệu ứng xử lý và tương tác
  const { emissiveIntensity, scale } = useSpring({
    emissiveIntensity: isProcessing ? 0.9 : hovered ? 0.6 : 0.25,
    scale: isProcessing ? 1.08 : hovered ? 1.05 : 1.0,
    config: { tension: 300, friction: 18 },
  });

  const tips = [
    "Chào bạn! Hãy click vào sản phẩm trên kệ để thêm vào giỏ hàng nhé! 📦",
    "Bạn có thể click Quầy thu ngân để xem các đơn hàng gần đây! 💳",
    "Dùng các nút góc nhìn bên dưới để đổi góc camera nhanh chóng! 🎥",
    "BizFlow 3D hỗ trợ thanh toán trực tiếp qua Tiền mặt và VietQR! ✨",
  ];

  const handleBotClick = () => {
    onClick?.();
    const nextTip = tips[Math.floor(Math.random() * tips.length)];
    setCustomTip(nextTip);
  };

  const currentSpeech = message || customTip || "Xin chào! Tôi là Trợ lý ảo BizFlow 3D 👋";

  return (
    <group position={position} rotation={rotation}>
      <group ref={groupRef} position={[0, 1.4, 0]}>
        <animated.group
          scale={scale}
          onClick={(e) => {
            e.stopPropagation();
            handleBotClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "default";
          }}
        >
          {/* ── Thân Đầu Hình Cầu Công Nghệ (Spherical Chassis) ─────────── */}
          <mesh castShadow>
            <sphereGeometry args={[HEAD_RADIUS, 32, 32]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.15}
              metalness={0.2}
            />
          </mesh>

          {/* ── Vát kính mặt trước làm Màn hình mặt số ─────────────────── */}
          <mesh position={[0, 0.02, HEAD_RADIUS * 0.68]}>
            <sphereGeometry args={[HEAD_RADIUS * 0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
            <meshStandardMaterial
              color="#020617"
              roughness={0.1}
              metalness={0.8}
            />
          </mesh>

          {/* ── Đôi Mắt Kỹ Thuật Số LED Xanh Ngọc (Digital Eyes) ───────── */}
          {/* Mắt trái */}
          <mesh position={[-0.14, 0.05, HEAD_RADIUS * 0.95]}>
            <capsuleGeometry args={[0.032, 0.06, 8, 16]} />
            <animated.meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          {/* Mắt phải */}
          <mesh position={[0.14, 0.05, HEAD_RADIUS * 0.95]}>
            <capsuleGeometry args={[0.032, 0.06, 8, 16]} />
            <animated.meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>

          {/* ── Tai Nghe Kỹ Thuật Số Hai Bên (Side Audio Pods) ─────────── */}
          {[-1, 1].map((dir, i) => (
            <group key={i} position={[dir * (HEAD_RADIUS + 0.04), 0.04, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Vòng đèn LED tai */}
              <mesh position={[dir * 0.045, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[0.06, 0.09, 24]} />
                <meshStandardMaterial
                  color="#6366f1"
                  emissive="#6366f1"
                  emissiveIntensity={0.8}
                />
              </mesh>
            </group>
          ))}

          {/* ── Ăng-ten phát tín hiệu trên đỉnh đầu (Antenna) ──────────── */}
          <mesh position={[0, HEAD_RADIUS + 0.08, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.16, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          <mesh position={[0, HEAD_RADIUS + 0.18, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <animated.meshStandardMaterial
              color="#ec4899"
              emissive="#ec4899"
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>

          {/* ── Vòng Hào Quang Holographic Xoay Lơ Lửng (Halo Ring) ─────── */}
          <group ref={haloRef}>
            <mesh rotation={[1.2, 0, 0]}>
              <torusGeometry args={[HEAD_RADIUS * 1.45, 0.018, 16, 64]} />
              <meshStandardMaterial
                color="#6366f1"
                emissive="#818cf8"
                emissiveIntensity={0.9}
                transparent
                opacity={0.85}
              />
            </mesh>
          </group>

          {/* ── Động cơ phản lực Antigravity phía dưới ─────────────────── */}
          <mesh position={[0, -HEAD_RADIUS + 0.05, 0]}>
            <cylinderGeometry args={[0.16, 0.08, 0.12, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          {/* Luồng phát sáng màu xanh cyan bên dưới */}
          <mesh position={[0, -HEAD_RADIUS - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.15, 24]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
          </mesh>
        </animated.group>

        {/* ── Bong Bóng Thoại Tương Tác (Speech Bubble) ──────────────── */}
        {!hideBubble && (
          <Html
            occlude
            position={[0, HEAD_RADIUS + 0.45, 0]}
            center
            distanceFactor={5.2}
            zIndexRange={[15, 0]}
            style={{ pointerEvents: "auto" }}
          >
            <div
              onClick={handleBotClick}
              className="animate-in fade-in zoom-in-95 group flex max-w-[220px] cursor-pointer items-start gap-2 rounded-2xl border border-indigo-400/40 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:border-indigo-400"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Bot className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1 font-bold text-[10px] text-indigo-300">
                  AI Assistant <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-100">
                  {currentSpeech}
                </p>
              </div>
            </div>
          </Html>
        )}
      </group>

      {/* ── Vệt bóng đổ dưới sàn (Floor Shadow Ring) ─────────────────── */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.45, 32]} />
        <meshBasicMaterial color="#020617" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
