"use client";

import React, { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useRoomFrame } from "./roomActivity";
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
  type Entry = { mesh: THREE.Mesh; materials: THREE.Material[]; opacity: number[]; depthWrite: boolean[]; raycast: THREE.Mesh["raycast"]; text: boolean; cleanup: () => void };
  const entries = useRef<Entry[]>([]);
  const cache = useRef(new Map<THREE.Mesh, Entry>());
  const lastOpacity = useRef(-1);
  const noRaycast: THREE.Mesh["raycast"] = () => {};
  const { camera } = useThree();

  // Cache once per child-tree revision; preserve custom raycasts and material ownership.
  useEffect(() => {
    if (!groupRef.current) return;
    const seen = new Set<THREE.Mesh>();
    groupRef.current.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      seen.add(mesh);
      if (cache.current.has(mesh)) return;
      const text = typeof (mesh as any).sync === "function";
      const original = mesh.material;
      const originals = Array.isArray(original) ? original : [original];
      const materials = text ? originals : originals.map(material => {
        const clone = material.clone();
        // Stable shader/render mode while fading, prepared before navigation.
        clone.transparent = true;
        return clone;
      });
      const raycast = mesh.raycast;
      if (!text) mesh.material = Array.isArray(original) ? materials : materials[0];
      const textMesh = mesh as any;
      const fill = textMesh.fillOpacity, outline = textMesh.outlineOpacity;
      const cleanup = () => {
        mesh.raycast = raycast;
        if (!text) { mesh.material = original; materials.forEach(m => m.dispose()); }
        else { textMesh.fillOpacity = fill; textMesh.outlineOpacity = outline; }
      };
      cache.current.set(mesh, { mesh, materials, opacity: originals.map(m => m.opacity), depthWrite: originals.map(m => m.depthWrite), raycast, text, cleanup });
    });
    for (const [mesh, entry] of cache.current) {
      if (!seen.has(mesh)) { entry.cleanup(); cache.current.delete(mesh); }
    }
    entries.current = [...cache.current.values()];
    lastOpacity.current = -1;
  }, [children]);
  useEffect(() => () => {
    cache.current.forEach(entry => entry.cleanup());
    cache.current.clear();
    entries.current = [];
  }, []);

  useRoomFrame((_, delta) => {
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

    opacityRef.current = THREE.MathUtils.damp(opacityRef.current, targetOpacity, fadeSpeed, delta);
    if (Math.abs(opacityRef.current - targetOpacity) < 0.001) opacityRef.current = targetOpacity;
    const opacity = opacityRef.current;
    if (Math.abs(opacity - lastOpacity.current) < 0.0001) return;
    lastOpacity.current = opacity;
    groupRef.current.visible = opacity > 0.01;
    for (const entry of entries.current) {
      if (entry.text) {
        const text = entry.mesh as any;
        text.fillOpacity = opacity;
        text.outlineOpacity = opacity;
      } else {
        entry.materials.forEach((material, index) => {
          material.opacity = entry.opacity[index] * opacity;
          material.depthWrite = opacity > 0.98 && entry.depthWrite[index];
        });
      }
      if (passThroughRaycast) entry.mesh.raycast = opacity > 0.15 ? entry.raycast : noRaycast;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
