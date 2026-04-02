/** Checkerboard pattern for transparent-color indicators */
export const CHECKER_BG =
  "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 6px 6px";

/** Column-group background presets (transparent + warm/cool tints) */
export const COLUMN_BG_PRESETS = [
  "transparent",
  "#fef3c7",
  "#dcfce7",
  "#dbeafe",
  "#fce7f3",
  "#f3e8ff",
  "#fee2e2",
  "#f3f4f6",
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
