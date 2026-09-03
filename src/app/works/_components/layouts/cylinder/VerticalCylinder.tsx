"use client";

/* 실린더 3D 씬 — 곡면 패널을 원통으로 두른 메시 그룹과, 씬에 붙는 두 보조 컴포넌트.
   스크롤·마우스·회전 상태는 부모가 ref 로 들고 있고 여기서는 매 프레임 읽어 반영만 한다
   (state 를 쓰면 60fps 로 리렌더된다). CylinderLayout.tsx 에서 분리 (#662). */

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { BREAKPOINT } from "@/constants";
import {
  RADIUS,
  PLANE_WIDTH,
  LERP_SPEED,
  TILT_Z,
  MOUSE_X,
  MOUSE_Y,
  makeCurvedPlane,
} from "./scene";

/* ── Texture loader ── */
function useImageTextures(urls: string[]) {
  const textures = useLoader(THREE.TextureLoader, urls);
  return Array.isArray(textures) ? textures : [textures];
}

/* ── 3D Vertical Cylinder ── */
export default function VerticalCylinder({ allImages, segAngle, arc, scrollRef, mouseRef, actualRotRef, screenPosRef, dimRef, onMeshHover, onMeshLeave, onMeshClick }: {
  allImages: string[];
  segAngle: number;
  arc: number;
  scrollRef: React.RefObject<number>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  actualRotRef: React.MutableRefObject<number>;
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
  dimRef: React.RefObject<number>;
  onMeshHover: (slotIdx: number) => void;
  onMeshLeave: (slotIdx: number) => void;
  onMeshClick: (slotIdx: number) => void;
}) {
  const tiltGroupRef = useRef<THREE.Group>(null);
  const scrollGroupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const { camera } = useThree();
  const textures = useImageTextures(allImages);
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const tiltEuler = useMemo(() => new THREE.Euler(), []);
  const scrollEuler = useMemo(() => new THREE.Euler(), []);


  const count = allImages.length;
  const tiltRef = useRef({ x: 0, y: 0 });
  const initializedRef = useRef(false);

  useFrame(() => {
    if (!tiltGroupRef.current || !scrollGroupRef.current) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      scrollGroupRef.current.rotation.x = Math.PI;
    }

    const s = scrollRef.current ?? 0;
    const m = mouseRef.current ?? { x: 0, y: 0 };
    const isDesktop = window.innerWidth > BREAKPOINT.tablet;

    const targetRotX = s * segAngle * count + Math.PI;
    const sRot = scrollGroupRef.current.rotation;
    sRot.x += (targetRotX - sRot.x) * LERP_SPEED;
    actualRotRef.current = sRot.x;

    const tRot = tiltGroupRef.current.rotation;
    if (isDesktop) {
      tiltRef.current.x += (m.y * MOUSE_Y - tiltRef.current.x) * LERP_SPEED;
      tiltRef.current.y += (m.x * MOUSE_X - tiltRef.current.y) * LERP_SPEED;
      tRot.y = tiltRef.current.y;
      tRot.z = TILT_Z + tiltRef.current.x;
    } else {
      tiltRef.current.x *= 0.9;
      tiltRef.current.y *= 0.9;
      tRot.y = tiltRef.current.y;
      tRot.z = tiltRef.current.x;
    }

    scrollEuler.set(sRot.x, 0, 0);
    tiltEuler.set(0, tRot.y, tRot.z);
    for (let i = 0; i < count; i++) {
      const angle = i * segAngle;
      tempVec.set(0, Math.sin(angle) * RADIUS, Math.cos(angle) * RADIUS);
      tempVec.applyEuler(scrollEuler);
      tempVec.applyEuler(tiltEuler);
      tempVec.project(camera);
      screenPosRef.current[i] = {
        x: tempVec.x * window.innerWidth * 0.5,
        y: -tempVec.y * window.innerHeight * 0.5,
      };
    }

    // hover dimmed — dimRef > 0 이면 해당 slot 어둡게
    // dimRef = meshIdx+1 (mesh hover) 또는 meshIdx+2 (metaItem interactive hover)
    const dimVal = dimRef.current ?? 0;
    const hoveredMeshIdx = dimVal > 0 ? (dimVal <= count ? dimVal - 1 : dimVal - 2) : -1;
    for (let mi = 0; mi < meshRefs.current.length; mi++) {
      const mesh = meshRefs.current[mi];
      if (!mesh?.material) continue;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const targetBright = mi === hoveredMeshIdx ? 0.3 : 1;
      const cur = mat.color.r;
      const next = cur + (targetBright - cur) * 0.12;
      mat.color.setScalar(next);
    }
  });

  const segments = useMemo(() => {
    return textures.map((tex, i) => {
      const angle = i * segAngle;
      const geo = makeCurvedPlane(angle, arc, RADIUS, PLANE_WIDTH, 32);
      tex.colorSpace = THREE.SRGBColorSpace;
      return { geo, tex };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textures.length, segAngle, arc]);

  return (
    <group ref={tiltGroupRef}>
      <group ref={scrollGroupRef}>
        {segments.map(({ geo, tex }, i) => (
          <mesh
            key={i}
            geometry={geo}
            ref={(el) => { if (el) meshRefs.current[i] = el; }}
            onPointerEnter={() => {
              dimRef.current = i + 1;
              onMeshHover(i);
              if (i > 0) document.body.style.cursor = "pointer";
            }}
            onPointerLeave={() => {
              if (dimRef.current === i + 1) dimRef.current = 0;
              onMeshLeave(i);
              document.body.style.cursor = "";
            }}
            onClick={(e) => {
              e.stopPropagation();
              onMeshClick(i);
            }}
          >
            <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── Theme-aware clear color ── */
export function TransparentBg() {
  const { gl } = useThree();
  useEffect(() => { gl.setClearColor(0x000000, 0); }, [gl]);
  return null;
}

const BASE_CAM_Z = 9;
const REF_W = 1400;
const REF_H = 800;

export function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const scale = Math.min(1, size.width / REF_W, size.height / REF_H);
    camera.position.z = BASE_CAM_Z / scale;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

