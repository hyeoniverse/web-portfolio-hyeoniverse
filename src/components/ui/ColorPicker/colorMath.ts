/** HEX / RGB / HSL / HSV / OKLCH / CMYK 변환 — color picker 내부에서만 사용 */

export interface RGB { r: number; g: number; b: number; /* 0-255 */ }
export interface HSL { h: number; s: number; l: number; /* h: 0-360, s/l: 0-100 */ }
export interface HSV { h: number; s: number; v: number; /* h: 0-360, s/v: 0-100 */ }

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function hexToRgb(hex: string): RGB {
  const p = hex.replace("#", "").trim();
  const full = p.length === 3 ? p.split("").map((c) => c + c).join("") : p;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const t = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${t(r)}${t(g)}${t(b)}`;
}

/* ── HSL / HSV 변환 ── 표준 RGB ↔ HSL/HSV 공식 (color profile 무관) */

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0));
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

function hsvToRgb({ h, s, v }: HSV): RGB {
  const sn = s / 100, vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)       [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsl(hex: string): HSL { return rgbToHsl(hexToRgb(hex)); }
export function hslToHex(hsl: HSL): string { return rgbToHex(hslToRgb(hsl)); }
export function hexToHsv(hex: string): HSV { return rgbToHsv(hexToRgb(hex)); }
export function hsvToHex(hsv: HSV): string { return rgbToHex(hsvToRgb(hsv)); }

/** valid hex (#abc, #aabbcc) 인지 검증 — # 자동 보정 */
export function normalizeHex(input: string): string | null {
  const cleaned = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(cleaned)) {
    return "#" + cleaned.split("").map((c) => c + c).join("");
  }
  if (/^[0-9a-f]{6}$/i.test(cleaned)) {
    return "#" + cleaned.toLowerCase();
  }
  return null;
}

/* ── OKLCH 변환 ── culori 기반 */

import { converter, formatHex, parse } from "culori";

export interface OKLCH { l: number; c: number; h: number; /* l: 0-100, c: 0-0.4, h: 0-360 */ }

/** OKLCH 의 chroma 안전 max — sRGB gamut 안에서 안전한 상한. UI slider 의 max 로 사용 */
export const OKLCH_C_MAX = 0.37;

const toOklch = converter("oklch");
const toRgb = converter("rgb");

export function hexToOklch(hex: string): OKLCH {
  const parsed = parse(hex);
  if (!parsed) return { l: 0, c: 0, h: 0 };
  const o = toOklch(parsed);
  return {
    l: Math.round((o.l ?? 0) * 1000) / 10,
    c: Math.round((o.c ?? 0) * 1000) / 1000,
    h: Math.round(o.h ?? 0),
  };
}

export function oklchToHex({ l, c, h }: OKLCH): string {
  const rgb = toRgb({ mode: "oklch", l: l / 100, c, h });
  // sRGB gamut 밖이면 clipping. culori 가 자체 clamp
  return formatHex(rgb) ?? "#000000";
}

/** OKLCH → raw sRGB (0~1 범위, gamut 밖이면 음수/1초과 그대로). canvas 그릴 때 out-of-gamut 판정 위해 사용 */
export function oklchToRgbRaw({ l, c, h }: OKLCH): { r: number; g: number; b: number } {
  const rgb = toRgb({ mode: "oklch", l: l / 100, c, h });
  return { r: rgb?.r ?? 0, g: rgb?.g ?? 0, b: rgb?.b ?? 0 };
}

/** 주어진 L/H 에서 sRGB gamut 안에 들어오는 max chroma 를 binary search 로 찾음.
 *  ColorPicker 에서 C 값이 dome (sRGB gamut) 밖으로 못 가게 clamp 할 때 사용. */
export function maxSafeChroma(l: number, h: number): number {
  let lo = 0;
  let hi = OKLCH_C_MAX;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const { r, g, b } = oklchToRgbRaw({ l, c: mid, h });
    const inGamut = r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
    if (inGamut) lo = mid;
    else hi = mid;
  }
  return Math.round(lo * 1000) / 1000;
}

/** OKLCH CSS 문자열 → OKLCH 객체. format 검증 + parse 실패 시 null */
export function parseOklchString(input: string): OKLCH | null {
  const parsed = parse(input.trim());
  if (!parsed) return null;
  const o = toOklch(parsed);
  if (o === undefined) return null;
  return {
    l: Math.round((o.l ?? 0) * 1000) / 10,
    c: Math.round((o.c ?? 0) * 1000) / 1000,
    h: Math.round(o.h ?? 0),
  };
}

/** OKLCH 객체 → CSS 문자열 `oklch(L% C H)` */
export function formatOklch({ l, c, h }: OKLCH): string {
  return `oklch(${l.toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(0)})`;
}

