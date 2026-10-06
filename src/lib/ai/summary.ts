/**
 * AI 요약의 모양과 재료 — 서버(라우트 · 공급자 호출)와 화면(공개 요약 상자 · 편집기 칸 · 비교 모달)이 같이 쓴다.
 *
 * 저장은 posts/works 의 summary_ko · summary_en(text) 그대로다. 새 요약은 JSON 문자열
 *   {"tldr":"한 문장","points":["핵심","핵심"],"hash":"본문 해시"}
 * 로 넣고, 예전에 저장된 줄글은 그대로 문단으로 읽는다(마이그레이션 없음).
 * hash 는 요약을 만들 때의 본문 해시 — 발행 때 본문이 안 바뀌었으면 다시 만들지 않는다.
 */

export interface StructuredSummary {
  /** 제목처럼 읽히는 한 줄 */
  tldr: string;
  /** 본문 2~3문장 — 무엇을 어떻게 했고 무엇이 나왔는지 */
  body?: string;
  /** 덧붙임 한 문장(한계 · 주의 · 전제) — 흐리게 보인다. 없을 수 있다 */
  note?: string;
  /** 키워드 칩 3~5개 */
  keywords?: string[];
  /** 강조색 마무리 한 줄 — 누가 읽으면 좋은지 · 가장 큰 성과 */
  takeaway?: string;
  /** 첫 구조 형식의 핵심 목록 — 지금은 body 로 합쳐 그린다 */
  points?: string[];
  /** 만들 때의 본문 해시(summaryHash). 없으면 예전 요약 */
  hash?: string;
}

/** 화면이 그릴 모양 — 구조가 있으면 조각들, 예전 줄글이면 text */
export type DisplaySummary =
  | { kind: "structured"; tldr: string; body: string; note: string; keywords: string[]; takeaway: string }
  | { kind: "text"; text: string }
  | null;

const pickStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const pickList = (v: unknown, max = 5) => (Array.isArray(v) ? v.map(pickStr).filter(Boolean).slice(0, max) : []);

function toDisplay(o: Record<string, unknown>): DisplaySummary {
  const tldr = pickStr(o.tldr);
  const points = pickList(o.points);
  /* 첫 구조 형식(points)은 본문 문단으로 이어 붙인다 */
  const body = pickStr(o.body) || points.join(" ");
  const note = pickStr(o.note);
  const keywords = pickList(o.keywords);
  const takeaway = pickStr(o.takeaway);
  if (!tldr && !body && !takeaway) return null;
  return { kind: "structured", tldr, body, note, keywords, takeaway };
}

/** 저장된 글(JSON 또는 줄글)을 화면 모양으로 */
export function parseStoredSummary(raw: string | null | undefined): DisplaySummary {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (s.startsWith("{")) {
    try {
      const d = toDisplay(JSON.parse(s) as Record<string, unknown>);
      if (d) return d;
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
  const out: Record<string, unknown> = { tldr: s.tldr };
  if (s.body) out.body = s.body;
  if (s.note) out.note = s.note;
  if (s.keywords?.length) out.keywords = s.keywords;
  if (s.takeaway) out.takeaway = s.takeaway;
  if (!s.body && s.points?.length) out.points = s.points;
  if (s.hash) out.hash = s.hash;
  return JSON.stringify(out);
}

/** 공급자가 돌려준 한 언어 값 — 새 모양(객체)과 예전 모양(문장)을 다 받는다 */
export function coerceSummary(v: unknown): StructuredSummary | null {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const s: StructuredSummary = {
      tldr: pickStr(o.tldr),
      body: pickStr(o.body) || undefined,
      note: pickStr(o.note) || undefined,
      keywords: pickList(o.keywords).length ? pickList(o.keywords) : undefined,
      takeaway: pickStr(o.takeaway) || undefined,
      points: pickList(o.points).length ? pickList(o.points) : undefined,
    };
    return s.tldr || s.body || s.points ? s : null;
  }
  const text = pickStr(v);
  return text ? { tldr: text } : null;
}

/** 화면에 한 줄로 — 비교 모달의 같음 판정 · 목록 미리보기 */
export function summaryToPlain(d: DisplaySummary): string {
  if (!d) return "";
  return d.kind === "text" ? d.text : [d.tldr, d.body, d.note, d.keywords.join(" "), d.takeaway].filter(Boolean).join(" ");
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
  /** 분량 */
  length: "short" | "normal" | "detailed";
  /** 무엇을 앞세울지 — 결과 · 수치 / 과정 · 결정 / 독자가 얻는 것 */
  focus: "outcome" | "process" | "reader";
  /** 키워드 개수(0 이면 키워드 없음) */
  keywords: 0 | 3 | 5;
  /** 덧붙임(한계 · 주의) 줄을 둘지 */
  note: boolean;
  /** 추가 지시(자유 글, 300자까지) */
  instruction: string;
}

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = { tone: "formal", length: "normal", focus: "outcome", keywords: 5, note: true, instruction: "" };

/** 요청 본문의 options 를 믿지 않고 고른 값만 받는다 — 모르는 값은 기본으로, 지시문은 300자로 자른다 */
export function sanitizeSummaryOptions(v: unknown): SummaryOptions {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const pick = <T extends string | number>(val: unknown, allowed: readonly T[], def: T): T => (allowed.includes(val as T) ? (val as T) : def);
  const d = DEFAULT_SUMMARY_OPTIONS;
  return {
    tone: pick(o.tone, ["formal", "friendly", "plain"] as const, d.tone),
    length: pick(o.length, ["short", "normal", "detailed"] as const, d.length),
    focus: pick(o.focus, ["outcome", "process", "reader"] as const, d.focus),
    keywords: pick(o.keywords, [0, 3, 5] as const, d.keywords),
    note: typeof o.note === "boolean" ? o.note : d.note,
    instruction: typeof o.instruction === "string" ? o.instruction.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 300) : "",
  };
}
