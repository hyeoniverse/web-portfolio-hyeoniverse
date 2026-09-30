import { hexToRgb, lerpRgb, rgbHex, type Rgb } from "@/utils/color";
import { clampChroma, converter, formatHex } from "culori";
import { contrastRatio } from "@/utils/contrast";

/* =============================================================================
 * 사이트 설정의 테마 색(강조·배경·텍스트) → CSS 변수
 * =============================================================================
 * ThemeProvider(실제 사이트)와 디자인 시스템 페이지의 프리셋 미리보기가 같은 규칙을 쓴다.
 *
 * 강조색 자체(--color-accent)는 고른 그대로 둔다 — 버튼·배지·하이라이트의 색감이 테마의 얼굴이라서.
 * 대신 글자로 쓰이는 두 값만 대비를 보장한다 (WCAG AA 4.5).
 * - 강조 글자(--text-accent): 파스텔 강조색은 밝은 배경에서, 진한 강조색은 어두운 배경에서 묻힌다.
 *   색상·채도는 그대로 두고 OKLCH 명도만 배경 반대쪽으로 옮겨 대비를 맞춘다.
 * - 흐린 글자(--text-muted): 배경과 기본 텍스트를 고정 비율로 섞으면 기본 텍스트 대비가 낮은
 *   테마에서 4.5 아래로 떨어진다. 필요한 만큼 텍스트 쪽으로 당긴다.
 * =========================================================================== */

/** 글자 최소 대비 — WCAG AA 본문 */
export const MIN_TEXT_CONTRAST = 4.5;

const ACCENT_ALPHAS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
const ACCENT_LIGHT_ALPHAS = [40, 60, 70, 90];

const NEUTRAL_STOPS = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 999] as const;
/** bg(0) → text(1) 보간 비율. 500 은 다크, 600 은 라이트의 --text-muted 라 대비를 보장한다 */
const MID_BLENDS: [number, number][] = [
  [100, 0.05], [200, 0.12], [300, 0.22], [400, 0.33],
  [500, 0.46], [600, 0.65], [700, 0.80], [800, 0.92],
];
const MUTED_STOPS = new Set([500, 600]);
const NEUTRAL_ALPHA_STEPS = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** from 에서 to 쪽으로 start 부터 조금씩 옮기며 bg 대비가 min 이상이 되는 첫 비율. 끝까지 못 넘으면 1. */
function readableT(from: Rgb, to: Rgb, bgHex: string, min: number, start = 0): number {
  for (let t = start; t < 1; t += 0.01) {
    if ((contrastRatio(rgbHex(lerpRgb(from, to, t)), bgHex) ?? 0) >= min) return t;
  }
  return 1;
}

/**
 * neutral 스케일 — 50 은 배경, 900 은 텍스트, 그 사이는 보간.
 * 흐린 글자로 쓰이는 500·600 은 배경 대비가 4.5 이상이 되도록 텍스트 쪽으로 당기고,
 * 그보다 진한 단계가 역전되지 않게 뒤 단계도 같이 올린다.
 */
export function neutralScale(bgHex: string, textHex: string): Record<number, string> | null {
  const bg = hexToRgb(bgHex);
  const text = hexToRgb(textHex);
  if (!bg || !text) return null;

  const out: Record<number, string> = { 0: "#ffffff", 50: bgHex, 900: textHex, 999: "#000000" };
  let floor = 0;
  for (const [n, base] of MID_BLENDS) {
    let t = Math.max(base, floor);
    if (MUTED_STOPS.has(n)) t = readableT(bg, text, bgHex, MIN_TEXT_CONTRAST, t);
    floor = t;
    out[n] = rgbHex(lerpRgb(bg, text, t));
  }
  out[950] = rgbHex(lerpRgb(text, BLACK, 0.3));
  return out;
}

const toOklch = converter("oklch");

/**
 * 강조색을 bg 위에서 글자로 읽히게 — 대비가 모자라면 색상·채도는 두고 명도만
 * bg 반대쪽(어두운 bg 면 밝게)으로 옮긴다. 이미 충분하면 그대로.
 */
export function readableAccent(accentHex: string, bgHex: string, min = MIN_TEXT_CONTRAST): string {
  if ((contrastRatio(accentHex, bgHex) ?? 0) >= min) return accentHex;
  const base = toOklch(accentHex);
  if (!base) return accentHex;
  const bgIsDark = (contrastRatio(bgHex, "#000000") ?? 21) < (contrastRatio(bgHex, "#ffffff") ?? 21);
  const step = bgIsDark ? 0.01 : -0.01;
  for (let l = base.l + step; l > 0 && l < 1; l += step) {
    const hex = formatHex(clampChroma({ ...base, l }, "oklch"));
    if ((contrastRatio(hex, bgHex) ?? 0) >= min) return hex;
  }
  return bgIsDark ? "#ffffff" : "#000000";
}

/** 강조 글자 — 고른 강조색을 현재 배경 위에서 읽히게 맞춘 값 */
export function applyTextAccent(root: HTMLElement, accentHex: string, bgHex: string) {
  const hex = readableAccent(accentHex, bgHex);
  root.style.setProperty("--text-accent", hex);
  root.style.setProperty("--text-accent-alt", hex);
}

export function removeTextAccent(root: HTMLElement) {
  root.style.removeProperty("--text-accent");
  root.style.removeProperty("--text-accent-alt");
}

/** accent 관련 CSS 변수를 모두 세팅 (alpha, dark, light 포함) */
export function applyAccentAll(root: HTMLElement, hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const [r, g, b] = rgb;

  root.style.setProperty("--color-accent", hex);

  for (const a of ACCENT_ALPHAS) {
    root.style.setProperty(`--color-accent-alpha-${a}`, `rgba(${r}, ${g}, ${b}, ${a / 100})`);
  }

  // darker variant (~20% darker)
  root.style.setProperty(
    "--color-accent-dark",
    `rgb(${Math.round(r * 0.78)}, ${Math.round(g * 0.78)}, ${Math.round(b * 0.78)})`,
  );

  // lighter variant (~40% toward white)
  const [lr, lg, lb] = lerpRgb(rgb, WHITE, 0.4);
  root.style.setProperty("--color-accent-light", `rgb(${lr}, ${lg}, ${lb})`);
  for (const a of ACCENT_LIGHT_ALPHAS) {
    root.style.setProperty(`--color-accent-light-alpha-${a}`, `rgba(${lr}, ${lg}, ${lb}, ${a / 100})`);
  }
}

export function removeAccentAll(root: HTMLElement) {
  root.style.removeProperty("--color-accent");
  root.style.removeProperty("--color-accent-dark");
  root.style.removeProperty("--color-accent-light");
  for (const a of ACCENT_ALPHAS) root.style.removeProperty(`--color-accent-alpha-${a}`);
  for (const a of ACCENT_LIGHT_ALPHAS) root.style.removeProperty(`--color-accent-light-alpha-${a}`);
}

/** neutral scale + neutral/inverse alpha 를 bg·text 로부터 생성해 주입 */
export function applyNeutralScale(root: HTMLElement, bgHex: string, textHex: string) {
  const scale = neutralScale(bgHex, textHex);
  const bg = hexToRgb(bgHex);
  const text = hexToRgb(textHex);
  if (!scale || !bg || !text) return;

  for (const n of NEUTRAL_STOPS) root.style.setProperty(`--color-neutral-${n}`, scale[n]);

  for (const a of NEUTRAL_ALPHA_STEPS) {
    // neutral-alpha: text 컬러 기반, inverse-alpha: bg 컬러 기반
    root.style.setProperty(`--color-neutral-alpha-${a}`, `rgba(${text[0]}, ${text[1]}, ${text[2]}, ${a / 100})`);
    root.style.setProperty(`--color-inverse-alpha-${a}`, `rgba(${bg[0]}, ${bg[1]}, ${bg[2]}, ${a / 100})`);
  }
}

export function removeNeutralScale(root: HTMLElement) {
  for (const n of NEUTRAL_STOPS) root.style.removeProperty(`--color-neutral-${n}`);
  for (const a of NEUTRAL_ALPHA_STEPS) {
    root.style.removeProperty(`--color-neutral-alpha-${a}`);
    root.style.removeProperty(`--color-inverse-alpha-${a}`);
  }
}

/** presetHelpers 가 스냅샷·복원할 변수 이름 전부 */
export function themeVarKeys(): string[] {
  const keys = [
    "--color-accent", "--color-accent-dark", "--color-accent-light",
    "--text-accent", "--text-accent-alt", "--bg-primary", "--text-primary",
  ];
  for (const a of ACCENT_ALPHAS) keys.push(`--color-accent-alpha-${a}`);
  for (const a of ACCENT_LIGHT_ALPHAS) keys.push(`--color-accent-light-alpha-${a}`);
  for (const n of NEUTRAL_STOPS) keys.push(`--color-neutral-${n}`);
  for (const a of NEUTRAL_ALPHA_STEPS) {
    keys.push(`--color-neutral-alpha-${a}`);
    keys.push(`--color-inverse-alpha-${a}`);
  }
  return keys;
}
