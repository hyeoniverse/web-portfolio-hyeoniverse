/* 실린더 레이아웃의 three.js 씬 재료 — 인트로 텍스처 생성과 곡면 평면 지오메트리.
   렌더링에 쓰이는 상수도 여기 모은다. CylinderLayout.tsx 에서 분리 (#662). */

import * as THREE from "three";
import { renderGradient } from "@/components/posts/CoverImagePicker/gradientUtils";
import { pickFallbackPreset } from "@/lib/coverFallback";

/* ── Constants ── */
export const RADIUS = 35;
export const PLANE_WIDTH = 46;
export const MIN_SEGMENT_ANGLE = Math.PI / 3; // 패널이 적어도 이만큼은 간격
export const GAP_RATIO = 0.08;
export const LERP_SPEED = 0.06;
export const TILT_Z = 0.14;
export const MOUSE_X = 0.06;
export const MOUSE_Y = 0.04;
export const SCROLL_SENSITIVITY = 0.0008;
export const SCROLL_CLAMP = 80;
export const BACK_THRESHOLD = Math.PI * 0.55;
/* 손가락을 떼기 직전 속도로 이만큼(ms) 더 간 자리에서 가까운 판에 멈춘다 */
export const FLING_MS = 200;

/** 각을 [-π, π) 로 접는다 — 슬롯이 앞면에서 얼마나 돌아가 있는지 셀 때 */
export function wrapAngle(a: number): number {
  return ((a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
}

/* ── Camera ──
   카메라는 원통 안에서 축 너머 먼 쪽 판을 본다. 기준 화면(1400×800)보다 작으면 뒤로 물러나 판이 다 들어오게
   하는데, 원통 벽(RADIUS)을 넘으면 카메라 바로 앞의 판이 near 평면 안으로 들어와 화면을 통째로 덮는다
   (폭 358px 이하, #940). 벽 앞에서 멈추고, 모자란 거리만큼 시야각을 넓혀 먼 쪽 판이 같은 크기로 보이게 한다.
   씬(ResponsiveCamera)과 화면 좌표 계산(useCylinderStage)이 이 식을 같이 쓴다. */
export const CAMERA_Z = 9;
export const CAMERA_FOV = 55;
const CAMERA_REF_W = 1400;
const CAMERA_REF_H = 800;
const CAMERA_MAX_Z = RADIUS - 1;

export function cylinderCamera(width: number, height: number): { z: number; fov: number } {
  if (!(width > 0 && height > 0)) return { z: CAMERA_Z, fov: CAMERA_FOV };
  const scale = Math.min(1, width / CAMERA_REF_W, height / CAMERA_REF_H);
  const wanted = CAMERA_Z / scale;
  if (wanted <= CAMERA_MAX_Z) return { z: wanted, fov: CAMERA_FOV };
  // 먼 쪽 판까지의 거리가 (wanted + R) 에서 (벽 앞 + R) 로 줄어든 비율만큼 시야각의 tan 을 키운다
  const halfTan = Math.tan((CAMERA_FOV * Math.PI) / 360) * ((wanted + RADIUS) / (CAMERA_MAX_Z + RADIUS));
  return { z: CAMERA_MAX_Z, fov: (Math.atan(halfTan) * 360) / Math.PI };
}

/* ── Intro texture — cosmic: nebula wash + stars ── */
/**
 * 표지가 없는 칸에 두를 판(#1062).
 *
 * 빈 주소를 그대로 넘기면 three 의 TextureLoader 가 "Could not load : undefined" 로 죽는다.
 * GitHub 저장소로 목록을 채우면 README 에 그림이 없는 저장소가 섞이므로 실제로 생기는 일이다.
 *
 * 그림은 사이트가 표지 없는 카드에 쓰는 것과 같은 것으로 그린다 — 같은 seed 면 DOM 배치와
 * 원통이 같은 그라데이션을 보여준다.
 */
export function createFallbackPanelDataUrl(seed: string): string {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  renderGradient(ctx, s, s, pickFallbackPreset(seed));
  return c.toDataURL("image/png");
}

export function createIntroDataUrl(isDark: boolean): string {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s; c.height = s;
  const ctx = c.getContext("2d")!;

  // Deep space base
  ctx.fillStyle = isDark ? "#000000" : "#000000";
  ctx.fillRect(0, 0, s, s);

  // Nebula wash — accent pink (always on dark base)
  const n1 = ctx.createRadialGradient(s * 0.3, s * 0.35, 0, s * 0.35, s * 0.4, s * 0.5);
  n1.addColorStop(0, "rgba(212,0,99,0.15)");
  n1.addColorStop(0.5, "rgba(212,0,99,0.04)");
  n1.addColorStop(1, "transparent");
  ctx.fillStyle = n1;
  ctx.fillRect(0, 0, s, s);

  // Nebula wash — blue/purple
  const n2 = ctx.createRadialGradient(s * 0.7, s * 0.65, 0, s * 0.65, s * 0.6, s * 0.45);
  n2.addColorStop(0, "rgba(80,40,180,0.12)");
  n2.addColorStop(0.5, "rgba(80,40,180,0.03)");
  n2.addColorStop(1, "transparent");
  ctx.fillStyle = n2;
  ctx.fillRect(0, 0, s, s);

  // Stars (intro is always dark)
  {
    const rng = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 80; i++) {
      const x = rng(i * 7 + 1) * s;
      const y = rng(i * 13 + 3) * s;
      const r = rng(i * 3 + 5) * 1.2 + 0.3;
      const a = rng(i * 11 + 7) * 0.5 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
  }

  return c.toDataURL("image/png");
}

/* ── Curved Plane geometry ── */
export function makeCurvedPlane(
  angle: number, arc: number, radius: number, width: number, segsV: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= segsV; j++) {
    const t = j / segsV;
    const a = angle - arc / 2 + t * arc;
    const y = Math.sin(a) * radius;
    const z = Math.cos(a) * radius;
    positions.push(-width / 2, y, z);
    uvs.push(0, 1 - t);
    positions.push(width / 2, y, z);
    uvs.push(1, 1 - t);
  }

  for (let j = 0; j < segsV; j++) {
    const a = j * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
