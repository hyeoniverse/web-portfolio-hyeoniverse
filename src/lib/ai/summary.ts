/**
 * AI 요약의 모양과 재료 — 서버(라우트 · 공급자 호출)와 화면(공개 요약 상자 · 편집기 칸 · 비교 모달)이 같이 쓴다.
 *
 * 저장은 posts/works 의 summary_ko · summary_en(text) 그대로다. 새 요약은 JSON 문자열
 *   {"emoji":"⚡","tldr":"제목 한 줄","blocks":[{"type":"list","items":[…]}, …],"keywords":[…],"hash":"본문 해시"}
 * 로 넣는다. 고정 칸은 제목 한 줄(tldr)과 키워드뿐이고, 나머지는 모델이 글에 맞는 블록(문단 · 목록 · 단계 · 수치 카드 ·
 * 전후 비교 · 콜아웃 · 인용 · 소제목)을 골라 쌓는다 — 글의 모양이 제각각이라 칸을 정해 두면 모든 글이 같은 틀에 눌렸다.
 * 예전 모양(body · points · note · takeaway 칸, 그보다 앞의 줄글)도 블록으로 바꿔 읽는다(마이그레이션 없음).
 * hash 는 요약을 만들 때의 본문 해시 — 발행 때 본문이 안 바뀌었으면 다시 만들지 않는다.
 */

/* ── 블록 ── */

/** 목록 · 단계의 한 줄 — 머리말(label)과 이모지는 있을 수도 없을 수도 */
export interface SummaryItem {
  label?: string;
  text: string;
  emoji?: string;
}

/** 수치 카드 하나 — 지금 값(value)과 이전 값(from). 원문이 말한 수치만 */
interface SummaryMetric {
  label: string;
  value: string;
  from?: string;
}

/** 전후 · 둘 비교의 한 줄 */
interface SummaryCompareRow {
  label: string;
  before: string;
  after: string;
}

export type CalloutTone = "tip" | "warn" | "info";

export type SummaryBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; title?: string; items: SummaryItem[] }
  | { type: "steps"; title?: string; items: SummaryItem[] }
  | { type: "metrics"; items: SummaryMetric[] }
  | { type: "compare"; title?: string; beforeLabel?: string; afterLabel?: string; items: SummaryCompareRow[] }
  | { type: "callout"; tone: CalloutTone; text: string }
  | { type: "quote"; text: string }
  | { type: "heading"; text: string };

/** 블록 수 상한 — 모델이 넘치게 쌓아도 화면은 여기까지 */
export const MAX_SUMMARY_BLOCKS = 8;

export interface StructuredSummary {
  /** 제목처럼 읽히는 한 줄 — 고정 칸(목록 미리보기 · 비교 모달이 쓴다) */
  tldr: string;
  /** 제목 줄 앞 이모지 — 없을 수 있다 */
  emoji?: string;
  /** 모델이 고른 블록들 */
  blocks?: SummaryBlock[];
  /** 키워드 칩 — 고정 칸 */
  keywords?: string[];
  /** 만들 때의 본문 해시(summaryHash). 없으면 예전 요약 */
  hash?: string;
}

/** 화면이 그릴 모양 — 구조가 있으면 블록들, 예전 줄글이면 text */
export type DisplaySummary =
  | { kind: "structured"; tldr: string; emoji: string; blocks: SummaryBlock[]; keywords: string[] }
  | { kind: "text"; text: string }
  | null;

const pickStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const pickList = (v: unknown, max = 5) => (Array.isArray(v) ? v.map(pickStr).filter(Boolean).slice(0, max) : []);
/** 이모지 하나 — 그림 글자가 들어 있고 짧을 때만(모델이 낱말을 넣는 경우를 거른다) */
const pickEmoji = (v: unknown) => {
  const s = pickStr(v);
  return s && s.length <= 8 && /\p{Extended_Pictographic}/u.test(s) && !/[\p{L}\p{N}]/u.test(s.replace(/️|‍/g, "")) ? s : "";
};
/** 짧은 글(라벨 · 수치) — 숫자로 와도 받고, 길면 자른다 */
const pickShort = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? String(v) : pickStr(v)).slice(0, max);
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** 목록 · 단계 항목 — {label, text, emoji} 와 문자열 둘 다. 문자열이 "머리말: 내용" 꼴이면 갈라 둔다 */
function pickItems(v: unknown, max = 8): SummaryItem[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, max).map((it): SummaryItem | null => {
    const o = obj(it);
    if (o) {
      const text = pickStr(o.text);
      if (!text) return null;
      const item: SummaryItem = { text };
      const label = pickShort(o.label, 40);
      const emoji = pickEmoji(o.emoji);
      if (label) item.label = label;
      if (emoji) item.emoji = emoji;
      return item;
    }
    const s = pickStr(it);
    if (!s) return null;
    const m = s.match(/^\*{0,2}([^:：*]{1,24})\*{0,2}\s*[:：]\s*(.+)$/);
    return m ? { label: m[1].trim(), text: m[2].trim() } : { text: s };
  }).filter((x): x is SummaryItem => !!x);
}

function pickMetrics(v: unknown): SummaryMetric[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 4).map((it): SummaryMetric | null => {
    const o = obj(it);
    if (!o) return null;
    const value = pickShort(o.value, 24);
    const label = pickShort(o.label, 30);
    if (!value || !label) return null;
    const from = pickShort(o.from, 24);
    return from ? { label, value, from } : { label, value };
  }).filter((x): x is SummaryMetric => !!x);
}

function pickCompare(v: unknown): SummaryCompareRow[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 6).map((it): SummaryCompareRow | null => {
    const o = obj(it);
    if (!o) return null;
    const row = { label: pickShort(o.label, 40), before: pickShort(o.before, 120), after: pickShort(o.after, 120) };
    return row.before || row.after ? row : null;
  }).filter((x): x is SummaryCompareRow => !!x);
}

/** 블록 하나 — 모르는 종류 · 빈 블록은 버린다(모델이 지시를 덜 따라도 화면이 깨지지 않게) */
function pickBlock(v: unknown): SummaryBlock | null {
  const o = obj(v);
  if (!o) return null;
  const title = pickShort(o.title, 60);
  const withTitle = <T extends object>(b: T) => (title ? { ...b, title } : b);
  switch (o.type) {
    case "paragraph": { const text = pickStr(o.text); return text ? { type: "paragraph", text } : null; }
    case "quote": { const text = pickStr(o.text); return text ? { type: "quote", text } : null; }
    case "heading": { const text = pickShort(o.text, 60); return text ? { type: "heading", text } : null; }
    case "callout": {
      const text = pickStr(o.text);
      const tone: CalloutTone = o.tone === "warn" || o.tone === "info" ? o.tone : "tip";
      return text ? { type: "callout", tone, text } : null;
    }
    case "list":
    case "steps": {
      const items = pickItems(o.items);
      return items.length ? withTitle({ type: o.type, items }) : null;
    }
    case "metrics": { const items = pickMetrics(o.items); return items.length ? { type: "metrics", items } : null; }
    case "compare": {
      const items = pickCompare(o.items);
      if (!items.length) return null;
      const b: Extract<SummaryBlock, { type: "compare" }> = { type: "compare", items };
      const beforeLabel = pickShort(o.beforeLabel, 24);
      const afterLabel = pickShort(o.afterLabel, 24);
      if (beforeLabel) b.beforeLabel = beforeLabel;
      if (afterLabel) b.afterLabel = afterLabel;
      return withTitle(b);
    }
    default: return null;
  }
}

function pickBlocks(v: unknown): SummaryBlock[] {
  if (!Array.isArray(v)) return [];
  return v.map(pickBlock).filter((b): b is SummaryBlock => !!b).slice(0, MAX_SUMMARY_BLOCKS);
}

/** 예전 칸 모양(body · metrics · points(+section) · note · takeaway)을 블록으로 — 저장된 옛 요약도 같은 화면으로 그린다 */
function legacyBlocks(o: Record<string, unknown>): SummaryBlock[] {
  const out: SummaryBlock[] = [];
  const body = pickStr(o.body);
  const metrics = pickMetrics(o.metrics);
  if (metrics.length) out.push({ type: "metrics", items: metrics });
  if (body) out.push({ type: "paragraph", text: body });
  /* points — 소제목(section)이 같은 것끼리 이어 붙여 소제목 + 목록으로 */
  if (Array.isArray(o.points)) {
    const raw = o.points.slice(0, 8);
    const items = pickItems(raw);
    let current: { section: string; items: SummaryItem[] } | null = null;
    const groups: { section: string; items: SummaryItem[] }[] = [];
    items.forEach((item, i) => {
      const section = pickShort(obj(raw[i])?.section, 30);
      if (!current || current.section !== section) { current = { section, items: [] }; groups.push(current); }
      current.items.push(item);
    });
    for (const g of groups) {
      if (g.section) out.push({ type: "heading", text: g.section });
      out.push({ type: "list", items: g.items });
    }
  }
  const note = pickStr(o.note);
  if (note) out.push({ type: "callout", tone: "info", text: note });
  const takeaway = pickStr(o.takeaway);
  if (takeaway) out.push({ type: "quote", text: takeaway });
  return out;
}

/** 한 언어 값(객체) → 구조. 블록이 있으면 그것, 없으면 예전 칸에서 */
function toStructured(o: Record<string, unknown>): StructuredSummary | null {
  const blocks = Array.isArray(o.blocks) ? pickBlocks(o.blocks) : legacyBlocks(o);
  const tldr = pickStr(o.tldr);
  if (!tldr && !blocks.length) return null;
  const s: StructuredSummary = { tldr };
  const emoji = pickEmoji(o.emoji);
  const keywords = pickList(o.keywords);
  if (emoji) s.emoji = emoji;
  if (blocks.length) s.blocks = blocks;
  if (keywords.length) s.keywords = keywords;
  return s;
}

/** 저장된 글(JSON 또는 줄글)을 화면 모양으로 */
export function parseStoredSummary(raw: string | null | undefined): DisplaySummary {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (s.startsWith("{")) {
    try {
      const o = obj(JSON.parse(s));
      const st = o && toStructured(o);
      if (st) return { kind: "structured", tldr: st.tldr, emoji: st.emoji ?? "", blocks: st.blocks ?? [], keywords: st.keywords ?? [] };
    } catch { /* 줄글로 */ }
  }
  return { kind: "text", text: s };
}

/** 저장된 글에서 본문 해시만 — 예전 줄글이면 undefined */
export function storedSummaryHash(raw: string | null | undefined): string | undefined {
  const s = (raw ?? "").trim();
  if (!s.startsWith("{")) return undefined;
  try { return pickStr((JSON.parse(s) as Record<string, unknown>).hash) || undefined; } catch { return undefined; }
}

export function serializeSummary(s: StructuredSummary): string {
  const out: Record<string, unknown> = {};
  if (s.emoji) out.emoji = s.emoji;
  out.tldr = s.tldr;
  if (s.blocks?.length) out.blocks = s.blocks;
  if (s.keywords?.length) out.keywords = s.keywords;
  if (s.hash) out.hash = s.hash;
  return JSON.stringify(out);
}

/** 공급자가 돌려준 한 언어 값 — 새 모양(blocks) · 예전 칸 모양 · 문장 하나를 다 받는다 */
export function coerceSummary(v: unknown): StructuredSummary | null {
  const o = obj(v);
  if (o) return toStructured(o);
  const text = pickStr(v);
  return text ? { tldr: text } : null;
}

/** 글 안의 가벼운 꾸밈 — **굵게** · ==형광펜== · `코드` 만. HTML 은 쓰지 않는다(화면이 조각으로 그린다) */
export type InlinePart = { kind: "text" | "strong" | "mark" | "code"; text: string };
export function parseInline(s: string): InlinePart[] {
  const out: InlinePart[] = [];
  let last = 0;
  for (const m of s.matchAll(/\*\*([^*]+)\*\*|==([^=]+)==|`([^`]+)`/g)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: s.slice(last, at) });
    out.push(m[1] !== undefined ? { kind: "strong", text: m[1] } : m[2] !== undefined ? { kind: "mark", text: m[2] } : { kind: "code", text: m[3] });
    last = at + m[0].length;
  }
  if (last < s.length) out.push({ kind: "text", text: s.slice(last) });
  return out;
}

/** 꾸밈 기호를 뗀 글 — 같음 판정 · 미리보기 */
const stripInline = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/==([^=]+)==/g, "$1").replace(/`([^`]+)`/g, "$1");

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ");
function blockToPlain(b: SummaryBlock): string {
  switch (b.type) {
    case "paragraph": case "quote": case "heading": case "callout": return b.text;
    case "list": case "steps": return join(b.title, ...b.items.map((i) => join(i.label, i.text)));
    case "metrics": return b.items.map((m) => join(m.label, m.from, m.value)).join(" ");
    case "compare": return join(b.title, ...b.items.map((r) => join(r.label, r.before, r.after)));
  }
}

/** 화면에 한 줄로 — 비교 모달의 같음 판정 · 목록 미리보기 */
export function summaryToPlain(d: DisplaySummary): string {
  if (!d) return "";
  return stripInline(d.kind === "text" ? d.text : join(d.tldr, ...d.blocks.map(blockToPlain), d.keywords.join(" ")));
}

/* ── 본문 해시 ── */

/** 짧은 안정 해시(FNV-1a 32bit, hex). 본문이 바뀌었는지만 보면 되므로 암호학적일 필요가 없다 */
export function summaryHash(...parts: (string | null | undefined)[]): string {
  const text = parts.map((p) => (p ?? "").trim()).join("\u0000");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/* ── 본문 뼈대 ── */

const decodeEntities = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

type Block = { kind: "h" | "p" | "li"; text: string };

/** HTML(또는 마크다운 비슷한 글)을 블록 목록으로 — 코드 · 이미지 · 표 · 링크 주소는 뺀다(요약에 거의 기여하지 않으면서 토큰을 많이 먹는다) */
function toBlocks(input: string): Block[] {
  let s = input;
  s = s.replace(/<(pre|code|script|style|table|svg|iframe|figure)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<img[^>]*>/gi, " ");
  s = s.replace(/```[\s\S]*?```/g, " ");
  const blocks: Block[] = [];
  const push = (kind: Block["kind"], raw: string) => {
    const text = decodeEntities(raw.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text) blocks.push({ kind, text });
  };
  if (/<(h[1-6]|p|li)\b/i.test(s)) {
    const re = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) push(m[1].toLowerCase().startsWith("h") ? "h" : m[1].toLowerCase() === "li" ? "li" : "p", m[2]);
    if (blocks.length) return blocks;
  }
  /* 태그가 없으면 줄 단위 — 마크다운 제목 · 글머리를 알아본다 */
  for (const line of s.split(/\n+/)) {
    const t = line.trim();
    if (!t) continue;
    if (/^#{1,6}\s/.test(t)) push("h", t.replace(/^#{1,6}\s/, ""));
    else if (/^[-*•]\s/.test(t) || /^\d+\.\s/.test(t)) push("li", t.replace(/^([-*•]|\d+\.)\s/, ""));
    else push("p", t);
  }
  return blocks;
}

const firstSentence = (text: string) => {
  /* 8자 이상 뒤의 첫 마침표까지 — 너무 짧은 "1." 같은 조각에서 끊기지 않게 */
  const m = text.match(/^.{8,}?[.!?。](?=\s|$)/);
  return (m ? m[0] : text).slice(0, 240);
};

/**
 * 긴 글을 요약용 뼈대로 — 제목 · 소제목 · 문단마다 첫 문장 · 글머리 항목 · 마지막 문단을 maxChars 안에 담는다.
 * 어떤 길이의 글이든 보내는 양이 고정이라 호출 비용이 같고, 글의 구조(무엇을 다뤘는지)는 끝까지 보인다.
 * 짧은 글은 그대로 전부 들어간다.
 */
export function extractSkeleton(input: string | null | undefined, maxChars = 6000): string {
  const blocks = toBlocks(input ?? "");
  if (blocks.length === 0) return "";
  const full = blocks.map((b) => (b.kind === "h" ? `## ${b.text}` : b.kind === "li" ? `- ${b.text}` : b.text)).join("\n");
  if (full.length <= maxChars) return full;

  const lines: string[] = [];
  const last = blocks[blocks.length - 1];
  blocks.forEach((b, i) => {
    if (b.kind === "h") lines.push(`## ${b.text}`);
    else if (b.kind === "li") lines.push(`- ${b.text.slice(0, 160)}`);
    else if (i === 0 || b === last) lines.push(b.text.slice(0, 600));
    else lines.push(firstSentence(b.text));
  });
  let out = lines.join("\n");
  if (out.length > maxChars) {
    /* 그래도 길면 글머리 항목부터 줄이고, 마지막엔 앞을 남기고 자른다 */
    const trimmed = lines.filter((l) => !l.startsWith("- ")).join("\n");
    out = trimmed.length <= maxChars ? trimmed : trimmed.slice(0, maxChars);
  }
  return out;
}

/* ── 관리자 옵션 ── */

/** 편집기에서 요약을 다시 만들 때 고르는 값 — 공개(방문자) 생성은 늘 기본값 */
export interface SummaryOptions {
  /** 한국어 말투 — 합니다체 · 해요체 · 평서(~다) */
  tone: "formal" | "friendly" | "plain";
  /** 분량 — 블록 수와 전체 글자 수의 상한 */
  length: "short" | "normal" | "detailed";
  /** 요약 초점 — 자동(글에 따라) / 성과(수치 · 결과) / 방법(어떻게 했는지) / 배울 점(독자가 가져갈 것) */
  focus: "auto" | "outcome" | "process" | "reader";
  /** 키워드 개수(0 이면 키워드 없음) */
  keywords: 0 | 3 | 5;
  /** 한계 · 주의 콜아웃을 허용할지 — 끄면 모델이 주의 블록을 넣지 않는다 */
  note: boolean;
  /** 추가 지시(자유 글, 300자까지) */
  instruction: string;
  /** temperature 0 ~ 1. null 이면 자동(저장 때 0.2, 다시 만들기 0.7). 1 을 넘기면 Claude 가 거절해 공급자 공통 범위로 둔다 */
  temperature: number | null;
  /** 출력 토큰 상한 — JSON 이 잘리면 늘린다 */
  maxTokens: 512 | 1024 | 2048;
  /** 이번 요청에 쓸 공급자. auto 면 설정 › 서비스의 순서(자동 전환 포함), 하나를 고르면 그 공급자만 */
  provider: "auto" | "gemini" | "openai" | "groq" | "claude";
}

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = { tone: "formal", length: "normal", focus: "auto", keywords: 5, note: true, instruction: "", temperature: null, maxTokens: 1024, provider: "auto" };

/** 요청 본문의 options 를 믿지 않고 고른 값만 받는다 — 모르는 값은 기본으로, 지시문은 300자로 자른다 */
export function sanitizeSummaryOptions(v: unknown): SummaryOptions {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const pick = <T extends string | number>(val: unknown, allowed: readonly T[], def: T): T => (allowed.includes(val as T) ? (val as T) : def);
  const d = DEFAULT_SUMMARY_OPTIONS;
  return {
    tone: pick(o.tone, ["formal", "friendly", "plain"] as const, d.tone),
    length: pick(o.length, ["short", "normal", "detailed"] as const, d.length),
    focus: pick(o.focus, ["auto", "outcome", "process", "reader"] as const, d.focus),
    keywords: pick(o.keywords, [0, 3, 5] as const, d.keywords),
    note: typeof o.note === "boolean" ? o.note : d.note,
    instruction: typeof o.instruction === "string" ? o.instruction.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 300) : "",
    temperature: typeof o.temperature === "number" && Number.isFinite(o.temperature) ? Math.round(Math.min(1, Math.max(0, o.temperature)) * 100) / 100 : null,
    maxTokens: pick(o.maxTokens, [512, 1024, 2048] as const, d.maxTokens),
    provider: pick(o.provider, ["auto", "gemini", "openai", "groq", "claude"] as const, d.provider),
  };
}
