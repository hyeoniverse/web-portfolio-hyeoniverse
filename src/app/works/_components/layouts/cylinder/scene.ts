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

/** 같은 씨앗이면 같은 수열 — 판의 무늬가 그릴 때마다 달라지지 않게 */
function introRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * 밝은 테마의 인트로 판 — 봄날의 꽃잎(#1062).
 *
 * 어두운 쪽은 깊은 우주를 그린다. 그 그림을 밝은 테마에도 쓰면 밝은 화면에서 이 판만 캄캄해서,
 * 밝은 쪽 빈 화면이 꽃잎을 날리는 것과도 어긋났다. 여기서는 따뜻한 종이색 위에 꽃잎을 흩는다.
 * 글자는 이 판 위에 얹히므로 밝은 판에서는 짙은 먹색으로 바뀐다(CylinderIntroPanel.module.css).
 */
function petalPath(ctx: CanvasRenderingContext2D, len: number, wid: number): void {
  /* 벚꽃잎 — 밑동은 좁고 끝은 넓으며 그 끝에 얕게 팬 자리가 있다.
     양끝이 똑같이 뾰족하면(타원·렌즈꼴) 꽃잎이 아니라 나뭇잎으로 읽힌다 */
  const tip = len * 0.5;
  const notch = len * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, -tip);
  ctx.bezierCurveTo(wid * 0.55, -len * 0.26, wid, len * 0.12, wid * 0.42, tip - notch);
  ctx.quadraticCurveTo(0, tip - notch * 2.2, -wid * 0.42, tip - notch);
  ctx.bezierCurveTo(-wid, len * 0.12, -wid * 0.55, -len * 0.26, 0, -tip);
  ctx.closePath();
}

/**
 * 밝은 테마의 인트로 판 — 봄빛(#1062).
 *
 * 어두운 판은 성운 두 겹과 작은 별로 만든 "분위기" 다. 그림을 그리지 않아서 좋아 보인다.
 * 밝은 쪽에 꽃가지나 큼직한 꽃잎을 그려 넣었더니 그림이 되어 판에서 겉돌았다(스티커처럼 보였다).
 * 그래서 어두운 판과 같은 짜임으로 간다 — 바탕, 빛 두 겹, 그리고 아주 작은 것들.
 * 별 자리에는 꽃잎을 둔다. 크기가 대여섯 픽셀이라 모양보다 빛가루처럼 읽히고, 가운데 얹히는
 * 제목과도 다투지 않는다.
 */
function paintBlossomPanel(ctx: CanvasRenderingContext2D, s: number): void {
  const base = ctx.createLinearGradient(0, 0, s * 0.3, s);
  base.addColorStop(0, "#fffdfb");
  base.addColorStop(0.45, "#fdf3ed");
  base.addColorStop(1, "#f6e6e2");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);

  /* 빛 두 겹 — 어두운 판의 성운과 같은 자리, 같은 크기. 색만 봄빛으로 바꾼다 */
  const w1 = ctx.createRadialGradient(s * 0.3, s * 0.35, 0, s * 0.35, s * 0.4, s * 0.5);
  w1.addColorStop(0, "rgba(247,178,196,0.5)");
  w1.addColorStop(0.5, "rgba(247,178,196,0.16)");
  w1.addColorStop(1, "rgba(247,178,196,0)");
  ctx.fillStyle = w1;
  ctx.fillRect(0, 0, s, s);

  const w2 = ctx.createRadialGradient(s * 0.7, s * 0.65, 0, s * 0.65, s * 0.6, s * 0.45);
  w2.addColorStop(0, "rgba(250,206,158,0.42)");
  w2.addColorStop(0.5, "rgba(250,206,158,0.12)");
  w2.addColorStop(1, "rgba(250,206,158,0)");
  ctx.fillStyle = w2;
  ctx.fillRect(0, 0, s, s);

  /* 위에서 드는 빛 — 판 위쪽이 살짝 트여 보인다 */
  const sun = ctx.createRadialGradient(s * 0.5, s * 0.08, 0, s * 0.5, s * 0.2, s * 0.6);
  sun.addColorStop(0, "rgba(255,255,255,0.55)");
  sun.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, s, s);

  /* 작은 꽃잎 — 어두운 판의 별 80개 자리에 같은 수만큼. 크기가 대여섯 픽셀이라 그림이 되지 않고
     빛가루처럼 흩어져 보인다. 기울기는 한쪽으로 몰아 바람의 결을 남긴다 */
  for (let i = 0; i < 80; i++) {
    const x = introRandom(i * 7 + 1) * s;
    const y = introRandom(i * 13 + 3) * s;
    const len = 3 + introRandom(i * 3 + 5) * 9;
    const a = 0.25 + introRandom(i * 11 + 7) * 0.45;
    const warm = introRandom(i * 17 + 2) > 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.7 + introRandom(i * 19 + 4) * 0.9);
    ctx.fillStyle = warm ? `rgba(244,176,150,${a})` : `rgba(238,158,186,${a})`;
    petalPath(ctx, len, len * 0.44);
    ctx.fill();
    ctx.restore();
  }

  /* 가까이 있는 몇 장만 조금 크게 — 전부 같은 크기면 무늬가 된다. 흐리게 두어 앞뒤를 만든다 */
  ctx.filter = "blur(2.5px)";
  for (let i = 0; i < 10; i++) {
    const k = 200 + i * 9;
    const x = introRandom(k) * s;
    const y = introRandom(k * 3 + 1) * s;
    const len = 18 + introRandom(k * 5 + 2) * 20;
    const warm = introRandom(k * 7 + 3) > 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.7 + introRandom(k * 11 + 4) * 0.9);
    ctx.fillStyle = warm ? "rgba(246,190,164,0.33)" : "rgba(240,172,196,0.33)";
    petalPath(ctx, len, len * 0.44);
    ctx.fill();
    ctx.restore();
  }
  ctx.filter = "none";
}

export function createIntroDataUrl(isDark: boolean): string {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s; c.height = s;
  const ctx = c.getContext("2d")!;

  /* 밝은 테마는 우주가 아니라 봄날이다 — 판도 화면 배경(꽃잎)과 같은 결로 둔다 */
  if (!isDark) {
    paintBlossomPanel(ctx, s);
    return c.toDataURL("image/png");
  }

  // Deep space base
  ctx.fillStyle = "#000000";
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
    const rng = introRandom;
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
