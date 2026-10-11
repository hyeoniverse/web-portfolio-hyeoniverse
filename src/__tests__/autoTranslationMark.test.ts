import { describe, it, expect } from "vitest";
import { POST_COLUMNS, makeMark, staleAutoTranslationPatch } from "@/lib/api/autoTranslationMark";

const base = { title: "제목", content: "본문", excerpt: "", title_en: "Title", content_en: "Body", excerpt_en: "" };
const marked = { ...base, auto_translation: makeMark(base, POST_COLUMNS, "en") };

describe("staleAutoTranslationPatch", () => {
  it("칸이 없는 DB 면 아무것도 하지 않는다", () => {
    expect(staleAutoTranslationPatch(base, { content: "새 본문" }, POST_COLUMNS)).toEqual({});
  });
  it("원문이 그대로면 그대로 둔다", () => {
    expect(staleAutoTranslationPatch(marked, { content: "본문", content_en: "Body" }, POST_COLUMNS)).toEqual({});
  });
  it("원문이 바뀌고 번역이 자동 그대로면 번역 칸(제목 제외)을 비운다", () => {
    expect(staleAutoTranslationPatch(marked, { content: "새 본문", content_en: "Body" }, POST_COLUMNS))
      .toEqual({ auto_translation: null, content_en: "", excerpt_en: "" });
  });
  it("사람이 번역을 고쳤으면 표식만 지운다", () => {
    expect(staleAutoTranslationPatch(marked, { content: "새 본문", content_en: "Edited" }, POST_COLUMNS))
      .toEqual({ auto_translation: null });
  });
});
