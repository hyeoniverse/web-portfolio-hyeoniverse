"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Geometry profiles (FloatingScene과 동일) ── */

const BODY_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 32;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.4 + 0.25 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const y = -0.55 * Math.cos(angle);
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
})();

const EAR_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.22 - 0.04 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const normalY = -0.45 * Math.cos(angle);
    if (t <= 0.6) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const flatY = -0.45 * Math.cos(0.6 * Math.PI);
      const b = (t - 0.6) / 0.4;
      const s = b * b * (3 - 2 * b);
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

const ARM_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.15 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.11 - 0.03 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const normalY = -0.15 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

const FOOT_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.18 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.19 - 0.06 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const normalY = -0.18 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

const BODY_COLOR = "#f0e6dc";
const BODY_EMISSIVE = "#c8b8a8";
const EYE_COLOR = "#1a1a2e";

const MAT_PROPS = {
  color: BODY_COLOR,
  emissive: BODY_EMISSIVE,
  emissiveIntensity: 0.05,
  metalness: 0,
  roughness: 0.92,
} as const;

/* ── Component ── */

type Expression = "normal" | "surprised" | "happy";

interface BunnyPreviewSceneProps {
  expression?: Expression;
}

export default function BunnyPreviewScene({
  expression = "normal",
}: BunnyPreviewSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftSquintRef = useRef<THREE.Group>(null);
  const rightSquintRef = useRef<THREE.Group>(null);
  const leftSmileRef = useRef<THREE.Group>(null);
  const rightSmileRef = useRef<THREE.Group>(null);
  const nextBlink = useRef(2 + Math.random() * 3);
  const blinkPhase = useRef(-1);
  const exprRef = useRef<Expression>(expression);
  exprRef.current = expression;

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    // 오르골 회전: Y축 ~10초에 1회전
    groupRef.current.rotation.set(0, t * 0.6, 0);

    // 살짝 위아래 보빙
    groupRef.current.position.y = Math.sin(t * 0.4 * Math.PI * 2) * 0.03;

    // ── Expressions (prop 기반, store 미사용) ──
    const expr = exprRef.current;
    const showNormal = expr === "normal";
    const showSquint = expr === "surprised";
    const showSmile = expr === "happy";

    if (leftEyeRef.current) leftEyeRef.current.visible = showNormal;
    if (rightEyeRef.current) rightEyeRef.current.visible = showNormal;
    if (leftSquintRef.current) leftSquintRef.current.visible = showSquint;
    if (rightSquintRef.current) rightSquintRef.current.visible = showSquint;
    if (leftSmileRef.current) leftSmileRef.current.visible = showSmile;
    if (rightSmileRef.current) rightSmileRef.current.visible = showSmile;

    // ── Blink ──
    if (showNormal) {
      const BLINK_DUR = 0.15;
      if (blinkPhase.current < 0) {
        if (t > nextBlink.current) blinkPhase.current = 0;
      }
      let eyeScaleY = 1.3;
      if (blinkPhase.current >= 0) {
        blinkPhase.current += dt / BLINK_DUR;
        if (blinkPhase.current >= 1) {
          blinkPhase.current = -1;
          nextBlink.current = t + 2 + Math.random() * 4;
        } else {
          const p = blinkPhase.current < 0.5
            ? blinkPhase.current / 0.5
            : 1 - (blinkPhase.current - 0.5) / 0.5;
          eyeScaleY = 1.3 * (1 - p * 0.92);
        }
      }
      if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
      if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} />
      <directionalLight position={[-2, -1, 3]} intensity={0.3} />
      <hemisphereLight args={["#ffeedd", "#b0a8c0", 0.4]} />

      <group ref={groupRef} scale={1.0} position={[0, 0, 0]}>
        {/* Body */}
        <mesh position={[0, -0.15, 0]} scale={[0.75, 0.78, 0.7]}>
          <latheGeometry args={[BODY_PROFILE, 24]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.42, 0.06]} scale={[1.15, 1, 0.95]}>
          <sphereGeometry args={[0.48, 24, 18]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Left Ear */}
        <mesh position={[-0.2, 0.82, -0.04]} rotation={[0.12, 0, 0.18]} scale={[1.3, 1.3, 1]}>
          <latheGeometry args={[EAR_PROFILE, 16]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Right Ear */}
        <mesh position={[0.2, 0.82, -0.04]} rotation={[0.12, 0, -0.18]} scale={[1.3, 1.3, 1]}>
          <latheGeometry args={[EAR_PROFILE, 16]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Left Eye (normal) */}
        <mesh ref={leftEyeRef} position={[-0.2, 0.46, 0.48]} rotation={[-0.08, -0.31, 0]} scale={[1, 1.3, 0.15]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* Right Eye (normal) */}
        <mesh ref={rightEyeRef} position={[0.2, 0.46, 0.48]} rotation={[-0.08, 0.31, 0]} scale={[1, 1.3, 0.15]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* Left Squint > (꼭짓점이 오른쪽에서 만남) */}
        <group ref={leftSquintRef} position={[-0.14, 0.46, 0.49]} rotation={[-0.08, -0.2, 0]} visible={false}>
          <mesh position={[-0.088, 0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.088, -0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* Right Squint < (꼭짓점이 왼쪽에서 만남) */}
        <group ref={rightSquintRef} position={[0.14, 0.46, 0.49]} rotation={[-0.08, 0.2, 0]} visible={false}>
          <mesh position={[0.088, 0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.088, -0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* Left Smile ^^ (torus + sphere caps for rounded ends) */}
        <group ref={leftSmileRef} position={[-0.2, 0.46, 0.49]} rotation={[-0.08, -0.31, 0]} visible={false}>
          <mesh>
            <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* Right Smile ^^ (torus + sphere caps for rounded ends) */}
        <group ref={rightSmileRef} position={[0.2, 0.46, 0.49]} rotation={[-0.08, 0.31, 0]} visible={false}>
          <mesh>
            <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* Tail */}
        <mesh position={[0, -0.25, -0.38]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Left Arm */}
        <mesh position={[-0.3, -0.1, 0]} rotation={[0, 0, 2]} scale={[1, 1.6, 1]}>
          <latheGeometry args={[ARM_PROFILE, 16]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Right Arm */}
        <mesh position={[0.3, -0.1, 0]} rotation={[0, 0, -2]} scale={[1, 1.6, 1]}>
          <latheGeometry args={[ARM_PROFILE, 16]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Left Leg */}
        <mesh position={[-0.15, -0.35, 0.25]} rotation={[1.4, 0, 0.1]} scale={[0.7, 1.8, 0.7]}>
          <latheGeometry args={[FOOT_PROFILE, 16]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>

        {/* Right Leg */}
        <mesh position={[0.15, -0.35, 0.25]} rotation={[1.4, 0, -0.1]} scale={[0.7, 1.8, 0.7]}>
          <latheGeometry args={[FOOT_PROFILE, 16]} />
          <meshStandardMaterial {...MAT_PROPS} />
        </mesh>
      </group>
    </>
  );
}
