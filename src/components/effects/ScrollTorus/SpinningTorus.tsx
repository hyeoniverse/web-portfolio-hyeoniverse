"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/providers/ThemeProvider";
import { TORUS_GEOMETRY, TORUS_SCALE, TORUS_MATERIAL } from "@/constants/torus";

interface SpinningTorusProps {
  scale?: number;
  speed?: number;
  segments?: [number, number];
}

export default function SpinningTorus({
  scale = 0.7,
  speed = 1,
  segments,
}: SpinningTorusProps) {
  const ref = useRef<THREE.Mesh>(null);
  const { theme } = useTheme();
  const mat = TORUS_MATERIAL[theme];

  const envTex = useTexture("/images/profile_pic.webp");
  envTex.mapping = THREE.EquirectangularReflectionMapping;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * 0.6 * speed;
    ref.current.position.x = Math.sin(t * 0.7) * 0.6;
    ref.current.position.y = Math.cos(t * 1.1) * 0.4;
    ref.current.rotation.x = t * 2.5;
    ref.current.rotation.y = t * 4.0;
    ref.current.rotation.z = t * 1.2;
  });

  const s = scale;
  const [radial, tubular] = segments ?? [TORUS_GEOMETRY.radialSegments, TORUS_GEOMETRY.tubularSegments];

  return (
    <mesh ref={ref} scale={[TORUS_SCALE.x * s, TORUS_SCALE.y * s, TORUS_SCALE.z * s]}>
      <torusGeometry args={[TORUS_GEOMETRY.radius, TORUS_GEOMETRY.tube, radial, tubular]} />
      <meshStandardMaterial
        color={mat.color}
        emissive={mat.emissive}
        emissiveIntensity={mat.emissiveIntensity}
        metalness={mat.metalness}
        roughness={mat.roughness}
        envMap={envTex}
        envMapIntensity={mat.envMapIntensity}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
