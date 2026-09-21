/* 실린더 레이아웃의 three.js 씬 재료 — 인트로 텍스처 생성과 곡면 평면 지오메트리.
   렌더링에 쓰이는 상수도 여기 모은다. CylinderLayout.tsx 에서 분리 (#662). */

import * as THREE from "three";
import { renderGradient } from "@/components/posts/CoverImagePicker/gradientUtils";
import { pickFallbackPreset } from "@/lib/coverFallback";

/* ── Constants ──
   수치는 andreasantonsson.dev 의 원통을 옮겨 왔다. 그 원통은 높이 = 반지름인 원통을 눕혀 안쪽 벽을 보고,
   작업물 7개 + 빈 칸 1개로 한 바퀴를 나눈다(한 칸 45°, 틈 0.12rad). 여기서는 칸 수와 상관없이 그 한 칸을
   그대로 쓰고, 칸이 적어도 비지 않게 판들을 띠처럼 돌린다(slotOffset). */
export const RADIUS = 35;
/* 판 폭 = 원통 반지름 — 판은 폭 35 : 원호 35 × (π/4 − 0.12) ≈ 3:2 */
export const PLANE_WIDTH = RADIUS;
/* 판 한 칸이 차지하는 각 — 칸 수와 상관없이 고정이라 판 비율도 늘 같다 */
export const SLOT_ANGLE = Math.PI / 4;
/* 판 사이 틈(라디안) */
const PANEL_GAP = 0.12;
/* 판 하나의 원호 각 */
export const PANEL_ARC = SLOT_ANGLE - PANEL_GAP;

export const LERP_SPEED = 0.06;
/* 가로 화면에서 원통을 더 돌려 두는 각(0.04π ≈ 7°) — 세로 화면에서는 기울이지 않는다 */
export const TILT_Z = Math.PI * 0.04;
/* 마우스 — 좌우로 움직이면 원통이 살짝 비틀리고, 위아래로 움직이면 조금 더 돈다 */
export const MOUSE_X = 0.02;
export const MOUSE_SPIN = 0.004 * Math.PI * 1.5;
/* 판 밝기 — 흰 제목이 밝은 사진 위에서도 읽히게 판을 조금 낮춘다(레퍼런스는 캔버스 불투명도 0.75 인데,
   그쪽 사진은 대개 어둡다. 밝은 표지가 많아 조금 더 낮춘다).
   올리면 조금 더 낮춰 누를 수 있는 판임을 알린다 */
export const PANEL_BRIGHTNESS = 0.7;
export const PANEL_HOVER_BRIGHTNESS = 0.5;
/* 처음 들어올 때 이만큼(칸) 뒤에서 돌아 들어온다 — 레퍼런스의 진입 회전(진행률 -0.2 → 0) */
export const ENTRY_SPIN_SLOTS = 1.2;
export const BACK_THRESHOLD = Math.PI * 0.55;
/* 손가락을 떼기 직전 속도로 이만큼(ms) 더 간 자리에서 가까운 판에 멈춘다 */
export const FLING_MS = 200;

/**
 * 휠 한 번이 몇 칸인지 — 화면 높이만큼 굴리면 한 칸이다(레퍼런스는 작업물마다 100vh 섹션을 둔다).
 * 줄·쪽 단위로 오는 휠(deltaMode 1·2)은 픽셀로 바꾸고, 한 번에 반 칸을 넘지 않게 자른다.
 */
export function wheelSlots(e: { deltaY: number; deltaMode: number }, viewportHeight: number): number {
  const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * viewportHeight : e.deltaY;
  const slots = px / Math.max(1, viewportHeight);
  return Math.max(-0.5, Math.min(0.5, slots));
}

/** 각을 띠 길이 안으로 접는다 — [-loop/2, loop/2) */
export function wrapLoop(a: number, loop: number): number {
  return ((a % loop) + loop * 1.5) % loop - loop / 2;
}

/**
 * 칸 i 가 앞면에서 얼마나 떨어져 있는지(라디안, 앞면이 0).
 *
 * 판들은 원통에 박혀 있지 않고 띠처럼 돈다. 띠 길이(loop)는 칸 수 × 한 칸 각이라 칸이 적으면
 * 한 바퀴보다 짧다. 그 띠의 이음매(±loop/2)는 원통 뒤쪽, 화면 밖에 온다. 이음매를 넘은 판은
 * 반대쪽 끝에서 다시 나오므로 몇 칸이든 앞쪽은 빈틈없이 이어지고, 같은 판을 두 번 붙이지 않는다.
 * 칸이 여덟이면(한 칸 45°) 띠가 딱 한 바퀴라 판이 원통에 박힌 것과 같다.
 *
 * rot 은 씬의 회전값이다(처음 π). 칸 i 가 앞면에 오는 회전은 π + i × segAngle 이다.
 */
export function slotOffset(i: number, segAngle: number, loop: number, rot: number): number {
  return wrapLoop(i * segAngle - rot + Math.PI, loop);
}

/* ── Camera ──
   카메라는 원통 안(세로 화면에서는 뒤쪽 벽 너머)에서 축 너머 먼 쪽 벽을 본다. 레퍼런스는 반지름을
   4 × 화면비로 두고 카메라를 가로 화면 z=3, 세로 화면 z=5 에 둔다(시야각 35°). 반지름을 고정한 이 씬으로
   옮기면 카메라 거리는 반지름 × 0.75/화면비(가로), 1.25/화면비(세로)다. 세로 화면에서는 카메라가 원통 밖으로
   나가 먼 쪽 벽이 위아래로 서너 칸 보인다(가까운 쪽 판은 그리지 않는다 — VerticalCylinder 의 HIDDEN_BEYOND).

   칸이 적으면 띠의 이음매(±띠 길이/2)가 보이는 범위 안으로 들어올 수 있다. 그때는 이음매가 화면 끝 바깥에
   머물도록 카메라를 당긴다. 씬(ResponsiveCamera)과 화면 좌표 계산(useCylinderStage)이 이 식을 같이 쓴다. */
export const CAMERA_FOV = 35;
const CAMERA_LANDSCAPE = 0.75;
const CAMERA_PORTRAIT = 1.25;
/* 크기를 아직 모를 때 — 1.6:1 가로 화면 기준 */
export const CAMERA_Z = (RADIUS * CAMERA_LANDSCAPE) / 1.6;
/* 이음매를 화면 끝에서 이만큼(라디안) 더 바깥에 둔다 — 기울기(7°)로 판 모서리가 조금 더 보이는 몫 */
const SEAM_GUARD = 0.15;

/**
 * 먼 쪽 벽에서 화면 위아래 끝이 닿는 각(앞면 기준, 라디안) — 카메라가 축에서 z 만큼 떨어져 있을 때.
 * 벽의 한 점(각 θ)은 카메라에서 atan(R sinθ / (z + R cosθ)) 만큼 위아래로 보인다. 그 값이 시야각의 절반이
 * 되는 θ 를 푼다.
 */
export function visibleWallAngle(z: number, fov = CAMERA_FOV): number {
  const t = Math.tan((fov * Math.PI) / 360);
  const k = z / RADIUS;
  // sinθ − t·cosθ = t·k  →  √(1+t²)·sin(θ − φ) = t·k,  φ = atan(t)
  const phi = Math.atan(t);
  const v = Math.min(1, (t * k) / Math.sqrt(1 + t * t));
  return phi + Math.asin(v);
}

export function cylinderCamera(width: number, height: number, loop = Math.PI * 2): { z: number; fov: number } {
  const fov = CAMERA_FOV;
  if (!(width > 0 && height > 0)) return { z: CAMERA_Z, fov };
  const aspect = width / height;
  let z = (RADIUS * (aspect > 1 ? CAMERA_LANDSCAPE : CAMERA_PORTRAIT)) / aspect;
  // 이음매가 화면 끝보다 안쪽에 오면 그만큼 당긴다 — visibleWallAngle 을 거꾸로 풀었다
  const edge = loop / 2 - SEAM_GUARD;
  if (edge < Math.PI / 2 && visibleWallAngle(z, fov) > edge) {
    const t = Math.tan((fov * Math.PI) / 360);
    z = RADIUS * (Math.sin(edge) / t - Math.cos(edge));
  }
  return { z: Math.max(0, z), fov };
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
