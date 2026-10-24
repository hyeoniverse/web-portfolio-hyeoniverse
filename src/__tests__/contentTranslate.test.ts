// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  CONTENT_TRANSLATION_VERSION,
  applyMetaTranslations,
  isFreshCache,
  metaPieces,
  postSource,
  sourceHash,
} from "@/lib/api/contentTranslate";
import { captionLines } from "@/lib/galleryCaptions";
import { captionCues } from "@/lib/captionCues";

/* /api/content-translate 의 원문 고르기 · 캐시 해시 · 공급자 호출 상한 */

describe("postSource", () => {
  it("한국어 본문이 있으면 한국어 칸들", () => {
    const s = postSource({ title: "제목", title_en: "Title", excerpt: "요약", content: "본문", content_en: "Body", content_type: "richtext" });
    expect(s).toEqual({ lang: "ko", from: "ko", html: true, fields: { title: "제목", excerpt: "요약", content: "본문" }, meta: {} });
  });

  it("한국어 본문이 없으면 영어 칸들 — 영어 제목이 비면 한국어 제목", () => {
    const s = postSource({ title: "제목", title_en: "", excerpt: "요약", excerpt_en: "Sum", content: "", content_en: "Body", content_type: "markdown" });
    expect(s).toEqual({ lang: "en", from: "en", html: false, fields: { title: "제목", excerpt: "Sum", content: "Body" }, meta: {} });
  });

  it("본문이 둘 다 없으면 null", () => {
    expect(postSource({ title: "제목", content: "", content_en: null })).toBeNull();
  });
});

describe("sourceHash", () => {
  it("같은 원문이면 같고, 한 칸만 바뀌어도 달라진다", () => {
    const a = postSource({ title: "제목", excerpt: "요약", content: "본문" })!;
    const b = postSource({ title: "제목", excerpt: "요약", content: "본문" })!;
    const c = postSource({ title: "제목", excerpt: "요약", content: "본문 고침" })!;
    expect(sourceHash(a)).toBe(sourceHash(b));
    expect(sourceHash(a)).not.toBe(sourceHash(c));
  });
});

/* ── 정보 칸(메타) · AI 요약 ── */

/** 조각을 받은 대로 "[T]" 를 붙여 돌려주는 가짜 번역 — 빠뜨릴 id 를 고를 수 있다 */
function fakeTranslate(pieces: { id: string; text: string }[], drop: (id: string) => boolean = () => false) {
  return new Map(pieces.filter((p) => !drop(p.id)).map((p) => [p.id, `[T]${p.text}`]));
}

describe("정보 칸 고르기", () => {
  it("글 — AI 요약(한국어 우선) · 시리즈 이름", () => {
    const s = postSource({ title: "제목", content: "본문", summary_ko: "요약글", summary_en: "Sum" }, { title: "시리즈", title_en: "Series" })!;
    expect(s.meta).toEqual({ summary: "요약글", seriesTitle: "시리즈" });
  });

  it("정보 칸이 바뀌면 해시가 달라진다 — 요약을 고쳐도 다시 번역", () => {
    const a = postSource({ title: "제목", content: "본문", summary_ko: "가" })!;
    const b = postSource({ title: "제목", content: "본문", summary_ko: "나" })!;
    expect(sourceHash(a)).not.toBe(sourceHash(b));
  });
});

describe("캐시 판", () => {
  it("해시가 같아도 판(v)이 없는 예전 줄은 다시 번역한다", () => {
    expect(isFreshCache({ source_hash: "h", fields: { content: "x" } }, "h")).toBe(false);
    expect(isFreshCache({ source_hash: "h", fields: { content: "x", v: CONTENT_TRANSLATION_VERSION } }, "h")).toBe(true);
    expect(isFreshCache({ source_hash: "old", fields: { v: CONTENT_TRANSLATION_VERSION } }, "h")).toBe(false);
    expect(isFreshCache(null, "h")).toBe(false);
  });
});

describe("조각 나누기 · 다시 모으기", () => {
  const meta = { seriesTitle: "시리즈" };

  it("한 조각이라도 빠지면 그 칸만 원문 · 캐시하지 않는다(complete false)", () => {
    const pieces = metaPieces(meta);
    expect(applyMetaTranslations(meta, fakeTranslate(pieces))).toEqual({ meta: { seriesTitle: "[T]시리즈" }, complete: true });
    const { meta: out, complete } = applyMetaTranslations(meta, fakeTranslate(pieces, () => true));
    expect(complete).toBe(false);
    expect(out.seriesTitle).toBe("시리즈");
  });

  it("AI 요약 — 구조(JSON)는 글 칸만 번역하고 블록 종류 · 이모지 · 수치는 그대로", () => {
    const summary = JSON.stringify({
      emoji: "🚀", tldr: "빠른 배포",
      blocks: [{ type: "metrics", items: [{ label: "속도", value: "3s", from: "10s" }] }, { type: "callout", tone: "tip", text: "팁" }],
      keywords: ["배포"], hash: "abc",
    });
    const pieces = metaPieces({ summary });
    expect(pieces.map((p) => p.text).sort()).toEqual(["빠른 배포", "배포", "속도", "팁"].sort());
    const { meta: out } = applyMetaTranslations({ summary }, fakeTranslate(pieces));
    const parsed = JSON.parse(out.summary!);
    expect(parsed.emoji).toBe("🚀");
    expect(parsed.tldr).toBe("[T]빠른 배포");
    expect(parsed.blocks[0]).toEqual({ type: "metrics", items: [{ label: "[T]속도", value: "3s", from: "10s" }] });
    expect(parsed.blocks[1]).toEqual({ type: "callout", tone: "tip", text: "[T]팁" });
    expect(parsed.hash).toBe("abc");
  });

  it("예전 줄글 요약은 문자열 그대로 번역", () => {
    const { meta: out } = applyMetaTranslations({ summary: "줄글 요약" }, new Map([["summary", "Plain"]]));
    expect(out.summary).toBe("Plain");
  });
});

describe("갤러리 자막 줄", () => {
  it("음성 파일이 있는 장은 captionCues 의 줄, 대본만 있는 장은 읽는 문장", () => {
    const script = "첫 문장입니다. 둘째 문장입니다. 셋째 문장입니다.";
    expect(captionLines({ script, audio: "a.mp3" })).toEqual(captionCues(script).map((c) => c.text));
    expect(captionLines({ script: "[RLS|알엘에스] 를 켰다. 끝." })).toEqual(["RLS 를 켰다.", "끝."]);
    expect(captionLines({ audio: "a.mp3" })).toEqual([]);
    /* TTS 음성은 만들 때의 대본으로 */
    expect(captionLines({ script: "새 대본.", audio: "a.mp3", audioSource: "tts", audioScript: "옛 대본." })).toEqual(["옛 대본."]);
  });
});
