"use client";

import { createTrack, sampleTrack, lookAngles } from "./transitionMotion";
import { getPOSCamera } from "../posScreenLayout";
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
  paused?: boolean;
  reducedMotion?: boolean;
  currentPreset: CameraPreset;
  activeRoom?: RoomId;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  targetFocusPoint?: CameraFocusPoint | null;
  /** Tốc độ chuyển đổi lerp mặc định */
  lerpSpeed?: number;
  /** Đang ở chế độ máy POS (tắt parallax) */
  isPOSActive?: boolean;
  isAnyModalOpen?: boolean;
  /** Chuỗi waypoint chuyển phòng xuyên cửa */
  waypoints?: TransitionWaypoint[] | null;
  /** Callback khi bắt đầu waypoint mới (để mở cửa tương ứng) */
  onWaypointChange?: (waypoint: TransitionWaypoint) => void;
  /** Callback khi hoàn tất toàn bộ chuỗi waypoint */
  onTransitionComplete?: () => void;
}

export function WorldCameraController({
  paused = false,
  reducedMotion = false,
  currentPreset,
  activeRoom,
  controlsRef,
  targetFocusPoint,
  lerpSpeed = 4.5,
  isPOSActive = false,
  isAnyModalOpen = false,
  waypoints = null,
  onWaypointChange,
  onTransitionComplete,
}: WorldCameraControllerProps) {
  const { camera, gl, size } = useThree();
  const lookSampleRef = useRef(new THREE.Vector3());
  const desiredZoomRef = useRef(1);

  // Optical zoom stays independent of preset/parallax camera positions.
  useEffect(() => {
    desiredZoomRef.current = 1;
  }, [currentPreset, activeRoom, targetFocusPoint, waypoints, isPOSActive]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || isPOSActive || isAnyModalOpen || targetFocusPoint || isTransitioningRef.current) return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      const step = THREE.MathUtils.clamp(pixels, -100, 100);
      desiredZoomRef.current = THREE.MathUtils.clamp(desiredZoomRef.current * Math.exp(-step * 0.0007), 0.9, 1.2);
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [gl, isPOSActive, isAnyModalOpen, targetFocusPoint]);

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
  const tracksRef = useRef<{ position: ReturnType<typeof createTrack>; target: ReturnType<typeof createTrack> } | null>(null);
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
      const durations = waypoints.map(wp => wp.duration);
      const positions = [camera.position.toArray(), ...waypoints.map(wp => wp.position)];
      const targets = [waypointStartTargetRef.current.toArray(), ...waypoints.map(wp => wp.target)];
      let yaw = 0;
      const angles = positions.map((position, index) => {
        const angle = lookAngles(position, targets[index], yaw);
        yaw = angle[0];
        return angle;
      });
      tracksRef.current = {
        position: createTrack(positions, durations),
        target: createTrack(angles, durations),
      };
      currentParallaxPosRef.current.set(0, 0, 0);
      currentParallaxLookRef.current.set(0, 0, 0);
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
    if (hadTargetFocusPointRef.current || currentPreset !== lastPresetRef.current || currentPreset === "posScreen") {
      hadTargetFocusPointRef.current = false;
      const targetPreset = currentPreset;

      lastPresetRef.current = targetPreset;
      const cfg = targetPreset === "posScreen"
        ? getPOSCamera(size.width / Math.max(1, size.height), camera instanceof THREE.PerspectiveCamera ? camera.fov : 52)
        : CAMERA_PRESETS[targetPreset] || CAMERA_PRESETS[currentPreset] || CAMERA_PRESETS.overview;
      desiredPosRef.current.set(...cfg.position);
      desiredTargetRef.current.set(...cfg.target);
      isTransitioningRef.current = true;
    }
  }, [currentPreset, targetFocusPoint, activeRoom, camera, waypoints, size.width, size.height]);

  // ── 3. Vòng lặp Render useFrame (Waypoints + Parallax + Safe Zoom) ───────────
  useFrame((state, delta) => {
    if (paused || document.hidden) return;
    if (reducedMotion) {
      const lastWaypoint = waypointsRef.current?.at(-1);
      if (lastWaypoint) {
        desiredPosRef.current.set(...lastWaypoint.position);
        desiredTargetRef.current.set(...lastWaypoint.target);
        waypointsRef.current = null;
        tracksRef.current = null;
        onTransitionComplete?.();
      }
      basePosRef.current.copy(desiredPosRef.current);
      baseTargetRef.current.copy(desiredTargetRef.current);
      camera.position.copy(basePosRef.current);
      currentParallaxPosRef.current.set(0, 0, 0);
      currentParallaxLookRef.current.set(0, 0, 0);
      isTransitioningRef.current = false;
      if (controlsRef.current) {
        controlsRef.current.target.copy(baseTargetRef.current);
        controlsRef.current.update();
      }
      camera.zoom = desiredZoomRef.current;
      camera.updateProjectionMatrix();
      return;
    }
    delta = Math.min(delta, 0.05);
    const zoom = THREE.MathUtils.damp(camera.zoom, desiredZoomRef.current, 8, delta);
    if (Math.abs(camera.zoom - zoom) > 0.00001) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    // --- PHẦN A: ĐIỀU KHIỂN CHUỖI WAYPOINT CHUYỂN PHÒNG ---
    if (waypointsRef.current && waypointsRef.current.length > 0) {
      const currentWp = waypointsRef.current[waypointIndexRef.current];
      if (currentWp) {
        const previousProgress = waypointProgressRef.current;
        const step = delta / Math.max(0.1, currentWp.duration);
        waypointProgressRef.current = Math.min(1, waypointProgressRef.current + step);

        const t = waypointProgressRef.current;
        desiredPosRef.current.set(...currentWp.position);
        desiredTargetRef.current.set(...currentWp.target);
        if (tracksRef.current) {
          sampleTrack(tracksRef.current.position, waypointIndexRef.current, t, basePosRef.current);
          sampleTrack(tracksRef.current.target, waypointIndexRef.current, t, lookSampleRef.current);
          const { x: yaw, y: pitch, z: distance } = lookSampleRef.current;
          baseTargetRef.current.set(
            Math.sin(yaw) * Math.cos(pitch) * distance,
            Math.sin(pitch) * distance,
            Math.cos(yaw) * Math.cos(pitch) * distance,
          ).add(basePosRef.current);
          camera.up.set(0, 1, 0);
        }

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
            waypointProgressRef.current = Math.max(0, (step - (1 - previousProgress)) * currentWp.duration / waypointsRef.current[nextIndex].duration);
            waypointStartPosRef.current.copy(camera.position);
            waypointStartTargetRef.current.copy(
              controlsRef.current?.target || baseTargetRef.current,
            );
            onWaypointChange?.(waypointsRef.current[nextIndex]);
          } else {
            // Đã hoàn thành toàn bộ hành trình
            waypointsRef.current = null;
            isTransitioningRef.current = false;
            tracksRef.current = null;
            currentParallaxPosRef.current.set(0, 0, 0);
            currentParallaxLookRef.current.set(0, 0, 0);
            onTransitionComplete?.();
          }
        }
      }
      return;
    }

    // --- PHẦN B: LERP PRESET HOẶC FOCUS POINT THÔNG THƯỜNG ---
    if (isTransitioningRef.current) {
      const factor = 1 - Math.exp(-delta * lerpSpeed);
      const current = lookAngles(basePosRef.current.toArray(), baseTargetRef.current.toArray());
      const desired = lookAngles(desiredPosRef.current.toArray(), desiredTargetRef.current.toArray(), current[0]);
      const yaw = THREE.MathUtils.lerp(current[0], desired[0], factor);
      const pitch = THREE.MathUtils.lerp(current[1], desired[1], factor);
      const distance = THREE.MathUtils.lerp(current[2], desired[2], factor);
      basePosRef.current.lerp(desiredPosRef.current, factor);
      baseTargetRef.current.set(Math.sin(yaw) * Math.cos(pitch) * distance,
        Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance).add(basePosRef.current);
      camera.up.set(0, 1, 0);

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
    const pDamp = 1 - Math.exp(-delta * 4.2);
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
