"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

/* --------------------------------------------------------------------------
   프로파일(측면 단면) → LatheGeometry로 회전시켜 둥근 컵/접시 만들기
   -------------------------------------------------------------------------- */
const CUP_PROFILE: [number, number][] = [
  // 바닥 중심에서 시작
  [0.0, -0.7],
  [0.35, -0.7],
  [0.45, -0.68],
  [0.52, -0.6],
  // 벨리 라인 (둥글게 부풀어오름)
  [0.68, -0.4],
  [0.82, -0.15],
  [0.92, 0.15],
  [0.98, 0.45],
  [1.0, 0.62],
  // 입술(rim) — 바깥으로 살짝 말림
  [1.03, 0.68],
  [1.02, 0.72],
  [0.97, 0.72],
  // 안쪽 벽 (하강)
  [0.93, 0.68],
  [0.9, 0.45],
  [0.82, 0.15],
  [0.72, -0.15],
  [0.6, -0.4],
  [0.5, -0.55],
  [0.35, -0.58],
  [0.0, -0.58],
];

const SAUCER_PROFILE: [number, number][] = [
  [0.0, -0.02],
  [0.3, -0.02],
  [0.6, 0.0],
  [0.9, 0.02],
  [1.15, 0.06],
  [1.35, 0.11],
  [1.5, 0.16],
  [1.55, 0.18],
  [1.58, 0.2],
  // 림 바깥 말림
  [1.6, 0.23],
  [1.58, 0.26],
  [1.54, 0.27],
  // 안쪽 내려감
  [1.48, 0.24],
  [1.3, 0.18],
  [1.05, 0.14],
  [0.8, 0.12],
  [0.5, 0.1],
  [0.3, 0.1],
  [0.0, 0.1],
];

function toVec2(pts: [number, number][]) {
  return pts.map(([x, y]) => new THREE.Vector2(x, y));
}

// 바닥 그림자 텍스처 — 중앙 어두운 타원이 부드럽게 페이드
function useShadowTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, "rgba(0,0,0,0.85)");
    grad.addColorStop(0.3, "rgba(0,0,0,0.7)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.35)");
    grad.addColorStop(0.85, "rgba(0,0,0,0.1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

// 라떼 아트 텍스처 — 하트 패턴 + 주변 크레마
function useLatteArtTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const cx = size / 2;
    const cy = size / 2;

    // 베이스: 커피 그라데이션
    const base = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.5);
    base.addColorStop(0.0, "#120802");
    base.addColorStop(0.25, "#180c04");
    base.addColorStop(0.5, "#241308");
    base.addColorStop(0.65, "#341c0d");
    base.addColorStop(0.78, "#4a2a14");
    base.addColorStop(0.87, "#6a4124");
    base.addColorStop(0.93, "#8f5f38");
    base.addColorStop(0.97, "#b07e50");
    base.addColorStop(1.0, "#cc9668");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // 라떼 아트 — 클래식 하트 하나
    ctx.save();
    ctx.translate(cx, cy);

    // 우유 라디얼 그라데이션 (중앙 밝음 → 가장자리 크림)
    const milkGrad = ctx.createRadialGradient(0, -30, 15, 0, 0, 200);
    milkGrad.addColorStop(0, "#ffffff");
    milkGrad.addColorStop(0.45, "#fff2d6");
    milkGrad.addColorStop(1, "#d8a868");

    const heartSize = 300;

    // 뒤집힌 하트 — parametric heart curve, 꼬리 길게 뽑음
    const drawHeart = (scale = 1) => {
      const s = (heartSize / 32) * scale;
      ctx.beginPath();
      const steps = 160;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3) * s;
        const y =
          (13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)) *
          s;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    // 0. 바깥 할로 — blur된 크림 훗광으로 바깥 퍼지는 느낌
    ctx.save();
    ctx.filter = "blur(14px)";
    const haloGrad = ctx.createRadialGradient(0, 0, heartSize * 0.3, 0, 0, heartSize * 0.9);
    haloGrad.addColorStop(0, "rgba(165, 115, 65, 0.7)");
    haloGrad.addColorStop(0.55, "rgba(135, 88, 48, 0.45)");
    haloGrad.addColorStop(1, "rgba(100, 60, 30, 0)");
    drawHeart(1.25);
    ctx.fillStyle = haloGrad;
    ctx.fill();
    ctx.filter = "none";
    ctx.restore();

    // 1. 바깥 크레마 경계 링 (약하게 blur로 가장자리 부드럽게)
    ctx.save();
    ctx.filter = "blur(3px)";
    drawHeart(1.06);
    ctx.fillStyle = "rgba(50, 25, 8, 0.8)";
    ctx.fill();
    ctx.filter = "none";
    ctx.restore();

    // 2. 메인 우유 채움 (라디얼 그라데이션)
    drawHeart(1);
    ctx.fillStyle = milkGrad;
    ctx.fill();

    // 3. 상단(뾰족한 끝 쪽) 하이라이트 — 바깥쪽 밝은 반사
    ctx.save();
    drawHeart(0.95);
    ctx.clip();
    const topHighlight = ctx.createRadialGradient(
      -heartSize * 0.2, -heartSize * 0.3, 5,
      -heartSize * 0.2, -heartSize * 0.3, heartSize * 0.5,
    );
    topHighlight.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    topHighlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = topHighlight;
    ctx.fillRect(-heartSize, -heartSize, heartSize * 2, heartSize * 2);
    ctx.restore();

    // 4. 꼬리 쪽 그림자 — 아래로 갈수록 어두워지는 그라데이션
    ctx.save();
    drawHeart(1);
    ctx.clip();
    const botShade = ctx.createLinearGradient(0, 0, 0, heartSize * 0.85);
    botShade.addColorStop(0, "rgba(74, 42, 20, 0)");
    botShade.addColorStop(1, "rgba(74, 42, 20, 0.45)");
    ctx.fillStyle = botShade;
    ctx.fillRect(-heartSize, -heartSize, heartSize * 2, heartSize * 2);
    ctx.restore();

    // 5. 크림-커피 교차 하트 링 — 다수의 중첩 하트를 색상 보간으로 부드럽게
    const mix = (a: [number, number, number], b: [number, number, number], t: number, alpha = 1) =>
      `rgba(${a[0] + (b[0] - a[0]) * t}, ${a[1] + (b[1] - a[1]) * t}, ${a[2] + (b[2] - a[2]) * t}, ${alpha})`;
    const cream: [number, number, number] = [245, 234, 214];
    const coffee: [number, number, number] = [90, 52, 24];
    ctx.save();
    drawHeart(1);
    ctx.clip();
    ctx.filter = "blur(4px)";
    const bandCount = 80;
    for (let i = 0; i < bandCount; i++) {
      const t = 1 - i / bandCount;
      const scale = 0.05 + t * 0.85;
      const phase = t * Math.PI * 5;
      const m = (Math.cos(phase) + 1) / 2;
      // 가장 바깥쪽(t가 1에 가까울수록) alpha 낮춰 투명하게 페이드
      const alpha = t > 0.85 ? Math.max(0.2, 1 - (t - 0.85) / 0.15 * 0.7) : 1;
      ctx.fillStyle = mix(cream, coffee, m, alpha);
      drawHeart(scale);
      ctx.fill();
    }
    ctx.filter = "none";
    ctx.restore();

    // 5b. 중앙 수직 스템 — tip(위)에서 V 지점(아래)까지
    ctx.save();
    drawHeart(1);
    ctx.clip();
    ctx.strokeStyle = "rgba(90, 50, 20, 0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -heartSize * 0.5);
    ctx.lineTo(0, heartSize * 0.1);
    ctx.stroke();
    ctx.restore();


    // 7. 아웃라인
    drawHeart(1);
    ctx.strokeStyle = "rgba(40, 18, 5, 0.55)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function ShadowDisc() {
  const tex = useShadowTexture();
  return (
    <mesh position={[0, -0.92, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.8, 3.8]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthWrite={false}
        opacity={1}
      />
    </mesh>
  );
}

function CoffeeCup() {
  const groupRef = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const cupPoints = useMemo(() => toVec2(CUP_PROFILE), []);
  const saucerPoints = useMemo(() => toVec2(SAUCER_PROFILE), []);

  // 윈도우 전체 마우스 추적 (Canvas 밖에서도 반응)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    // 기본 더 위에서 내려보는 각도 → 커피 표면 잘 보임
    const tx = 0.65 + pointer.current.y * -0.15;
    const ty = pointer.current.x * 0.9;
    groupRef.current.rotation.x += (tx - groupRef.current.rotation.x) * 0.06;
    groupRef.current.rotation.y += (ty - groupRef.current.rotation.y) * 0.06;
  });

  return (
    <group ref={groupRef} rotation={[0.65, 0, -0.08]} scale={0.78}>
      {/* 받침 아래 소프트 그라데이션 그림자 디스크 — 컵 회전을 따라감 */}
      <ShadowDisc />

      {/* 받침 접시 — LatheGeometry로 얕은 dish 형태 */}
      <mesh receiveShadow castShadow position={[0, -0.85, 0]}>
        <latheGeometry args={[saucerPoints, 96]} />
        <meshPhysicalMaterial
          color="#f4efe8"
          roughness={0.35}
          clearcoat={0.7}
          clearcoatRoughness={0.2}
          reflectivity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 컵 본체 — 둥근 프로파일 */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[cupPoints, 96]} />
        <meshPhysicalMaterial
          color="#f4efe8"
          roughness={0.3}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
          reflectivity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 커피 액체 — 부드러운 크레마 표면 (라디얼 그라데이션 텍스처) */}
      <mesh position={[0, 0.57, 0]}>
        <cylinderGeometry args={[0.88, 0.86, 0.025, 64]} />
        <meshPhysicalMaterial
          map={useLatteArtTexture()}
          roughness={0.55}
          metalness={0}
          clearcoat={0.3}
          clearcoatRoughness={0.35}
          reflectivity={0.4}
        />
      </mesh>

      {/* 손잡이 — 컵 곡면(위쪽 넓고 아래쪽 좁음)에 맞춰 Z축 기울임 */}
      <mesh
        castShadow
        position={[0.95, 0.05, 0]}
        rotation={[0, 0, -0.22]}
        scale={[1, 1.1, 1]}
      >
        <torusGeometry args={[0.32, 0.1, 24, 64]} />
        <meshPhysicalMaterial
          color="#f4efe8"
          roughness={0.3}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
          reflectivity={0.6}
        />
      </mesh>

    </group>
  );
}

export default function CoffeeCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.1, 5.2], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2.5, 5, 3]} intensity={2.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#ffd9b8" />
      <pointLight position={[0, 3, 3]} intensity={1.2} color="#fff2e0" />
      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>
      <CoffeeCup />

    </Canvas>
  );
}
