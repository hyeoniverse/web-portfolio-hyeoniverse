/**
 * 시드 + (선택) index 로부터 결정적이고 시각적으로 잘 분산된 색을 생성.
 *
 * - index 가 주어지면 hue 는 golden angle 비율로 분산 → 어떤 N 개라도 최대 시각적 분리
 * - index 가 없으면 seed 의 FNV-1a hash 로 hue
 * - 색공간은 HSL — sRGB gamut 보장으로 항상 vivid 하게 표시 (OKLCH 의 gamut 클리핑 회피)
 * - 빨간 브랜드 띠(hue ≈ 0/360) 영역만 회피:
 *     warm  35~165  (orange / yellow / lime / green)
 *     cool  175~325 (teal / blue / purple / pink / magenta)
 */

/** 명확히 구분되는 8개 hue 앵커. index % 8 로 cycle, 각 앵커 ±12° jitter 로 변주.
   brand red(0~25) 영역만 회피, 8가지 색이 시각적으로 또렷이 분리. */
const HUE_ANCHORS: ReadonlyArray<number> = [
  35,   // 0: 주황 (orange)
  60,   // 1: 호박/노랑 (amber)
  95,   // 2: 라임 (lime)
  140,  // 3: 초록 (green)
  185,  // 4: 시안 (cyan/teal)
  225,  // 5: 파랑 (blue)
  275,  // 6: 보라 (purple/violet)
  320,  // 7: 핑크/마젠타 (pink/magenta)
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

/**
 * seed (+ optional index) 기반 결정적 HSL 색 생성 (sRGB gamut 안전)
 * @param seed  같은 객체엔 같은 색이 나오도록 묶을 키 (예: id, slug)
 * @param isDark 다크 모드 여부 — lightness 미세 조정
 * @param index  주어지면 golden ratio 비율로 hue 분포 (가장 균등)
 */
/** 3가지 톤 스타일 — 인접 색이 같은 톤으로만 안 나오게 cycle */
const TONE_STYLES = [
  // vivid: 진한 채도 + 중간 명도
  { sBase: 78, sRange: 14, lBase: 56, lRange: 10 },
  // pastel: 낮은 채도 + 높은 명도 (부드러운 파스텔)
  { sBase: 55, sRange: 18, lBase: 80, lRange: 8 },
  // muted: 중간 채도 + 살짝 낮은 명도 (차분/얼리톤 느낌)
  { sBase: 38, sRange: 14, lBase: 60, lRange: 8 },
] as const;

export function generateSeededColor(seed: string, isDark: boolean, index?: number): string {
  const h = fnv1a(seed);

  // hue: 8 앵커 cycle + ±12° jitter
  const anchorIdx = index !== undefined
    ? index % HUE_ANCHORS.length
    : h % HUE_ANCHORS.length;
  const anchor = HUE_ANCHORS[anchorIdx];
  const jitterPct = (((h >>> 5) & 0xff) / 0xff - 0.5) * 2;
  const hue = (anchor + jitterPct * 12 + 360) % 360;

  // 톤: index % 3 으로 vivid → pastel → muted 순환 (index 없으면 hash)
  const toneIdx = index !== undefined
    ? index % TONE_STYLES.length
    : (h >>> 13) % TONE_STYLES.length;
  const tone = TONE_STYLES[toneIdx];

  const sJitter = (((h >>> 9) & 0x1f) / 31);
  const saturation = tone.sBase + sJitter * tone.sRange;

  // lightness 는 dark 모드에서 살짝 낮게 (-5)
  const lShift = isDark ? -5 : 0;
  const lJitter = (((h >>> 17) & 0x1f) / 31);
  const lightness = tone.lBase + lShift + lJitter * tone.lRange;

  return `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
}
