import { fillTemplate } from "@/utils/format";

/** 목록 페이지당 개수 — posts 목록 · 태그 페이지 · 시리즈 인덱스 공통 */
const PER_PAGE_VALUES = [10, 20, 50] as const;

/** 페이지당 개수 Select 옵션. 라벨("10개씩" / "10 per page")은 화면 언어로 만든다 */
export function perPageOptions(t: (key: string) => string) {
  return PER_PAGE_VALUES.map((n) => ({ value: String(n), label: fillTemplate(t("postsPage.perPage"), { n }) }));
}
