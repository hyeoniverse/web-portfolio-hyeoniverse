/**
 * AI 요약의 모양과 재료 — 서버(라우트 · 공급자 호출)와 화면(공개 요약 상자 · 편집기 칸 · 비교 모달)이 같이 쓴다.
 *
 * 저장은 posts/works 의 summary_ko · summary_en(text) 그대로다. 새 요약은 JSON 문자열
 *   {"tldr":"한 문장","points":["핵심","핵심"],"hash":"본문 해시"}
 * 로 넣고, 예전에 저장된 줄글은 그대로 문단으로 읽는다(마이그레이션 없음).
 * hash 는 요약을 만들 때의 본문 해시 — 발행 때 본문이 안 바뀌었으면 다시 만들지 않는다.
 */

export interface StructuredSummary {
  /** 한 문장 요약 */
  tldr: string;
  /** 핵심 2~4개 */
  points: string[];
  /** 만들 때의 본문 해시(summaryHash). 없으면 예전 요약 */
  hash?: string;
}

/** 화면이 그릴 모양 — 구조가 있으면 tldr · points, 예전 줄글이면 text */
export type DisplaySummary = { kind: "structured"; tldr: string; points: string[] } | { kind: "text"; text: string } | null;

const pickStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const pickList = (v: unknown) => (Array.isArray(v) ? v.map(pickStr).filter(Boolean).slice(0, 5) : []);

/** 저장된 글(JSON 또는 줄글)을 화면 모양으로 */
export function parseStoredSummary(raw: string | null | undefined): DisplaySummary {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s) as Record<string, unknown>;
      const tldr = pickStr(o.tldr);
      const points = pickList(o.points);
      if (tldr || points.length) return { kind: "structured", tldr, points };
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
  return JSON.stringify({ tldr: s.tldr, points: s.points, ...(s.hash ? { hash: s.hash } : {}) });
}

/** 공급자가 돌려준 한 언어 값 — 새 모양(객체)과 예전 모양(문장)을 다 받는다 */
export function coerceSummary(v: unknown): StructuredSummary | null {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const tldr = pickStr(o.tldr);
    const points = pickList(o.points);
    if (tldr || points.length) return { tldr, points };
    return null;
  }
  const text = pickStr(v);
  return text ? { tldr: text, points: [] } : null;
}

/** 화면에 한 줄로 — 비교 모달의 같음 판정 · 목록 미리보기 */
export function summaryToPlain(d: DisplaySummary): string {
  if (!d) return "";
  return d.kind === "text" ? d.text : [d.tldr, ...d.points].filter(Boolean).join(" ");
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
