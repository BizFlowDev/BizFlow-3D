"use client";

import { useEffect, type MutableRefObject } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_PRESETS, type RoomId } from "./types";

export type PrepareRoom = (from: RoomId, to: RoomId) => Promise<void>;
const rooms: RoomId[] = ["showroom", "hallway", "warehouse", "office"];

/** Mounted inside Suspense, after the room tree and environment have committed. */
export function ScenePrewarmer({ prepareRef, activeRoom, busy }: {
  prepareRef: MutableRefObject<PrepareRoom | null>;
  activeRoom: RoomId;
  busy: boolean;
}) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let disposed = false;
    let queue = Promise.resolve();
    const prepared = new Map<string, string>();
    const target = new THREE.WebGLRenderTarget(32, 32);
    const warmCamera = camera.clone();

    const prepare: PrepareRoom = (from, to) => {
      const job = queue.catch(() => {}).then(async () => {
        if (disposed) throw new Error("Scene disposed");
        const roots = rooms.map(room => scene.getObjectByName(`room-${room}`));
        if (roots.some(root => !root)) throw new Error("Rooms are not ready");
        // Troika fonts and generated text geometry are asynchronous too.
        const texts: (THREE.Object3D & { sync: () => void; _needsSync?: boolean; _isSyncing?: boolean })[] = [];
        scene.traverse(object => {
          const text = object as typeof texts[number];
          if (typeof text.sync === "function") { texts.push(text); text.sync(); }
        });
        const textDeadline = performance.now() + 10000;
        while (texts.some(text => text._needsSync || text._isSyncing)) {
          if (disposed || performance.now() > textDeadline) throw new Error("Text preparation timed out");
          await new Promise(resolve => setTimeout(resolve, 16));
        }
        if (disposed) throw new Error("Scene disposed");
        const signature: string[] = [];
        scene.traverse(object => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          signature.push(mesh.uuid, mesh.geometry.uuid);
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            signature.push(material.uuid);
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) signature.push(value.uuid, String(value.version));
            }
          }
        });
        const key = `${from}:${to}`;
        const version = signature.join(",");
        if (prepared.get(key) === version) return;
        const start = performance.now();

        // Match both the transit light set and the settled destination light set.
        for (const transit of [true, false]) {
          if (disposed) throw new Error("Scene disposed");
          const configure = () => {
            const state: [THREE.Object3D, boolean, boolean][] = [];
            scene.traverse(object => {
              state.push([object, object.visible, object.frustumCulled]);
              object.visible = true;
              object.frustumCulled = false;
            });
            roots.forEach((root, index) => {
              root!.visible = transit
                ? rooms[index] === from || rooms[index] === to || rooms[index] === "hallway"
                : rooms[index] === to || (rooms[index] === "hallway" && to === "showroom");
            });
            const oldFog = scene.fog;
            const fogRoom = transit ? from : to;
            scene.fog = new THREE.Fog("#070b14", fogRoom === "warehouse" ? 38 : 20, fogRoom === "warehouse" ? 90 : 48);
            return () => {
              scene.fog = oldFog;
              state.forEach(([object, visible, culled]) => {
                object.visible = visible;
                object.frustumCulled = culled;
              });
            };
          };
          const preset = CAMERA_PRESETS[`${to}Overview`];
          warmCamera.position.set(...preset.position);
          warmCamera.lookAt(...preset.target);
          warmCamera.updateMatrixWorld();
          // compileAsync captures lighting synchronously; never leave overrides across await.
          let restore = configure();
          let compilation: Promise<unknown>;
          try { compilation = gl.compileAsync(scene, warmCamera); }
          finally { restore(); }
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([compilation, new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error("Shader preparation timed out")), 10000);
            })]);
          } finally { clearTimeout(timer); }
          if (disposed) throw new Error("Scene disposed");
          restore = configure();
          const previousTarget = gl.getRenderTarget();
          const face = gl.getActiveCubeFace(), mip = gl.getActiveMipmapLevel();
          const viewport = gl.getViewport(new THREE.Vector4());
          const scissor = gl.getScissor(new THREE.Vector4());
          const scissorTest = gl.getScissorTest();
          const autoClear = gl.autoClear;
          const shadowUpdate = gl.shadowMap.needsUpdate;
          try {
            gl.setRenderTarget(target);
            gl.setViewport(0, 0, 32, 32);
            gl.setScissorTest(false);
            gl.autoClear = true;
            gl.shadowMap.needsUpdate = true;
            gl.render(scene, warmCamera);
          } finally {
            restore();
            gl.setRenderTarget(previousTarget, face, mip);
            gl.setViewport(viewport);
            gl.setScissor(scissor);
            gl.setScissorTest(scissorTest);
            gl.autoClear = autoClear;
            gl.shadowMap.needsUpdate = shadowUpdate;
          }
        }
        prepared.set(key, version);
        performance.measure("bizflow:prepare-room", { start, end: performance.now(), detail: { from, to } });
      });
      queue = job;
      return job;
    };
    prepareRef.current = prepare;
    return () => {
      disposed = true;
      if (prepareRef.current === prepare) prepareRef.current = null;
      target.dispose();
    };
  }, [gl, scene, camera, prepareRef]);

  useEffect(() => {
    if (busy) return;
    let cancelled = false;
    let idle: number;
    const remaining = rooms.filter(room => room !== activeRoom);
    const schedule = () => {
      idle = window.requestIdleCallback(async () => {
        if (cancelled) return;
        const next = remaining.shift();
        if (!next) return;
        try { await prepareRef.current?.(activeRoom, next); } catch { /* Explicit requests can retry. */ }
        if (!cancelled && remaining.length) schedule();
      });
    };
    // Unsupported browsers still prepare on demand.
    if (typeof window.requestIdleCallback === "function") schedule();
    return () => { cancelled = true; if (idle !== undefined) window.cancelIdleCallback(idle); };
  }, [activeRoom, busy, prepareRef]);
  return null;
}
