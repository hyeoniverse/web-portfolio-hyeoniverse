"use client";

import { useRef, useState } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  BODY_PROFILE,
  EAR_PROFILE,
  ARM_PROFILE,
  FOOT_PROFILE,
  EYE_COLOR,
} from "./bunnyPreviewGeometry";
import BunnySkin from "../FloatingObject/BunnySkin";

/* ── Component ── */

type Expression = "normal" | "surprised" | "happy";

interface BunnyPreviewSceneProps {
  expression?: Expression;
  /** 클릭으로 표정 변경 시에만 증가하는 카운터 — 정면 스냅 트리거 */
  snapToFront?: number;
}

export default function BunnyPreviewScene({
  expression = "normal",
  snapToFront = 0,
}: BunnyPreviewSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftSquintRef = useRef<THREE.Group>(null);
  const rightSquintRef = useRef<THREE.Group>(null);
  const leftSmileRef = useRef<THREE.Group>(null);
  const rightSmileRef = useRef<THREE.Group>(null);
  /* 첫 깜빡임까지의 시간은 인스턴스마다 달라야 하지만 렌더마다 달라질 이유는 없다.
     useRef 의 인자는 첫 값만 쓰이면서도 렌더할 때마다 평가되므로, 여기서 Math.random 을
     부르면 리렌더마다 난수를 뽑아 버린다. useState 의 지연 초기화는 마운트 때 한 번만 돈다. */
  const [firstBlinkAt] = useState(() => 2 + Math.random() * 3);
  const nextBlink = useRef(firstBlinkAt);
  const blinkPhase = useRef(-1);
  const exprRef = useRef<Expression>(expression);
  useSyncRef(exprRef, expression);

  // ── 클릭 시 정면 스냅 ──
  const rotationY = useRef(0);
  const modeRef = useRef<"spin" | "snap" | "hold">("spin");
  const snapTarget = useRef(0);
  const holdStart = useRef(0);
  const prevSnapRef = useRef(snapToFront);
  const SPIN_SPEED = 0.6; // rad/s
  const HOLD_DURATION = 2.5; // seconds

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    // ── 클릭으로 표정 변경 시에만 정면 스냅 ──
    if (snapToFront !== prevSnapRef.current) {
      prevSnapRef.current = snapToFront;
      const nearest = Math.round(rotationY.current / (Math.PI * 2)) * Math.PI * 2;
      snapTarget.current = nearest;
      modeRef.current = "snap";
    }

    if (modeRef.current === "spin") {
      rotationY.current += SPIN_SPEED * dt;
    } else if (modeRef.current === "snap") {
      rotationY.current += (snapTarget.current - rotationY.current) * (1 - Math.pow(0.02, dt));
      if (Math.abs(rotationY.current - snapTarget.current) < 0.005) {
        rotationY.current = snapTarget.current;
        modeRef.current = "hold";
        holdStart.current = t;
      }
    } else if (modeRef.current === "hold") {
      if (t - holdStart.current > HOLD_DURATION) {
        modeRef.current = "spin";
      }
    }

    groupRef.current.rotation.set(0, rotationY.current, 0);

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
          <BunnySkin />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.42, 0.06]} scale={[1.15, 1, 0.95]}>
          <sphereGeometry args={[0.48, 24, 18]} />
          <BunnySkin />
        </mesh>

        {/* Left Ear */}
        <mesh position={[-0.2, 0.82, -0.04]} rotation={[0.12, 0, 0.18]} scale={[1.3, 1.3, 1]}>
          <latheGeometry args={[EAR_PROFILE, 16]} />
          <BunnySkin />
        </mesh>

        {/* Right Ear */}
        <mesh position={[0.2, 0.82, -0.04]} rotation={[0.12, 0, -0.18]} scale={[1.3, 1.3, 1]}>
          <latheGeometry args={[EAR_PROFILE, 16]} />
          <BunnySkin />
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
          <BunnySkin />
        </mesh>

        {/* Left Arm */}
        <mesh position={[-0.3, -0.1, 0]} rotation={[0, 0, 2]} scale={[1, 1.6, 1]}>
          <latheGeometry args={[ARM_PROFILE, 16]} />
          <BunnySkin />
        </mesh>

        {/* Right Arm */}
        <mesh position={[0.3, -0.1, 0]} rotation={[0, 0, -2]} scale={[1, 1.6, 1]}>
          <latheGeometry args={[ARM_PROFILE, 16]} />
          <BunnySkin />
        </mesh>

        {/* Left Leg */}
        <mesh position={[-0.15, -0.35, 0.25]} rotation={[1.4, 0, 0.1]} scale={[0.7, 1.8, 0.7]}>
          <latheGeometry args={[FOOT_PROFILE, 16]} />
          <BunnySkin />
        </mesh>

        {/* Right Leg */}
        <mesh position={[0.15, -0.35, 0.25]} rotation={[1.4, 0, -0.1]} scale={[0.7, 1.8, 0.7]}>
          <latheGeometry args={[FOOT_PROFILE, 16]} />
          <BunnySkin />
        </mesh>
      </group>
    </>
  );
}
