"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  TORUS_GEOMETRY,
  TORUS_SCALE,
  TORUS_PATH,
  TORUS_ROTATION,
  TORUS_MATERIAL,
  TORUS_MOBILE,
} from "@/constants/torus";

interface TorusSceneProps {
  getProgress: () => number;
  theme: "dark" | "light";
  isMobile: boolean;
}

export default function TorusScene({
  getProgress,
  theme,
  isMobile,
}: TorusSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const radial = isMobile
      ? TORUS_MOBILE.radialSegments
      : TORUS_GEOMETRY.radialSegments;
    const tubular = isMobile
      ? TORUS_MOBILE.tubularSegments
      : TORUS_GEOMETRY.tubularSegments;

    return new THREE.TorusGeometry(
      TORUS_GEOMETRY.radius,
      TORUS_GEOMETRY.tube,
      radial,
      tubular
    );
  }, [isMobile]);

  const matConfig = TORUS_MATERIAL[theme];

  useFrame(() => {
    if (!meshRef.current) return;

    const progress = getProgress();

    // Position
    const xAmp = isMobile
      ? TORUS_PATH.xAmplitude * TORUS_MOBILE.xAmplitudeMultiplier
      : TORUS_PATH.xAmplitude;

    const x =
      Math.sin(progress * TORUS_PATH.xFrequency * Math.PI * 2 + TORUS_PATH.xPhase) *
      xAmp;

    const yLinear =
      TORUS_PATH.yStart + (TORUS_PATH.yEnd - TORUS_PATH.yStart) * progress;
    const yWave =
      Math.sin(progress * TORUS_PATH.yWaveFrequency * Math.PI * 2) *
      TORUS_PATH.yWaveAmplitude;

    const z =
      Math.sin(progress * TORUS_PATH.zFrequency * Math.PI * 2) *
        TORUS_PATH.zAmplitude -
      2;

    // Rotation
    const rx = progress * TORUS_ROTATION.xSpeed;
    const ry = progress * TORUS_ROTATION.ySpeed;
    const rz = progress * TORUS_ROTATION.zSpeed;

    // Scale
    const s = isMobile ? TORUS_MOBILE.scaleFactor : 1;

    meshRef.current.position.set(x, yLinear + yWave, z);
    meshRef.current.rotation.set(rx, ry, rz);
    meshRef.current.scale.set(
      TORUS_SCALE.x * s,
      TORUS_SCALE.y * s,
      TORUS_SCALE.z * s
    );

    if (wireframeRef.current) {
      wireframeRef.current.position.copy(meshRef.current.position);
      wireframeRef.current.rotation.copy(meshRef.current.rotation);
      wireframeRef.current.scale.copy(meshRef.current.scale);
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <directionalLight position={[-3, -2, 4]} intensity={0.3} />

      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={matConfig.color}
          emissive={matConfig.emissive}
          emissiveIntensity={matConfig.emissiveIntensity}
          metalness={matConfig.metalness}
          roughness={matConfig.roughness}
          transparent
          opacity={matConfig.opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={wireframeRef} geometry={geometry}>
        <meshBasicMaterial
          color={matConfig.color}
          wireframe
          transparent
          opacity={matConfig.wireframeOpacity}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
