"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { TransitionPhase } from "./transitionMotion";

/** Opt-in production measurement: append ?profile3d=1 and inspect User Timing. */
export function TransitionProfiler({ phase }: { phase: TransitionPhase }) {
  const enabled = useRef(false);
  const frames = useRef<number[]>([]);
  const draws = useRef<number[]>([]);
  const started = useRef(0);
  useEffect(() => { enabled.current = new URLSearchParams(window.location.search).get("profile3d") === "1"; }, []);
  useEffect(() => {
    if (!enabled.current) return;
    if (phase === "moving") {
      frames.current = []; draws.current = []; started.current = performance.now();
    } else if (started.current) {
      const samples = [...frames.current].sort((a, b) => a - b);
      const detail = {
        frames: samples.length,
        p95Ms: samples[Math.floor(samples.length * 0.95)] ?? 0,
        maxMs: samples.at(-1) ?? 0,
        over50Ms: samples.filter(ms => ms > 50).length,
        maxDrawCalls: Math.max(0, ...draws.current),
      };
      performance.measure("bizflow:room-transition", { start: started.current, end: performance.now(), detail });
      console.table(detail);
      started.current = 0;
    }
  }, [phase]);
  useFrame(({ gl }, delta) => {
    if (enabled.current && phase === "moving" && !document.hidden) {
      frames.current.push(delta * 1000);
      draws.current.push(gl.info.render.calls);
    }
  });
  return null;
}
