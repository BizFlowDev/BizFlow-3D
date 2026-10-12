"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { type CameraPreset, CAMERA_PRESETS } from "./types";

interface WorldCameraControllerProps {
  currentPreset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  targetFocusPoint?: [number, number, number] | null;
  /** Tốc độ chuyển đổi lerp (mặc định 4.5) */
  lerpSpeed?: number;
}

export function WorldCameraController({
  currentPreset,
  controlsRef,
  targetFocusPoint,
  lerpSpeed = 4.5,
}: WorldCameraControllerProps) {
  const { camera } = useThree();
  const isTransitioningRef = useRef(false);

  const desiredPosRef = useRef(new THREE.Vector3());
  const desiredTargetRef = useRef(new THREE.Vector3());

  useEffect(() => {
    if (targetFocusPoint) {
      // Focus vào một điểm / sản phẩm / bàn làm việc cụ thể
      desiredTargetRef.current.set(
        targetFocusPoint[0],
        targetFocusPoint[1],
        targetFocusPoint[2],
      );
      desiredPosRef.current.set(
        targetFocusPoint[0],
        targetFocusPoint[1] + 0.8,
        targetFocusPoint[2] + 2.4,
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

    // Hệ số lerp mượt mà theo delta time
    const factor = Math.min(1, delta * lerpSpeed);

    camera.position.lerp(desiredPosRef.current, factor);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTargetRef.current, factor);
      controlsRef.current.update();
    }

    // Kiểm tra xem camera đã đến đích chưa
    const posDist = camera.position.distanceTo(desiredPosRef.current);
    const targetDist = controlsRef.current
      ? controlsRef.current.target.distanceTo(desiredTargetRef.current)
      : 0;

    if (posDist < 0.15 && targetDist < 0.05) {
      isTransitioningRef.current = false;
    }
  });

  return null;
}
