"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  TORUS_GEOMETRY,
  TORUS_SCALE,
  TORUS_PATH,
  TORUS_ROTATION,
  TORUS_MATERIAL,
  TORUS_MOBILE,
  TORUS_REPULSION,
  TORUS_ATTRACTION,
} from "@/constants/torus";

interface TorusSceneProps {
  getCumulative: () => number;
  theme: "dark" | "light";
  isMobile: boolean;
  /** 마우스/터치 NDC 좌표 (-1~1) — Canvas pointer-events 차단으로 수동 추적 */
  mouseNDC: React.RefObject<{ x: number; y: number }>;
  /** 터치 활성 상태 (터치 종료 시 false → 반발력 해제) */
  pointerActive: React.RefObject<boolean>;
}

export default function TorusScene({
  getCumulative,
  theme,
  isMobile,
  mouseNDC,
  pointerActive,
}: TorusSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // 반발 오프셋 (매 프레임 lerp로 부드럽게 보간)
  const repulsionRef = useRef(new THREE.Vector2(0, 0));
  // 재활용 벡터 (GC 방지)
  const _mouseVec = useMemo(() => new THREE.Vector3(), []);
  const _camPos = useMemo(() => new THREE.Vector3(), []);

  const geometry = useMemo(() => {
    const radial = isMobile
      ? TORUS_MOBILE.radialSegments
      : TORUS_GEOMETRY.radialSegments;
    const tubular = isMobile
      ? TORUS_MOBILE.tubularSegments
      : TORUS_GEOMETRY.tubularSegments;

    return new THREE.TorusGeometry(
      TORUS_GEOMETRY.radius,
      TORUS_GEOMETRY.tube,
      radial,
      tubular
    );
  }, [isMobile]);

  useEffect(() => {
    return () => { geometry.dispose(); };
  }, [geometry]);

  const matConfig = TORUS_MATERIAL[theme];

  useFrame(() => {
    if (!meshRef.current) return;

    const t = getCumulative();

    // X: 좌우 진동 (연속)
    const xAmp = isMobile
      ? TORUS_PATH.xAmplitude * TORUS_MOBILE.xAmplitudeMultiplier
      : TORUS_PATH.xAmplitude;
    let x = Math.sin(t * TORUS_PATH.xFrequency * Math.PI * 2) * xAmp;

    // Y: 상하 진동 (X와 다른 주파수 → 리사주 곡선)
    let y =
      Math.cos(t * TORUS_PATH.yFrequency * Math.PI * 2) * TORUS_PATH.yAmplitude;

    // Z: 깊이 진동 (연속)
    const z =
      Math.sin(t * TORUS_PATH.zFrequency * Math.PI * 2) *
        TORUS_PATH.zAmplitude -
      2;

    // 커서/터치 자석 + 반발 효과
    {
      const isActive = isMobile ? pointerActive.current : true;

      // 수동 추적된 NDC를 토러스 Z 깊이의 월드 좌표로 변환
      _mouseVec.set(mouseNDC.current.x, mouseNDC.current.y, 0.5).unproject(camera);
      _camPos.copy(camera.position);
      const dir = _mouseVec.sub(_camPos).normalize();
      const distToPlane = (z - camera.position.z) / dir.z;
      const mouseWorldX = camera.position.x + dir.x * distToPlane;
      const mouseWorldY = camera.position.y + dir.y * distToPlane;

      // 토러스와 포인터 간 거리
      const dx = x - mouseWorldX;
      const dy = y - mouseWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetRepX = 0;
      let targetRepY = 0;
      let smoothing: number = TORUS_ATTRACTION.smoothing;

      if (isActive && dist > 0.01) {
        if (dist < TORUS_ATTRACTION.radius) {
          // 자석 존 (가까움): 커서를 따라감 — 가까울수록 강하게
          const force =
            ((1 - dist / TORUS_ATTRACTION.radius) ** 2) * TORUS_ATTRACTION.strength;
          // dx는 토러스→커서 반대 방향이므로 부호 반전하여 끌어당김
          targetRepX = -(dx / dist) * force;
          targetRepY = -(dy / dist) * force;
          smoothing = TORUS_ATTRACTION.smoothing;
        } else if (dist < TORUS_REPULSION.radius) {
          // 반발 존 (멈): 자석 반경 밖 ~ 반발 반경 안 → 밀어냄
          const range = TORUS_REPULSION.radius - TORUS_ATTRACTION.radius;
          const normalized = (dist - TORUS_ATTRACTION.radius) / range;
          const force = Math.min(
            (normalized ** 1.5) * TORUS_REPULSION.strength,
            TORUS_REPULSION.maxDisplacement,
          );
          targetRepX = (dx / dist) * force;
          targetRepY = (dy / dist) * force;
          smoothing = TORUS_REPULSION.smoothing;
        }
      }

      // lerp 보간으로 부드러운 전환
      const rep = repulsionRef.current;
      rep.x += (targetRepX - rep.x) * smoothing;
      rep.y += (targetRepY - rep.y) * smoothing;

      x += rep.x;
      y += rep.y;
    }

    // Rotation: 연속 회전
    const rx = t * TORUS_ROTATION.xSpeed;
    const ry = t * TORUS_ROTATION.ySpeed;
    const rz = t * TORUS_ROTATION.zSpeed;

    // Scale
    const s = isMobile ? TORUS_MOBILE.scaleFactor : 1;

    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.set(rx, ry, rz);
    meshRef.current.scale.set(
      TORUS_SCALE.x * s,
      TORUS_SCALE.y * s,
      TORUS_SCALE.z * s
    );
  });

  return (
    <>
      {/* 환경 반사맵 (메탈릭 반사용) */}
      <Environment preset="city" />

      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1.0} />
      <directionalLight position={[-3, -2, 4]} intensity={0.5} />

      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={matConfig.color}
          emissive={matConfig.emissive}
          emissiveIntensity={matConfig.emissiveIntensity}
          metalness={matConfig.metalness}
          roughness={matConfig.roughness}
          envMapIntensity={matConfig.envMapIntensity}
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  );
}
