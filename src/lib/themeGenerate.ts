import { clampChroma, converter, formatHex, type Oklch } from "culori";
import { contrastRatio } from "@/utils/contrast";
import type { ThemeColors } from "@/lib/themeAudit";

/* =============================================================================
 * 테마 색 추천 — 색상환 조화 규칙과 이미지에서 뽑은 색으로 테마 한 벌 만들기
 * =============================================================================
 * 한 벌은 강조색 + 라이트(배경·글자) + 다크(배경·글자). 배경·글자는 조화 규칙이 고른 색상(hue)에
 * 채도를 아주 조금만 입혀 은은하게 물들이고, 명도는 본문 대비가 7(AAA) 이상 나오게 고정한다.
 * 강조색은 고른 색상·채도를 살리되 너무 밝거나 어두우면 쓸 만한 범위로 당긴다.
 * =========================================================================== */

const toOklch = converter("oklch");
const hex = (c: Oklch) => formatHex(clampChroma(c, "oklch"));
const ok = (l: number, c: number, h: number): Oklch => ({ mode: "oklch", l, c, h: ((h % 360) + 360) % 360 });

export type HarmonyRule = "analogous" | "complementary" | "split" | "triad" | "mono";

export const HARMONY_RULES: HarmonyRule[] = ["analogous", "complementary", "split", "triad", "mono"];

/** 규칙마다 기준 색상에서 몇 도씩 떨어진 색을 쓰는지. mono 는 한 색상의 명도 단계 */
const OFFSETS: Record<HarmonyRule, number[]> = {
  analogous: [0, -30, 30],
  complementary: [0, 180],
  split: [0, 150, 210],
  triad: [0, 120, 240],
  mono: [0, 0, 0],
};
const MONO_L = [0.62, 0.45, 0.78];

/**
 * 강조색을 테마에 쓸 만한 범위로 — 명도 0.5~0.72, 채도 0.08 이상(색이 거의 없으면 그대로).
 * 그 위에 흰 글자가 3 이상(굵은 버튼 글자·아이콘 기준) 나오도록 필요한 만큼만 명도를 내린다.
 * 4.5 까지 내리면 노랑·주황이 흙빛으로 탁해져서 3 에서 멈춘다.
 */
export function usableAccent(color: string): string {
  const c = toOklch(color);
  if (!c) return color;
  const l = Math.min(0.72, Math.max(0.5, c.l));
  const chroma = c.c < 0.03 ? c.c : Math.max(0.08, c.c);
  return ensureContrast(ok(l, chroma, c.h ?? 0), "#ffffff", 3);
}

/** 명도만 옮겨 bg 대비가 min 이상이 되게 — bg 가 밝으면 어둡게, 어두우면 밝게 */
function ensureContrast(c: Oklch, bg: string, min: number): string {
  const bgDark = (contrastRatio(bg, "#000000") ?? 21) < (contrastRatio(bg, "#ffffff") ?? 21);
  let cur = { ...c };
  for (let i = 0; i < 60 && (contrastRatio(hex(cur), bg) ?? 0) < min; i++) {
    cur = { ...cur, l: Math.min(1, Math.max(0, cur.l + (bgDark ? 0.01 : -0.01))) };
  }
  return hex(cur);
}

/**
 * 강조색 하나와 배경·글자 색상(hue)으로 테마 한 벌.
 * tint 는 배경·글자에 입힐 채도 — 기존 프리셋처럼 파스텔 톤이 보일 만큼 입힌다.
 */
export function buildTheme(accent: string, bgHue: number, textHue: number, tint: { bg: number; text: number; bgL?: number } = { bg: 0.045, text: 0.05 }): ThemeColors {
  const lightBg = hex(ok(tint.bgL ?? 0.955, tint.bg, bgHue));
  const darkBg = hex(ok(0.19, tint.bg * 0.8, bgHue));
  const lightText = ensureContrast(ok(0.28, tint.text, textHue), lightBg, 10);
  const darkText = ensureContrast(ok(0.92, tint.text * 0.9, textHue), darkBg, 10);
  return { accentColor: usableAccent(accent), lightBg, lightText, darkBg, darkText };
}

const norm = (x: number) => ((x % 360) + 360) % 360;
const hueOf = (c: string) => toOklch(c)?.h ?? 0;

/** 규칙이 고른 색들의 색상(hue) — 색상환에 점을 찍는 데 쓴다. 첫 번째가 기준 */
export function harmonyHues(base: string, rule: HarmonyRule): number[] {
  const h = hueOf(base);
  return OFFSETS[rule].map((o) => norm(h + o));
}

/** 규칙이 고른 색 — 기준 색의 채도로 선명하게. mono 는 같은 색상의 밝기 단계 */
export function harmonyPalette(base: string, rule: HarmonyRule): string[] {
  const c = toOklch(base) ?? ok(0.62, 0.15, 0);
  const chroma = Math.max(c.c, 0.1);
  const l = Math.min(0.75, Math.max(0.55, c.l));
  return harmonyHues(base, rule).map((h, i) => hex(ok(rule === "mono" ? MONO_L[i] : l, chroma, h)));
}

/**
 * 조화 규칙으로 테마 후보 여러 벌 — 규칙이 고른 색을 하나씩 강조색으로 쓰고, 나머지 색의 색상을
 * 배경·글자에 입힌다. 그래서 후보마다 강조색이 달라 한눈에 구분된다.
 * mono 는 한 색상 안에서 강조색 밝기와 배경 물들임 정도를 달리한 세 벌.
 */
export function harmonyThemes(base: string, rule: HarmonyRule): ThemeColors[] {
  const palette = harmonyPalette(base, rule);
  if (rule === "mono") {
    const h = hueOf(base);
    // 밝은 배경은 담을 수 있는 채도가 적어서, 짙게 물들일수록 명도도 조금씩 내린다
    return ([[0.97, 0.02], [0.94, 0.04], [0.91, 0.06]] as const).map(([bgL, bg], i) => buildTheme(palette[i], h, h, { bg, bgL, text: 0.04 }));
  }
  return palette.map((accent, i) => {
    const others = palette.filter((_, j) => j !== i).map(hueOf);
    return buildTheme(accent, others[0], others[1] ?? others[0]);
  });
}

/** 같은 명도·채도로 색상(hue)만 바꾼 색 — 색상환을 눌러 기준색을 옮길 때 */
export function withHue(base: string, hue: number): string {
  const c = toOklch(base) ?? ok(0.6, 0.15, 0);
  return hex(ok(c.l, Math.max(c.c, 0.08), hue));
}

/* ─── 이미지에서 색 뽑기 ─── */

export interface ExtractedColor {
  hex: string;
  /** 이미지에서 차지하는 비율 (0~1) */
  share: number;
  l: number;
  c: number;
  h: number;
}

/**
 * 이미지 픽셀(RGBA)에서 대표 색 k 개 — OKLab 공간 k-평균. 많이 차지하는 순.
 * 투명 픽셀은 뺀다. 결정적으로 돌도록 초깃값은 명도 순으로 고르게 뽑는다.
 */
export function extractColors(data: Uint8ClampedArray, k = 6): ExtractedColor[] {
  const toLab = converter("oklab");
  const pts: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const lab = toLab({ mode: "rgb", r: data[i] / 255, g: data[i + 1] / 255, b: data[i + 2] / 255 });
    pts.push([lab.l, lab.a, lab.b]);
  }
  if (pts.length === 0) return [];
  const sorted = [...pts].sort((a, b) => a[0] - b[0]);
  let centers = Array.from({ length: Math.min(k, pts.length) }, (_, i) => sorted[Math.floor(((i + 0.5) / k) * sorted.length)]);
  let assign = new Array<number>(pts.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    assign = pts.map((p) => {
      let best = 0, bd = Infinity;
      centers.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = j; } });
      return best;
    });
    centers = centers.map((c, j) => {
      const mine = pts.filter((_, i) => assign[i] === j);
      if (!mine.length) return c;
      return [0, 1, 2].map((d) => mine.reduce((s, p) => s + p[d], 0) / mine.length) as [number, number, number];
    });
  }
  const counts = centers.map((_, j) => assign.filter((a) => a === j).length);
  return centers
    .map((c, j) => {
      const lch = toOklch({ mode: "oklab", l: c[0], a: c[1], b: c[2] })!;
      return { hex: formatHex({ mode: "oklab", l: c[0], a: c[1], b: c[2] }), share: counts[j] / pts.length, l: lch.l, c: lch.c, h: lch.h ?? 0 };
    })
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share);
}

/**
 * 뽑은 색으로 테마 후보 — 눈에 띄는 색(채도 × 비중)을 강조색으로, 가장 많이 차지하는 색의 색상을
 * 배경에, 강조색과 다른 색상을 글자에 입힌다. 강조색 후보마다 한 벌, 최대 max 벌.
 */
export function themesFromColors(colors: ExtractedColor[], max = 4): ThemeColors[] {
  if (!colors.length) return [];
  const dominant = colors[0];
  const accents = [...colors]
    .filter((c) => c.c >= 0.04)
    .sort((a, b) => b.c * Math.sqrt(b.share) - a.c * Math.sqrt(a.share))
    .slice(0, max);
  // 색이 거의 없는 이미지 — 가장 많은 색을 강조색으로 한 벌만
  if (!accents.length) return [buildTheme(dominant.hex, dominant.h, dominant.h, { bg: 0.01, text: 0.01 })];
  return accents.map((a) => {
    const other = colors.find((c) => c !== a && c.c >= 0.03 && Math.abs(((c.h - a.h + 540) % 360) - 180) > 40);
    const bgHue = dominant === a ? (other?.h ?? a.h + 30) : dominant.h;
    const textHue = other && other.h !== bgHue ? other.h : a.h + 180;
    return buildTheme(a.hex, bgHue, textHue);
  });
}
