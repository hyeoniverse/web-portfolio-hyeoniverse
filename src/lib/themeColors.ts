import { hexToRgb, lerpRgb, rgbHex, type Rgb } from "@/utils/color";
import { clampChroma, converter, formatHex } from "culori";
import { contrastRatio } from "@/utils/contrast";

/* =============================================================================
 * 사이트 설정의 테마 색(강조·배경·텍스트) → CSS 변수
 * =============================================================================
 * ThemeProvider(실제 사이트)와 디자인 시스템 페이지의 프리셋 미리보기가 같은 규칙을 쓴다.
 *
 * 팔레트(--color-*)는 테마와 상관없이 고정이라 건드리지 않고, 역할 토큰(--bg-* · --text-* …)을 덮어쓴다
 * (docs/design-system.md 2-5-1). 반투명 역할은 color-mix() 로 이 역할들에서 만들어지므로 따로 넣지 않는다.
 *
 * 강조색 자체(--bg-accent-solid)는 고른 그대로 둔다 — 버튼·배지·하이라이트의 색감이 테마의 얼굴이라서.
 * 대신 글자로 쓰이는 두 값만 대비를 보장한다 (WCAG AA 4.5).
 * - 강조 글자(--text-accent): 파스텔 강조색은 밝은 배경에서, 진한 강조색은 어두운 배경에서 묻힌다.
 *   색상·채도는 그대로 두고 OKLCH 명도만 배경 반대쪽으로 옮겨 대비를 맞춘다.
 * - 흐린 글자(--text-muted): 배경과 기본 텍스트를 고정 비율로 섞으면 기본 텍스트 대비가 낮은
 *   테마에서 4.5 아래로 떨어진다. 필요한 만큼 텍스트 쪽으로 당긴다.
 * =========================================================================== */

/** 글자 최소 대비 — WCAG AA 본문 */
export const MIN_TEXT_CONTRAST = 4.5;

/** bg(0) → text(1) 보간 비율. 500 은 다크, 600 은 라이트의 --text-muted 라 대비를 보장한다 */
const MID_BLENDS: [number, number][] = [
  [100, 0.05], [200, 0.12], [300, 0.22], [400, 0.33],
  [500, 0.46], [600, 0.65], [700, 0.80], [800, 0.92],
];
const MUTED_STOPS = new Set([500, 600]);

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

/**
 * 강조색 면(버튼·배지·오늘 날짜 표시) 위 글자색 — 테마 팔레트 안에서 고른다.
 * 그 모드의 배경색 → 글자색 → 반대 모드의 배경·글자색 순으로 강조색 대비 4.5 가 나오는 첫 색.
 * 배경색이 먼저라 버튼이 바탕을 뚫은 것처럼 보인다. 테마 색이 모두 모자라면 흰색·검은색 중 잘 보이는 쪽.
 */
export function textOnAccent(
  t: { lightBg: string; lightText: string; darkBg: string; darkText: string },
  mode: "light" | "dark",
  accentHex: string,
): string {
  const own = mode === "light" ? [t.lightBg, t.lightText] : [t.darkBg, t.darkText];
  const other = mode === "light" ? [t.darkBg, t.darkText] : [t.lightBg, t.lightText];
  for (const c of [...own, ...other]) {
    if ((contrastRatio(c, accentHex) ?? 0) >= MIN_TEXT_CONTRAST) return c;
  }
  return (contrastRatio("#ffffff", accentHex) ?? 0) >= (contrastRatio("#000000", accentHex) ?? 0) ? "#ffffff" : "#000000";
}

/** 강조색 역할 — 면 · 한 단계 진한 면 · 밝은 면. 반투명 강조(--bg-accent 등)와 강조 테두리는 이걸 따라온다 */
const ACCENT_ROLES = ["--bg-accent-solid", "--bg-accent-solid-hover", "--bg-accent-solid-light"] as const;

export function applyAccentAll(root: HTMLElement, hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const [r, g, b] = rgb;
  root.style.setProperty("--bg-accent-solid", hex);
  // 한 단계 진한 면(~20% 어둡게)
  root.style.setProperty("--bg-accent-solid-hover", `rgb(${Math.round(r * 0.78)}, ${Math.round(g * 0.78)}, ${Math.round(b * 0.78)})`);
  // 밝은 면(흰색 쪽으로 40%)
  const [lr, lg, lb] = lerpRgb(rgb, WHITE, 0.4);
  root.style.setProperty("--bg-accent-solid-light", `rgb(${lr}, ${lg}, ${lb})`);
}

export function removeAccentAll(root: HTMLElement) {
  for (const k of ACCENT_ROLES) root.style.removeProperty(k);
}

/** 무채색 역할 — 지금 테마의 배경 · 글자색에서 만든 단계(neutralScale)를 역할에 넣는다.
 *  --bg-primary · --text-primary 는 고른 색 그대로라 ThemeProvider 가 따로 넣는다. */
function neutralRoles(mode: "light" | "dark"): [string, number][] {
  return [
    ["--text-secondary", 800], ["--text-tertiary", 700], ["--text-muted", mode === "light" ? 600 : 500],
    ["--bg-secondary", 100], ["--bg-inverse", 950], ["--bg-inverse-light", 700],
  ];
}

export function applyNeutralScale(root: HTMLElement, bgHex: string, textHex: string, mode: "light" | "dark") {
  const scale = neutralScale(bgHex, textHex);
  if (!scale) return;
  for (const [role, step] of neutralRoles(mode)) root.style.setProperty(role, scale[step]);
  // 테두리 · 옅은 면의 바탕(반투명 틴트) — 고른 글자색
  root.style.setProperty("--text-contrast", textHex);
}

export function removeNeutralScale(root: HTMLElement) {
  for (const [role] of neutralRoles("light")) root.style.removeProperty(role);
  root.style.removeProperty("--text-contrast");
}

/** presetHelpers 가 스냅샷·복원할 변수 이름 전부 */
export function themeVarKeys(): string[] {
  return [
    ...ACCENT_ROLES, ...neutralRoles("light").map(([role]) => role),
    "--text-accent", "--text-accent-alt", "--text-on-accent", "--bg-primary", "--text-primary", "--text-contrast",
  ];
}
