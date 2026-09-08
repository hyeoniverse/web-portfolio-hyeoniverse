/**
 * 커버 이미지 미지정 시 hash 기반 결정적 gradient fallback.
 *
 * - 같은 seed (slug/id) → 항상 같은 preset → 시각적 일관성
 * - 외부 API 0, 즉시 (런타임 CSS string)
 * - presets 풀에서 seed hash mod N 으로 하나 pick
 */

import { presets } from "@/components/posts/CoverImagePicker/presets";
import type { PresetConfig } from "@/components/posts/CoverImagePicker/gradientUtils";

/** djb2 hash — 빠르고 결정적, 분포 OK. */
function hashSeed(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** seed 로 preset 하나 결정적으로 선택. */
function pickFallbackPreset(seed: string): PresetConfig {
  const idx = hashSeed(seed) % presets.length;
  return presets[idx].config;
}

/** PresetConfig → CSS gradient string. canvas 대신 CSS background 로 빠르게 렌더. */
function presetToCssGradient(config: PresetConfig): string {
  const stops = config.stops
    .map((s) => `${s.color} ${(s.pos * 100).toFixed(0)}%`)
    .join(", ");
  if (config.type === "radial") {
    return `radial-gradient(circle at center, ${stops})`;
  }
  // linear (default)
  return `linear-gradient(${config.angle ?? 135}deg, ${stops})`;
}

/** 편의: seed 만 넘기면 바로 CSS 문자열. cover 없을 때 background 에 그대로 사용. */
export function getFallbackCoverGradient(seed: string): string {
  return presetToCssGradient(pickFallbackPreset(seed));
}
