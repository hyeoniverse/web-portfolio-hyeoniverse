"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "@/providers/ThemeProvider";
import { createSafeRenderer } from "@/utils/three";
import {
  TORUS_GEOMETRY,
  TORUS_MATERIAL,
  TORUS_SCALE,
} from "@/constants/torus";
import styles from "../WebFlowSection.module.css";

function MiniTorusScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { theme } = useTheme();
  const mat = TORUS_MATERIAL[theme];

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.6;

    meshRef.current.position.x = Math.sin(t * 0.7) * 0.6;
    meshRef.current.position.y = Math.cos(t * 1.1) * 0.4;
    meshRef.current.position.z = Math.sin(t * 0.4) * 0.2;

    meshRef.current.rotation.x = t * 2.5;
    meshRef.current.rotation.y = t * 4.0;
    meshRef.current.rotation.z = t * 1.2;
  });

  const s = 0.7;

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <directionalLight position={[-3, -2, 4]} intensity={0.5} />
      <mesh
        ref={meshRef}
        scale={[TORUS_SCALE.x * s, TORUS_SCALE.y * s, TORUS_SCALE.z * s]}
      >
        <torusGeometry
          args={[TORUS_GEOMETRY.radius, TORUS_GEOMETRY.tube, 24, 48]}
        />
        <meshStandardMaterial
          color={mat.color}
          emissive={mat.emissive}
          emissiveIntensity={mat.emissiveIntensity}
          metalness={mat.metalness}
          roughness={mat.roughness}
          envMapIntensity={mat.envMapIntensity}
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  );
}

export default function DemoScrollTorus() {
  return (
    <div className={styles.codeDemoInner} style={{ padding: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={(d) => createSafeRenderer(d, { alpha: true, antialias: true, powerPreference: "high-performance" })}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Suspense fallback={null}>
          <MiniTorusScene />
        </Suspense>
      </Canvas>
      <span className={styles.demoHint}>3D Metallic Torus</span>
    </div>
  );
}
