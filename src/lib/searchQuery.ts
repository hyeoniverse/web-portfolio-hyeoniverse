/**
 * 검색 쿼리 파서 + 매칭 — 두 가지 syntax 모드 지원.
 *
 * 공통 syntax:
 *   word            — 필수 포함 (loose)
 *   +word           — 필수 (명시적)
 *   -word           — 제외
 *   "exact phrase"  — 정확한 구문 (공백 포함)
 *   a OR b          — 둘 중 하나
 *
 * Prefix mode (default — 친화적):
 *   c:word          — case sensitive 만
 *   w:word          — whole word 만
 *   cw:word / wc:word — 둘 다
 *   c:"phrase"      — phrase + case sensitive (조합 가능)
 *
 * Regex mode (강력):
 *   /pattern/       — 정확한 regex (case sensitive)
 *   /pattern/i      — case insensitive flag
 *   /\bword\b/i     — whole word + case insensitive
 */

export type SyntaxMode = "prefix" | "regex";

export interface SearchOptions {
  syntaxMode?: SyntaxMode;
}

export interface SearchTerm {
  value: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  /** regex mode 에서 사용자가 직접 입력한 패턴 — value 가 regex source 그대로. */
  isRegex?: boolean;
}

export interface ParsedSearchQuery {
  required: SearchTerm[];
  excluded: SearchTerm[];
  phrases: SearchTerm[];
  or: ParsedSearchQuery[];
}

/* ── Tokenizers ──────────────────────────────────────────── */

const PREFIX_TOKEN_REGEX = /([+-]?)(cw:|wc:|c:|w:)?(?:"([^"]+)"|(\S+))/g;
const REGEX_TOKEN_REGEX = /([+-]?)(?:"([^"]+)"|\/((?:\\\/|[^\/])+)\/([a-z]*)|(\S+))/g;

function parsePrefixGroup(q: string): ParsedSearchQuery {
  const required: SearchTerm[] = [];
  const excluded: SearchTerm[] = [];
  const phrases: SearchTerm[] = [];
  PREFIX_TOKEN_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PREFIX_TOKEN_REGEX.exec(q))) {
    const [, sign, modifier, phrase, word] = m;
    const value = phrase ?? word ?? "";
    if (!value) continue;
    const mod = (modifier ?? "").replace(":", "");
    const term: SearchTerm = {
      value,
      caseSensitive: mod.includes("c"),
      wholeWord: mod.includes("w"),
    };
    if (sign === "-") excluded.push(term);
    else if (phrase) phrases.push(term);
    else required.push(term);
  }
  return { required, excluded, phrases, or: [] };
}

function parseRegexGroup(q: string): ParsedSearchQuery {
  const required: SearchTerm[] = [];
  const excluded: SearchTerm[] = [];
  const phrases: SearchTerm[] = [];
  REGEX_TOKEN_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REGEX_TOKEN_REGEX.exec(q))) {
    const [, sign, phrase, regexPattern, regexFlags, word] = m;
    if (regexPattern !== undefined) {
      const flags = regexFlags ?? "";
      const term: SearchTerm = {
        value: regexPattern,
        caseSensitive: !flags.includes("i"),
        wholeWord: false,
        isRegex: true,
      };
      if (sign === "-") excluded.push(term);
      else required.push(term);
      continue;
    }
    const value = phrase ?? word ?? "";
    if (!value) continue;
    const term: SearchTerm = { value, caseSensitive: false, wholeWord: false };
    if (sign === "-") excluded.push(term);
    else if (phrase) phrases.push(term);
    else required.push(term);
  }
  return { required, excluded, phrases, or: [] };
}

export function parseSearchQuery(q: string, mode: SyntaxMode = "prefix"): ParsedSearchQuery {
  const trimmed = q.trim();
  if (!trimmed) return { required: [], excluded: [], phrases: [], or: [] };
  const orSplit = trimmed.split(/\s+OR\s+/);
  const parse = mode === "regex" ? parseRegexGroup : parsePrefixGroup;
  if (orSplit.length === 1) return parse(trimmed);
  return { required: [], excluded: [], phrases: [], or: orSplit.map(parse) };
}

/* ── Matcher ─────────────────────────────────────────────── */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPattern(term: SearchTerm): RegExp {
  if (term.isRegex) {
    try {
      return new RegExp(term.value, term.caseSensitive ? "" : "i");
    } catch {
      // invalid regex — fallback: 항상 false 매칭되도록 매칭 불가능 패턴
      return /(?!)/;
    }
  }
  const wb = term.wholeWord ? "\\b" : "";
  return new RegExp(`${wb}${escapeRegex(term.value)}${wb}`, term.caseSensitive ? "" : "i");
}

function matchGroup(text: string, group: ParsedSearchQuery): boolean {
  for (const t of group.required) if (!buildPattern(t).test(text)) return false;
  for (const t of group.phrases) if (!buildPattern(t).test(text)) return false;
  for (const t of group.excluded) if (buildPattern(t).test(text)) return false;
  return true;
}

export function matchesQuery(text: string, parsed: ParsedSearchQuery): boolean {
  if (parsed.or.length > 0) return parsed.or.some((g) => matchGroup(text, g));
  return matchGroup(text, parsed);
}

export function searchMatches(text: string, query: string, mode: SyntaxMode = "prefix"): boolean {
  return matchesQuery(text, parseSearchQuery(query, mode));
}
