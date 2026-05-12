/** ──────────────────────────────────────────────────────────────────
 *  Cover image picker — 그라데이션 공유 유틸
 *  preset / custom editor 모두 이 정의를 통해 렌더 + 직렬화.
 *  ────────────────────────────────────────────────────────────────── */

export type GradientType = "linear" | "radial";

export interface Stop { color: string; pos: number /* 0~1 */ }

export interface PresetConfig {
  type: GradientType;
  /** linear 일 때만 의미 — 기본 135° */
  angle?: number;
  /** 그라데이션 영역 크기 multiplier (default 1) */
  size?: number;
  /** stop 위치 power curve (default 1) */
  speed?: number;
  stops: Stop[];
}

/** angle(0-360 deg) → (x0,y0,x1,y1) 좌표 (canvas linear gradient 용) */
function angleToCoords(angle: number, w: number, h: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.max(w, h);
  return {
    x0: cx - Math.cos(rad) * (len / 2),
    y0: cy - Math.sin(rad) * (len / 2),
    x1: cx + Math.cos(rad) * (len / 2),
    y1: cy + Math.sin(rad) * (len / 2),
  };
}

/** PresetConfig 를 canvas 에 그림 — 미리보기 / 풀사이즈 모두 사용 */
export function renderGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: PresetConfig,
) {
  const { type, angle = 135, size = 1, speed = 1, stops } = config;
  let g: CanvasGradient;
  if (type === "radial") {
    g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6 * size);
  } else {
    const { x0, y0, x1, y1 } = angleToCoords(angle, w * size, h * size);
    g = ctx.createLinearGradient(x0, y0, x1, y1);
  }
  [...stops]
    .sort((a, b) => a.pos - b.pos)
    .forEach((s) => {
      const p = Math.pow(Math.max(0, Math.min(1, s.pos)), speed);
      g.addColorStop(Math.max(0, Math.min(1, p)), s.color);
    });
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
