"use client";

import { Canvas } from "@react-three/fiber";
import BunnyPreviewScene from "@/app/profile/_components/BunnyShowcase/BunnyPreviewScene";

/* TIL 그날의 기록 옆 3D 몽이 — Profile 의 BunnyPreviewScene 을 그대로 쓴다.
   표정은 고른 날에 따라 바뀌고, snapToFront 가 늘 때마다 정면으로 돌아본다. three 가 무거워 dynamic 으로만 싣는다 */
export default function TilMong3D({
  expression,
  snapToFront,
}: {
  expression: "normal" | "surprised" | "happy";
  snapToFront: number;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 3.6], fov: 45 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} />
      <BunnyPreviewScene expression={expression} snapToFront={snapToFront} />
    </Canvas>
  );
}
