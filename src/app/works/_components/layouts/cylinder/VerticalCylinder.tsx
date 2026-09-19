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
  cylinderCamera,
} from "./scene";

/* ── Texture loader ── */
/* 표지를 한 장 못 받았다고 원통 전체가 사라지면 안 된다.
   useLoader 는 실패를 그대로 던지고, 그러면 Canvas 아래가 통째로 날아간다(표지가 SVG 라서 이미지
   최적화가 거부하거나, 주소가 옮겨졌거나, 바깥 저장소가 막았을 때 실제로 그렇게 됐다).
   실패한 자리만 무채색 판으로 채우고 나머지는 그대로 그린다(#1062). */
let fallbackTexture: THREE.Texture | null = null;
function blankTexture(): THREE.Texture {
  if (fallbackTexture) return fallbackTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#6e7681";
    ctx.fillRect(0, 0, 2, 2);
  }
  fallbackTexture = new THREE.CanvasTexture(canvas);
  return fallbackTexture;
}

class ForgivingTextureLoader extends THREE.TextureLoader {
  load(
    url: string,
    onLoad?: (data: THREE.Texture<HTMLImageElement>) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ): THREE.Texture<HTMLImageElement> {
    void onError;
    return super.load(url, onLoad, onProgress, (err) => {
      /* onError 를 부르지 않는다 — 부르면 useLoader 가 던지고 Canvas 아래가 날아간다.
         대신 성공한 것처럼 판을 넘긴다. 판은 캔버스로 만든 텍스처라 타입만 맞춰 준다 */
      console.warn("[cylinder] 표지를 받지 못해 빈 판으로 대신합니다:", url, err);
      onLoad?.(blankTexture() as unknown as THREE.Texture<HTMLImageElement>);
    });
  }
}

function useImageTextures(urls: string[]) {
  const textures = useLoader(ForgivingTextureLoader, urls);
  return Array.isArray(textures) ? textures : [textures];
}

/* ── 3D Vertical Cylinder ── */
export default function VerticalCylinder({ allImages, segAngle, arc, scrollRef, mouseRef, actualRotRef, screenPosRef, dimRef, panelFadeRef, onMeshHover, onMeshLeave, onMeshClick }: {
  allImages: string[];
  segAngle: number;
  arc: number;
  scrollRef: React.RefObject<number>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  actualRotRef: React.MutableRefObject<number>;
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
  dimRef: React.RefObject<number>;
  /** 0~1 — 판이 펴지며 옅어지는 정도(#1062). 작업물이 없는 화면에서만 넘어온다.
      판만 건드리므로 같은 씬의 몽이는 그대로 남는다 */
  panelFadeRef?: React.RefObject<number>;
  onMeshHover: (slotIdx: number) => void;
  onMeshLeave: (slotIdx: number) => void;
  onMeshClick: (slotIdx: number, e: MouseEvent) => void;
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
  // 가운데 버튼을 누른 판 — 그 판에서 떼야 누름으로 친다. 누른 채 판을 벗어나면 지운다
  const auxPressRef = useRef(-1);

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
    /* 판이 펴지는 정도 — 0 이면 평소와 똑같다. 평소에는 transparent 도 켜지 않는다 */
    const fade = panelFadeRef?.current ?? 0;
    for (let mi = 0; mi < meshRefs.current.length; mi++) {
      const mesh = meshRefs.current[mi];
      if (!mesh?.material) continue;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      /* 인트로 칸(0번)은 눌러서 갈 곳이 없다 — 올렸다고 어두워지면 눌러도 되는 것처럼 보이고,
         밝은 테마의 꽃 판에서는 그냥 때가 탄 것처럼 보인다(#1062). 작업물 칸만 어두워진다 */
      const targetBright = mi > 0 && mi === hoveredMeshIdx ? 0.3 : 1;
      const cur = mat.color.r;
      const next = cur + (targetBright - cur) * 0.12;
      mat.color.setScalar(next);

      if (fade > 0 || mat.transparent) {
        /* 가로로 더 많이 펼친다 — 판은 원통 축을 감고 있어서 넓히면 시야를 감싸듯 펴진다.
           그러면서 옅어지므로 판이 하늘로 바뀌는 것처럼 보인다 */
        mat.transparent = fade > 0;
        mat.opacity = 1 - fade;
        mesh.scale.set(1 + fade * 2.2, 1 + fade * 1.5, 1);
      }
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
              if (auxPressRef.current === i) auxPressRef.current = -1;
              onMeshLeave(i);
              document.body.style.cursor = "";
            }}
            onClick={(e) => {
              e.stopPropagation();
              onMeshClick(i, e.nativeEvent);
            }}
            /* 가운데 클릭은 click 이 아니라 auxclick 이라 광선 판정의 onClick 으로 오지 않는다.
               누름과 뗌을 직접 짝지어 넘긴다 — 새 탭으로 열지는 받는 쪽이 버튼을 보고 정한다 */
            onPointerDown={(e) => {
              if (e.button !== 1) return;
              e.stopPropagation();
              auxPressRef.current = i;
            }}
            onPointerUp={(e) => {
              if (e.button !== 1) return;
              e.stopPropagation();
              if (auxPressRef.current === i) onMeshClick(i, e.nativeEvent);
              auxPressRef.current = -1;
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

/* 화면 크기에 맞춰 카메라 거리·시야각을 잡는다(scene.ts 의 cylinderCamera). three 객체는 매 프레임 콜백에서
   다루고, 크기가 바뀐 프레임에만 고친다 */
export function ResponsiveCamera() {
  const appliedRef = useRef({ width: 0, height: 0 });
  useFrame(({ camera, size }) => {
    const applied = appliedRef.current;
    if (applied.width === size.width && applied.height === size.height) return;
    appliedRef.current = { width: size.width, height: size.height };
    const cam = camera as THREE.PerspectiveCamera;
    const { z, fov } = cylinderCamera(size.width, size.height);
    cam.position.z = z;
    cam.fov = fov;
    cam.updateProjectionMatrix();
  });
  return null;
}

