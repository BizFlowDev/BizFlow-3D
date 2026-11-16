"use client";

interface RoomLightingProps {
  center: [number, number, number];
  height: number;
  depth: number;
}

/** P3's neutral ambient, warm key and cool fill, scaled to each room. */
export function RoomLighting({ center: [x, y, z], height, depth }: RoomLightingProps) {
  const ceilingY = y + height - 0.4;

  return (
    <group>
      <ambientLight intensity={0.48} color="#f8fafc" />
      <pointLight
        position={[x, ceilingY, z]}
        intensity={16}
        distance={10}
        color="#fef3c7"
      />
      <pointLight
        position={[x, ceilingY, z - depth * (5 / 14)]}
        intensity={14.4}
        distance={8}
        color="#bae6fd"
      />
    </group>
  );
}
