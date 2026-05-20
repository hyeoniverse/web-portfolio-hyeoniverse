/**
 * 시드 + (선택) index 로부터 결정적이고 시각적으로 잘 분산된 색을 OKLCH 로 생성.
 *
 * - index 가 주어지면 anchor hue 를 순환 배정해 인접 카드의 색 분리 보장
 * - index 가 없으면 seed 의 FNV-1a hash 로 anchor hue 결정
 * - **OKLCH** — perceptually uniform. 같은 L 값이면 색 무관 같은 밝기로 인지됨.
 * - **sRGB gamut 클리핑 회피** — 각 hue 의 안전 chroma 범위를 anchor 별로 명시 (vivid 톤도 sRGB 안)
 *
 * 색 분리 정책:
 *   - brand accent (warm pink/red, hue ≈ 0~30) 영역 회피
 *   - 12개 anchor hue: orange / amber / yellow / lime / green / teal / cyan / sky / blue / purple / magenta / pink
 *   - 5가지 톤 (vivid / pastel / muted / deep / soft) 을 index 별 cycle
 *   - 총 12 × 5 = 60 가지 결정적 조합 + hue/chroma/lightness jitter 로 미세 변주
 */

/** 12개 OKLCH hue anchor. brand accent (hue 0~30) 영역만 회피.
 *  각 anchor 별 safeChroma — sRGB gamut 클리핑 없이 vivid 까지 가는 최대 chroma 근사값 */
const HUE_ANCHORS: ReadonlyArray<{ hue: number; safeChroma: number }> = [
  { hue: 50,  safeChroma: 0.16 }, // 0:  주황 (orange)
  { hue: 75,  safeChroma: 0.17 }, // 1:  앰버 (amber)
  { hue: 100, safeChroma: 0.18 }, // 2:  옐로우 (yellow)
  { hue: 130, safeChroma: 0.20 }, // 3:  라임 (lime)
  { hue: 155, safeChroma: 0.19 }, // 4:  초록 (green)
  { hue: 180, safeChroma: 0.14 }, // 5:  틸 (teal)
  { hue: 210, safeChroma: 0.13 }, // 6:  시안 (cyan)
  { hue: 240, safeChroma: 0.15 }, // 7:  스카이 (sky)
  { hue: 265, safeChroma: 0.16 }, // 8:  파랑 (blue)
  { hue: 290, safeChroma: 0.17 }, // 9:  보라 (purple)
  { hue: 315, safeChroma: 0.18 }, // 10: 마젠타 (magenta)
  { hue: 340, safeChroma: 0.18 }, // 11: 핑크 (pink)
];

/** FNV-1a — 비슷한 문자열에도 hash 가 잘 분산됨 */
function fnv1a(s: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 5가지 톤 스타일 — 인접 색이 같은 톤으로만 안 나오게 cycle.
 *  값은 OKLCH 의 L (lightness 0~1) + chroma 의 안전 anchor.safeChroma 대비 비율 */
const TONE_STYLES = [
  // vivid: 진한 채도 + 중간 명도 (선명한 강조 톤)
  { lBase: 0.62, lRange: 0.06, cRatioBase: 0.90, cRatioRange: 0.10 },
  // pastel: 낮은 채도 + 높은 명도 (부드러운 파스텔)
  { lBase: 0.86, lRange: 0.06, cRatioBase: 0.30, cRatioRange: 0.15 },
  // muted: 중간 채도 + 살짝 낮은 명도 (얼리 / 차분)
  { lBase: 0.58, lRange: 0.08, cRatioBase: 0.40, cRatioRange: 0.15 },
  // deep: 진한 채도 + 낮은 명도 (어두운 jewel 톤)
  { lBase: 0.48, lRange: 0.06, cRatioBase: 0.80, cRatioRange: 0.15 },
  // soft: 중상 채도 + 중상 명도 (밝지만 채도 있는 톤)
  { lBase: 0.74, lRange: 0.06, cRatioBase: 0.55, cRatioRange: 0.15 },
] as const;

/**
 * seed (+ optional index) 기반 결정적 OKLCH 색 생성 (sRGB gamut 안전)
 * @param seed  같은 객체엔 같은 색이 나오도록 묶을 키 (예: id, slug)
 * @param isDark 다크 모드 여부 — lightness 미세 조정
 * @param index  주어지면 anchor cycle 로 hue 분포 (가장 균등)
 * @returns `oklch(L C H)` CSS 함수 문자열
 */
export function generateSeededColor(seed: string, isDark: boolean, index?: number): string {
  const h = fnv1a(seed);

  // hue: 12 anchor cycle + ±12° jitter
  const anchorIdx = index !== undefined
    ? index % HUE_ANCHORS.length
    : h % HUE_ANCHORS.length;
  const anchor = HUE_ANCHORS[anchorIdx];
  const jitterPct = (((h >>> 5) & 0xff) / 0xff - 0.5) * 2;
  const hue = (anchor.hue + jitterPct * 12 + 360) % 360;

  // 톤: index % 3 으로 vivid → pastel → muted 순환 (index 없으면 hash)
  const toneIdx = index !== undefined
    ? index % TONE_STYLES.length
    : (h >>> 13) % TONE_STYLES.length;
  const tone = TONE_STYLES[toneIdx];

  // chroma: anchor 의 safeChroma 에 톤 ratio 적용 → 어떤 hue 든 sRGB gamut 안전
  const cJitter = (((h >>> 9) & 0x1f) / 31);
  const chromaRatio = tone.cRatioBase + cJitter * tone.cRatioRange;
  const chroma = anchor.safeChroma * chromaRatio;

  // lightness: 다크 모드에서 살짝 낮게 (-0.04)
  const lShift = isDark ? -0.04 : 0;
  const lJitter = (((h >>> 17) & 0x1f) / 31);
  const lightness = tone.lBase + lShift + lJitter * tone.lRange;

  return `oklch(${(lightness * 100).toFixed(1)}% ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
}
