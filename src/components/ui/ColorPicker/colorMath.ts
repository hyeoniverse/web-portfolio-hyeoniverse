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

/* ── Alpha(투명도) ── source of truth 는 색(OKLCH)과 직교하는 0~1 스칼라. 색은 그대로 두고 alpha 만 얹는다. */

/** alpha(0-1) → 2자리 hex ("00"~"ff"). */
export function alphaToHex(a: number): string {
  return clamp(Math.round(a * 255), 0, 255).toString(16).padStart(2, "0");
}

/** hex6 + alpha → alpha<1 이면 `#rrggbbaa`, 불투명(1)이면 `#rrggbb` 그대로. */
export function withAlpha(hex6: string, a: number): string {
  const base = hex6.startsWith("#") ? hex6.slice(0, 7) : `#${hex6.slice(0, 6)}`;
  return a >= 1 ? base : `${base}${alphaToHex(a)}`;
}

/** valid hex + alpha (#abc, #abcd, #aabbcc, #aabbccdd) 검증 — # 보정. 색(6자리 hex) + alpha(0-1) 반환. 실패 null. */
export function normalizeHexAlpha(input: string): { hex: string; alpha: number } | null {
  const c = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(c)) return { hex: "#" + c.split("").map((x) => x + x).join(""), alpha: 1 };
  if (/^[0-9a-f]{4}$/.test(c)) {
    const rgb = c.slice(0, 3).split("").map((x) => x + x).join("");
    return { hex: "#" + rgb, alpha: clamp(parseInt(c[3] + c[3], 16) / 255, 0, 1) };
  }
  if (/^[0-9a-f]{6}$/.test(c)) return { hex: "#" + c, alpha: 1 };
  if (/^[0-9a-f]{8}$/.test(c)) return { hex: "#" + c.slice(0, 6), alpha: clamp(parseInt(c.slice(6, 8), 16) / 255, 0, 1) };
  return null;
}

/** 임의 색 문자열에서 alpha(0-1) 추출. #rgba·#rrggbbaa, rgba()/hsla() 4번째 값, oklch(... / a).
 *  alpha 토큰이 없으면 null — 호출부는 "미지정"과 "alpha=1 명시"를 구분해 불투명 소비자의 alpha 리셋을 막는다. */
export function parseAlpha(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const hex = s.replace(/^#/, "");
  if (/^[0-9a-f]{4}$/.test(hex)) return clamp(parseInt(hex[3] + hex[3], 16) / 255, 0, 1);
  if (/^[0-9a-f]{8}$/.test(hex)) return clamp(parseInt(hex.slice(6, 8), 16) / 255, 0, 1);
  // rgba()/hsla() — 값 3개 뒤 구분자 다음의 4번째 값
  const fn = s.match(/^(?:rgba?|hsla?)\(\s*[0-9.]+%?[\s,]+[0-9.]+%?[\s,]+[0-9.]+%?[\s,/]+([0-9.]+)(%?)\s*\)/);
  if (fn) return clamp(fn[2] ? parseFloat(fn[1]) / 100 : parseFloat(fn[1]), 0, 1);
  // oklch(L C H / a)
  const ok = s.match(/oklch\([^)]*\/\s*([0-9.]+)(%?)\s*\)/);
  if (ok) return clamp(ok[2] ? parseFloat(ok[1]) / 100 : parseFloat(ok[1]), 0, 1);
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

/* ── 문자열 → OKLCH ──────────────────────────────────────────────
 * 사람이 적어 넣거나 붙여넣은 색 문자열을 하나의 표현(OKLCH)으로 바꾼다.
 * 화면과 무관한 계산이라 여기 둔다. */

/** 외부 value (hex 또는 oklch string) → OKLCH 객체 */
export function parseAnyToOklch(input: string): OKLCH {
  const trimmed = input.trim();
  if (trimmed.startsWith("oklch")) {
    return parseOklchString(trimmed) ?? { l: 0, c: 0, h: 0 };
  }
  return hexToOklch(trimmed);
}

/** 붙여넣기용 — HEX / RGB / HSL / HSV / OKLCH 어떤 형식이든 자동 감지해 OKLCH 로 변환. 실패 시 null. */
export function parseAnyColorToOklch(input: string): OKLCH | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // 1. oklch(...)
  if (s.startsWith("oklch")) return parseOklchString(s);

  // 2. hex (with or without #) — 3/4/6/8 자리 (alpha 포함). 색만 OKLCH 로, alpha 는 parseAlpha 가 별도 추출
  if (s.startsWith("#") || /^[0-9a-f]{3,4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/.test(s)) {
    const parsed = normalizeHexAlpha(s.startsWith("#") ? s : `#${s}`);
    if (parsed) return hexToOklch(parsed.hex);
  }

  // 3. rgb(r, g, b) / rgba(r, g, b, a) — 0~255, alpha 무시
  const rgbMatch = s.match(/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/);
  if (rgbMatch) {
    const r = clamp(parseFloat(rgbMatch[1]), 0, 255);
    const g = clamp(parseFloat(rgbMatch[2]), 0, 255);
    const b = clamp(parseFloat(rgbMatch[3]), 0, 255);
    return hexToOklch(rgbToHex({ r, g, b }));
  }

  // 4. hsl(h, s%, l%) / hsla(...)
  const hslMatch = s.match(/^hsla?\(\s*([0-9.]+)[\s,]+([0-9.]+)%?[\s,]+([0-9.]+)%?/);
  if (hslMatch) {
    const h = clamp(parseFloat(hslMatch[1]), 0, 360);
    const sat = clamp(parseFloat(hslMatch[2]), 0, 100);
    const l = clamp(parseFloat(hslMatch[3]), 0, 100);
    return hexToOklch(hslToHex({ h, s: sat, l }));
  }

  // 5. hsv(h, s%, v%) / hsb(h, s%, b%)
  const hsvMatch = s.match(/^(?:hsv|hsb)\(\s*([0-9.]+)[\s,]+([0-9.]+)%?[\s,]+([0-9.]+)%?/);
  if (hsvMatch) {
    const h = clamp(parseFloat(hsvMatch[1]), 0, 360);
    const sat = clamp(parseFloat(hsvMatch[2]), 0, 100);
    const v = clamp(parseFloat(hsvMatch[3]), 0, 100);
    return hexToOklch(hsvToHex({ h, s: sat, v }));
  }

  // 6. bare "r, g, b" — 숫자 3개 콤마 구분 (RGB 추정)
  const bare = s.match(/^([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)$/);
  if (bare) {
    const r = clamp(parseFloat(bare[1]), 0, 255);
    const g = clamp(parseFloat(bare[2]), 0, 255);
    const b = clamp(parseFloat(bare[3]), 0, 255);
    return hexToOklch(rgbToHex({ r, g, b }));
  }

  return null;
}
