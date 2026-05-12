/**
 * PostgREST `.or(...)` 필터에 사용자 입력을 ilike 패턴으로 끼워넣을 때 안전하게 escape.
 *
 * 이스케이프 대상:
 * - `%` / `_` : LIKE wildcard — 검색어 부분일치 검사가 다른 의미가 되지 않게
 * - `,` `(` `)` : PostgREST OR 구조 자체를 깨뜨릴 수 있음 ("col.ilike.x,col2.ilike.y" 의 구분자/그룹)
 * - `\` : escape 문자 자체
 */
export function escapeOrSearch(s: string): string {
  return s.replace(/[%_,()\\]/g, (m) => `\\${m}`);
}
