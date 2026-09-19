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
 * 밝은 테마의 인트로 판 — 꽃잎이 흩날리는 봄날(#1062).
 *
 * 어두운 쪽은 깊은 우주를 그린다. 그 그림을 밝은 테마에도 쓰면 밝은 화면에서 이 판만 캄캄해서,
 * 밝은 쪽 빈 화면이 꽃잎을 날리는 것과도 어긋났다.
 *
 * 꽃잎을 또렷한 타원으로 촘촘히 찍으면 무늬(패턴)처럼 보여 배경이 되지 못한다. 그래서 세 겹으로
 * 나누고 뒤쪽은 흐리게 그린다 — 사진의 얕은 심도처럼 뒤가 풀리고 앞의 몇 장만 또렷하다.
 * 꽃 모양을 또박또박 그려 넣지도 않는다. 다섯 장을 둘러 붙인 도형은 스티커처럼 읽힌다.
 */
function paintBlossomPanel(ctx: CanvasRenderingContext2D, s: number): void {
  const base = ctx.createLinearGradient(0, 0, s * 0.4, s);
  base.addColorStop(0, "#fffcf8");
  base.addColorStop(0.5, "#fdf2ea");
  base.addColorStop(1, "#f7e7e0");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);

  /* 빛이 도는 자리 — 판이 종이 한 장처럼 납작해지지 않게 아주 옅게 얹는다 */
  for (const [cx, cy, r, color] of [
    [0.32, 0.26, 0.5, "rgba(250,208,214,0.38)"],
    [0.74, 0.7, 0.46, "rgba(250,222,190,0.34)"],
    [0.5, 0.5, 0.75, "rgba(255,255,255,0.22)"],
  ] as const) {
    const wash = ctx.createRadialGradient(s * cx, s * cy, 0, s * cx, s * cy, s * r);
    wash.addColorStop(0, color);
    wash.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, s, s);
  }

  /* 세 겹 — 뒤는 크고 흐리게, 앞은 작고 살짝만 흐리게. 앞 겹을 크고 진하게 두면 종이 꽃을 붙인 것
     처럼 보이고, 셋 다 흐리면 분홍 얼룩만 남는다. 그 사이를 잡는다.
     기울기는 한 방향으로 몰아 흩날리는 결을 만든다(완전히 무작위면 어느 방향으로 날리는지 읽히지 않는다) */
  const layers = [
    { count: 10, blur: 12, len: 104, alpha: 0.2, vein: false, seed: 3 },
    { count: 18, blur: 5, len: 58, alpha: 0.3, vein: false, seed: 31 },
    { count: 12, blur: 1.4, len: 40, alpha: 0.5, vein: false, seed: 67 },
  ];
  for (const layer of layers) {
    ctx.filter = layer.blur > 0 ? `blur(${layer.blur}px)` : "none";
    /* 자리는 칸을 나눠 그 안에서 흔든다 — 순전한 난수로 뽑으면 한쪽에 몰리고 다른 쪽이 빈다.
       칸 수는 겹마다 다르게 잡아 세 겹의 격자가 겹쳐 보이지 않게 한다 */
    const cols = Math.ceil(Math.sqrt(layer.count));
    for (let i = 0; i < layer.count; i++) {
      const k = layer.seed + i * 5;
      const cell = s / cols;
      const x = ((i % cols) + 0.15 + introRandom(k) * 0.7) * cell;
      const y = (Math.floor(i / cols) + 0.15 + introRandom(k * 3 + 1) * 0.7) * cell;
      const len = layer.len * (0.6 + introRandom(k * 7 + 2) * 0.7);
      const wid = len * (0.36 + introRandom(k * 17 + 8) * 0.12);
      const tilt = -0.95 + introRandom(k * 11 + 4) * 0.8;
      const warm = introRandom(k * 13 + 6) > 0.45;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      /* 꽃잎 안에서 밝기가 흐른다 — 한 색으로 채우면 종이 조각처럼 보인다.
         뾰족한 끝이 밝고 밑동이 짙다 */
      const fill = ctx.createLinearGradient(0, -len * 0.5, 0, len * 0.5);
      fill.addColorStop(0, warm ? `rgba(255,240,226,${layer.alpha})` : `rgba(255,234,240,${layer.alpha})`);
      fill.addColorStop(1, warm ? `rgba(246,196,176,${layer.alpha})` : `rgba(242,180,202,${layer.alpha})`);
      ctx.fillStyle = fill;
      petalPath(ctx, len, wid);
      ctx.fill();
      /* 앞 겹에만 접힌 자국 — 밑동에서 짧게 올라오다 만다. 끝까지 그으면 잎맥이 되어 나뭇잎처럼 보인다 */
      if (layer.vein) {
        ctx.strokeStyle = `rgba(255,255,255,${layer.alpha * 0.4})`;
        ctx.lineWidth = Math.max(0.8, len * 0.009);
        ctx.beginPath();
        ctx.moveTo(0, -len * 0.3);
        ctx.quadraticCurveTo(wid * 0.1, len * 0.05, 0, len * 0.3);
        ctx.stroke();
      }
      ctx.restore();
    }
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
