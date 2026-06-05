/**
 * Parsed search query → Supabase (PostgREST) 필터 적용.
 *
 * 지원:
 *  - required / phrases (AND, 컬럼 OR)
 *  - excluded (모든 컬럼에 NOT)
 *  - case-sensitive: like / match
 *  - whole word: Postgres `\m\M` 단어 boundary 사용 (~ / ~*)
 *  - regex: 사용자가 입력한 regex 그대로 ~ / ~*
 *  - OR 분기: nested PostgREST filter (or(and(or(...),...),...))
 */

import { parseSearchQuery, type ParsedSearchQuery, type SearchTerm, type SyntaxMode } from "@/lib/searchQuery";
import { escapeOrSearch } from "./search";

type AnyQuery = {
  or: (filter: string) => AnyQuery;
  not: (column: string, operator: string, value: string) => AnyQuery;
};

function escapeRegexForPostgres(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function termOperator(term: SearchTerm): "like" | "ilike" | "match" | "imatch" {
  if (term.isRegex || term.wholeWord) return term.caseSensitive ? "match" : "imatch";
  return term.caseSensitive ? "like" : "ilike";
}

/** column.op. 뒤에 들어가는 raw value 부분 — or-string 안 특수문자 escape 포함. */
function termValueForFilter(term: SearchTerm): string {
  if (term.isRegex) return escapeOrSearch(term.value);
  if (term.wholeWord) return `\\m${escapeOrSearch(escapeRegexForPostgres(term.value))}\\M`;
  return `%${escapeOrSearch(term.value)}%`;
}

/** OR 가 없을 때 — query 에 .or() + .not() chain 적용 (각 chain = AND). */
function applyGroup<Q extends AnyQuery>(query: Q, group: ParsedSearchQuery, columns: string[]): Q {
  let result = query;
  for (const term of [...group.required, ...group.phrases]) {
    const op = termOperator(term);
    const val = termValueForFilter(term);
    const filter = columns.map((c) => `${c}.${op}.${val}`).join(",");
    result = result.or(filter) as Q;
  }
  for (const term of group.excluded) {
    const op = termOperator(term);
    const val = termValueForFilter(term);
    for (const col of columns) {
      result = result.not(col, op, val) as Q;
    }
  }
  return result;
}

/** OR 분기 안 한 group 을 nested filter string 으로 변환. */
function buildGroupFilter(group: ParsedSearchQuery, columns: string[]): string | null {
  const conditions: string[] = [];

  for (const term of [...group.required, ...group.phrases]) {
    const op = termOperator(term);
    const val = termValueForFilter(term);
    const cf = columns.map((c) => `${c}.${op}.${val}`);
    conditions.push(cf.length === 1 ? cf[0] : `or(${cf.join(",")})`);
  }
  for (const term of group.excluded) {
    const op = termOperator(term);
    const val = termValueForFilter(term);
    const cf = columns.map((c) => `not.${c}.${op}.${val}`);
    conditions.push(cf.length === 1 ? cf[0] : `and(${cf.join(",")})`);
  }

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return `and(${conditions.join(",")})`;
}

export interface ApplySearchOptions {
  search: string;
  mode?: SyntaxMode;
  columns: string[];
}

export function applySearchQuery<Q extends AnyQuery>(query: Q, { search, mode = "prefix", columns }: ApplySearchOptions): Q {
  const parsed = parseSearchQuery(search, mode);

  if (parsed.or.length === 0) return applyGroup(query, parsed, columns);

  // OR 분기 — nested filter 한 줄로 합쳐서 .or() 호출
  const groupFilters = parsed.or
    .map((g) => buildGroupFilter(g, columns))
    .filter((f): f is string => f !== null);

  if (groupFilters.length === 0) return query;
  return query.or(groupFilters.join(",")) as Q;
}
