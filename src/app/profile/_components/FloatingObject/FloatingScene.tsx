"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useSoundStore } from "@/stores/soundStore";
import { useProfileSectionStore } from "@/stores/profileSectionStore";

/** 도킹은 시작과 끝이 부드러워야 "날아가서 앉는다" 로 읽힌다. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
import {
  BUNNY,
  BODY_PROFILE,
  EAR_PROFILE,
  ARM_PROFILE,
  FOOT_PROFILE,
  BODY_COLOR,
  BODY_EMISSIVE,
  EYE_COLOR,
} from "./bunnyGeometry";

/* ── Component ── */

interface FloatingSceneProps {
  theme: "dark" | "light";
  isMobile: boolean;
  mouseNDC: React.RefObject<{ x: number; y: number }>;
  pointerActive: React.RefObject<boolean>;
  screenPosRef?: React.RefObject<{ x: number; y: number }>;
  smileRef?: React.RefObject<boolean>;
  scrollVelRef?: React.RefObject<number>;
}

export default function FloatingScene({
  theme: _theme,
  isMobile,
  mouseNDC,
  pointerActive,
  screenPosRef,
  smileRef,
  scrollVelRef,
}: FloatingSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftSquintRef = useRef<THREE.Group>(null);
  const rightSquintRef = useRef<THREE.Group>(null);
  const leftSmileRef = useRef<THREE.Group>(null);
  const rightSmileRef = useRef<THREE.Group>(null);
  const nextBlink = useRef(2 + Math.random() * 3);
  const blinkPhase = useRef(-1); // -1 = idle, 0~1 = blinking
  const hitTime = useRef(-1); // 충돌 시점 (초)
  const { camera, size } = useThree();
  const cfg = useSiteConfig();

  const vel = useRef<THREE.Vector2 | null>(null);
  const pos = useRef(new THREE.Vector2(0, 0));
  const spinVel = useRef(new THREE.Vector3(0, 0, 0));
  const spinOffset = useRef(new THREE.Euler(0, 0, 0));
  const wasInside = useRef(false);
  /* 자리에 내려앉은 정도 0~1. 0=자유롭게 떠다님, 1=완전히 앉음. 튀지 않게 서서히 오간다. */
  const dockBlend = useRef(0);
  const dockTarget = useRef(new THREE.Vector2(0, 0));
  const dockScale = useRef(1);
  const _mouseVec = useMemo(() => new THREE.Vector3(), []);
  const _camPos = useMemo(() => new THREE.Vector3(), []);

  // ── 충돌 사운드 (yo.mp3) ──
  const audioCtx = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);

  const playBoing = () => {
    if (!cfg.profile.bunnyCollisionSound) return;
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

  const scale = isMobile
    ? size.width <= 480
      ? (size.width / 480) * 0.8
      : 0.8
    : 1.2;
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

    /* ── MEET 패널의 자리로 내려앉기 ──
       패널이 가로로 계속 움직이므로 매 프레임 지금 자리를 다시 읽는다. 무한 스크롤에서는
       같은 패널이 여러 벌 그려지니 화면 가운데에 가장 가까운 것을 고른다. */
    const slots = useProfileSectionStore.getState().bunnyDockSlots;
    let dockRect: DOMRect | null = null;
    if (slots.size > 0) {
      const vw = window.innerWidth;
      const cx = vw / 2;
      let best = Infinity;
      for (const el of slots) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right < 0 || r.left > vw) continue;
        const d = Math.abs(r.left + r.width / 2 - cx);
        if (d < best) {
          best = d;
          dockRect = r;
        }
      }
      /* 앉고 떠나는 기준을 다르게 둔다(히스테리시스).
         앉을 때는 자리가 화면 안에 온전히 들어와야 하고, 한 번 앉은 뒤에는 자리의 한가운데가
         화면을 벗어날 때까지 붙어 있는다. 기준이 하나면 그 선 위에서 붙었다 떨어졌다 한다.

         화면 가운데와의 거리로 판정하면 안 된다 — 자리는 패널 왼쪽에 치우쳐 있어서
         패널이 정중앙일 때도 이미 수백 px 떨어져 있다. 조금만 움직여도 곧바로 풀린다. */
      if (dockRect) {
        const center = dockRect.left + dockRect.width / 2;
        const settled = dockBlend.current > 0;
        const keep = settled
          ? center > 0 && center < vw
          : dockRect.left >= -8 && dockRect.right <= vw + 8;
        if (!keep) dockRect = null;
      }
    }
    /* 오갈 때 1초 남짓 걸리게 — 그래야 "날아가서 앉는다" 로 읽힌다. */
    dockBlend.current = THREE.MathUtils.clamp(
      dockBlend.current + (dockRect ? dt : -dt) / 0.9,
      0,
      1,
    );
    const docked = dockBlend.current > 0.001;

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

    // Scroll velocity → bunny에 힘 적용 (스크롤 방향 반대로 밀림)
    if (scrollVelRef?.current) {
      const scrollForce = scrollVelRef.current * 0.008;
      v.y -= scrollForce * dt;
    }

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

    let outX = p.x + bobX;
    let outY = p.y + bobY;
    let outScale = scale;
    let outRx = rx;
    let outRy = ry;
    let outRz = rz;

    /* 끌어서 돌린 각도 — 손을 떼면 여세로 조금 더 돌다가 멈춘다. */
    const drag = useProfileSectionStore.getState().bunnyDrag;
    if (!drag.dragging) {
      drag.y += drag.vy;
      drag.x = THREE.MathUtils.clamp(drag.x + drag.vx, -1.2, 1.2);
      drag.vx *= 0.92;
      drag.vy *= 0.92;
      if (Math.abs(drag.vx) < 1e-4) drag.vx = 0;
      if (Math.abs(drag.vy) < 1e-4) drag.vy = 0;
    }

    if (docked) {
      const k = easeInOutCubic(dockBlend.current);

      if (dockRect) {
        /* 화면 좌표(px) → 몽이가 사는 평면(z)의 월드 좌표. 그 평면의 세로 길이를 알면
           px 와 월드 단위의 비율이 나오고, 자리 상자의 크기를 몽이 크기로 바꿀 수 있다. */
        const planeH = halfH * 2;
        const worldPerPx = planeH / window.innerHeight;
        const targetX = (dockRect.left + dockRect.width / 2 - window.innerWidth / 2) * worldPerPx;
        const targetY = -(dockRect.top + dockRect.height / 2 - window.innerHeight / 2) * worldPerPx;
        dockTarget.current.set(targetX, targetY);
        /* 모델은 대략 2 단위 높이다. 자리 상자 안에 여유를 두고 담기게 0.72 만 쓴다. */
        dockScale.current = (dockRect.height * worldPerPx * 0.72) / 2;
      }

      outX = THREE.MathUtils.lerp(outX, dockTarget.current.x, k);
      outY = THREE.MathUtils.lerp(outY, dockTarget.current.y + bobY * 0.35, k);
      outScale = THREE.MathUtils.lerp(scale, dockScale.current, k);
      /* 앉으면 정면을 본다 — 자기소개 옆에서 빙글빙글 돌면 읽기 힘들다.
         고개만 아주 조금 갸웃하고, 끌어서 돌린 만큼을 거기에 더한다.
         끄는 동안에는 갸웃거림을 죽인다 — 손으로 잡은 것이 스스로 움직이면 어긋나 보인다. */
      const idle = drag.dragging ? 0 : 1;
      outRx = THREE.MathUtils.lerp(rx, Math.sin(t * 0.6) * 0.05 * idle + drag.x, k);
      outRy = THREE.MathUtils.lerp(ry, Math.sin(t * 0.45) * 0.12 * idle + drag.y, k);
      outRz = THREE.MathUtils.lerp(rz, Math.sin(t * 0.5) * 0.04 * idle, k);

      /* 앉아 있는 동안에는 속도를 죽여 둔다 — 안 그러면 떠날 때 튕겨 나간다.
         자리를 뜨면 그 지점에서 다시 떠다니게 위치도 맞춰 둔다. */
      v.x *= 1 - k;
      v.y *= 1 - k;
      p.x = THREE.MathUtils.lerp(p.x, dockTarget.current.x, k * 0.15);
      p.y = THREE.MathUtils.lerp(p.y, dockTarget.current.y, k * 0.15);
    } else if (drag.x !== 0 || drag.y !== 0) {
      /* 패널을 벗어나면 돌려 둔 각도를 놓아준다 — 다음에 다시 앉을 때 정면에서 시작한다. */
      drag.x *= 0.94;
      drag.y *= 0.94;
      if (Math.abs(drag.x) < 1e-3) drag.x = 0;
      if (Math.abs(drag.y) < 1e-3) drag.y = 0;
    }

    groupRef.current.position.set(outX, outY, z);
    groupRef.current.rotation.set(outRx, outRy, outRz);
    groupRef.current.scale.setScalar(outScale);

    // ── Idle animations (breathing, ear wiggle, arm/leg sway, tail wag) ──
    // Breathing — subtle body scale pulse
    if (bodyRef.current) {
      const breath = 1 + Math.sin(t * 1.8) * 0.02;
      bodyRef.current.scale.set(0.75 * breath, 0.78 * breath, 0.7 * breath);
    }

    // Ear wiggle — independent sine waves per ear
    if (leftEarRef.current) {
      leftEarRef.current.rotation.set(
        0.12 + Math.sin(t * 2.3) * 0.08,
        Math.sin(t * 1.7) * 0.05,
        0.18 + Math.sin(t * 3.1) * 0.06,
      );
    }
    if (rightEarRef.current) {
      rightEarRef.current.rotation.set(
        0.12 + Math.sin(t * 2.3 + 0.5) * 0.08,
        Math.sin(t * 1.7 + 0.5) * -0.05,
        -0.18 + Math.sin(t * 3.1 + 1) * -0.06,
      );
    }

    // Arm sway — gentle pendulum
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(
        Math.sin(t * 1.5) * 0.12,
        0,
        2 + Math.sin(t * 1.2) * 0.15,
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(
        Math.sin(t * 1.5 + Math.PI) * 0.12,
        0,
        -2 + Math.sin(t * 1.2 + Math.PI) * -0.15,
      );
    }

    // Leg sway — slight kick
    if (leftLegRef.current) {
      leftLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.0) * 0.08,
        0,
        0.1 + Math.sin(t * 0.8) * 0.04,
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.0 + Math.PI) * 0.08,
        0,
        -0.1 + Math.sin(t * 0.8 + Math.PI) * -0.04,
      );
    }

    // Tail wag
    if (tailRef.current) {
      tailRef.current.position.set(
        Math.sin(t * 4) * 0.03,
        -0.25,
        -0.38,
      );
      tailRef.current.scale.set(
        1 + Math.sin(t * 3) * 0.1,
        1 + Math.cos(t * 3) * 0.1,
        1,
      );
    }

    // ── Expressions ──
    const storeExpr = useProfileSectionStore.getState().bunnyExpression;
    let showNormal: boolean;
    let showSquint: boolean;
    let showSmile: boolean;

    if (storeExpr) {
      showNormal = storeExpr === "normal";
      showSquint = storeExpr === "surprised";
      showSmile = storeExpr === "happy";
    } else {
      const HIT_EXPR_DUR = 0.8;
      const isHitExpr = hitTime.current > 0 && (t - hitTime.current) < HIT_EXPR_DUR;
      const isSmile = !isHitExpr && !!smileRef?.current;
      showNormal = !isHitExpr && !isSmile;
      showSquint = isHitExpr;
      showSmile = isSmile;
    }

    // normal eyes
    if (leftEyeRef.current) leftEyeRef.current.visible = showNormal;
    if (rightEyeRef.current) rightEyeRef.current.visible = showNormal;
    // hit >< eyes
    if (leftSquintRef.current) leftSquintRef.current.visible = showSquint;
    if (rightSquintRef.current) rightSquintRef.current.visible = showSquint;
    // smile ^^ eyes
    if (leftSmileRef.current) leftSmileRef.current.visible = showSmile;
    if (rightSmileRef.current) rightSmileRef.current.visible = showSmile;

    // ── Eye blink (특수 표정 중에는 스킵) ──
    if (showNormal) {
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
        <mesh ref={bodyRef} position={[0, -0.15, 0]} scale={[0.75, 0.78, 0.7]}>
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
          ref={leftEarRef}
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
          ref={rightEarRef}
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

        {/* ── Left Squint Eye > (꼭짓점 오른쪽 만남) ── */}
        <group
          ref={leftSquintRef}
          position={[-0.14, 0.46, 0.49]}
          rotation={[-0.08, -0.2, 0]}
          visible={false}
        >
          <mesh position={[-0.088, 0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.088, -0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Right Squint Eye < (꼭짓점 왼쪽 만남) ── */}
        <group
          ref={rightSquintRef}
          position={[0.14, 0.46, 0.49]}
          rotation={[-0.08, 0.2, 0]}
          visible={false}
        >
          <mesh position={[0.088, 0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.088, -0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Left Smile Eye ^ (말풍선 전환 시) ── */}
        <group
          ref={leftSmileRef}
          position={[-0.2, 0.46, 0.49]}
          rotation={[-0.08, -0.31, 0]}
          visible={false}
        >
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

        {/* ── Right Smile Eye ^ (말풍선 전환 시) ── */}
        <group
          ref={rightSmileRef}
          position={[0.2, 0.46, 0.49]}
          rotation={[-0.08, 0.31, 0]}
          visible={false}
        >
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

        {/* ── Tail ── */}
        <mesh ref={tailRef} position={[0, -0.25, -0.38]}>
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
          ref={leftArmRef}
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
          ref={rightArmRef}
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
          ref={leftLegRef}
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
          ref={rightLegRef}
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
