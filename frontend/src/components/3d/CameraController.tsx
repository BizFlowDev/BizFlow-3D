"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type CameraPreset =
  | "overview"
  | "shelfLeft"
  | "shelfRight"
  | "shelfSideLeft"
  | "shelfSideRight"
  | "counter"
  | "posScreen"
  | "avatar";

export interface CameraPresetConfig {
  position: [number, number, number];
  target: [number, number, number];
  label: string;
}

export const CAMERA_PRESETS: Record<CameraPreset, CameraPresetConfig> = {
  overview: {
    position: [0, 4.8, 9.8],
    target: [0, 1.2, 0],
    label: "Toàn cảnh Showroom",
  },
  shelfLeft: {
    position: [-3.7, 2.4, 2],
    target: [-3.5, 1.8, -5.5],
    label: "Kệ hàng Trái (A)",
  },
  shelfRight: {
    position: [3.7, 2.4, 2],
    target: [3.5, 1.8, -5.5],
    label: "Kệ hàng Phải (B)",
  },
  shelfSideLeft: {
    position: [0, 2.2, -0.5],
    target: [-7.0, 1.8, -0.5],
    label: "Kệ Hông Trái (C)",
  },
  shelfSideRight: {
    position: [0, 2.2, -0.5],
    target: [7.0, 1.8, -0.5],
    label: "Kệ Hông Phải (D)",
  },
  counter: {
    position: [0, 2.1, 4.8],
    target: [0, 1.1, 2],
    label: "Quầy Thu Ngân",
  },
  posScreen: {
    position: [0.45, 2.2, 2.95],
    target: [0.45, 1.85, 1.95],
    label: "Màn hình POS",
  },
  avatar: {
    position: [1.9, 1.8, 4.0],
    target: [2.5, 1.3, 2.5],
    label: "Trợ lý AI",
  },
};

interface CameraControllerProps {
  currentPreset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  targetFocusPoint?: [number, number, number] | null;
}

export function CameraController({
  currentPreset,
  controlsRef,
  targetFocusPoint,
}: CameraControllerProps) {
  const { camera } = useThree();
  const isTransitioningRef = useRef(false);

  const desiredPosRef = useRef(new THREE.Vector3());
  const desiredTargetRef = useRef(new THREE.Vector3());

  useEffect(() => {
    if (targetFocusPoint) {
      // Focus vào sản phẩm cụ thể
      desiredTargetRef.current.set(
        targetFocusPoint[0],
        targetFocusPoint[1],
        targetFocusPoint[2],
      );
      desiredPosRef.current.set(
        targetFocusPoint[0],
        targetFocusPoint[1] + 0.8,
        targetFocusPoint[2] + 2.6,
      );
      isTransitioningRef.current = true;
      return;
    }

    const cfg = CAMERA_PRESETS[currentPreset] || CAMERA_PRESETS.overview;
    desiredPosRef.current.set(...cfg.position);
    desiredTargetRef.current.set(...cfg.target);
    isTransitioningRef.current = true;
  }, [currentPreset, targetFocusPoint]);

  useFrame((_, delta) => {
    if (!isTransitioningRef.current) return;

    // Lerp factor mượt mà theo delta time (khoảng 4x mỗi giây)
    const factor = Math.min(1, delta * 4.5);

    camera.position.lerp(desiredPosRef.current, factor);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTargetRef.current, factor);
      controlsRef.current.update();
    }

    // Kiểm tra xem camera đã đến gần điểm mong muốn chưa
    const posDist = camera.position.distanceTo(desiredPosRef.current);
    const targetDist = controlsRef.current
      ? controlsRef.current.target.distanceTo(desiredTargetRef.current)
      : 0;

    if (posDist < 0.2 && targetDist < 0.05) {
      isTransitioningRef.current = false;
    }
  });

  return null;
}
