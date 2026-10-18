import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetSiteLangForTest, getSiteDefaultLang, getSiteLangSnapshot, selectSiteLang, setSiteDefaultLang } from "@/lib/siteLang";
import { normalizeTranslationLang, TRANSLATION_LANGUAGES } from "@/lib/translationLanguages";
import { SITE_LANGUAGE_OPTIONS } from "@/lib/siteLanguage";
import { sourceLangOf } from "@/lib/siteContent";
import { listMetaSource } from "@/lib/api/siteTranslate";
import { postSource, sourceHash, workSource } from "@/lib/api/contentTranslate";

beforeEach(() => {
  localStorage.clear();
  __resetSiteLangForTest();
});

describe("기본 언어가 ko · en 밖일 때 한국어로 보기(#1497)", () => {
  it("한국어는 코드 확인은 받지만 목록 · 기본 언어 선택지에는 늘지 않는다", () => {
    expect(normalizeTranslationLang("ko")).toBe("ko");
    expect(TRANSLATION_LANGUAGES.some((l) => l.code === "ko")).toBe(false);
    expect(SITE_LANGUAGE_OPTIONS.filter((o) => o.value === "ko")).toHaveLength(1);
  });

  it("기본 언어가 ko 면 사이트 기본 언어(다른 언어)로 치지 않는다 — 한국어로 고르면 걸린다", () => {
    setSiteDefaultLang("ko");
    expect(getSiteDefaultLang()).toBeNull();
    setSiteDefaultLang("ja");
    expect(getSiteDefaultLang()).toBe("ja");
    selectSiteLang("ko");
    expect(getSiteLangSnapshot().lang).toBe("ko");
  });

  it("화면 글은 한국어 사전 — 기계 번역을 묻지 않는다", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { LanguageProvider, useLanguage } = await import("@/providers/LanguageProvider");
    const ko = (await import("@/locales/ko.json")).default;
    const fetcher = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    vi.useFakeTimers();
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => createElement(LanguageProvider, { siteLanguage: "ja", children }),
    });
    act(() => selectSiteLang("ko"));
    expect(result.current.foreignLang).toBe("ko");
    expect(result.current.t("nav.home")).toBe(ko.nav.home);
    await vi.runAllTimersAsync();
    expect(fetcher).not.toHaveBeenCalled();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("원문 언어 — 한글은 ko, 라틴 밖 글자는 원문 칸의 언어, 그 밖은 en", () => {
    expect(sourceLangOf("리액트", "ja")).toBe("ko");
    expect(sourceLangOf("ウェブ開発", "ja")).toBe("ja");
    expect(sourceLangOf("Web Development — 2026!", "ja")).toBe("en");
    expect(sourceLangOf("ウェブ開発")).toBe("en");
  });

  it("목록 · 상세의 원문 언어는 ko 칸이면 source_lang(비면 ko) — 같으면 상세 해시는 예전 그대로", () => {
    expect(listMetaSource("post", { title: "タイトル", content: "本文", source_lang: "ja" })?.lang).toBe("ja");
    expect(listMetaSource("post", { title: "제목", content: "본문" })?.lang).toBe("ko");
    expect(listMetaSource("post", { title_en: "Title", content_en: "Body", source_lang: "ja" })?.lang).toBe("en");

    const ja = postSource({ title: "タイトル", content: "本文", source_lang: "ja" })!;
    expect([ja.lang, ja.from]).toEqual(["ko", "ja"]);
    expect(workSource({ title: "作品", content_ko: "本文です。".repeat(20), source_lang: "ja" })?.from).toBe("ja");
    const plain = postSource({ title: "제목", content: "본문" })!;
    expect(plain.from).toBe("ko");
    expect(sourceHash(plain)).not.toBe(sourceHash({ ...plain, from: "ja" }));
  });
});
