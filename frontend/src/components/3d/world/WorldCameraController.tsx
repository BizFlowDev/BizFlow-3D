"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { type CameraPreset, CAMERA_PRESETS, type TransitionWaypoint, type RoomId } from "./types";

export type CameraFocusPoint =
  | [number, number, number]
  | {
      target: [number, number, number];
      position: [number, number, number];
    };

interface WorldCameraControllerProps {
  currentPreset: CameraPreset;
  activeRoom?: RoomId;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  targetFocusPoint?: CameraFocusPoint | null;
  /** Tốc độ chuyển đổi lerp mặc định */
  lerpSpeed?: number;
  /** Đang ở chế độ máy POS (tắt parallax) */
  isPOSActive?: boolean;
  /** Chuỗi waypoint chuyển phòng xuyên cửa */
  waypoints?: TransitionWaypoint[] | null;
  /** Callback khi bắt đầu waypoint mới (để mở cửa tương ứng) */
  onWaypointChange?: (waypoint: TransitionWaypoint) => void;
  /** Callback khi hoàn tất toàn bộ chuỗi waypoint */
  onTransitionComplete?: () => void;
}

export function WorldCameraController({
  currentPreset,
  activeRoom,
  controlsRef,
  targetFocusPoint,
  lerpSpeed = 4.5,
  isPOSActive = false,
  waypoints = null,
  onWaypointChange,
  onTransitionComplete,
}: WorldCameraControllerProps) {
  const { camera } = useThree();

  // Vị trí gốc (Base position & target không có Parallax)
  const basePosRef = useRef(new THREE.Vector3(0, 4.8, 9.8));
  const baseTargetRef = useRef(new THREE.Vector3(0, 1.2, 0));

  // Vị trí đích mong muốn (khi lerp theo preset hoặc focus point)
  const desiredPosRef = useRef(new THREE.Vector3(0, 4.8, 9.8));
  const desiredTargetRef = useRef(new THREE.Vector3(0, 1.2, 0));

  // Trạng thái chuyển động
  const isTransitioningRef = useRef(false);

  // Quản lý chuỗi Waypoints chuyển phòng
  const waypointsRef = useRef<TransitionWaypoint[] | null>(null);
  const waypointIndexRef = useRef(0);
  const waypointProgressRef = useRef(0);
  const waypointStartPosRef = useRef(new THREE.Vector3());
  const waypointStartTargetRef = useRef(new THREE.Vector3());

  // Parallax offsets (Local coordinates)
  const targetParallaxPosRef = useRef(new THREE.Vector3());
  const targetParallaxLookRef = useRef(new THREE.Vector3());
  const currentParallaxPosRef = useRef(new THREE.Vector3());
  const currentParallaxLookRef = useRef(new THREE.Vector3());

  // Vector phụ trợ tính toán (tránh garbage collection)
  const cameraRightRef = useRef(new THREE.Vector3());
  const cameraUpRef = useRef(new THREE.Vector3());
  const worldParallaxPosRef = useRef(new THREE.Vector3());
  const worldParallaxLookRef = useRef(new THREE.Vector3());
  const lastPresetRef = useRef<CameraPreset | null>(null);

  // ── 1. Kích hoạt chuỗi Waypoint chuyển phòng khi có waypoints mới ───────────
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      waypointsRef.current = waypoints;
      waypointIndexRef.current = 0;
      waypointProgressRef.current = 0;
      waypointStartPosRef.current.copy(camera.position);
      waypointStartTargetRef.current.copy(
        controlsRef.current?.target || baseTargetRef.current,
      );
      isTransitioningRef.current = true;

      // Thông báo waypoint đầu tiên ngay lập tức (để mở cửa)
      onWaypointChange?.(waypoints[0]);
    } else {
      waypointsRef.current = null;
    }
  }, [waypoints, camera, controlsRef, onWaypointChange]);

  // Cờ nhận biết vừa thoát khỏi chế độ Focus Point vào vật phẩm/trạm chức năng
  const hadTargetFocusPointRef = useRef(false);

  // ── 2. Xử lý đổi Preset Camera hoặc Focus Point thông thường ─────────────────
  useEffect(() => {
    // Nếu đang chạy chuỗi waypoint chuyển phòng thì bỏ qua preset thông thường
    if (waypointsRef.current && waypointsRef.current.length > 0) return;

    if (targetFocusPoint) {
      hadTargetFocusPointRef.current = true;
      if (Array.isArray(targetFocusPoint)) {
        desiredTargetRef.current.set(
          targetFocusPoint[0],
          targetFocusPoint[1],
          targetFocusPoint[2],
        );
        desiredPosRef.current.set(
          targetFocusPoint[0],
          targetFocusPoint[1] + 0.8,
          targetFocusPoint[2] + 3.8,
        );
      } else {
        desiredTargetRef.current.set(
          targetFocusPoint.target[0],
          targetFocusPoint.target[1],
          targetFocusPoint.target[2],
        );
        desiredPosRef.current.set(
          targetFocusPoint.position[0],
          targetFocusPoint.position[1],
          targetFocusPoint.position[2],
        );
      }
      isTransitioningRef.current = true;
      return;
    }

    // Khi targetFocusPoint được đóng (chuyển về null) hoặc khi người dùng đổi preset camera:
    if (hadTargetFocusPointRef.current || currentPreset !== lastPresetRef.current) {
      const wasExitingFocusPoint = hadTargetFocusPointRef.current;
      hadTargetFocusPointRef.current = false;

      let targetPreset = currentPreset;
      if (wasExitingFocusPoint && activeRoom) {
        targetPreset =
          activeRoom === "warehouse"
            ? "warehouseOverview"
            : activeRoom === "office"
              ? "officeOverview"
              : activeRoom === "hallway"
                ? "hallwayOverview"
                : "showroomOverview";
      }

      lastPresetRef.current = targetPreset;
      const cfg = CAMERA_PRESETS[targetPreset] || CAMERA_PRESETS[currentPreset] || CAMERA_PRESETS.overview;
      desiredPosRef.current.set(...cfg.position);
      desiredTargetRef.current.set(...cfg.target);
      isTransitioningRef.current = true;
    }
  }, [currentPreset, targetFocusPoint, activeRoom]);

  // ── 3. Vòng lặp Render useFrame (Waypoints + Parallax + Safe Zoom) ───────────
  useFrame((state, delta) => {
    // --- PHẦN A: ĐIỀU KHIỂN CHUỖI WAYPOINT CHUYỂN PHÒNG ---
    if (waypointsRef.current && waypointsRef.current.length > 0) {
      const currentWp = waypointsRef.current[waypointIndexRef.current];
      if (currentWp) {
        const step = delta / Math.max(0.1, currentWp.duration);
        waypointProgressRef.current = Math.min(1, waypointProgressRef.current + step);

        const t = waypointProgressRef.current;
        const isFirst = waypointIndexRef.current === 0;
        const isLast = waypointIndexRef.current === waypointsRef.current.length - 1;

        // Easing chuyển động điện ảnh mượt mà, không bị phanh gấp giữa chừng khi qua cửa
        let eased: number;
        if (isFirst && isLast) {
          // Waypoint đơn lẻ: Smoothstep hoàn hảo
          eased = t * t * (3 - 2 * t);
        } else if (isFirst) {
          // Khởi hành êm từ trạng thái đứng yên (Ease-in mượt mà)
          eased = Math.pow(t, 1.45);
        } else if (isLast) {
          // Tiếp đất êm ái về vị trí toàn cảnh của phòng đích (Ease-out mềm mại)
          eased = 1 - Math.pow(1 - t, 2.2);
        } else {
          // Đang lướt qua ngưỡng cửa: Giữ đà lướt mượt mà, không khựng phanh
          eased = t * t * (3 - 2 * t) * 0.35 + t * 0.65;
        }

        desiredPosRef.current.set(...currentWp.position);
        desiredTargetRef.current.set(...currentWp.target);

        basePosRef.current.lerpVectors(
          waypointStartPosRef.current,
          desiredPosRef.current,
          eased,
        );
        baseTargetRef.current.lerpVectors(
          waypointStartTargetRef.current,
          desiredTargetRef.current,
          eased,
        );

        camera.position.copy(basePosRef.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(baseTargetRef.current);
          controlsRef.current.update();
        }

        // Đã hoàn tất waypoint hiện tại
        if (t >= 1) {
          const nextIndex = waypointIndexRef.current + 1;
          if (nextIndex < waypointsRef.current.length) {
            waypointIndexRef.current = nextIndex;
            waypointProgressRef.current = 0;
            waypointStartPosRef.current.copy(camera.position);
            waypointStartTargetRef.current.copy(
              controlsRef.current?.target || baseTargetRef.current,
            );
            onWaypointChange?.(waypointsRef.current[nextIndex]);
          } else {
            // Đã hoàn thành toàn bộ hành trình
            waypointsRef.current = null;
            isTransitioningRef.current = false;
            onTransitionComplete?.();
          }
        }
      }
      return;
    }

    // --- PHẦN B: LERP PRESET HOẶC FOCUS POINT THÔNG THƯỜNG ---
    if (isTransitioningRef.current) {
      const factor = Math.min(1, delta * lerpSpeed);
      basePosRef.current.lerp(desiredPosRef.current, factor);
      baseTargetRef.current.lerp(desiredTargetRef.current, factor);

      camera.position.copy(basePosRef.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(baseTargetRef.current);
        controlsRef.current.update();
      }

      const posDist = basePosRef.current.distanceTo(desiredPosRef.current);
      const targetDist = baseTargetRef.current.distanceTo(desiredTargetRef.current);

      if (posDist < 0.08 && targetDist < 0.04) {
        basePosRef.current.copy(desiredPosRef.current);
        baseTargetRef.current.copy(desiredTargetRef.current);
        isTransitioningRef.current = false;
      }
      return;
    }

    // --- PHẦN C: MOUSE PARALLAX & SAFE ZOOM KHI CAMERA ĐỨNG YÊN ---
    const canParallax = !isPOSActive && !targetFocusPoint;

    if (canParallax) {
      // Giới hạn biên độ nhìn theo chuột cực êm ái
      targetParallaxPosRef.current.set(
        state.pointer.x * 0.22,
        state.pointer.y * 0.14,
        0,
      );
      targetParallaxLookRef.current.set(
        state.pointer.x * 0.40,
        state.pointer.y * 0.25,
        0,
      );
    } else {
      targetParallaxPosRef.current.set(0, 0, 0);
      targetParallaxLookRef.current.set(0, 0, 0);
    }

    // Hệ số damping làm mịn mượt cử động
    const pDamp = Math.min(1, delta * 4.2);
    currentParallaxPosRef.current.lerp(targetParallaxPosRef.current, pDamp);
    currentParallaxLookRef.current.lerp(targetParallaxLookRef.current, pDamp);

    // Chuyển đổi offset sang hệ trục tọa độ cục bộ của Camera
    cameraRightRef.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraUpRef.current.set(0, 1, 0).applyQuaternion(camera.quaternion);

    worldParallaxPosRef.current
      .copy(cameraRightRef.current)
      .multiplyScalar(currentParallaxPosRef.current.x)
      .addScaledVector(cameraUpRef.current, currentParallaxPosRef.current.y);

    worldParallaxLookRef.current
      .copy(cameraRightRef.current)
      .multiplyScalar(currentParallaxLookRef.current.x)
      .addScaledVector(cameraUpRef.current, currentParallaxLookRef.current.y);

    // Cập nhật vị trí và góc nhìn thực tế
    camera.position.copy(basePosRef.current).add(worldParallaxPosRef.current);

    if (controlsRef.current) {
      controlsRef.current.target
        .copy(baseTargetRef.current)
        .add(worldParallaxLookRef.current);
      controlsRef.current.update();
    }
  });

  return null;
}
