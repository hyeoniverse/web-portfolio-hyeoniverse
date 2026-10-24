"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ReadySignal } from "@/lib/readyGate";
import { createSafeRenderer } from "@/utils/three";
import FloatingScene, { type FloatingSceneProps } from "./FloatingScene";

/* 몽이 3D 캔버스 — three · @react-three/fiber 를 쓰는 부분만 모은다. FloatingObject 가 ssr: false 로 늦게 불러
   /profile 첫 로드에 three 가 실리지 않게 한다(오버레이 · 말풍선 DOM 은 FloatingObject 에 남아 서버 HTML 에 그대로). */

const CAMERA = { position: [0, 0, 8] as [number, number, number], fov: 50, near: 0.1, far: 100 };

export default function FloatingCanvas({ dpr, antialias, ...scene }: FloatingSceneProps & { dpr: number; antialias: boolean }) {
  return (
    <Canvas
      camera={CAMERA}
      dpr={dpr}
      gl={(d) =>
        createSafeRenderer(d, {
          alpha: true,
          antialias,
          powerPreference: "high-performance",
        })
      }
      style={{ background: "transparent" }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        <FloatingScene {...scene} />
        <ReadySignal id="mascot" />
      </Suspense>
    </Canvas>
  );
}
