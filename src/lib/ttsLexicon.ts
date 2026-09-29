/**
 * 슬라이드 음성 읽기 사전 — 대본의 표기를 TTS 에 보낼 때만 읽을 말로 바꾼다.
 *
 * `?all=true`, `RLS` 같은 코드·약어는 목소리마다 읽는 방식이 달라(Fish 는 기호를 제대로 읽지 못했다)
 * 사전으로 읽을 말을 정해 둔다. 대본과 자막은 원문 그대로 두고 음성만 바뀐다. 사이트 전체에 하나를 두고
 * (site_settings id='tts_lexicon') 모든 작업물의 음성 만들기가 같이 쓴다.
 */
export interface LexiconEntry {
  /** 대본에 적힌 표기 — 대소문자까지 그대로 맞춘다 */
  from: string;
  /** TTS 가 읽을 말 */
  to: string;
}

export const LEXICON_ROW = "tts_lexicon";
export const LEXICON_MAX_ENTRIES = 200;
export const LEXICON_FROM_MAX = 60;
export const LEXICON_TO_MAX = 120;

/** 긴 표기부터 바꾼다 — "?all=true" 를 "all" 보다 먼저 바꿔야 짧은 쪽이 긴 표기 안을 먼저 먹지 않는다 */
export function applyLexicon(text: string, entries: LexiconEntry[]): string {
  const sorted = entries.filter((e) => e.from).sort((a, b) => b.from.length - a.from.length);
  /* 한 번 바꾼 자리를 다른 표기가 다시 바꾸지 않게 자리표시로 먼저 치환한다 */
  const holes: string[] = [];
  let out = text;
  sorted.forEach((e) => {
    if (!out.includes(e.from)) return;
    const mark = `\u0000${holes.length}\u0000`;
    holes.push(e.to);
    out = out.split(e.from).join(mark);
  });
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => holes[Number(i)]);
}

/** 저장 전에 다듬는다 — 앞뒤 공백을 지우고, 빈 표기·중복 표기·길이 초과를 버린다 */
export function sanitizeLexicon(input: unknown): LexiconEntry[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: LexiconEntry[] = [];
  for (const raw of input) {
    const from = typeof raw?.from === "string" ? raw.from.trim() : "";
    const to = typeof raw?.to === "string" ? raw.to.trim() : "";
    if (!from || from.length > LEXICON_FROM_MAX || to.length > LEXICON_TO_MAX || seen.has(from)) continue;
    seen.add(from);
    out.push({ from, to });
    if (out.length >= LEXICON_MAX_ENTRIES) break;
  }
  return out;
}

/**
 * 여러 줄을 한 번에 붙여 넣을 때 — 한 줄에 "표기 → 읽을 말". 표기에 = 가 들어갈 수 있어(?all=true)
 * 구분은 탭, 앞뒤에 빈칸이 있는 " → " · " -> " · " = " 만 본다. 구분이 없는 줄은 버린다.
 */
export function parseLexiconLines(text: string): LexiconEntry[] {
  const out: LexiconEntry[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const m = /^(.+?)(?:\t| → | -> | = )(.+)$/.exec(line.trim());
    if (m) out.push({ from: m[1].trim(), to: m[2].trim() });
  }
  return sanitizeLexicon(out);
}

/** 붙여 넣은 항목을 합친다 — 같은 표기는 새 값으로 바꾸고, 새 표기는 뒤에 붙인다 */
export function mergeLexicon(base: LexiconEntry[], incoming: LexiconEntry[]): LexiconEntry[] {
  const next = base.map((e) => ({ ...e }));
  for (const e of incoming) {
    const hit = next.find((b) => b.from === e.from);
    if (hit) hit.to = e.to;
    else next.push({ ...e });
  }
  return next;
}

/**
 * 대본 안에서 그 자리만 읽는 법을 정한다 — `[ms|밀리세컨드]` 는 음성으로 "밀리세컨드", 자막·가사에는 "ms".
 * 같은 표기를 자리마다 다르게 읽어야 할 때 쓴다(사전은 기본 읽기, 이 표기는 예외).
 */
const INLINE_READING = /\[([^\[\]|]+)\|([^\[\]]+)\]/g;

/** 화면에 보일 대본 — `[표기|읽을 말]` 을 표기로 */
export function displayScript(text: string): string {
  return text.replace(INLINE_READING, (_, shown: string) => shown);
}

/**
 * 음성으로 보낼 대본 — `[표기|읽을 말]` 은 읽을 말로, 나머지는 사전으로 바꾼다.
 * 자리 지정이 사전보다 먼저다 — 읽을 말을 사전이 다시 바꾸지 않게 자리표시로 빼 두었다가 되돌린다.
 */
export function spokenScript(text: string, entries: LexiconEntry[] = []): string {
  const inline: string[] = [];
  const marked = text.replace(INLINE_READING, (_, _shown: string, spoken: string) => {
    inline.push(spoken.trim());
    return `\u0001${inline.length - 1}\u0001`;
  });
  return applyLexicon(marked, entries).replace(/\u0001(\d+)\u0001/g, (_, i: string) => inline[Number(i)]);
}
