import type { PresetConfig } from "./gradientUtils";

export interface CoverPreset {
  id: string;
  name: string;
  config: PresetConfig;
}

/**
 * 커버 이미지 프리셋 — declarative config (PresetConfig).
 * 프리셋 클릭 시 editor 가 이 config 를 그대로 받아 stops/angle/type 으로 로드 →
 * 사용자가 추가 편집 후 "사용" 버튼으로 최종 업로드.
 *
 * angle 135 = (0,0) → (w,h) 방향 (top-left → bottom-right). 대부분 프리셋은 같은 방향.
 */
export const presets: CoverPreset[] = [
  // ── Warm ──
  {
    id: "warm-sunset",
    name: "Sunset",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#ff6b35", pos: 0 },
        { color: "#f7931e", pos: 0.5 },
        { color: "#e84393", pos: 1 },
      ],
    },
  },
  {
    id: "warm-amber",
    name: "Amber",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#f6d365", pos: 0 },
        { color: "#fda085", pos: 1 },
      ],
    },
  },
  {
    id: "warm-coral",
    name: "Coral",
    config: {
      type: "radial",
      stops: [
        { color: "#ff9a9e", pos: 0 },
        { color: "#fad0c4", pos: 0.5 },
        { color: "#fbc2eb", pos: 1 },
      ],
    },
  },
  {
    id: "warm-peach",
    name: "Peach",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#ffecd2", pos: 0 },
        { color: "#fcb69f", pos: 1 },
      ],
    },
  },

  // ── Cool ──
  {
    id: "cool-ocean",
    name: "Ocean",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#667eea", pos: 0 },
        { color: "#764ba2", pos: 1 },
      ],
    },
  },
  {
    id: "cool-midnight",
    name: "Midnight",
    config: {
      type: "linear",
      // (0,0,w*0.5,h) — 더 vertical 한 방향. 약 160°
      angle: 160,
      stops: [
        { color: "#0f0c29", pos: 0 },
        { color: "#302b63", pos: 0.5 },
        { color: "#24243e", pos: 1 },
      ],
    },
  },
  {
    id: "cool-arctic",
    name: "Arctic",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#e0eafc", pos: 0 },
        { color: "#cfdef3", pos: 1 },
      ],
    },
  },
  {
    id: "cool-teal",
    name: "Teal",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#11998e", pos: 0 },
        { color: "#38ef7d", pos: 1 },
      ],
    },
  },

  // ── Neutral ──
  {
    id: "neutral-slate",
    name: "Slate",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#2c3e50", pos: 0 },
        { color: "#4ca1af", pos: 1 },
      ],
    },
  },
  {
    id: "neutral-ivory",
    name: "Ivory",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#f5f5f0", pos: 0 },
        { color: "#e8e4dd", pos: 1 },
      ],
    },
  },
  {
    id: "neutral-charcoal",
    name: "Charcoal",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#232526", pos: 0 },
        { color: "#414345", pos: 1 },
      ],
    },
  },
  {
    id: "neutral-sand",
    name: "Sand",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#d4c5a9", pos: 0 },
        { color: "#c2b091", pos: 1 },
      ],
    },
  },

  // ── Vibrant ──
  {
    id: "vibrant-neon",
    name: "Neon",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#f953c6", pos: 0 },
        { color: "#b91d73", pos: 1 },
      ],
    },
  },
  {
    id: "vibrant-aurora",
    name: "Aurora",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#00c6ff", pos: 0 },
        { color: "#7c3aed", pos: 0.5 },
        { color: "#0072ff", pos: 1 },
      ],
    },
  },
  {
    id: "vibrant-tropical",
    name: "Tropical",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#fa709a", pos: 0 },
        { color: "#fee140", pos: 1 },
      ],
    },
  },
  {
    id: "vibrant-electric",
    name: "Electric",
    config: {
      type: "linear",
      angle: 135,
      stops: [
        { color: "#4facfe", pos: 0 },
        { color: "#00f2fe", pos: 1 },
      ],
    },
  },
];
