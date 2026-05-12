/** HSV / HEX / RGB 변환 — color picker 내부에서만 사용 */

export interface HSV { h: number; s: number; v: number; /* h: 0-360, s/v: 0-100 */ }
export interface RGB { r: number; g: number; b: number; /* 0-255 */ }

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string): RGB {
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

export function rgbToHsv({ r, g, b }: RGB): HSV {
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

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const sn = s / 100, vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)        [r, g, b] = [c, x, 0];
  else if (h < 120)  [r, g, b] = [x, c, 0];
  else if (h < 180)  [r, g, b] = [0, c, x];
  else if (h < 240)  [r, g, b] = [0, x, c];
  else if (h < 300)  [r, g, b] = [x, 0, c];
  else               [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

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
