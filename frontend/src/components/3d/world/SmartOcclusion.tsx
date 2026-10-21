"use client";

import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type OcclusionPreset =
  | "ceiling"
  | "wall-front"
  | "wall-back"
  | "wall-left"
  | "wall-right"
  | "custom";

export interface SmartOcclusionGroupProps {
  /**
   * Preset hướng ngáng tầm nhìn tiện dụng
   */
  preset?: OcclusionPreset;
  /**
   * Ngưỡng tọa độ tương ứng với preset (vd: Y trần, Z tường trước, X tường hông)
   */
  threshold?: number;
  /**
   * Hàm kiểm tra tùy biến: trả về true nếu camera đang ở vị trí bị vật thể ngáng đường
   */
  checkOcclusion?: (cameraPos: THREE.Vector3, cameraTarget?: THREE.Vector3) => boolean;
  /**
   * Tốc độ fade mượt (mặc định 9.0)
   */
  fadeSpeed?: number;
  /**
   * Độ mờ tối đa khi bị ẩn (mặc định 0.0 - biến mất hoàn toàn)
   */
  targetFadeOpacity?: number;
  /**
   * Cho phép click xuyên thấu khi đang mờ (mặc định true)
   */
  passThroughRaycast?: boolean;
  children: React.ReactNode;
}

/**
 * SmartOcclusionGroup — Cơ chế làm mờ và ẩn vật cản tầm nhìn thông minh
 * Áp dụng chuẩn hoá cho toàn bộ hệ thống phòng trong BizFlow 3D (The Sims / Diablo style).
 *
 * Tính năng chính:
 * 1. Tự động kiểm tra vị trí camera từng frame với chi phí tính toán cực thấp.
 * 2. Nội suy mượt mà (Lerp) độ trong suốt giữa 0.0 và 1.0.
 * 3. Tự động chuyển đổi `depthWrite` và `visible` để tránh lỗi Depth Sorting và ngăn chặn Raycast ngáng chuột vào các vật thể bên trong phòng.
 * 4. Nhân bản vật liệu độc lập (Material Cloning) nhằm bảo vệ màu sắc và thông số vật lý của các mesh khác.
 */
export function SmartOcclusionGroup({
  preset = "custom",
  threshold,
  checkOcclusion,
  fadeSpeed = 9.0,
  targetFadeOpacity = 0.0,
  passThroughRaycast = true,
  children,
}: SmartOcclusionGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(1.0);
  const originalMaterialsCloned = useRef(false);
  const { camera } = useThree();

  // Đảm bảo clone material để các thay đổi opacity không bị rò rỉ sang mesh khác
  useEffect(() => {
    if (!groupRef.current || originalMaterialsCloned.current) return;

    groupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((mat) => mat.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
      }
    });
    originalMaterialsCloned.current = true;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Xác định xem camera có đang ở góc bị vật cản ngáng đường không
    let isOccluding = false;

    if (checkOcclusion) {
      isOccluding = checkOcclusion(camera.position);
    } else if (preset && threshold !== undefined) {
      switch (preset) {
        case "ceiling":
          // Camera ở trên cao hơn trần
          isOccluding = camera.position.y > threshold;
          break;
        case "wall-front":
          // Camera ở phía trước tường trước
          isOccluding = camera.position.z > threshold;
          break;
        case "wall-back":
          // Camera ở phía sau tường sau
          isOccluding = camera.position.z < threshold;
          break;
        case "wall-left":
          // Camera ở phía ngoài bên trái
          isOccluding = camera.position.x < threshold;
          break;
        case "wall-right":
          // Camera ở phía ngoài bên phải
          isOccluding = camera.position.x > threshold;
          break;
        default:
          isOccluding = false;
      }
    }

    const targetOpacity = isOccluding ? targetFadeOpacity : 1.0;

    // Nội suy Lerp độ trong suốt theo delta time
    opacityRef.current = THREE.MathUtils.lerp(
      opacityRef.current,
      targetOpacity,
      Math.min(1, delta * fadeSpeed),
    );

    const currentOpacity = opacityRef.current;
    const isVisible = currentOpacity > 0.01;
    groupRef.current.visible = isVisible;

    if (isVisible) {
      const isSolid = currentOpacity > 0.98;
      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];

          materials.forEach((mat) => {
            if (mat) {
              mat.transparent = !isSolid;
              mat.opacity = currentOpacity;
              // Chỉ bật depthWrite khi mảng tường gần như đặc hoàn toàn (tránh vỡ hình depth sort)
              mat.depthWrite = isSolid;
              mat.needsUpdate = true;
            }
          });

          // Cho phép click chuột xuyên qua vật thể khi đang mờ
          if (passThroughRaycast) {
            mesh.raycast = currentOpacity > 0.15 ? THREE.Mesh.prototype.raycast : () => {};
          }
        }
      });
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
