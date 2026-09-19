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

/** 꽃 한 송이 — 꽃잎 다섯 장을 돌려 붙이고 가운데에 수술을 찍는다 */
function drawBlossom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn: number, alpha: number, warm: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  for (let i = 0; i < 5; i++) {
    ctx.save();
    /* 다섯 장을 정확히 72도씩 두면 톱니바퀴처럼 보인다 — 조금씩 어긋나게 한다 */
    ctx.rotate((i / 5) * Math.PI * 2 + (i % 2 ? 0.08 : -0.06));
    ctx.translate(0, -r * 0.62);
    const fill = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
    fill.addColorStop(0, warm ? `rgba(255,238,224,${alpha})` : `rgba(255,232,240,${alpha})`);
    fill.addColorStop(1, warm ? `rgba(244,186,164,${alpha})` : `rgba(240,170,196,${alpha})`);
    ctx.fillStyle = fill;
    petalPath(ctx, r * 1.25, r * 0.5);
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(250,214,140,${alpha})`;
  ctx.fill();
  ctx.restore();
}

/** 가지 한 줄 — 끝으로 갈수록 가늘어지고, 그 위에 꽃이 붙는다 */
function drawBranch(
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  ctrl: [number, number],
  to: [number, number],
  width: number,
  alpha: number,
  blossoms: number,
  seed: number,
): void {
  /* 굵기를 줄여 가며 여러 번 그으면 끝이 가늘어진다 — 캔버스에는 굵기가 변하는 선이 없다 */
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const at = (t: number): [number, number] => [
      (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * to[0],
      (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * to[1],
    ];
    const [x0, y0] = at(t0);
    const [x1, y1] = at(t1);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = `rgba(150,116,104,${alpha})`;
    ctx.lineWidth = width * (1 - t0 * 0.85);
    ctx.lineCap = "round";
    ctx.stroke();
  }

  for (let i = 0; i < blossoms; i++) {
    /* 자리를 고르게 나누되 조금씩 흔든다 — 딱 맞춰 두면 구슬을 꿴 것처럼 보인다 */
    const t = Math.min(0.98, 0.16 + (i / Math.max(1, blossoms - 1)) * 0.8 + (introRandom(seed + i * 29) - 0.5) * 0.12);
    const x = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * to[0];
    const y = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * to[1];
    const k = seed + i * 13;
    /* 가지에 딱 붙이지 않고 조금씩 띄운다 — 줄 세운 것처럼 보이지 않게 */
    const off = (introRandom(k) - 0.5) * width * 2.2;
    const r = width * (1.1 + introRandom(k * 3 + 1) * 2.1);
    drawBlossom(ctx, x + off, y + off * 0.6, r, introRandom(k * 5 + 2) * Math.PI, alpha, introRandom(k * 7 + 3) > 0.5);
  }
}

/**
 * 밝은 테마의 인트로 판 — 벚꽃 가지(#1062).
 *
 * 어두운 쪽은 깊은 우주를 그린다. 그 그림을 밝은 테마에도 쓰면 밝은 화면에서 이 판만 캄캄해서,
 * 밝은 쪽 빈 화면이 꽃잎을 날리는 것과도 어긋났다.
 *
 * 꽃잎만 흩뿌리면 아무리 색과 흐림을 손봐도 스티커를 붙인 것처럼 보인다. 꽃은 어딘가에 달려
 * 있어야 꽃으로 읽힌다. 그래서 모서리에서 가지를 뻗고 그 위에 꽃을 앉힌 뒤, 떨어지는 꽃잎
 * 몇 장을 더한다. 가운데는 비워 둔다 — 그 자리에 제목과 한 줄이 얹힌다.
 */
function paintBlossomPanel(ctx: CanvasRenderingContext2D, s: number): void {
  const base = ctx.createLinearGradient(0, 0, s * 0.35, s);
  base.addColorStop(0, "#fffdfa");
  base.addColorStop(0.5, "#fdf4ee");
  base.addColorStop(1, "#f8ebe4");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);

  /* 빛이 도는 자리 — 판이 종이 한 장처럼 납작해지지 않게 아주 옅게 */
  for (const [cx, cy, r, color] of [
    [0.28, 0.2, 0.55, "rgba(250,214,220,0.34)"],
    [0.78, 0.76, 0.5, "rgba(250,224,196,0.3)"],
  ] as const) {
    const wash = ctx.createRadialGradient(s * cx, s * cy, 0, s * cx, s * cy, s * r);
    wash.addColorStop(0, color);
    wash.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, s, s);
  }

  /* 뒤쪽 가지 둘 — 흐리게. 앞뒤가 없으면 그림이 납작하다 */
  ctx.filter = "blur(5px)";
  drawBranch(ctx, [-0.06 * s, 0.1 * s], [0.3 * s, 0.02 * s], [0.62 * s, 0.2 * s], 5, 0.4, 5, 11);
  drawBranch(ctx, [1.05 * s, 0.7 * s], [0.72 * s, 0.9 * s], [0.4 * s, 0.98 * s], 5, 0.36, 4, 29);

  /* 앞쪽 가지 둘 — 또렷하게. 왼쪽 위와 오른쪽 아래 모서리에서 들어와 가운데를 비껴간다 */
  ctx.filter = "none";
  drawBranch(ctx, [-0.05 * s, -0.02 * s], [0.26 * s, 0.16 * s], [0.52 * s, 0.08 * s], 8, 0.85, 6, 3);
  drawBranch(ctx, [1.04 * s, 0.95 * s], [0.74 * s, 0.82 * s], [0.46 * s, 0.92 * s], 7, 0.8, 5, 47);

  /* 떨어지는 꽃잎 몇 장 — 가지에서 막 떨어진 것처럼 가운데 위쪽에 흩는다 */
  for (let i = 0; i < 9; i++) {
    const k = 91 + i * 7;
    const x = (0.12 + introRandom(k) * 0.76) * s;
    const y = (0.2 + introRandom(k * 3 + 1) * 0.62) * s;
    const len = 14 + introRandom(k * 5 + 2) * 16;
    const warm = introRandom(k * 11 + 4) > 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.9 + introRandom(k * 13 + 5) * 1.4);
    const fill = ctx.createLinearGradient(0, -len * 0.5, 0, len * 0.5);
    fill.addColorStop(0, warm ? "rgba(255,238,224,0.75)" : "rgba(255,232,240,0.75)");
    fill.addColorStop(1, warm ? "rgba(244,186,164,0.75)" : "rgba(240,170,196,0.75)");
    ctx.fillStyle = fill;
    petalPath(ctx, len, len * 0.42);
    ctx.fill();
    ctx.restore();
  }
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
