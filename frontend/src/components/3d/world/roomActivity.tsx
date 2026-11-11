"use client";

import { createContext, useContext } from "react";
import { useFrame, type RootState } from "@react-three/fiber";

export const RoomActivity = createContext(true);

/** Hidden rooms stay mounted, but do not spend CPU on decorative animation. */
export function useRoomFrame(callback: (state: RootState, delta: number) => void) {
  const active = useContext(RoomActivity);
  useFrame((state, delta) => {
    if (active) callback(state, Math.min(delta, 0.05));
  });
}
