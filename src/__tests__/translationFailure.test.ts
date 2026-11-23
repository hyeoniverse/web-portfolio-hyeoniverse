import { describe, expect, it } from "vitest";
import { translationFailure } from "@/lib/api/translationProviders";

/* 503 이어야 자동 번역(siteLang · useContentTranslation)이 조용히 원문으로 물러난다 */
describe("translationFailure", () => {
  it("키가 하나도 없으면 503", () => {
    expect(translationFailure([
      { provider: "deepl", kind: "no_key" },
      { provider: "google_translate", kind: "no_key" },
    ])).toEqual({ status: 503, code: "TRANSLATION_NOT_CONFIGURED" });
  });

  it("꺼 둔 공급자와 키 없는 공급자만 남아도 503", () => {
    expect(translationFailure([
      { provider: "gemini", kind: "forbidden", disabled: true, skipped: true },
      { provider: "deepl", kind: "no_key" },
      { provider: "google_translate", kind: "no_key" },
    ])).toEqual({ status: 503, code: "TRANSLATION_NOT_CONFIGURED" });
  });

  it("모두 꺼져 있으면 AI_PROVIDERS_DISABLED", () => {
    expect(translationFailure([
      { provider: "gemini", kind: "forbidden", disabled: true, skipped: true },
      { provider: "deepl", kind: "quota", disabled: true, skipped: true },
    ])).toEqual({ status: 502, code: "AI_PROVIDERS_DISABLED" });
  });

  it("실제로 불렀다가 실패한 공급자가 있으면 502", () => {
    expect(translationFailure([
      { provider: "gemini", kind: "rate_limit" },
      { provider: "deepl", kind: "no_key" },
    ])).toEqual({ status: 502, code: "TRANSLATION_FAILED" });
    expect(translationFailure([])).toEqual({ status: 502, code: "TRANSLATION_FAILED" });
  });
});
