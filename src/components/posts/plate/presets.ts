/** Checkerboard pattern for transparent-color indicators */
export const CHECKER_BG =
  "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 6px 6px";

/** 열블록 "기본" 배경 — 의도적으로 테마 고정값. --bg-primary 토큰은 라이트/다크에서 값이 뒤집혀
 *  기본 배경이 테마 따라 바뀌므로, 고정 뉴트럴(라이트 neutral-50)로 고정해 일관 유지. */
export const COLUMN_DEFAULT_BG = "oklch(97.3% 0.0082 91.48)";

/** 개별 열 px 너비 상·하한. 상한은 본문 폭(~800px)의 약 2배 — 넘치면 스크롤. */
export const COLUMN_MIN_PX = 40;
export const COLUMN_MAX_PX = 1600;
/** 열블록 전체 폭 상한(px) — 가로 스크롤이 과하게 길어지지 않게 (본문 폭의 약 3배). */
export const COLUMN_GROUP_MAX_PX = 2400;

/** Named color preset (hex + 한/영 이름) — swatch tooltip 용 */
export type NamedColor = { hex: string; ko: string; en: string };

/** Column-group background presets (warm/cool tints) — 이름 포함 */
export const COLUMN_BG_NAMED: NamedColor[] = [
  { hex: "#fef3c7", ko: "노랑", en: "Yellow" },
  { hex: "#dcfce7", ko: "초록", en: "Green" },
  { hex: "#dbeafe", ko: "파랑", en: "Blue" },
  { hex: "#fce7f3", ko: "분홍", en: "Pink" },
  { hex: "#f3e8ff", ko: "보라", en: "Purple" },
  { hex: "#fee2e2", ko: "빨강", en: "Red" },
  { hex: "#f3f4f6", ko: "회색", en: "Gray" },
];

/** Column divider(line) presets — 이름 포함 */
export const COLUMN_LINE_NAMED: NamedColor[] = [
  { hex: "#d1d5db", ko: "밝은 회색", en: "Light gray" },
  { hex: "#374151", ko: "진회색", en: "Dark gray" },
  { hex: "#000000", ko: "검정", en: "Black" },
  { hex: "#ef4444", ko: "빨강", en: "Red" },
  { hex: "#3b82f6", ko: "파랑", en: "Blue" },
  { hex: "#22c55e", ko: "초록", en: "Green" },
  { hex: "#8b5cf6", ko: "보라", en: "Purple" },
];

/** @deprecated 이름 포함 COLUMN_BG_NAMED 사용 */
export const COLUMN_BG_PRESETS = [
  "transparent",
  ...COLUMN_BG_NAMED.map((c) => c.hex),
];

/** Callout background presets (Notion-inspired palette) */
export const CALLOUT_BG_PRESETS = [
  { color: "var(--bg-primary)" },
  { color: "var(--bg-tertiary)" },
  { color: "#e8d5b7" }, // 갈색 (Notion brown)
  { color: "#fedba0" }, // 노랑 (Notion yellow)
  { color: "#fbd5a0" }, // 주황 (Notion orange)
  { color: "#f5c2c2" }, // 빨강 (Notion red)
  { color: "#e8d0f0" }, // 보라 (Notion purple)
  { color: "#c5dbf0" }, // 파랑 (Notion blue)
  { color: "#c5e8d0" }, // 초록 (Notion green)
  { color: "#d4d4d4" }, // 회색 (Notion gray)
];
