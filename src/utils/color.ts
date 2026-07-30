/** RGB 색상 튜플 [r, g, b] (각 0-255) */
export type Rgb = [number, number, number];

/** hex(#rrggbb) → [r, g, b]. 형식이 안 맞으면 null */
export function hexToRgb(hex: string): Rgb | null {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** 두 RGB 를 t(0~1)로 선형 보간 */
export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** [r, g, b] → hex(#rrggbb). 각 채널 0~255 클램프 */
export function rgbHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}
