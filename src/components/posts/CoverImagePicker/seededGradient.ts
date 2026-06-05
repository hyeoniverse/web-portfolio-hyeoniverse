/**
 * 시드(예: post.slug / post.id) 기반 deterministic preset 선택 + CSS gradient 문자열.
 * cover 가 비어있는 카드/배너의 placeholder 배경으로 사용 — 같은 글은 항상 같은 그라데이션.
 */

import { presets } from "./presets";
import type { PresetConfig } from "./gradientUtils";

/* 간단 해시 — 짧은 string → 안정적 32-bit 정수 */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** PresetConfig → CSS gradient 문자열 (linear / radial) */
function presetToCss(c: PresetConfig): string {
  const stops = c.stops.map((s) => `${s.color} ${(s.pos * 100).toFixed(0)}%`).join(", ");
  if (c.type === "radial") {
    return `radial-gradient(circle at center, ${stops})`;
  }
  const angle = c.angle ?? 135;
  return `linear-gradient(${angle}deg, ${stops})`;
}

/** 시드 → preset 인덱스 → CSS gradient 문자열 */
export function seededGradient(seed: string): string {
  if (!seed || presets.length === 0) {
    return "linear-gradient(135deg, oklch(20% 0.02 240), oklch(35% 0.04 280))";
  }
  const idx = hashSeed(seed) % presets.length;
  return presetToCss(presets[idx].config);
}
