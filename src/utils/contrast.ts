/* =============================================================================
 * 색 대비율 (WCAG) 유틸
 * =============================================================================
 * favicon 미리보기의 글자색 vs 배경색 대비 표시에 사용.
 * 색 문자열(#rgb/#rrggbb/#rrggbbaa/rgb()/rgba()) 파싱 → sRGB relative luminance
 * → contrast ratio ((L1+0.05)/(L2+0.05)). 파싱 실패 시 null.
 * =========================================================================== */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** 색 문자열 파싱. alpha 는 무시(불투명 가정). 실패 시 null. */
export function parseColor(input: string | undefined | null): RGB | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  // hex — #rgb / #rgba / #rrggbb / #rrggbbaa
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some((n) => Number.isNaN(n))) return null;
      return { r, g, b };
    }
    return null;
  }

  // rgb() / rgba() — 쉼표·공백·슬래시 구분 모두 허용
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const nums = parts.slice(0, 3).map((p) =>
      p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p),
    );
    if (nums.some((n) => !Number.isFinite(n))) return null;
    return { r: clamp255(nums[0]), g: clamp255(nums[1]), b: clamp255(nums[2]) };
  }

  return null;
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** sRGB relative luminance (0~1) */
export function relativeLuminance(rgb: RGB): number {
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/** 두 색의 WCAG contrast ratio (1~21). 파싱 실패 시 null. */
export function contrastRatio(fg: string, bg: string): number | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return null;
  const l1 = relativeLuminance(f);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = "aaa" | "aa" | "aaLarge" | "fail";

/**
 * WCAG 등급 판정.
 * - ≥7   : AAA
 * - ≥4.5 : AA (텍스트 최소)
 * - ≥3   : AA Large / 그래픽 비텍스트 대비(1.4.11) 최소 — favicon 글리프의 실질 기준
 * - <3   : 미달
 */
export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "aaa";
  if (ratio >= 4.5) return "aa";
  if (ratio >= 3) return "aaLarge";
  return "fail";
}
