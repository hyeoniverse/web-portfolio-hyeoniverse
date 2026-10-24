import { createHash } from "node:crypto";

/**
 * 상세 페이지의 "AI 자동 번역"(ko ↔ en)이 칸에 써 넣은 번역의 표식.
 *
 * 자동 번역은 결과를 title_en · content_en 같은 실제 칸에 저장한다. 그래서 나중에 원문을 고쳐도
 * 번역 칸이 이미 차 있어 다시 번역하지 않았다. 번역할 때 원문과 결과의 해시를 auto_translation 칸에
 * 남겨 두고, 글을 저장할 때 원문이 바뀌었는데 번역 칸은 그때 그대로면(사람이 고치지 않았으면)
 * 번역 칸을 비운다 — 다음 방문 때 새 원문으로 다시 번역된다. 사람이 번역 칸을 고쳤으면 그대로 둔다.
 *
 * auto_translation 칸이 아직 없는 DB(마이그레이션 2026_10_13 적용 전)에서는 아무것도 하지 않는다.
 */
export type Lang = "ko" | "en";
export interface AutoTranslationMark { to: Lang; src: string; out: string }
/** 언어별 칸 이름 목록 — 같은 자리끼리 짝이다 */
export type LangColumns = Record<Lang, readonly string[]>;

export const POST_COLUMNS: LangColumns = {
  ko: ["title", "content", "excerpt"],
  en: ["title_en", "content_en", "excerpt_en"],
};
export const WORK_COLUMNS: LangColumns = {
  ko: ["title", "subtitle_ko", "description_ko"],
  en: ["title_en", "subtitle_en", "description_en"],
};

type Row = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function hashColumns(row: Row, cols: readonly string[]): string {
  return createHash("sha256").update(JSON.stringify(cols.map((c) => text(row[c])))).digest("hex").slice(0, 32);
}

/** 번역을 써 넣은 직후의 행으로 표식을 만든다 */
export function makeMark(row: Row, columns: LangColumns, to: Lang): AutoTranslationMark {
  const from: Lang = to === "en" ? "ko" : "en";
  return { to, src: hashColumns(row, columns[from]), out: hashColumns(row, columns[to]) };
}

function readMark(v: unknown): AutoTranslationMark | null {
  const m = v as Partial<AutoTranslationMark> | null;
  if (!m || (m.to !== "ko" && m.to !== "en") || typeof m.src !== "string" || typeof m.out !== "string") return null;
  return m as AutoTranslationMark;
}

/**
 * 저장 직전에 부른다 — current 는 저장 전 행(select "*"), body 는 저장할 값.
 * 돌려준 값을 body 에 덧씌운다. 할 일이 없으면 빈 객체.
 * - 표식이 없거나 칸이 없는 DB → {}
 * - 저장 후 번역 칸이 표식과 다르다(사람이 고쳤다) → 표식만 지운다
 * - 원문이 그대로 → {}
 * - 원문이 바뀌고 번역 칸은 자동 번역 그대로 → 번역 칸을 비우고 표식을 지운다
 */
export function staleAutoTranslationPatch(current: Row | null | undefined, body: Row, columns: LangColumns): Row {
  if (!current || !("auto_translation" in current)) return {};
  const mark = readMark(current.auto_translation);
  if (!mark) return {};
  const from: Lang = mark.to === "en" ? "ko" : "en";
  const after = { ...current, ...body };
  if (hashColumns(after, columns[mark.to]) !== mark.out) return { auto_translation: null };
  if (hashColumns(after, columns[from]) === mark.src) return {};
  /* 제목은 남긴다 — 한 언어 제목이 비면 목록 카드가 다른 언어 제목으로 보이고, 제품 이름은 보통 같다 */
  const cleared: Row = { auto_translation: null };
  for (const c of columns[mark.to]) if (c !== "title" && c !== "title_en") cleared[c] = "";
  return cleared;
}
