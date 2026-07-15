/** 게시물 제목 최대 글자수 — UI(input maxLength) · API 검증 · DB CHECK 3계층 공통 상수 */
export const POST_TITLE_MAX = 120;

/** API 검증 — title/title_en 이 문자열이면서 상한 초과 시 true (input maxLength 와 동일한 UTF-16 length 기준) */
export function titleTooLong(v: unknown): boolean {
  return typeof v === "string" && v.length > POST_TITLE_MAX;
}

/** 자동 생성(자동번역 등) 제목을 상한으로 잘라 저장 — 사용자 입력이 아니라 조용히 truncate */
export function clampTitle<T extends string | null | undefined>(v: T): T {
  return (typeof v === "string" ? v.slice(0, POST_TITLE_MAX) : v) as T;
}
