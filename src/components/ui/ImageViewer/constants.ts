/* ── ImageViewer Constants ── */

export const SWIPE_THRESHOLD = 50;
export const DISMISS_THRESHOLD = 100;
export const IDLE_MS = 2500;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.5;
export const AUTOPLAY_INTERVALS = [2000, 4000, 6000, 8000] as const;
export const SLIDE_OFFSET = 200;
/* 포인터가 이만큼 이상 움직였으면 클릭이 아니라 드래그로 간주 — 팬(이동) 후 배경 닫힘 방지 */
export const CLICK_MOVE_TOLERANCE = 8;
