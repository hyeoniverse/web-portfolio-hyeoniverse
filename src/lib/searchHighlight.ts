/**
 * Parsed search query → text 의 매칭 구간 추출 → highlight 마크업 생성.
 *
 * - excluded term 은 highlight 안 함 (부정적 매칭이라 강조할 의미 없음)
 * - required + phrases 만 highlight
 * - regex term 도 매칭 위치 추출
 */

import type { ParsedSearchQuery, SearchTerm } from "./searchQuery";

interface Span {
  start: number;
  end: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(term: SearchTerm): RegExp {
  if (term.isRegex) {
    try {
      return new RegExp(term.value, `g${term.caseSensitive ? "" : "i"}`);
    } catch {
      return /(?!)/g;
    }
  }
  const wb = term.wholeWord ? "\\b" : "";
  return new RegExp(`${wb}${escapeRegex(term.value)}${wb}`, `g${term.caseSensitive ? "" : "i"}`);
}

/** 모든 highlight term 으로 text 에서 매칭 구간 추출 후 병합 (overlap 처리). */
function extractSpans(text: string, terms: SearchTerm[]): Span[] {
  const raw: Span[] = [];
  for (const t of terms) {
    const re = buildPattern(t);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m[0].length === 0) { re.lastIndex++; continue; } // zero-width 무한루프 방지
      raw.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  if (raw.length === 0) return [];
  raw.sort((a, b) => a.start - b.start);
  const merged: Span[] = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const last = merged[merged.length - 1];
    const cur = raw[i];
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else merged.push(cur);
  }
  return merged;
}

/** OR 분기 포함 — 모든 highlight 후보 term 합치기. */
function collectHighlightTerms(parsed: ParsedSearchQuery): SearchTerm[] {
  if (parsed.or.length > 0) {
    return parsed.or.flatMap(collectHighlightTerms);
  }
  return [...parsed.required, ...parsed.phrases];
}

/** text 를 [{ text, mark }] tokens 으로 split — UI 에서 mark=true 부분만 <mark> 으로 렌더. */
export function highlightTokens(text: string, parsed: ParsedSearchQuery): Array<{ text: string; mark: boolean }> {
  if (!text) return [];
  const terms = collectHighlightTerms(parsed);
  if (terms.length === 0) return [{ text, mark: false }];
  const spans = extractSpans(text, terms);
  if (spans.length === 0) return [{ text, mark: false }];

  const tokens: Array<{ text: string; mark: boolean }> = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor) tokens.push({ text: text.slice(cursor, s.start), mark: false });
    tokens.push({ text: text.slice(s.start, s.end), mark: true });
    cursor = s.end;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), mark: false });
  return tokens;
}
