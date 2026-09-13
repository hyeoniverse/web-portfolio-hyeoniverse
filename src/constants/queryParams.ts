/** URL 쿼리 파라미터 키 — client(set) ↔ server(get) 계약.
 *  한쪽 오타 시 페이지네이션·필터가 조용히 깨지므로 단일 소스로 고정한다. */
export const QUERY_PARAM = {
  page: "page",
  limit: "limit",
  q: "q",
  category: "category",
  sort: "sort",
  tag: "tag",
  series: "series",
  author: "author",
} as const;
