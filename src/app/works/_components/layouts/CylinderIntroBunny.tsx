"use client";

import { useRef } from "react";
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
} from "@/app/profile/_components/FloatingObject/bunnyGeometry";

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
const BUNNY_WALL_BOUNCE = 0.9;
const BUNNY_FRICTION = 0.998;
const BUNNY_MARGIN = 0.8;

interface Props {
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
  arc: number;
  actualRotRef: React.MutableRefObject<number>;
}

export default function CylinderIntroBunny({ screenPosRef, arc, actualRotRef }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);
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
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={0.7} />

      {/* Body */}
      <mesh ref={bodyRef} position={[0, -0.15, 0]} scale={[0.75, 0.78, 0.7]}>
        <latheGeometry args={[BODY_PROFILE, 24]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.42, 0.06]} scale={[1.15, 1, 0.95]}>
        <sphereGeometry args={[0.48, 24, 18]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>

      {/* Helmet */}
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

      {/* Ears */}
      <mesh ref={leftEarRef} position={[-0.2, 0.82, -0.04]} rotation={[0.12, 0, 0.18]} scale={[1.3, 1.3, 1]}>
        <latheGeometry args={[EAR_PROFILE, 16]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>
      <mesh ref={rightEarRef} position={[0.2, 0.82, -0.04]} rotation={[0.12, 0, -0.18]} scale={[1.3, 1.3, 1]}>
        <latheGeometry args={[EAR_PROFILE, 16]} />
        <meshStandardMaterial {...BUNNY_MAT} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.2, 0.46, 0.48]} rotation={[-0.08, -0.31, 0]} scale={[1, 1.3, 0.15]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color={EYE_COLOR} />
      </mesh>
      <mesh position={[0.2, 0.46, 0.48]} rotation={[-0.08, 0.31, 0]} scale={[1, 1.3, 0.15]}>
        <sphereGeometry args={[0.12, 16, 12]} />
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
