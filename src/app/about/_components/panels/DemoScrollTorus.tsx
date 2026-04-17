"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { createSafeRenderer } from "@/utils/three";
import shared from "../AboutSection.module.css";
import local from "./CodeHighlightsPanel.module.css";
const styles = { ...shared, ...local };

const SpinningTorus = dynamic(
  () => import("@/components/effects/ScrollTorus/SpinningTorus"),
  { ssr: false }
);

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
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={1.0} />
          <directionalLight position={[-3, -2, 4]} intensity={0.5} />
          <SpinningTorus scale={0.7} segments={[24, 48]} />
        </Suspense>
      </Canvas>
      <span className={styles.demoHint}>3D Metallic Torus</span>
    </div>
  );
}
