// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  CONTENT_TRANSLATION_VERSION,
  applyMetaTranslations,
  createMissLimiter,
  isFreshCache,
  metaPieces,
  postSource,
  sourceHash,
  workSource,
} from "@/lib/api/contentTranslate";
import { captionLines } from "@/lib/galleryCaptions";
import { captionCues, cueIndexAt } from "@/lib/captionCues";
import { rolesToRecord, translatedGalleryNotes, translatedProject } from "@/lib/contentTranslateView";
import type { Project } from "@/data/projects";

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

describe("workSource", () => {
  it("복사된 영어 README 는 한국어 본문으로 보지 않는다", () => {
    const readme = "# Tool\n\nA small CLI tool for developers.";
    const s = workSource({ title: "Tool", title_en: "Tool", content_ko: readme, content_en: readme, subtitle_en: "CLI", description_en: "Desc" });
    expect(s?.lang).toBe("en");
    expect(s?.fields).toEqual({ title: "Tool", subtitle: "CLI", description: "Desc", content: readme });
  });

  it("한국어 본문이 있으면 한국어 칸들", () => {
    const s = workSource({ title: "작품", content_ko: "<p>한국어 본문입니다</p>", content_en: "", subtitle_ko: "부제", description_ko: "설명", content_type: "richtext" });
    expect(s).toEqual({ lang: "ko", from: "ko", html: true, fields: { title: "작품", subtitle: "부제", description: "설명", content: "<p>한국어 본문입니다</p>" }, meta: {} });
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

describe("createMissLimiter", () => {
  it("IP 당 상한 · 창이 지나면 풀린다", () => {
    const take = createMissLimiter(2, 100, 1000);
    expect(take("a", 0)).toBe(true);
    expect(take("a", 10)).toBe(true);
    expect(take("a", 20)).toBe(false);
    expect(take("b", 20)).toBe(true);
    expect(take("a", 1010)).toBe(true);
  });

  it("전체 상한", () => {
    const take = createMissLimiter(5, 2, 1000);
    expect(take("a", 0)).toBe(true);
    expect(take("b", 0)).toBe(true);
    expect(take("c", 0)).toBe(false);
  });
});

/* ── 정보 칸(메타) · AI 요약 · 갤러리 자막 ── */

/** 조각을 받은 대로 "[T]" 를 붙여 돌려주는 가짜 번역 — 빠뜨릴 id 를 고를 수 있다 */
function fakeTranslate(pieces: { id: string; text: string }[], drop: (id: string) => boolean = () => false) {
  return new Map(pieces.filter((p) => !drop(p.id)).map((p) => [p.id, `[T]${p.text}`]));
}

describe("정보 칸 고르기", () => {
  it("글 — AI 요약(한국어 우선) · 시리즈 이름", () => {
    const s = postSource({ title: "제목", content: "본문", summary_ko: "요약글", summary_en: "Sum" }, { title: "시리즈", title_en: "Series" })!;
    expect(s.meta).toEqual({ summary: "요약글", seriesTitle: "시리즈" });
  });

  it("작업물 — 원문 언어의 카테고리 · 성격 · 역할 · 기여 · 기술 설명 · 팀원 · 자막. 빈 칸은 뺀다", () => {
    const s = workSource({
      title: "작품", content_ko: "<p>한국어 본문입니다</p>",
      categories_ko: ["웹앱", "도구"], categories_en: ["Web app"],
      nature_ko: "사이드", role_ko: "프론트엔드",
      contributions_ko: { 설계: ["토큰 설계", "컴포넌트"], 운영: [] },
      tech_notes: { "Next.js": { ko: "라우팅", en: "Routing" }, GSAP: { ko: "", en: "" } },
      team_members: [{ name: "가", role_ko: "디자인", bio_ko: "소개", contributions_ko: { UI: ["화면"] } }],
      summary_ko: "",
    }, { "a.jpg": ["첫 줄.", "둘째 줄."] })!;
    expect(s.lang).toBe("ko");
    expect(s.meta).toEqual({
      categories: ["웹앱", "도구"],
      nature: "사이드",
      role: "프론트엔드",
      contributions: [{ role: "설계", items: ["토큰 설계", "컴포넌트"] }, { role: "운영", items: [] }],
      techNotes: { "Next.js": "라우팅" },
      team: [{ role: "디자인", bio: "소개", contributions: [{ role: "UI", items: ["화면"] }] }],
      gallery: { "a.jpg": ["첫 줄.", "둘째 줄."] },
    });
  });

  it("영어 원문 — 영어 카테고리가 빈 자리는 한국어(화면과 같다)", () => {
    const s = workSource({ title: "T", content_en: "English body text here.", categories_ko: ["웹앱", "도구"], categories_en: ["Web app", ""] })!;
    expect(s.lang).toBe("en");
    expect(s.meta.categories).toEqual(["Web app", "도구"]);
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
  const meta = {
    categories: ["웹앱", "도구"],
    contributions: [{ role: "설계", items: ["토큰", "컴포넌트"] }],
    techNotes: { "Next.js": "라우팅" },
    gallery: { "a.jpg": ["하나.", "둘."] },
  };

  it("배열 · 역할 · 기술 설명 · 자막을 조각마다 보내고 같은 자리에 끼운다 — 열쇠(기술 이름 · 그림 주소)는 그대로", () => {
    const pieces = metaPieces(meta);
    expect(pieces.map((p) => p.text)).toEqual(["웹앱", "도구", "설계", "토큰", "컴포넌트", "라우팅", "하나.", "둘."]);
    expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
    const { meta: out, complete } = applyMetaTranslations(meta, fakeTranslate(pieces));
    expect(complete).toBe(true);
    expect(out).toEqual({
      categories: ["[T]웹앱", "[T]도구"],
      contributions: [{ role: "[T]설계", items: ["[T]토큰", "[T]컴포넌트"] }],
      techNotes: { "Next.js": "[T]라우팅" },
      gallery: { "a.jpg": ["[T]하나.", "[T]둘."] },
    });
  });

  it("한 조각이라도 빠지면 그 칸만 원문 · 캐시하지 않는다(complete false)", () => {
    const pieces = metaPieces(meta);
    const { meta: out, complete } = applyMetaTranslations(meta, fakeTranslate(pieces, (id) => id === "categories.1"));
    expect(complete).toBe(false);
    expect(out.categories).toEqual(["웹앱", "도구"]);
    expect(out.techNotes).toEqual({ "Next.js": "[T]라우팅" });
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

describe("갤러리 자막 — 시각 유지", () => {
  it("음성 파일이 있는 장은 captionCues 의 줄, 대본만 있는 장은 읽는 문장", () => {
    const script = "첫 문장입니다. 둘째 문장입니다. 셋째 문장입니다.";
    expect(captionLines({ script, audio: "a.mp3" })).toEqual(captionCues(script).map((c) => c.text));
    expect(captionLines({ script: "[RLS|알엘에스] 를 켰다. 끝." })).toEqual(["RLS 를 켰다.", "끝."]);
    expect(captionLines({ audio: "a.mp3" })).toEqual([]);
    /* TTS 음성은 만들 때의 대본으로 */
    expect(captionLines({ script: "새 대본.", audio: "a.mp3", audioSource: "tts", audioScript: "옛 대본." })).toEqual(["옛 대본."]);
  });

  it("번역 자막은 줄 수가 같고, 같은 재생 자리에서 같은 순번의 줄이 나온다", () => {
    const script = "짧다. 이 문장은 조금 더 깁니다. 마지막.";
    const cues = captionCues(script);
    const pieces = metaPieces({ gallery: { "a.jpg": cues.map((c) => c.text) } });
    const { meta } = applyMetaTranslations({ gallery: { "a.jpg": cues.map((c) => c.text) } }, fakeTranslate(pieces));
    const lines = meta.gallery!["a.jpg"];
    expect(lines).toHaveLength(cues.length);
    for (const progress of [0, 0.3, 0.6, 0.99]) {
      const at = cueIndexAt(cues, progress);
      expect(lines[at]).toBe(`[T]${cues[at].text}`);
    }
  });

  it("화면 노트 — 원문 언어 노트를 두 언어 칸에 두고 자막 줄을 붙인다(음성 · 대본은 그대로)", () => {
    const notes = { "a.jpg": { script: "한국어.", audio: "ko.mp3", en: { script: "English.", audio: "en.mp3" } }, "b.jpg": { script: "둘." } };
    const out = translatedGalleryNotes(notes, "ko", { "a.jpg": ["[T]한국어."] })!;
    expect(out["a.jpg"]).toEqual({
      script: "한국어.", audio: "ko.mp3", captions: ["[T]한국어."],
      en: { script: "한국어.", audio: "ko.mp3", captions: ["[T]한국어."] },
    });
    expect(out["b.jpg"]).toBe(notes["b.jpg"]);
  });
});

describe("translatedProject", () => {
  const base = {
    id: "1", number: "01", title: { ko: "제목", en: "Title" }, subtitle: { ko: "", en: "" }, category: { ko: "웹앱", en: "Web" },
    categories: { ko: ["웹앱"], en: ["Web"] }, nature: { ko: "사이드", en: "Side" }, year: "2025",
    description: { ko: "", en: "" }, role: { ko: "개발", en: "Dev" }, tech: ["Next.js"],
    tech_notes: { "Next.js": { ko: "라우팅", en: "Routing" } }, image: "", size: "small", content: { ko: "본문", en: "" },
    gallery: [], summary: { ko: "요약", en: "" },
    contributions: { ko: { 설계: ["토큰"] }, en: {} },
    teamMembers: [{ name: "가", role: { ko: "디자인", en: "" }, bio: { ko: "", en: "" } }],
  } as Project;

  it("번역된 칸은 두 언어 칸 모두 번역, 기술 이름 · 연도 · 팀원 이름은 그대로", () => {
    const p = translatedProject(base, {
      categories: ["Webapp-ja"], nature: "サイド", role: "開発", summary: "要約",
      contributions: [{ role: "設計", items: ["トークン"] }], techNotes: { "Next.js": "ルーティング" },
      team: [{ role: "デザイン", bio: "", contributions: [] }],
    });
    expect(p.categories).toEqual({ ko: ["Webapp-ja"], en: ["Webapp-ja"] });
    expect(p.nature).toEqual({ ko: "サイド", en: "サイド" });
    expect(p.role).toEqual({ ko: "開発", en: "開発" });
    expect(p.summary).toEqual({ ko: "要約", en: "要約" });
    expect(p.contributions).toEqual({ ko: { 設計: ["トークン"] }, en: { 設計: ["トークン"] } });
    expect(p.tech_notes).toEqual({ "Next.js": { ko: "ルーティング", en: "ルーティング" } });
    expect(p.tech).toEqual(["Next.js"]);
    expect(p.year).toBe("2025");
    expect(p.teamMembers?.[0]).toMatchObject({ name: "가", role: { ko: "デザイン", en: "デザイン" }, bio: { ko: "", en: "" } });
  });

  it("번역이 없는 칸은 건드리지 않는다", () => {
    const p = translatedProject(base, { content: "本文" });
    expect(p.categories).toBe(base.categories);
    expect(p.role).toBe(base.role);
    expect(p.summary).toBe(base.summary);
    expect(p.content).toEqual({ ko: "本文", en: "本文" });
  });

  it("번역으로 역할 이름이 겹치면 항목을 잇는다", () => {
    expect(rolesToRecord([{ role: "A", items: ["1"] }, { role: "A", items: ["2"] }])).toEqual({ A: ["1", "2"] });
  });
});
