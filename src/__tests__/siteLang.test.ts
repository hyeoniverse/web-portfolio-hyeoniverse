import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONTENT_LANG_STORAGE_KEY,
  __resetSiteLangForTest,
  dismissAutoSiteLang,
  fetchSiteUiKeys,
  getSiteLangSnapshot,
  requestSiteUiKey,
  resolveInitialLang,
  selectSiteLang,
  setSiteLangEnabled,
  siteUiTexts,
  subscribeSiteLang,
} from "@/lib/siteLang";
import { siteUiSrcOf } from "@/lib/siteTranslation";

/** 저장 모양(문장마다 원문 해시) 그대로 — 지금 사전의 원문으로 해시를 단다 */
const cacheOf = (strings: Record<string, string>) => JSON.stringify({ strings, src: siteUiSrcOf(siteUiTexts(), Object.keys(strings)) });

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

describe("화면 글 번역 — 보는 화면의 열쇠만", () => {
  const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

  it("물은 열쇠의 번역을 지금 것에 더하고 localStorage 에 문장마다 원문 해시와 함께 둔다 — 깨진 번역은 버린다", async () => {
    selectSiteLang("de");
    expect(getSiteLangSnapshot().ui).toBeNull();
    expect(getSiteLangSnapshot().uiStatus).toBe("ready");
    const fetcher = vi.fn(() => ok({ strings: { "nav.home": "Startseite", "nav.about": "<b>x</b>" } }));
    await fetchSiteUiKeys("de", ["nav.home", "nav.about"], fetcher as unknown as typeof fetch);
    expect(JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ lang: "de", keys: ["nav.home", "nav.about"] });
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "Startseite" });

    await fetchSiteUiKeys("de", ["nav.works"], (() => ok({ strings: { "nav.works": "Arbeiten" } })) as unknown as typeof fetch);
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "Startseite", "nav.works": "Arbeiten" });
    expect(JSON.parse(localStorage.getItem("siteUi:de")!).src["nav.works"]).toBe(siteUiSrcOf(siteUiTexts(), ["nav.works"])["nav.works"]);

    /* 새로 연 탭(메모리 비움) — 저장된 것을 곧장 쓴다 */
    __resetSiteLangForTest();
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "Startseite", "nav.works": "Arbeiten" });
  });

  it("원문이 바뀐 문장만 버린다 — 나머지 저장분은 그대로 쓴다", () => {
    const stored = JSON.parse(cacheOf({ "nav.home": "Startseite", "nav.works": "Arbeiten" }));
    stored.src["nav.works"] = "old";
    localStorage.setItem("siteUi:de", JSON.stringify(stored));
    selectSiteLang("de");
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "Startseite" });
  });

  it("t() 가 찾은 열쇠를 모아 한 번에 묻는다 — 같은 열쇠는 다시 묻지 않는다", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: string, init: RequestInit) => {
      const { keys } = JSON.parse(init.body as string) as { keys: string[] };
      return ok({ strings: Object.fromEntries(keys.map((k) => [k, `de:${k}`])) });
    });
    vi.stubGlobal("fetch", fetcher);
    selectSiteLang("de");
    requestSiteUiKey("de", "nav.home");
    requestSiteUiKey("de", "nav.works");
    requestSiteUiKey("de", "nav.home");
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string).keys).toEqual(["nav.home", "nav.works"]);
    expect(getSiteLangSnapshot().ui).toEqual({ "nav.home": "de:nav.home", "nav.works": "de:nav.works" });

    requestSiteUiKey("de", "nav.home");
    await vi.runAllTimersAsync();
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("상한(429)은 rateLimited 로 남고 더 묻지 않는다 — 다시 고르면 지운다", async () => {
    selectSiteLang("it");
    await fetchSiteUiKeys("it", ["nav.home"], (() => Promise.resolve(new Response("{}", { status: 429 }))) as unknown as typeof fetch);
    expect(getSiteLangSnapshot().uiStatus).toBe("rateLimited");
    selectSiteLang("it");
    expect(getSiteLangSnapshot().uiStatus).toBe("ready");
  });
});

describe("t() 에 얹기 — 하나의 언어 상태", () => {
  it("다른 언어의 화면 글이 있으면 그것, 빠진 글은 영어 — 관리 화면도 같은 언어(내용 글 tx 만 원문)", async () => {
    const { renderHook, act } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { LanguageProvider, useLanguage } = await import("@/providers/LanguageProvider");
    const AdminDictProvider = (await import("@/providers/AdminDictProvider")).default;
    const en = (await import("@/locales/en.json")).default;

    localStorage.setItem("language", "ko");
    localStorage.setItem("siteUi:de", cacheOf({ "nav.home": "Startseite" }));
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
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
    expect(admin.result.current.language).toBe("en");
    expect(result.current.t("nav.home")).toBe("Startseite");
    expect(result.current.t("nav.about")).toBe(en.nav.about);
    expect(admin.result.current.t("nav.home")).toBe("Startseite");

    act(() => selectSiteLang(null));
    expect(result.current.t("nav.home")).not.toBe("Startseite");
    /* 끄면 저장된 ko 로 돌아온다 */
    expect(result.current.language).toBe("ko");
    expect(result.current.foreignLang).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("관리자 화면 글 번역(lib/adminLang)", () => {
  it("관리자 열쇠(admin.*)는 관리자 쪽이 묻고, 받은 것은 adminUi 와 localStorage 에 쌓인다 — 새 탭은 저장분을 올린다", async () => {
    const { fetchAdminUiKeys, loadAdminUi, adminUiTexts, __resetAdminLangForTest } = await import("@/lib/adminLang");
    __resetAdminLangForTest();
    const [k1] = [...adminUiTexts()].find(([, v]) => !/[{<>]/.test(v))!;
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ strings: { [k1]: "Übersetzt" } }))));
    selectSiteLang("de");
    await fetchAdminUiKeys("de", [k1], fetcher as unknown as typeof fetch);
    expect(fetcher.mock.calls[0]).toEqual(["/api/admin/site-translate-ui", expect.anything()]);
    expect(getSiteLangSnapshot().adminUi).toEqual({ [k1]: "Übersetzt" });

    __resetSiteLangForTest();
    __resetAdminLangForTest();
    selectSiteLang("de");
    loadAdminUi("de");
    expect(getSiteLangSnapshot().adminUi).toEqual({ [k1]: "Übersetzt" });
  });
});
