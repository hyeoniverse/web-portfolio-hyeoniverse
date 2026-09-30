import type { Rgb } from "@/utils/color";

/* =============================================================================
 * 로고를 테마 색으로 다시 칠하기
 * =============================================================================
 * 로고는 대개 잉크 한 색 + 포인트 한 색이다 (기본 로고: 잉크 #17151B + 분홍 점 #D40063).
 * 테마를 바꾸면 잉크는 그 테마의 본문 글자색, 포인트는 강조색으로 바꿔 칠한다.
 *
 * 색이 세 개 이상 뚜렷이 섞인 로고(사진·그라디언트 일러스트)나 배경이 칠해진 로고(jpg 등)는
 * 어느 색을 무엇으로 바꿀지 정할 수 없어서 원래대로 둔다 — analyzeLogo 가 null 을 준다.
 * =========================================================================== */

/** 이 이상 불투명해야 색 판정에 쓴다 — 반투명 가장자리는 판정에서 빼고 칠할 때만 따라간다 */
const OPAQUE = 160;
/** 한 색으로 칠 만큼 차지해야 "뚜렷한 색" — 그보다 적으면 가장자리 섞임으로 본다 */
const SIGNIFICANT = 0.02;
/** 잉크와 이 거리(RGB 유클리드) 안이면 같은 색으로 본다 */
const SAME_COLOR = 60;

export interface LogoPalette {
  ink: Rgb;
  /** 포인트 색 — 한 색짜리 로고면 null */
  accent: Rgb | null;
}

const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * 로고 픽셀(RGBA, 가로 width)에서 잉크·포인트 색을 찾는다. 다시 칠할 수 없는 로고면 null.
 * - 네 모서리가 불투명하면 배경이 칠해진 이미지다 → null
 * - 가장 많은 색이 잉크, 그다음 뚜렷한 색이 포인트, 뚜렷한 색이 셋 이상이면 → null
 */
export function analyzeLogo(data: Uint8ClampedArray, width: number): LogoPalette | null {
  const height = Math.floor(data.length / 4 / width);
  if (!width || !height) return null;
  const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3];
  const corners = [alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)];
  if (corners.every((a) => a >= OPAQUE)) return null;

  // 5비트 양자화 히스토그램 — 칸마다 개수와 색 합계(평균 색을 내려고)
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < OPAQUE) continue;
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++; bin.r += data[i]; bin.g += data[i + 1]; bin.b += data[i + 2];
    bins.set(key, bin);
    total++;
  }
  if (!total) return null;

  // 가까운 칸끼리 묶어 색 덩어리로 — 많은 칸부터 기존 덩어리에 붙이거나 새로 만든다
  const clusters: { n: number; color: Rgb }[] = [];
  for (const bin of [...bins.values()].sort((a, b) => b.n - a.n)) {
    const color: Rgb = [bin.r / bin.n, bin.g / bin.n, bin.b / bin.n];
    const near = clusters.find((c) => dist(c.color, color) < SAME_COLOR);
    if (near) near.n += bin.n;
    else clusters.push({ n: bin.n, color });
  }
  const significant = clusters.filter((c) => c.n / total >= SIGNIFICANT).sort((a, b) => b.n - a.n);
  if (significant.length === 0 || significant.length > 2) return null;
  return { ink: significant[0].color, accent: significant[1]?.color ?? null };
}

/**
 * 픽셀을 제자리에서 다시 칠한다. 각 픽셀이 잉크와 포인트 중 어디에 가까운지로 새 두 색을 섞으므로
 * 두 색이 맞닿은 가장자리도 부드럽게 이어진다. 알파는 그대로 둔다.
 */
export function recolorPixels(data: Uint8ClampedArray, palette: LogoPalette, ink: Rgb, accent: Rgb) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const px: Rgb = [data[i], data[i + 1], data[i + 2]];
    let t = 0;
    if (palette.accent) {
      const di = dist(px, palette.ink), da = dist(px, palette.accent);
      t = di + da === 0 ? 0 : di / (di + da);
    }
    data[i] = Math.round(ink[0] + (accent[0] - ink[0]) * t);
    data[i + 1] = Math.round(ink[1] + (accent[1] - ink[1]) * t);
    data[i + 2] = Math.round(ink[2] + (accent[2] - ink[2]) * t);
  }
}
