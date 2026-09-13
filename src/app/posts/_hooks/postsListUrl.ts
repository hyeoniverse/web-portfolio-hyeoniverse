import { QUERY_PARAM } from "@/constants";

/* 글 목록 주소 쿼리. 미리 그린 HTML 은 필터 없는 1쪽(기본 목록)이다. 주소가 다른 목록을 가리키면 하이드레이션 전에 목록을
   가리고(LIST_PENDING_SCRIPT), 마운트 직후 usePostsQuery 가 쿼리를 상태로 옮겨 다시 받은 뒤 표시를 뗀다. */

/** 목록을 거르는 쿼리 */
export const LIST_FILTER_PARAMS: readonly string[] = [
  QUERY_PARAM.category, QUERY_PARAM.tag, QUERY_PARAM.author, QUERY_PARAM.series, QUERY_PARAM.q,
];

/** 주소가 기본 목록과 다른 목록을 가리키는가. 인라인 스크립트로도 문자열화해 쓰므로 인자 밖의 값을 참조하지 않는다 */
export function pointsAwayFromDefaultList(search: string, filterParams: readonly string[], pageParam: string): boolean {
  const params = new URLSearchParams(search);
  return filterParams.some((key) => !!params.get(key)) || Number(params.get(pageParam)) > 1;
}

export const listPointsAway = (search: string) => pointsAwayFromDefaultList(search, LIST_FILTER_PARAMS, QUERY_PARAM.page);

/** 거른 목록을 기다리는 동안 `<html>` 에 붙는 표시. 목록 자리(그리드·쪽 번호)가 이 표시를 보고 숨는다 */
export const LIST_PENDING_ATTR = "data-posts-list-pending";

/** 목록보다 앞에서 도는 스크립트 — 주소가 기본 목록과 다르면 표시를 붙인다 */
export const LIST_PENDING_SCRIPT =
  `if((${pointsAwayFromDefaultList.toString()})(location.search,${JSON.stringify(LIST_FILTER_PARAMS)},${JSON.stringify(QUERY_PARAM.page)}))` +
  `document.documentElement.setAttribute(${JSON.stringify(LIST_PENDING_ATTR)},"")`;
