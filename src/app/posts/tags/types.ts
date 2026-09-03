/** 태그 인덱스 한 항목 — SSR 이 글 수 · 설명 · 연관 태그를 붙여 준다 */
export interface TagEntry {
  tag: string;
  count: number;
  description: string;
  related: string[];
}
