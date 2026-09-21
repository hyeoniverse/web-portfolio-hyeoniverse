"use client";

/* 실린더 3D 씬 — 곡면 패널을 원통으로 두른 메시 그룹과, 씬에 붙는 두 보조 컴포넌트.
   스크롤·마우스·회전 상태는 부모가 ref 로 들고 있고 여기서는 매 프레임 읽어 반영만 한다
   (state 를 쓰면 60fps 로 리렌더된다). CylinderLayout.tsx 에서 분리 (#662). */

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree, useLoader, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { BREAKPOINT } from "@/constants";
import {
  RADIUS,
  PLANE_WIDTH,
  LERP_SPEED,
  TILT_Z,
  MOUSE_X,
  MOUSE_SPIN,
  PANEL_BRIGHTNESS,
  PANEL_HOVER_BRIGHTNESS,
  ENTRY_SPIN_SLOTS,
  makeCurvedPlane,
  cylinderCamera,
  slotOffset,
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
/* 이만큼 넘게 돌아간 판은 그리지 않는다 — 원통의 가까운 쪽 절반이다. 세로 화면에서는 카메라가 원통 밖에
   있어서 그 판들이 카메라와 먼 쪽 벽 사이를 가린다(레퍼런스는 뒷면만 그려 가린다). 칸이 아홉 이상이면 띠가
   한 바퀴보다 길어 그쪽에서 판끼리 겹치기도 한다 */
const HIDDEN_BEYOND = Math.PI / 2;
/* 자를 일이 없는 판의 자르는 면 — 모든 점이 앞쪽에 있도록 멀리 둔다. 면의 수를 바꾸면 재질의
   셰이더를 새로 만들어야 해서, 면은 늘 하나를 두고 자리만 옮긴다 */
const KEEP_ALL = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6);

/**
 * 띠의 이음매에서 판을 자르는 면.
 * keep = +1 이면 앞면 기준 각이 edge 보다 큰 쪽을, -1 이면 작은 쪽을 남긴다.
 * 판의 한 점은 (x, -R sin δ, -R cos δ) 라, 법선 (0, -cos edge, sin edge) 와의 곱이 R sin(δ - edge) 다.
 */
function setSeamPlane(plane: THREE.Plane, edge: number, keep: 1 | -1, tilt: THREE.Matrix4) {
  plane.normal.set(0, -Math.cos(edge) * keep, Math.sin(edge) * keep);
  plane.constant = 0;
  plane.applyMatrix4(tilt);
}

export default function VerticalCylinder({ allImages, segAngle, arc, scrollRef, mouseRef, actualRotRef, screenPosRef, dimRef, hidePanels = false, onMeshHover, onMeshLeave, onMeshClick }: {
  allImages: string[];
  /** 한 칸이 차지하는 각 — 판 크기가 이것으로 정해진다(칸 수와 무관) */
  segAngle: number;
  arc: number;
  scrollRef: React.RefObject<number>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  actualRotRef: React.MutableRefObject<number>;
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
  dimRef: React.RefObject<number>;
  /** 판을 그리지 않는다 — 보여줄 것이 없을 때(#1062). 같은 씬의 몽이는 그대로 남는다 */
  hidePanels?: boolean;
  onMeshHover: (slotIdx: number) => void;
  onMeshLeave: (slotIdx: number) => void;
  onMeshClick: (slotIdx: number, e: MouseEvent) => void;
}) {
  const tiltGroupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  /* 이음매에 걸린 판의 나머지 조각 — 띠 반대쪽 끝에 같은 판을 하나 더 두고, 두 조각을 이음매에서 잘라
     이어 붙인다. 판 하나가 두 자리에 겹쳐 보이는 일은 없다(한 조각씩만 남는다) */
  const ghostRefs = useRef<THREE.Mesh[]>([]);
  const { camera } = useThree();
  const textures = useImageTextures(allImages);
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const tiltEuler = useMemo(() => new THREE.Euler(), []);

  const count = allImages.length;
  /* 판마다 자르는 면 둘(제 판, 나머지 조각) — 재질이 배열째로 붙들고 있으므로 배열도 고정해 둔다 */
  const clips = useMemo(
    () => Array.from({ length: count }, () => ({ main: [KEEP_ALL.clone()], ghost: [KEEP_ALL.clone()] })),
    [count],
  );
  const tiltRef = useRef({ x: 0, y: 0 });
  const enteredRef = useRef(false);
  // 가운데 버튼을 누른 판 — 그 판에서 떼야 누름으로 친다. 누른 채 판을 벗어나면 지운다
  const auxPressRef = useRef(-1);

  useFrame(({ gl, size }) => {
    if (!tiltGroupRef.current) return;
    // 재질에 단 자르는 면은 이 스위치를 켜야 먹는다
    if (!gl.localClippingEnabled) gl.localClippingEnabled = true;

    /* 들어올 때 — 판이 처음 그려지는 프레임에 조금 뒤로 물려 두면 아래 lerp 가 제자리로 돌려 들인다.
       캔버스는 그때부터 보인다(CylinderLayout.module.css 의 .canvas[data-ready]) */
    if (!enteredRef.current) {
      enteredRef.current = true;
      if (!hidePanels) actualRotRef.current -= ENTRY_SPIN_SLOTS * segAngle;
      gl.domElement.setAttribute("data-ready", "");
    }

    const s = scrollRef.current ?? 0;
    const m = mouseRef.current ?? { x: 0, y: 0 };
    const isDesktop = window.innerWidth > BREAKPOINT.tablet;
    const loop = segAngle * count;

    /* 마우스 — 좌우는 원통을 살짝 비틀고, 위아래는 조금 더 돌린다. 손가락 화면에서는 가라앉힌다 */
    const t = tiltRef.current;
    t.x += ((isDesktop ? m.y * MOUSE_SPIN : 0) - t.x) * LERP_SPEED;
    t.y += ((isDesktop ? m.x * MOUSE_X : 0) - t.y) * LERP_SPEED;

    // scrollRef 는 칸 단위다 — 한 칸 돌면 다음 판이 앞면에 온다
    const targetRot = s * segAngle + Math.PI + t.x;
    actualRotRef.current += (targetRot - actualRotRef.current) * LERP_SPEED;
    const rot = actualRotRef.current;

    const tRot = tiltGroupRef.current.rotation;
    tRot.y = t.y;
    // 가로 화면에서만 기울인다 — 세로 화면에서는 판이 폭을 거의 다 쓰므로 기울이면 모서리가 잘린다
    tRot.z = size.width > size.height ? TILT_Z : 0;
    tiltEuler.set(0, tRot.y, tRot.z);
    // 자르는 면은 월드 좌표로 준다 — 기울인 그룹의 행렬을 이번 프레임 값으로 맞춰 둔다
    tiltGroupRef.current.updateMatrixWorld();
    const tilt = tiltGroupRef.current.matrixWorld;

    const half = arc / 2;
    const seam = loop / 2;
    for (let i = 0; i < count; i++) {
      const d = slotOffset(i, segAngle, loop, rot);
      const clip = clips[i];
      /* 이음매를 넘어간 쪽은 잘라 내고, 그 몫은 반대쪽 끝의 조각이 채운다 */
      let ghostD = NaN;
      if (d + half > seam) {
        setSeamPlane(clip.main[0], seam, -1, tilt);
        setSeamPlane(clip.ghost[0], -seam, 1, tilt);
        ghostD = d - loop;
      } else if (d - half < -seam) {
        setSeamPlane(clip.main[0], -seam, 1, tilt);
        setSeamPlane(clip.ghost[0], seam, -1, tilt);
        ghostD = d + loop;
      } else {
        clip.main[0].copy(KEEP_ALL);
      }

      /* 판은 앞면 기준 각 d 자리에 선다 — 지오메트리가 0 각에 만들어져 있어 x 축으로 돌리기만 한다 */
      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.rotation.x = -(Math.PI + d);
        mesh.visible = !hidePanels && Math.abs(d) - half < HIDDEN_BEYOND;
      }
      const ghost = ghostRefs.current[i];
      if (ghost) {
        const on = !Number.isNaN(ghostD) && Math.abs(ghostD) - half < HIDDEN_BEYOND;
        ghost.visible = !hidePanels && on;
        if (on) ghost.rotation.x = -(Math.PI + ghostD);
      }

      const w = Math.PI + d;
      tempVec.set(0, Math.sin(w) * RADIUS, Math.cos(w) * RADIUS);
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
      /* 작업물 판은 늘 조금 낮춰 둔다 — 흰 제목이 밝은 사진 위에서도 읽혀야 한다.
         인트로 칸(0번)은 제 글자색을 판에 맞춰 두었고 눌러서 갈 곳도 없다 — 올렸다고 어두워지면 눌러도 되는 것처럼
         보이고, 밝은 테마의 꽃 판에서는 그냥 때가 탄 것처럼 보인다(#1062) */
      const targetBright = mi === 0 ? 1 : mi === hoveredMeshIdx ? PANEL_HOVER_BRIGHTNESS : PANEL_BRIGHTNESS;
      const cur = mat.color.r;
      const next = cur + (targetBright - cur) * 0.12;
      mat.color.setScalar(next);
      const ghost = ghostRefs.current[mi];
      if (ghost?.material) (ghost.material as THREE.MeshBasicMaterial).color.setScalar(next);
    }
  });

  /* 판 하나의 모양은 모두 같다 — 앞면(0 각)에 만들어 두고 판마다 돌려 세운다 */
  const geometry = useMemo(() => makeCurvedPlane(0, arc, RADIUS, PLANE_WIDTH, 32), [arc]);

  const segments = useMemo(() => {
    /* 판은 약 3:2 이고(한 칸 각이 고정이라 늘 같다) 표지 비율은 제각각이다. 그림을 판에 그대로
       늘여 붙이면 찌그러지므로 object-fit: cover 처럼 판을 덮을 만큼만 가운데에서 잘라 쓴다 */
    const panelAspect = PLANE_WIDTH / (RADIUS * arc);
    return textures.map((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const img = tex.image as { width?: number; height?: number } | undefined;
      if (img?.width && img.height) {
        const imgAspect = img.width / img.height;
        if (imgAspect > panelAspect) {
          const r = panelAspect / imgAspect; // 그림이 더 넓다 → 좌우를 잘라 낸다
          tex.repeat.set(r, 1);
          tex.offset.set((1 - r) / 2, 0);
        } else {
          const r = imgAspect / panelAspect; // 그림이 더 길다 → 위아래를 잘라 낸다
          tex.repeat.set(1, r);
          tex.offset.set(0, (1 - r) / 2);
        }
        tex.needsUpdate = true;
      }
      return tex;
    });
  /* 텍스처 배열 자체를 본다 — 개수만 보면, 테마를 바꿔 인트로 판 그림이 새로 들어와도(같은 개수) 옛 그림을
     계속 붙여 두어서 다크 모드에서도 봄 꽃잎 판이 남았다. useLoader 는 같은 주소 목록이면 같은 배열을 돌려준다 */
  }, [textures, arc]);

  /* 판과 그 나머지 조각은 같은 판이다 — 올리기·누르기를 같은 칸으로 받는다 */
  const panelEvents = (i: number) => ({
    onPointerEnter: () => {
      dimRef.current = i + 1;
      onMeshHover(i);
      if (i > 0) document.body.style.cursor = "pointer";
    },
    onPointerLeave: () => {
      if (dimRef.current === i + 1) dimRef.current = 0;
      if (auxPressRef.current === i) auxPressRef.current = -1;
      onMeshLeave(i);
      document.body.style.cursor = "";
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onMeshClick(i, e.nativeEvent);
    },
    /* 가운데 클릭은 click 이 아니라 auxclick 이라 광선 판정의 onClick 으로 오지 않는다.
       누름과 뗌을 직접 짝지어 넘긴다 — 새 탭으로 열지는 받는 쪽이 버튼을 보고 정한다 */
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 1) return;
      e.stopPropagation();
      auxPressRef.current = i;
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 1) return;
      e.stopPropagation();
      if (auxPressRef.current === i) onMeshClick(i, e.nativeEvent);
      auxPressRef.current = -1;
    },
  });

  return (
    <group ref={tiltGroupRef}>
      {segments.map((tex, i) => (
        <group key={i}>
          <mesh
            geometry={geometry}
            visible={false}
            ref={(el) => { if (el) meshRefs.current[i] = el; }}
            {...panelEvents(i)}
          >
            <meshBasicMaterial map={tex} side={THREE.DoubleSide} clippingPlanes={clips[i]?.main} />
          </mesh>
          <mesh
            geometry={geometry}
            visible={false}
            ref={(el) => { if (el) ghostRefs.current[i] = el; }}
            {...panelEvents(i)}
          >
            <meshBasicMaterial map={tex} side={THREE.DoubleSide} clippingPlanes={clips[i]?.ghost} />
          </mesh>
        </group>
      ))}
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
export function ResponsiveCamera({ loop }: {
  /** 판 띠의 길이 — 칸이 적으면 이음매가 화면에 들지 않게 카메라를 당긴다 */
  loop: number;
}) {
  const appliedRef = useRef({ width: 0, height: 0, loop: 0 });
  useFrame(({ camera, size }) => {
    const applied = appliedRef.current;
    if (applied.width === size.width && applied.height === size.height && applied.loop === loop) return;
    appliedRef.current = { width: size.width, height: size.height, loop };
    const cam = camera as THREE.PerspectiveCamera;
    const { z, fov } = cylinderCamera(size.width, size.height, loop);
    cam.position.z = z;
    cam.fov = fov;
    cam.updateProjectionMatrix();
  });
  return null;
}

