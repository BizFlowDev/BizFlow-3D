"use client";

import { useState } from "react";
import { Html, RoundedBox, Text } from "@react-three/drei";
import { LogOut } from "lucide-react";

interface LogoutKioskProps {
  enabled: boolean;
  onRequestLogout: () => void;
}

/** A session terminal between the warehouse and office doors. */
export function LogoutKiosk({ enabled, onRequestLogout }: LogoutKioskProps) {
  const [pointerOver, setPointerOver] = useState(false);
  const hovered = enabled && pointerOver;

  return (
    <group
      position={[0, 0, -17.5]}
      onPointerOver={(event) => { event.stopPropagation(); setPointerOver(true); }}
      onPointerOut={() => setPointerOver(false)}
      onClick={(event) => {
        event.stopPropagation();
        if (enabled) onRequestLogout();
      }}
    >
      <RoundedBox args={[1.15, 0.12, 0.7]} position={[0, 0.06, 0]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.65, 0.85, 0.38]} position={[0, 0.54, 0]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color="#c5ab87" roughness={0.65} />
      </RoundedBox>
      <RoundedBox args={[1.1, 1.2, 0.3]} position={[0, 1.5, 0]} radius={0.06} smoothness={4}>
        <meshStandardMaterial color="#c5ab87" roughness={0.65} />
      </RoundedBox>
      <RoundedBox args={[0.98, 1.07, 0.04]} position={[0, 1.5, 0.16]} radius={0.035} smoothness={4}>
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 1.5, 0.185]}>
        <planeGeometry args={[0.88, 0.97]} />
        <meshStandardMaterial color="#0f172a" emissive="#0f172a" emissiveIntensity={0.4} roughness={0.7} />
      </mesh>
      <Text position={[0, 1.84, 0.195]} fontSize={0.075} color="#c5ab87" letterSpacing={0.08}>
        BIZFLOW
      </Text>
      <Text position={[0, 1.61, 0.195]} fontSize={0.085} maxWidth={0.75} textAlign="center" color="#f8fafc">
        {"Kết thúc phiên\nlàm việc"}
      </Text>
      <mesh position={[0, 1.32, 0.195]}>
        <planeGeometry args={[0.68, 0.23]} />
        <meshStandardMaterial color={hovered ? "#b45309" : "#475569"} roughness={0.7} />
      </mesh>
      <Text position={[0, 1.32, 0.2]} fontSize={0.085} color="#ffffff">
        Đăng xuất
      </Text>
    </group>
  );
}
