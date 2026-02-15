"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
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
  getCumulative: () => number;
  theme: "dark" | "light";
  isMobile: boolean;
}

export default function TorusScene({
  getCumulative,
  theme,
  isMobile,
}: TorusSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

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

    const t = getCumulative();

    // X: 좌우 진동 (연속)
    const xAmp = isMobile
      ? TORUS_PATH.xAmplitude * TORUS_MOBILE.xAmplitudeMultiplier
      : TORUS_PATH.xAmplitude;
    const x = Math.sin(t * TORUS_PATH.xFrequency * Math.PI * 2) * xAmp;

    // Y: 상하 진동 (X와 다른 주파수 → 리사주 곡선)
    const y =
      Math.cos(t * TORUS_PATH.yFrequency * Math.PI * 2) * TORUS_PATH.yAmplitude;

    // Z: 깊이 진동 (연속)
    const z =
      Math.sin(t * TORUS_PATH.zFrequency * Math.PI * 2) *
        TORUS_PATH.zAmplitude -
      2;

    // Rotation: 연속 회전
    const rx = t * TORUS_ROTATION.xSpeed;
    const ry = t * TORUS_ROTATION.ySpeed;
    const rz = t * TORUS_ROTATION.zSpeed;

    // Scale
    const s = isMobile ? TORUS_MOBILE.scaleFactor : 1;

    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.set(rx, ry, rz);
    meshRef.current.scale.set(
      TORUS_SCALE.x * s,
      TORUS_SCALE.y * s,
      TORUS_SCALE.z * s
    );
  });

  return (
    <>
      {/* 환경 반사맵 (메탈릭 반사용) */}
      <Environment preset="city" />

      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <directionalLight position={[-3, -2, 4]} intensity={0.5} />

      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={matConfig.color}
          emissive={matConfig.emissive}
          emissiveIntensity={matConfig.emissiveIntensity}
          metalness={matConfig.metalness}
          roughness={matConfig.roughness}
          envMapIntensity={matConfig.envMapIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
