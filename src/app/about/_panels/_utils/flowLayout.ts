
/* ── SVG Layout Constants (Horizontal Zigzag) ── */
const STEP_GAP = 138;
const PAD_X = 68;
const LANE_TOP = 26;
const LANE_MAIN: [number, number] = [80, 142];
const LANE_BRANCH = 245;
const LANE_MULTI = [40, 112, 184, 256];

export const ACTION_W = 132;
export const ACTION_H = 38;
export const TERMINAL_W = 112;
export const TERMINAL_H = 34;
export const DIAMOND_W = 96;
export const DIAMOND_H = 62;

/* ── Position helpers ── */

export function nodeX(step: number) {
  return PAD_X + step * STEP_GAP;
}

export function nodeY(lane: number, step: number, override?: number) {
  if (override != null) return override;
  if (lane === 2) return LANE_TOP;
  if (lane === 1) return LANE_BRANCH;
  if (lane >= 3) return LANE_MULTI[lane - 3] ?? LANE_BRANCH;
  return LANE_MAIN[step % 2];
}

/* ── SVG dimensions ── */

/* ── Edge path builder (orthogonal elbow) ── */

/* ── Edge label position ── */

