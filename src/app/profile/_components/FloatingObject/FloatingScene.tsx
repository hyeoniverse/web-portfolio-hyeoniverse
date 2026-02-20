"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { siteConfig } from "@/config/site.config";
import { useSoundStore } from "@/stores/soundStore";

/* ── Constants ── */

const BUNNY = {
  speed: 0.15,
  z: -2,
  hitRadius: 0.7,
  impulse: 4.0,
  wallRestitution: 0.8,
  friction: 0.996,
  margin: 1.0,
  baseRotation: { x: 0.06, y: 0.12, z: 0.03 },
  bob: { amp: 0.06, freq: 0.4 },
} as const;

/* Egg-shaped body profile (wider at bottom, rounded poles) */
const BODY_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 32;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI; // 0 (bottom) → π (top)
    // R varies: 0.65 at bottom → 0.15 at top → extra chubby hip
    const R = 0.4 + 0.25 * Math.cos(angle);
    const r = R * Math.sin(angle);
    const y = -0.55 * Math.cos(angle);
    pts.push(new THREE.Vector2(r, y));
  }
  return pts;
})();

/* Ear profile — thin base, thick rounded tip */
const EAR_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.22 - 0.04 * Math.cos(angle); // 0.18 base → 0.26 tip
    const r = R * Math.sin(angle);
    const normalY = -0.45 * Math.cos(angle);
    // Tip end (t > 0.6): smooth dome
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

/* Arm profile — hand end has smooth dome (봉긋) */
const ARM_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.15 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.11 - 0.03 * Math.cos(angle); // 0.08 shoulder → 0.14 hand
    const r = R * Math.sin(angle);
    const normalY = -0.15 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      // retain 80% → 손바닥 쪽 도톰하게 튀어나옴
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

/* Teardrop foot profile — toe end has smooth dome (봉긋) */
const FOOT_PROFILE = (() => {
  const pts: THREE.Vector2[] = [];
  const N = 20;
  const flatT = 0.6;
  const flatY = -0.18 * Math.cos(flatT * Math.PI);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * Math.PI;
    const R = 0.19 - 0.06 * Math.cos(angle); // 0.13 ankle → 0.25 toe
    const r = R * Math.sin(angle);
    const normalY = -0.18 * Math.cos(angle);
    if (t <= flatT) {
      pts.push(new THREE.Vector2(r, normalY));
    } else {
      const b = (t - flatT) / (1 - flatT);
      const s = b * b * (3 - 2 * b);
      // retain 80% of curvature at tip → 도톰하게 튀어나옴
      const retain = 1 - s * 0.2;
      pts.push(new THREE.Vector2(r, flatY + (normalY - flatY) * retain));
    }
  }
  return pts;
})();

/* Soft plush colors — no metal */
const BODY_COLOR = "#f0e6dc";
const BODY_EMISSIVE = "#c8b8a8";
const EYE_COLOR = "#1a1a2e";

/* ── Component ── */

interface FloatingSceneProps {
  theme: "dark" | "light";
  isMobile: boolean;
  mouseNDC: React.RefObject<{ x: number; y: number }>;
  pointerActive: React.RefObject<boolean>;
  screenPosRef?: React.RefObject<{ x: number; y: number }>;
  smileRef?: React.RefObject<boolean>;
}

export default function FloatingScene({
  theme: _theme,
  isMobile,
  mouseNDC,
  pointerActive,
  screenPosRef,
  smileRef,
}: FloatingSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftSquintRef = useRef<THREE.Group>(null);
  const rightSquintRef = useRef<THREE.Group>(null);
  const leftSmileRef = useRef<THREE.Mesh>(null);
  const rightSmileRef = useRef<THREE.Mesh>(null);
  const nextBlink = useRef(2 + Math.random() * 3);
  const blinkPhase = useRef(-1); // -1 = idle, 0~1 = blinking
  const hitTime = useRef(-1); // 충돌 시점 (초)
  const { camera, size } = useThree();

  const vel = useRef<THREE.Vector2 | null>(null);
  const pos = useRef(new THREE.Vector2(0, 0));
  const spinVel = useRef(new THREE.Vector3(0, 0, 0));
  const spinOffset = useRef(new THREE.Euler(0, 0, 0));
  const wasInside = useRef(false);
  const _mouseVec = useMemo(() => new THREE.Vector3(), []);
  const _camPos = useMemo(() => new THREE.Vector3(), []);

  // ── 충돌 사운드 (yo.mp3) ──
  const audioCtx = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);

  const playBoing = () => {
    if (!siteConfig.profile.bunnyCollisionSound) return;
    if (useSoundStore.getState().isMuted) return;
    // AudioContext는 사용자 제스처(클릭/터치) 이후에만 생성 가능
    if (!navigator.userActivation?.hasBeenActive) return;

    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
      fetch("/sounds/yo.mp3")
        .then((res) => res.arrayBuffer())
        .then((data) => audioCtx.current!.decodeAudioData(data))
        .then((buf) => { audioBuffer.current = buf; });
    }
    const ctx = audioCtx.current;
    if (ctx.state === "suspended") ctx.resume();
    if (!audioBuffer.current) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = audioBuffer.current;
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  };

  const scale = isMobile ? 0.8 : 1.2;
  const mobileYBias = isMobile ? 1.8 : 0;
  const introProgress = useRef(0);
  const INTRO_DUR = 0.8;

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const z = BUNNY.z;

    /* ── Intro pop animation (center → elastic pop) ── */
    if (introProgress.current < 1) {
      introProgress.current = Math.min(1, introProgress.current + dt / INTRO_DUR);
      const ip = introProgress.current;
      // Elastic ease-out (0 → overshoot → 1)
      const c4 = (2 * Math.PI) / 3;
      const elastic =
        ip === 0
          ? 0
          : ip >= 1
            ? 1
            : Math.pow(2, -10 * ip) * Math.sin((ip * 10 - 0.75) * c4) + 1;
      groupRef.current.position.set(0, mobileYBias, z);
      groupRef.current.scale.setScalar(scale * elastic);
      groupRef.current.rotation.set(0, elastic * Math.PI * 2, 0);
      return;
    }

    if (!vel.current) {
      const angle = Math.random() * Math.PI * 2;
      vel.current = new THREE.Vector2(
        Math.cos(angle) * BUNNY.speed,
        Math.sin(angle) * BUNNY.speed,
      );
      pos.current.y = mobileYBias;
    }
    const v = vel.current;
    const p = pos.current;

    const cam = camera as THREE.PerspectiveCamera;
    const distFromCam = Math.abs(z - cam.position.z);
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * distFromCam;
    const halfW = halfH * cam.aspect;
    const m = BUNNY.margin;

    // Friction — gradually slow down in zero-gravity
    v.x *= BUNNY.friction;
    v.y *= BUNNY.friction;

    p.x += v.x * dt;
    p.y += v.y * dt;

    const sv = spinVel.current;

    if (p.x < -halfW + m) {
      p.x = -halfW + m;
      v.x = Math.abs(v.x) * BUNNY.wallRestitution;
      sv.set(sv.x, sv.y + v.x * 3, sv.z - v.y * 2);
    } else if (p.x > halfW - m) {
      p.x = halfW - m;
      v.x = -Math.abs(v.x) * BUNNY.wallRestitution;
      sv.set(sv.x, sv.y + v.x * 3, sv.z - v.y * 2);
    }

    const bottomWall = isMobile ? -halfH * 0.2 + m : -halfH + m;
    if (p.y < bottomWall) {
      p.y = bottomWall;
      v.y = Math.abs(v.y) * BUNNY.wallRestitution;
      sv.set(sv.x - v.y * 3, sv.y, sv.z + v.x * 2);
    } else if (p.y > halfH - m) {
      p.y = halfH - m;
      v.y = -Math.abs(v.y) * BUNNY.wallRestitution;
      sv.set(sv.x - v.y * 3, sv.y, sv.z + v.x * 2);
    }

    const isActive = isMobile ? pointerActive.current : true;

    _mouseVec
      .set(mouseNDC.current.x, mouseNDC.current.y, 0.5)
      .unproject(camera);
    _camPos.copy(camera.position);
    const dir = _mouseVec.sub(_camPos).normalize();
    const distToPlane = (z - camera.position.z) / dir.z;
    const mwx = camera.position.x + dir.x * distToPlane;
    const mwy = camera.position.y + dir.y * distToPlane;

    const dx = p.x - mwx;
    const dy = p.y - mwy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const inside = isActive && dist < BUNNY.hitRadius;

    if (inside && !wasInside.current && dist > 0.01) {
      const nx = dx / dist;
      const ny = dy / dist;
      v.x = nx * BUNNY.impulse;
      v.y = ny * BUNNY.impulse;
      sv.set(-ny * 6, nx * 6, (nx - ny) * 3);
      hitTime.current = t;
      playBoing();
    }
    wasInside.current = inside;

    const so = spinOffset.current;
    sv.multiplyScalar(0.993);
    so.x += sv.x * dt;
    so.y += sv.y * dt;
    so.z += sv.z * dt;

    const rx = t * BUNNY.baseRotation.x + so.x;
    const ry = t * BUNNY.baseRotation.y + so.y;
    const rz = t * BUNNY.baseRotation.z + so.z;

    // Zero-gravity bobbing
    const bobY = Math.sin(t * BUNNY.bob.freq * Math.PI * 2) * BUNNY.bob.amp;
    const bobX = Math.cos(t * BUNNY.bob.freq * 0.7 * Math.PI * 2) * BUNNY.bob.amp * 0.5;

    groupRef.current.position.set(p.x + bobX, p.y + bobY, z);
    groupRef.current.rotation.set(rx, ry, rz);
    groupRef.current.scale.setScalar(scale);

    // ── Expressions ──
    const HIT_EXPR_DUR = 0.8;
    const isHitExpr = hitTime.current > 0 && (t - hitTime.current) < HIT_EXPR_DUR;
    const isSmile = !isHitExpr && !!smileRef?.current;

    // normal eyes: visible only when no special expression
    if (leftEyeRef.current) leftEyeRef.current.visible = !isHitExpr && !isSmile;
    if (rightEyeRef.current) rightEyeRef.current.visible = !isHitExpr && !isSmile;
    // hit >< eyes
    if (leftSquintRef.current) leftSquintRef.current.visible = isHitExpr;
    if (rightSquintRef.current) rightSquintRef.current.visible = isHitExpr;
    // smile ^^ eyes
    if (leftSmileRef.current) leftSmileRef.current.visible = isSmile;
    if (rightSmileRef.current) rightSmileRef.current.visible = isSmile;

    // ── Eye blink (특수 표정 중에는 스킵) ──
    if (!isHitExpr && !isSmile) {
      const BLINK_DUR = 0.15;
      if (blinkPhase.current < 0) {
        if (t > nextBlink.current) {
          blinkPhase.current = 0;
        }
      }
      let eyeScaleY = 1.3;
      if (blinkPhase.current >= 0) {
        blinkPhase.current += dt / BLINK_DUR;
        if (blinkPhase.current >= 1) {
          blinkPhase.current = -1;
          nextBlink.current = t + 2 + Math.random() * 4;
        } else {
          const p2 = blinkPhase.current < 0.5
            ? blinkPhase.current / 0.5
            : 1 - (blinkPhase.current - 0.5) / 0.5;
          eyeScaleY = 1.3 * (1 - p2 * 0.92);
        }
      }
      if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
      if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;
    }

    // 3D → screen projection for speech bubble
    if (screenPosRef?.current) {
      const projected = groupRef.current.position.clone().project(camera);
      screenPosRef.current.x = ((projected.x + 1) / 2) * size.width;
      screenPosRef.current.y = (-(projected.y - 1) / 2) * size.height;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} />
      <directionalLight position={[-2, -1, 3]} intensity={0.3} />
      <hemisphereLight args={["#ffeedd", "#b0a8c0", 0.4]} />

      <group ref={groupRef}>
        {/* ── Body (pear shape) ── */}
        <mesh position={[0, -0.15, 0]} scale={[0.75, 0.78, 0.7]}>
          <latheGeometry args={[BODY_PROFILE, 24]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Head ── */}
        <mesh position={[0, 0.42, 0.06]} scale={[1.15, 1, 0.95]}>
          <sphereGeometry args={[0.48, 24, 18]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Left Ear ── */}
        <mesh
          position={[-0.2, 0.82, -0.04]}
          rotation={[0.12, 0, 0.18]}
          scale={[1.3, 1.3, 1]}
        >
          <latheGeometry args={[EAR_PROFILE, 16]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Right Ear ── */}
        <mesh
          position={[0.2, 0.82, -0.04]}
          rotation={[0.12, 0, -0.18]}
          scale={[1.3, 1.3, 1]}
        >
          <latheGeometry args={[EAR_PROFILE, 16]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Left Eye (normal) ── */}
        <mesh
          ref={leftEyeRef}
          position={[-0.2, 0.46, 0.48]}
          rotation={[-0.08, -0.31, 0]}
          scale={[1, 1.3, 0.15]}
        >
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* ── Right Eye (normal) ── */}
        <mesh
          ref={rightEyeRef}
          position={[0.2, 0.46, 0.48]}
          rotation={[-0.08, 0.31, 0]}
          scale={[1, 1.3, 0.15]}
        >
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* ── Left Squint Eye > (충돌 시) ── */}
        <group
          ref={leftSquintRef}
          position={[-0.2, 0.46, 0.49]}
          rotation={[-0.08, -0.31, 0]}
          visible={false}
        >
          <mesh position={[-0.015, 0.04, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.16, 0.025, 0.025]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.015, -0.04, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.16, 0.025, 0.025]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Right Squint Eye < (충돌 시) ── */}
        <group
          ref={rightSquintRef}
          position={[0.2, 0.46, 0.49]}
          rotation={[-0.08, 0.31, 0]}
          visible={false}
        >
          <mesh position={[0.015, 0.04, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.16, 0.025, 0.025]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.015, -0.04, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.16, 0.025, 0.025]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Left Smile Eye ^ (말풍선 전환 시) ── */}
        <mesh
          ref={leftSmileRef}
          position={[-0.2, 0.46, 0.49]}
          rotation={[-0.08, -0.31, 0]}
          visible={false}
        >
          <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* ── Right Smile Eye ^ (말풍선 전환 시) ── */}
        <mesh
          ref={rightSmileRef}
          position={[0.2, 0.46, 0.49]}
          rotation={[-0.08, 0.31, 0]}
          visible={false}
        >
          <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* ── Tail ── */}
        <mesh position={[0, -0.25, -0.38]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Left Arm+Hand ── */}
        <mesh
          position={[-0.3, -0.1, 0]}
          rotation={[0, 0, 2]}
          scale={[1, 1.6, 1]}
        >
          <latheGeometry args={[ARM_PROFILE, 16]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Right Arm+Hand ── */}
        <mesh
          position={[0.3, -0.1, 0]}
          rotation={[0, 0, -2]}
          scale={[1, 1.6, 1]}
        >
          <latheGeometry args={[ARM_PROFILE, 16]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Left Leg ── */}
        <mesh
          position={[-0.15, -0.35, 0.25]}
          rotation={[1.4, 0, 0.1]}
          scale={[0.7, 1.8, 0.7]}
        >
          <latheGeometry args={[FOOT_PROFILE, 16]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>

        {/* ── Right Leg ── */}
        <mesh
          position={[0.15, -0.35, 0.25]}
          rotation={[1.4, 0, -0.1]}
          scale={[0.7, 1.8, 0.7]}
        >
          <latheGeometry args={[FOOT_PROFILE, 16]} />
          <meshStandardMaterial
            color={BODY_COLOR}
            emissive={BODY_EMISSIVE}
            emissiveIntensity={0.05}
            metalness={0}
            roughness={0.92}
          />
        </mesh>
      </group>
    </>
  );
}
