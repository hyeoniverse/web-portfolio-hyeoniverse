import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTENT_LANG_STORAGE_KEY,
  __resetSiteLangForTest,
  dismissAutoSiteLang,
  ensureSiteUi,
  getSiteLangSnapshot,
  resolveInitialLang,
  selectSiteLang,
  setSiteLangEnabled,
  siteUiSourceInfo,
  subscribeSiteLang,
} from "@/lib/siteLang";

const setLangs = (langs: string[]) => {
  Object.defineProperty(navigator, "languages", { value: langs, configurable: true });
};

beforeEach(() => {
  localStorage.clear();
  __resetSiteLangForTest();
  setLangs(["ko-KR"]);
});
afterEach(() => vi.restoreAllMocks());

describe("처음 언어(resolveInitialLang)", () => {
  it("저장된 선택 › 브라우저 언어, original 은 꺼짐", () => {
    expect(resolveInitialLang("ja", ["de"])).toEqual({ lang: "ja", auto: false });
    expect(resolveInitialLang("original", ["de"])).toEqual({ lang: null, auto: false });
    expect(resolveInitialLang(null, ["de-DE", "en"])).toEqual({ lang: "de", auto: true });
    expect(resolveInitialLang(null, ["ko-KR"])).toEqual({ lang: null, auto: true });
    expect(resolveInitialLang("xx", ["en-US"])).toEqual({ lang: null, auto: true });
  });
});

describe("사이트 전체가 나눠 쓰는 언어 상태", () => {
  it("상세 화면이 쓰던 저장 열쇠를 그대로 읽는다", () => {
    localStorage.setItem(CONTENT_LANG_STORAGE_KEY, "fr");
    expect(getSiteLangSnapshot().lang).toBe("fr");
  });

  it("고르면 구독자 모두에게 알리고 저장한다 — 끄면 original", () => {
    const a = vi.fn();
    const b = vi.fn();
    const ua = subscribeSiteLang(a);
    const ub = subscribeSiteLang(b);
    selectSiteLang("ja");
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    expect(getSiteLangSnapshot()).toMatchObject({ lang: "ja", auto: false });
    expect(localStorage.getItem(CONTENT_LANG_STORAGE_KEY)).toBe("ja");
    selectSiteLang(null);
    expect(getSiteLangSnapshot().lang).toBeNull();
    expect(localStorage.getItem(CONTENT_LANG_STORAGE_KEY)).toBe("original");
    ua(); ub();
  });

  it("스냅숏은 바뀌기 전까지 같은 객체다(useSyncExternalStore)", () => {
    expect(getSiteLangSnapshot()).toBe(getSiteLangSnapshot());
  });

  it("자동으로 건 언어만 조용히 거둔다 — 저장하지 않는다", () => {
    setLangs(["de-DE"]);
    __resetSiteLangForTest();
    expect(getSiteLangSnapshot()).toMatchObject({ lang: "de", auto: true });
    dismissAutoSiteLang();
    expect(getSiteLangSnapshot().lang).toBeNull();
    expect(localStorage.getItem(CONTENT_LANG_STORAGE_KEY)).toBeNull();

    selectSiteLang("fr");
    dismissAutoSiteLang();
    expect(getSiteLangSnapshot().lang).toBe("fr");
  });

  it("번역이 꺼진 곳(설정 · 관리 화면)에서는 언어가 걸리지 않는다", () => {
    selectSiteLang("ja");
    setSiteLangEnabled(false);
    expect(getSiteLangSnapshot().lang).toBeNull();
    setSiteLangEnabled(true);
    expect(getSiteLangSnapshot().lang).toBe("ja");
  });
});

describe("화면 글 번역 캐시", () => {
  const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

  it("받아 와서 메모리 + localStorage(해시)에 두고, 다음에는 묻지 않는다", async () => {
    selectSiteLang("de");
    const { hash } = siteUiSourceInfo();
    const fetcher = vi.fn(() => ok({ hash, complete: true, strings: { "nav.home": "Startseite", "nav.about": "<b>x</b>" } }));
    await ensureSiteUi("de", fetcher as unknown as typeof fetch);
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "Startseite" });
    expect(getSiteLangSnapshot().uiStatus).toBe("ready");
    expect(JSON.parse(localStorage.getItem("siteUi:de")!).h).toBe(hash);

    await ensureSiteUi("de", fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(1);

    /* 새로 연 탭(메모리 비움) — 저장된 것을 곧장 쓴다 */
    __resetSiteLangForTest();
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "Startseite" });
  });

  it("해시가 다른(사전이 바뀐) 저장분은 쓰지 않는다 · 다 못 받은 번역은 저장하지 않는다", async () => {
    localStorage.setItem("siteUi:de", JSON.stringify({ h: "old", s: { "nav.home": "Alt" } }));
    selectSiteLang("de");
    expect(getSiteLangSnapshot().ui).toBeNull();
    const fetcher = vi.fn(() => ok({ hash: siteUiSourceInfo().hash, complete: false, strings: { "nav.home": "Start" } }));
    await ensureSiteUi("de", fetcher as unknown as typeof fetch);
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "Start" });
    expect(JSON.parse(localStorage.getItem("siteUi:de")!).h).toBe("old");
  });

  it("상한(429)은 rateLimited 로 남는다", async () => {
    selectSiteLang("it");
    await ensureSiteUi("it", (() => Promise.resolve(new Response("{}", { status: 429 }))) as unknown as typeof fetch);
    expect(getSiteLangSnapshot().uiStatus).toBe("rateLimited");
    selectSiteLang("it");
    expect(getSiteLangSnapshot().uiStatus).toBe("idle");
  });
});

describe("t() 에 얹기 — 하나의 언어 상태", () => {
  it("다른 언어의 화면 글이 있으면 그것, 빠진 글은 영어 — 관리 화면(AdminDictProvider)은 그대로", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { LanguageProvider, useLanguage } = await import("@/providers/LanguageProvider");
    const AdminDictProvider = (await import("@/providers/AdminDictProvider")).default;
    const en = (await import("@/locales/en.json")).default;

    localStorage.setItem("language", "ko");
    localStorage.setItem("siteUi:de", JSON.stringify({ h: siteUiSourceInfo().hash, s: { "nav.home": "Startseite" } }));
    const wrap = ({ children }: { children: React.ReactNode }) => createElement(LanguageProvider, null, children);
    const { result } = renderHook(() => useLanguage(), { wrapper: wrap });
    const admin = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => createElement(LanguageProvider, null, createElement(AdminDictProvider, { dict: { ko: {}, en: {} }, children })),
    });

    expect(result.current.language).toBe("ko");
    act(() => selectSiteLang("de"));
    /* 다른 언어가 걸리면 기본 언어는 영어 — 번역되지 않은 분기가 한국어로 섞이지 않게. 저장된 ko 는 그대로 */
    expect(result.current.language).toBe("en");
    expect(result.current.foreignLang).toBe("de");
    expect(localStorage.getItem("language")).toBe("ko");
    expect(result.current.tAlt("nav.home")).toBe("Startseite");
    expect(admin.result.current.language).toBe("ko");
    expect(result.current.t("nav.home")).toBe("Startseite");
    expect(result.current.t("nav.about")).toBe(en.nav.about);
    expect(admin.result.current.t("nav.home")).not.toBe("Startseite");

    act(() => selectSiteLang(null));
    expect(result.current.t("nav.home")).not.toBe("Startseite");
    /* 끄면 저장된 ko 로 돌아온다 */
    expect(result.current.language).toBe("ko");
    expect(result.current.foreignLang).toBeNull();
  });
});
