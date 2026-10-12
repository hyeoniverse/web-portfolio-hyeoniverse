import { describe, expect, it } from "vitest";
import { authoringLangOf, baseLanguageOf, isForeignSiteLanguage, normalizeSiteLanguage, sourceBadgeOf } from "@/lib/siteLanguage";
import { resolveInitialLang } from "@/lib/siteLang";

describe("사이트 기본 언어(#1406)", () => {
  it("값을 고치고 화면 사전을 고른다", () => {
    expect(normalizeSiteLanguage(undefined)).toBe("ko");
    expect(normalizeSiteLanguage("xx")).toBe("ko");
    expect(normalizeSiteLanguage("zh-hans")).toBe("zh-Hans");
    expect(baseLanguageOf("ko")).toBe("ko");
    expect(baseLanguageOf("en")).toBe("en");
    expect(baseLanguageOf("ja")).toBe("en");
    expect(isForeignSiteLanguage("en")).toBe(false);
    expect(isForeignSiteLanguage("ja")).toBe(true);
    expect(sourceBadgeOf("ko")).toBe("KO");
    expect(sourceBadgeOf("ja")).toBe("JA");
    /* 글을 쓰는 칸 — en 이면 en, 그 밖은 원문 칸 ko */
    expect(authoringLangOf("en")).toBe("en");
    expect(authoringLangOf("ja")).toBe("ko");
  });

  it("고른 적 없으면 기본 언어, 고른 것이 먼저", () => {
    expect(resolveInitialLang(null, ["ko-KR"], "ja")).toEqual({ lang: "ja", auto: true });
    expect(resolveInitialLang("de", ["ko-KR"], "ja")).toEqual({ lang: "de", auto: false });
    expect(resolveInitialLang("original", ["ko-KR"], "ja")).toEqual({ lang: null, auto: false });
    /* ko · en 기본값은 지금처럼 브라우저 언어 */
    expect(resolveInitialLang(null, ["de-DE"], null)).toEqual({ lang: "de", auto: true });
  });
});
