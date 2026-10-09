// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  TRANSLATION_LANGUAGES,
  findTranslationLanguage,
  isTranslationLanguage,
  matchVisitorLanguage,
  normalizeTranslationLang,
} from "@/lib/translationLanguages";

/* 공급자 모듈이 불러오는 서버 전용 의존(비밀값 · 상태 기록)은 이 테스트에서 쓰지 않는다 */
vi.mock("@/lib/getSecret", () => ({ getSecret: async () => null }));
const { deeplLang, googleLang, promptLangName, claudeMaxTokens } = await import("@/lib/api/translationProviders");

/* 상세 화면 "다른 언어로 읽기"의 언어 목록 · 브라우저 언어 고르기 · 공급자 코드 */

describe("TRANSLATION_LANGUAGES", () => {
  it("ko · en 은 없다 — 두 언어는 칸으로 본다", () => {
    const codes = TRANSLATION_LANGUAGES.map((l) => l.code);
    expect(codes).not.toContain("ko");
    expect(codes).not.toContain("en");
  });

  it("코드가 겹치지 않고 모든 칸이 채워져 있다", () => {
    const codes = TRANSLATION_LANGUAGES.map((l) => l.code.toLowerCase());
    expect(new Set(codes).size).toBe(codes.length);
    for (const l of TRANSLATION_LANGUAGES) {
      expect(l.deepl).toMatch(/^[A-Z]{2}(-[A-Z]+)?$/);
      expect(l.google).toBeTruthy();
      expect(l.name).toBeTruthy();
      expect(l.native).toBeTruthy();
    }
  });

  it("중국어 · 포르투갈어 변형을 나눠 둔다", () => {
    expect(findTranslationLanguage("zh-Hans")?.deepl).toBe("ZH-HANS");
    expect(findTranslationLanguage("zh-hant")?.google).toBe("zh-TW");
    expect(findTranslationLanguage("pt-BR")?.deepl).toBe("PT-BR");
    expect(findTranslationLanguage("pt-PT")?.deepl).toBe("PT-PT");
  });

  it("요청 값 확인 · 정규화", () => {
    expect(isTranslationLanguage("ja")).toBe(true);
    expect(isTranslationLanguage("ko")).toBe(false);
    expect(isTranslationLanguage(42)).toBe(false);
    expect(normalizeTranslationLang("ZH-HANS")).toBe("zh-Hans");
    expect(normalizeTranslationLang("xx")).toBeNull();
  });
});

describe("matchVisitorLanguage", () => {
  it("첫 언어가 ko · en 이면 null — 지금처럼 본다", () => {
    expect(matchVisitorLanguage(["ko-KR", "ja"])).toBeNull();
    expect(matchVisitorLanguage(["en-US", "de"])).toBeNull();
    expect(matchVisitorLanguage([])).toBeNull();
  });

  it("목록에 있는 첫 언어", () => {
    expect(matchVisitorLanguage(["ja-JP", "en"])).toBe("ja");
    expect(matchVisitorLanguage(["de-DE"])).toBe("de");
    expect(matchVisitorLanguage(["fr_CA"])).toBe("fr");
  });

  it("모르는 언어는 건너뛴다", () => {
    expect(matchVisitorLanguage(["sw", "hi", "es-MX"])).toBe("es");
    expect(matchVisitorLanguage(["sw", "en"])).toBeNull();
  });

  it("중국어 — 대만 · 홍콩 · Hant 는 번체, 그 밖은 간체", () => {
    expect(matchVisitorLanguage(["zh-TW"])).toBe("zh-Hant");
    expect(matchVisitorLanguage(["zh-HK"])).toBe("zh-Hant");
    expect(matchVisitorLanguage(["zh-Hant-TW"])).toBe("zh-Hant");
    expect(matchVisitorLanguage(["zh-CN"])).toBe("zh-Hans");
    expect(matchVisitorLanguage(["zh"])).toBe("zh-Hans");
    expect(matchVisitorLanguage(["zh-Hans-SG"])).toBe("zh-Hans");
  });

  it("포르투갈어 · 노르웨이어 · 옛 코드", () => {
    expect(matchVisitorLanguage(["pt"])).toBe("pt-BR");
    expect(matchVisitorLanguage(["pt-BR"])).toBe("pt-BR");
    expect(matchVisitorLanguage(["pt-PT"])).toBe("pt-PT");
    expect(matchVisitorLanguage(["no"])).toBe("nb");
    expect(matchVisitorLanguage(["nb-NO"])).toBe("nb");
    expect(matchVisitorLanguage(["nn"])).toBe("nb");
    expect(matchVisitorLanguage(["iw"])).toBe("he");
    expect(matchVisitorLanguage(["in"])).toBe("id");
  });
});

describe("공급자 언어 코드", () => {
  it("ko · en 은 예전 그대로", () => {
    expect(deeplLang("ko")).toBe("KO");
    expect(deeplLang("en")).toBe("EN");
    expect(googleLang("ko")).toBe("ko");
    expect(googleLang("en")).toBe("en");
    expect(promptLangName("ko")).toBe("Korean");
    expect(promptLangName("en")).toBe("English");
  });

  it("목록의 모든 언어가 DeepL · Google · 프롬프트 이름으로 바뀐다", () => {
    for (const l of TRANSLATION_LANGUAGES) {
      expect(deeplLang(l.code)).toBe(l.deepl);
      expect(googleLang(l.code)).toBe(l.google);
      expect(promptLangName(l.code)).toBe(l.name);
    }
  });

  it("Claude 응답 상한 — ko↔en 은 4096, 다른 언어는 길이에 맞춰 16000 까지", () => {
    const long = [{ text: "가".repeat(50000) }];
    expect(claudeMaxTokens(long, "ko", "en")).toBe(4096);
    expect(claudeMaxTokens([{ text: "짧다" }], "ko", "ja")).toBe(4096);
    expect(claudeMaxTokens([{ text: "가".repeat(6000) }], "ko", "ja")).toBe(9000);
    expect(claudeMaxTokens(long, "ko", "ja")).toBe(16000);
  });
});
