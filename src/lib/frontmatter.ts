/**
 * `---` 로 감싼 머리말 + 본문 분리.
 *
 * 원래 sync-posts.ts 안에 있던 파서를 꺼낸 것이다. posts·works 에 이어 about 까지
 * 셋이 같은 형식을 읽으므로 규칙이 한 곳에 있어야 한다. scripts 밑이 아니라 여기 있는
 * 이유는 두 가지다 — vitest 가 `src/**` 만 훑고, 나중에 API 쪽 검증도 같은 파서로
 * 읽어야 하기 때문이다. 동기화 스크립트는 tsx 가 `@/` 를 풀어 주므로 그대로 쓴다.
 *
 * 일부러 YAML 을 다 지원하지 않는다. 다루는 것은 평면 `key: value` 와 한 줄 배열
 * `[a, b]` 뿐이다. 지금 쓰는 머리말이 그 범위 안에 있고, 중첩이 필요해지는 시점
 * (Backend 패널의 endpoints·columns)에 가서 yaml 의존성을 들일지 정한다.
 *
 * 값은 전부 문자열이나 문자열 배열로 돌려준다. 숫자·불리언 해석은 호출부가 한다 —
 * 필드마다 허용 범위가 달라서(난이도 1~3, published 는 여러 표기) 여기서 일괄로
 * 바꾸면 오히려 호출부가 되돌려야 한다.
 */

export type FrontmatterValue = string | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

export interface ParsedMarkdown {
  meta: Frontmatter;
  /** 머리말을 걷어낸 본문. 머리말이 없으면 원본 그대로. */
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

/** 앞뒤 따옴표 한 겹만 벗긴다. 본문에 든 따옴표는 건드리지 않는다. */
function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(raw: string): ParsedMarkdown {
  const meta: Frontmatter = {};
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { meta, body: raw };

  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      meta[key] = inner === "" ? [] : inner.split(",").map(unquote);
    } else {
      meta[key] = unquote(value);
    }
  }

  return { meta, body: raw.slice(match[0].length) };
}

/** 배열로 쓰였든 단일 값으로 쓰였든 배열로 받는다 (`tags: a` 와 `tags: [a]` 를 같게). */
export function asArray(value: FrontmatterValue | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** 정수로 읽되 범위를 벗어나거나 숫자가 아니면 undefined. */
export function asInt(value: FrontmatterValue | undefined, min: number, max: number): number | undefined {
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return undefined;
  return n;
}

const TRUE_WORDS = new Set(["true", "yes", "on", "1"]);
const FALSE_WORDS = new Set(["false", "no", "off", "0"]);

/** 표기가 여럿이라(true/yes/on/1) 한 곳에서 처리한다. 어느 쪽도 아니면 undefined. */
export function asBool(value: FrontmatterValue | undefined): boolean | undefined {
  if (typeof value !== "string") return undefined;
  const word = value.trim().toLowerCase();
  if (TRUE_WORDS.has(word)) return true;
  if (FALSE_WORDS.has(word)) return false;
  return undefined;
}
