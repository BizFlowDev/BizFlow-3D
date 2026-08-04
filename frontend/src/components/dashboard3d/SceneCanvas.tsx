"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";

interface SceneCanvasProps {
  children: React.ReactNode;
  /** Inline style cho thẻ canvas (mặc định fill toàn bộ vùng cha) */
  style?: React.CSSProperties;
  camera?: { position?: [number, number, number]; fov?: number };
}

/**
 * Canvas 3D dùng chung cho các widget dashboard.
 * - `frameloop="demand"`: chỉ render lại khi có invalidate — tối ưu hiệu năng,
 *   tiết kiệm pin trên điện thoại tầm trung (nguyên tắc hiệu suất).
 * - dpr giới hạn [1, 1.75], tắt antialias, powerPreference low-power:
 *   phù hợp thiết bị không GPU rời.
 */
export function SceneCanvas({ children, style, camera }: SceneCanvasProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{
        position: camera?.position ?? [0, 1.6, 7],
        fov: camera?.fov ?? 45,
      }}
      gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
      resize={{ scroll: false }}
      style={style}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 6]} intensity={0.95} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#b8c6ff" />
      {children}
    </Canvas>
  );
}

/**
 * Với `frameloop="demand"`, các scene có chuyển động liên tục (blink, xoay)
 * phải gọi invalidate() mỗi frame nếu không R3F sẽ không vẽ lại.
 * Gọi hook này 1 lần trong scene động.
 */
export function useDemandLoop() {
  const invalidate = useThree((state) => state.invalidate);
  useFrame(() => {
    invalidate();
  });
}
