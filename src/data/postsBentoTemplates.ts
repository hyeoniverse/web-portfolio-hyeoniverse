export type CardType = "wide" | "banner" | "square" | "portrait" | "standard";

// 10 items / 12 cells — 1 wide(2) + 1 banner(2) + 8 singles. dense packing 으로 backfill.
const TEMPLATE_A: CardType[] = [
  "banner",
  "standard",
  "standard",
  "wide",
  "portrait",
  "square",
  "standard",
  "standard",
  "portrait",
  "standard",
];
const TEMPLATE_B: CardType[] = [
  "wide",
  "portrait",
  "standard",
  "standard",
  "square",
  "banner",
  "standard",
  "portrait",
  "standard",
  "standard",
];
const TEMPLATE_C: CardType[] = [
  "standard",
  "square",
  "portrait",
  "wide",
  "standard",
  "banner",
  "standard",
  "portrait",
  "standard",
  "standard",
];
const BENTO_TEMPLATES = [TEMPLATE_A, TEMPLATE_B, TEMPLATE_C];

/** idx → 벤토 카드 타입 (10개 주기로 A/B/C 템플릿 순환) */
export function getCardType(idx: number): CardType {
  const cycleLen = 10;
  const cycle = Math.floor(idx / cycleLen);
  const pos = idx % cycleLen;
  return BENTO_TEMPLATES[cycle % BENTO_TEMPLATES.length][pos];
}
