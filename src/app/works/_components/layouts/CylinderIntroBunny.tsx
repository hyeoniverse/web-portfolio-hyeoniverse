"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BODY_PROFILE,
  EAR_PROFILE,
  ARM_PROFILE,
  FOOT_PROFILE,
  BODY_COLOR,
  BODY_EMISSIVE,
  EYE_COLOR,
  EYE_LOCAL,
  BARE_RIN,
  BARE_ROUT,
  BARE_YW,
} from "@/app/profile/_components/FloatingObject/bunnyGeometry";
import BunnyFur from "@/app/profile/_components/FloatingObject/BunnyFur";

const RADIUS = 35;
const PLANE_WIDTH = 46;
const BACK_THRESHOLD = Math.PI * 0.55;

const BUNNY_MAT = {
  color: BODY_COLOR,
  emissive: BODY_EMISSIVE,
  emissiveIntensity: 0.05,
  metalness: 0,
  roughness: 0.92,
};

const BUNNY_Z = 3;
const BUNNY_SCALE = 0.55;
const BUNNY_SPEED = 1.8;
/* 원통 인트로의 몽이는 프로필의 것보다 작게 보이고 헬멧에 반쯤 가린다.
   껍질 하나가 부위를 통째로 다시 그리므로 겹 수는 프로필(6)보다 적게 잡는다. */
const FUR_SHELLS = 4;
const BUNNY_WALL_BOUNCE = 0.9;
const BUNNY_FRICTION = 0.998;
const BUNNY_MARGIN = 0.8;

/* 꽃잎 다섯 장이 앉는 각도 — 위에서 시작해 한 바퀴 */
const PETAL_ANGLES = Array.from({ length: 5 }, (_, i) => (i / 5) * Math.PI * 2 + Math.PI / 2);

interface Props {
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
  arc: number;
  actualRotRef: React.MutableRefObject<number>;
  /** 어두운 테마인가 — 밝은 쪽에서는 어항(헬멧) 대신 머리에 꽃을 얹는다(#1062).
      판도 화면도 봄날인데 우주복만 남으면 혼자 다른 이야기를 한다 */
  isDark?: boolean;
}

export default function CylinderIntroBunny({ screenPosRef, arc, actualRotRef, isDark = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  /* 털은 살과 **같은** 도형을 써야 한다. JSX 안에 인라인으로 두면 각자 다른 객체가 된다. */
  const bodyGeo = useMemo(() => new THREE.LatheGeometry(BODY_PROFILE, 24), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.48, 24, 18), []);
  const earGeo = useMemo(() => new THREE.LatheGeometry(EAR_PROFILE, 16), []);
  /* 프로필 쪽은 몽이가 작아질 때 털을 더 뽑지만, 여기서는 크기가 고정이라 배수도 고정이다. */
  const furBoost = useRef({ k: 1 });
  /* 눈가에서는 털을 눕힌다. 안 그러면 껍질이 눈 위로 덮여 눈이 얼룩덜룩해진다.
     이 몽이는 표정이 안 바뀌므로 값이 고정이지만, 자리는 프로필과 같은 것을 본다. */
  const furBare = useRef({
    x: EYE_LOCAL[0], y: EYE_LOCAL[1], z: EYE_LOCAL[2],
    rIn: BARE_RIN, rOut: BARE_ROUT, yw: BARE_YW,
  });

  const bodyRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Group>(null);
  const rightEarRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const pos = useRef(new THREE.Vector2(0.5, -0.3));
  const vel = useRef<THREE.Vector2 | null>(null);
  const spinVel = useRef(new THREE.Vector3(0, 0, 0));
  const spinOffset = useRef(new THREE.Euler(0, 0, 0));

  useFrame(({ clock, camera, size }, delta) => {
    if (!groupRef.current) return;

    // Visibility: hide when slot 0 rotates behind
    const cylinderRotX = actualRotRef.current;
    let relAngle = cylinderRotX - Math.PI;
    relAngle = ((relAngle % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const isVisible = Math.abs(relAngle) < BACK_THRESHOLD;
    groupRef.current.visible = isVisible;
    if (!isVisible) return;

    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();

    // Slot 0 screen position → world offset at BUNNY_Z
    const slot0 = screenPosRef.current[0] || { x: 0, y: 0 };
    const cam = camera as THREE.PerspectiveCamera;
    const bunnyDist = Math.abs(BUNNY_Z - cam.position.z);
    const bHalfH = Math.tan((cam.fov * Math.PI) / 360) * bunnyDist;
    const bHalfW = bHalfH * cam.aspect;
    const centerX = (slot0.x / (size.width * 0.5)) * bHalfW;
    const centerY = -(slot0.y / (size.height * 0.5)) * bHalfH;

    // Slot projected bounds at BUNNY_Z depth
    const panelDist = cam.position.z + RADIUS;
    const ratio = bunnyDist / panelDist;
    const slotHalfW = (PLANE_WIDTH / 2) * ratio - BUNNY_MARGIN;
    const slotHalfH = ((arc * RADIUS) / 2) * ratio - BUNNY_MARGIN;

    if (!vel.current) {
      const angle = Math.random() * Math.PI * 2;
      vel.current = new THREE.Vector2(
        Math.cos(angle) * BUNNY_SPEED,
        Math.sin(angle) * BUNNY_SPEED,
      );
    }
    const v = vel.current;
    const p = pos.current;
    const sv = spinVel.current;
    const so = spinOffset.current;

    v.x *= BUNNY_FRICTION;
    v.y *= BUNNY_FRICTION;

    if (v.length() < 0.4) {
      const kickAngle = Math.random() * Math.PI * 2;
      v.x += Math.cos(kickAngle) * 0.8;
      v.y += Math.sin(kickAngle) * 0.8;
    }

    p.x += v.x * dt;
    p.y += v.y * dt;

    // Wall bounce
    if (p.x < -slotHalfW) {
      p.x = -slotHalfW;
      v.x = Math.abs(v.x) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x, sv.y + v.x * 4, sv.z - v.y * 3);
    } else if (p.x > slotHalfW) {
      p.x = slotHalfW;
      v.x = -Math.abs(v.x) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x, sv.y + v.x * 4, sv.z - v.y * 3);
    }
    if (p.y < -slotHalfH) {
      p.y = -slotHalfH;
      v.y = Math.abs(v.y) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x - v.y * 4, sv.y, sv.z + v.x * 3);
    } else if (p.y > slotHalfH) {
      p.y = slotHalfH;
      v.y = -Math.abs(v.y) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x - v.y * 4, sv.y, sv.z + v.x * 3);
    }

    sv.multiplyScalar(0.99);
    so.x += sv.x * dt;
    so.y += sv.y * dt;
    so.z += sv.z * dt;

    const bobY = Math.sin(t * 1.2) * 0.1;
    const bobX = Math.cos(t * 0.9) * 0.06;

    groupRef.current.position.set(
      centerX + p.x + bobX,
      centerY + p.y + bobY,
      BUNNY_Z,
    );

    groupRef.current.rotation.set(
      0.08 * Math.sin(t * 0.5) + so.x,
      t * 0.25 + so.y,
      0.06 * Math.sin(t * 0.4) + so.z,
    );
    groupRef.current.scale.setScalar(BUNNY_SCALE);

    if (bodyRef.current) {
      const breath = 1 + Math.sin(t * 1.8) * 0.025;
      bodyRef.current.scale.set(0.75 * breath, 0.78 * breath, 0.7 * breath);
    }

    if (leftEarRef.current) {
      leftEarRef.current.rotation.set(
        0.12 + Math.sin(t * 3.0) * 0.12,
        Math.sin(t * 2.2) * 0.08,
        0.18 + Math.sin(t * 4.0) * 0.1,
      );
    }
    if (rightEarRef.current) {
      rightEarRef.current.rotation.set(
        0.12 + Math.sin(t * 3.0 + 0.5) * 0.12,
        Math.sin(t * 2.2 + 0.5) * -0.08,
        -0.18 + Math.sin(t * 4.0 + 1) * -0.1,
      );
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(
        Math.sin(t * 2.5) * 0.2, 0, 2 + Math.sin(t * 2.0) * 0.25,
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(
        Math.sin(t * 2.5 + Math.PI) * 0.2, 0, -2 + Math.sin(t * 2.0 + Math.PI) * -0.25,
      );
    }

    if (leftLegRef.current) {
      leftLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.8) * 0.12, 0, 0.1 + Math.sin(t * 1.4) * 0.06,
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.8 + Math.PI) * 0.12, 0, -0.1 + Math.sin(t * 1.4 + Math.PI) * -0.06,
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* 프로필의 몽이와 같은 조명 구성 — 한 방향에서만 비추면 털이 눌려 보인다 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} />
      <directionalLight position={[-2, -1, 3]} intensity={0.3} />
      <hemisphereLight args={["#ffeedd", "#b0a8c0", 0.4]} />

      {/* Body */}
      <group ref={bodyRef} position={[0, -0.15, 0]} scale={[0.75, 0.78, 0.7]}>
        <mesh geometry={bodyGeo}>
          <meshStandardMaterial {...BUNNY_MAT} />
        </mesh>
        <BunnyFur geometry={bodyGeo} length={0.07} repeat={2.2} shells={FUR_SHELLS} boost={furBoost} />
      </group>

      {/* Head */}
      <group position={[0, 0.42, 0.06]} scale={[1.15, 1, 0.95]}>
        <mesh geometry={headGeo}>
          <meshStandardMaterial {...BUNNY_MAT} />
        </mesh>
        <BunnyFur
          geometry={headGeo}
          length={0.055}
          repeat={1.8}
          shells={FUR_SHELLS}
          boost={furBoost}
          bare={furBare}
        />
      </group>

      {/* 어두운 테마 — 우주로 나가는 어항(헬멧). 밝은 테마에서는 씌우지 않는다 */}
      {isDark && (
        <mesh position={[0, 0.46, 0.02]} scale={[1.5, 1.35, 1.35]} renderOrder={999}>
          <sphereGeometry args={[0.48, 24, 18]} />
          <meshStandardMaterial
            color="#ddeeff"
            emissive="#aaccff"
            emissiveIntensity={0.08}
            metalness={0.0}
            roughness={0.02}
            transparent
            opacity={0.3}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 밝은 테마 — 귀 사이 정수리에 꽃 한 송이. 꽃잎 다섯 장을 둘러 눕히고 가운데에 수술을 둔다.
          판·배경과 같은 분홍·살구색이라 셋이 한 이야기로 읽힌다.

          자리는 머리(중심 [0, 0.42, 0.06], 반지름 [0.552, 0.48, 0.456] 인 타원체)의 표면 위다.
          옆에 붙이면 몽이가 떠다니며 도는 동안 머리 뒤로 숨어 반쯤만 보인다. 귀 둘(x ±0.2, y 0.82)
          사이 앞쪽으로 올려 어느 쪽에서 봐도 꽃이 먼저 보이게 한다.
          기울기는 표면 법선(위로 0.86, 앞으로 0.51)에 맞춰 머리에 눕힌 각도다 */}
      {!isDark && (
        <group position={[0, 0.88, 0.3]} rotation={[-1.03, 0, 0.22]} scale={0.3}>
          {PETAL_ANGLES.map((angle, i) => (
            <mesh key={i} position={[Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0]} rotation={[0, 0, angle]}>
              <sphereGeometry args={[0.26, 16, 12]} />
              <meshStandardMaterial color={i % 2 === 0 ? "#f7b3c6" : "#f9c7a6"} roughness={0.75} metalness={0} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshStandardMaterial color="#fadf96" emissive="#f6c95e" emissiveIntensity={0.25} roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* Ears */}
      <group ref={leftEarRef} position={[-0.2, 0.82, -0.04]} rotation={[0.12, 0, 0.18]} scale={[1.3, 1.3, 1]}>
        <mesh geometry={earGeo}>
          <meshStandardMaterial {...BUNNY_MAT} />
        </mesh>
        <BunnyFur geometry={earGeo} length={0.042} repeat={1.2} shells={FUR_SHELLS} boost={furBoost} />
      </group>
      <group ref={rightEarRef} position={[0.2, 0.82, -0.04]} rotation={[0.12, 0, -0.18]} scale={[1.3, 1.3, 1]}>
        <mesh geometry={earGeo}>
          <meshStandardMaterial {...BUNNY_MAT} />
        </mesh>
        <BunnyFur geometry={earGeo} length={0.042} repeat={1.2} shells={FUR_SHELLS} boost={furBoost} />
      </group>

      {/* Eyes */}
      {/* 눈 크기·깊이는 profile 몽이와 같은 값을 쓴다(0.13, z 0.49) — bare 구역을 공유하므로
          한쪽만 바꾸면 눈가 털이 어긋난다. */}
      <mesh position={[-0.2, 0.46, 0.49]} rotation={[-0.08, -0.31, 0]} scale={[1, 1.3, 0.15]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color={EYE_COLOR} />
      </mesh>
      <mesh position={[0.2, 0.46, 0.49]} rotation={[-0.08, 0.31, 0]} scale={[1, 1.3, 0.15]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color={EYE_COLOR} />
      </mesh>

      {/* Arms */}
      <mesh ref={leftArmRef} position={[-0.3, -0.1, 0]} rotation={[0, 0, 2]} scale={[1, 1.6, 1]}>
        <latheGeometry args={[ARM_PROFILE, 16]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.3, -0.1, 0]} rotation={[0, 0, -2]} scale={[1, 1.6, 1]}>
        <latheGeometry args={[ARM_PROFILE, 16]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>

      {/* Legs */}
      <mesh ref={leftLegRef} position={[-0.15, -0.35, 0.25]} rotation={[1.4, 0, 0.1]} scale={[0.7, 1.8, 0.7]}>
        <latheGeometry args={[FOOT_PROFILE, 16]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.15, -0.35, 0.25]} rotation={[1.4, 0, -0.1]} scale={[0.7, 1.8, 0.7]}>
        <latheGeometry args={[FOOT_PROFILE, 16]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>

      {/* Tail */}
      <mesh position={[0, -0.25, -0.38]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>
    </group>
  );
}
