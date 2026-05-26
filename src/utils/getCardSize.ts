import type { CardSize } from "@/data/projects";

/** Flow 레이아웃 카드 사이즈 — sort_order 에서 cycle 로 derive.
 *  5종 (large/small/medium/tall/wide) 가 sort 순서대로 반복돼 갤러리 리듬감 보장.
 *  관리자가 작품마다 선택할 필요 없이 단일 source (sort_order) 에서 자동 결정. */
const CARD_SIZE_CYCLE: readonly CardSize[] = ["large", "small", "medium", "tall", "wide"] as const;

export function getCardSize(sortOrder: number | undefined | null): CardSize {
  const n = typeof sortOrder === "number" && sortOrder > 0 ? sortOrder : 1;
  return CARD_SIZE_CYCLE[(n - 1) % CARD_SIZE_CYCLE.length];
}
