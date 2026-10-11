/**
 * 사이트 전체 "다른 언어로 보기"의 순수한 부분 — 서버(라우트)와 브라우저가 같이 쓴다(crypto 없이).
 *
 *  1) 화면 글(UI 문자열) — 방문자 사전(locales/en.json) 전체를 언어마다 한 번 번역해 한 줄로 캐시한다.
 *     원문은 영어 사전 — 키 순서로 펼친 [열쇠, 글] 묶음. 해시는 그 묶음으로 만들어 브라우저도 같은 값을
 *     계산한다(localStorage 캐시가 지금 사전과 맞는지 서버에 묻지 않고 안다).
 *     관리자 사전(*.admin.json)은 넣지 않는다 — 관리 화면은 번역하지 않는다.
 *  2) 목록의 짧은 칸(제목 · 요약 · 부제목 · 설명) — 카드가 보이는 대로 모아 한 번에 묻는다(batch).
 */

export type SiteUiSource = [string, string][];

/** 판 — 펼치는 규칙 · 받는 규칙이 바뀌면 올린다(해시에 들어가 예전 캐시를 버린다) */
export const SITE_UI_VERSION = 1;

type Dict = { [key: string]: string | Dict };

/** 사전 → [점 열쇠, 글] (열쇠 순서). 빈 글은 뺀다 — 보낼 것이 없다 */
export function siteUiSource(dict: object): SiteUiSource {
  const out: SiteUiSource = [];
  const walk = (o: Dict, prefix: string) => {
    for (const [k, v] of Object.entries(o)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") { if (v.trim()) out.push([key, v]); }
      else if (v && typeof v === "object") walk(v, key);
    }
  };
  walk(dict as Dict, "");
  return out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

/** cyrb53 — 브라우저 · 서버가 같은 값을 내는 가벼운 해시(보안용 아님, 캐시 열쇠용) */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

/** 화면 글 묶음의 해시 — 영어 글을 고치거나 더하면 바뀌어 다음 요청이 다시 번역한다 */
export function siteUiHash(source: SiteUiSource): string {
  return cyrb53(JSON.stringify(["site-ui", SITE_UI_VERSION, source]));
}

/* ── 받을 수 있는 번역인가 ──
 * 자리표시({{n}})와 태그(<b> …)가 원문과 똑같아야 한다. 공급자가 {{n}} 을 옮기거나 빠뜨리면 숫자가 안 들어가고,
 * 태그가 늘면 innerHTML 로 그리는 글(postsPage.*Count)에 마크업이 섞여 들어온다.
 */
const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;
const TAG = /<[^>]*>/g;
const sorted = (xs: string[]) => [...xs].sort().join("\u0000");
const placeholdersOf = (s: string) => [...s.matchAll(PLACEHOLDER)].map((m) => m[1]);
const tagsOf = (s: string) => (s.match(TAG) ?? []).map((t) => t.replace(/\s+/g, "").toLowerCase());
const count = (s: string, ch: string) => s.split(ch).length - 1;

/** 번역 하나 — 쓸 수 있으면 다듬은 글({{ n }} → {{n}}), 아니면 null */
export function acceptSiteString(source: string, v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  if (sorted(placeholdersOf(v)) !== sorted(placeholdersOf(source))) return null;
  if (sorted(tagsOf(v)) !== sorted(tagsOf(source))) return null;
  /* 태그 밖에 홀로 선 < > 도 원문보다 많으면 받지 않는다 */
  if (count(v, "<") > count(source, "<") || count(v, ">") > count(source, ">")) return null;
  return v.trim().replace(PLACEHOLDER, (_, name: string) => `{{${name}}}`);
}

/**
 * 공급자 결과(source 순서) → 열쇠 → 번역. 실패한 자리 · 쓸 수 없는 번역은 뺀다(화면은 영어 글을 쓴다).
 * complete 는 모두 받았는지 — 아니면 캐시하지 않는다(다음에 다시 번역).
 */
export function assembleSiteUi(
  source: SiteUiSource,
  translations: (string | undefined)[],
  failed: Iterable<number> = [],
): { strings: Record<string, string>; complete: boolean } {
  const bad = new Set(failed);
  const strings: Record<string, string> = {};
  source.forEach(([k, text], i) => {
    const v = bad.has(i) ? null : acceptSiteString(text, translations[i]);
    if (v) strings[k] = v;
  });
  return { strings, complete: Object.keys(strings).length === source.length };
}

/** 저장된(또는 받아 온) 번역을 다시 거른다 — 지금 사전에 없는 열쇠 · 쓸 수 없는 글은 버린다 */
export function sanitizeSiteUi(source: SiteUiSource, raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  for (const [k, text] of source) {
    const v = acceptSiteString(text, r[k]);
    if (v) out[k] = v;
  }
  return out;
}

/** 공급자에 나눠 보내기 — 한 번에 maxItems 개 · maxChars 글자 넘지 않게(순서는 그대로) */
export function chunkIndices(texts: string[], maxItems = 120, maxChars = 6000): number[][] {
  const chunks: number[][] = [];
  let cur: number[] = [];
  let chars = 0;
  texts.forEach((t, i) => {
    if (cur.length && (cur.length >= maxItems || chars + t.length > maxChars)) {
      chunks.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(i);
    chars += t.length;
  });
  if (cur.length) chunks.push(cur);
  return chunks;
}

/* ── 목록 ── */

export type ListItemType = "post" | "work" | "series";
export interface ListItemRef { type: ListItemType; id: string }
/** 목록 칸의 번역 — 글: title · excerpt, 작업물: title · subtitle · description, 시리즈: title · description */
export type ListItemFields = Partial<Record<"title" | "excerpt" | "subtitle" | "description", string>>;

/** 한 요청에 묻는 항목 상한 — 한 화면의 카드 수 정도. 넘치면 다음 요청으로 */
export const LIST_BATCH_MAX = 40;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const listItemKey = (r: ListItemRef) => `${r.type}:${r.id.toLowerCase()}`;

/** 요청 본문의 항목 — 모르는 종류 · uuid 가 아닌 id 는 뺀다, 겹친 것은 하나로, 상한까지만 */
export function parseListItems(raw: unknown, max = LIST_BATCH_MAX): ListItemRef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ListItemRef[] = [];
  for (const x of raw) {
    const r = x as Partial<ListItemRef> | null;
    if (!r || (r.type !== "post" && r.type !== "work" && r.type !== "series")) continue;
    if (typeof r.id !== "string" || !UUID.test(r.id)) continue;
    const ref = { type: r.type, id: r.id.toLowerCase() };
    const key = listItemKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * 이번에 물을 항목 — 기다리는 것(pending) 중 이미 아는 것(known: 받았거나 실패) · 묻는 중(inflight)을 빼고,
 * 겹친 것은 하나로, 상한까지. 나머지는 다음 차례에 남는다.
 */
export function selectListBatch(
  pending: Iterable<ListItemRef>,
  known: (key: string) => boolean,
  inflight: ReadonlySet<string>,
  max = LIST_BATCH_MAX,
): { batch: ListItemRef[]; rest: ListItemRef[] } {
  const batch: ListItemRef[] = [];
  const rest: ListItemRef[] = [];
  const seen = new Set<string>();
  for (const ref of pending) {
    if (!UUID.test(ref.id)) continue;
    const key = listItemKey(ref);
    if (seen.has(key) || known(key) || inflight.has(key)) continue;
    seen.add(key);
    (batch.length < max ? batch : rest).push(ref);
  }
  return { batch, rest };
}
