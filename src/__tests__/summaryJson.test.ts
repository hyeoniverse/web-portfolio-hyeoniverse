/** 요약 응답 파싱(lib/api/aiSummaryProviders.parseSummaryJson) — 새 모양({tldr, points}) · 예전 모양(문장) · 울타리가 붙은 글을 다 읽는다 */
import { describe, expect, it } from "vitest";
import { parseSummaryJson } from "@/lib/api/aiSummaryProviders";

describe("parseSummaryJson", () => {
  it("구조 모양", () => {
    expect(parseSummaryJson('{"ko":{"tldr":"한 줄입니다.","points":["하나","둘"]},"en":{"tldr":"One line.","points":["a"]}}'))
      .toEqual({ ko: { tldr: "한 줄입니다.", points: ["하나", "둘"] }, en: { tldr: "One line.", points: ["a"] } });
  });
  it("예전 문장 모양도 받는다 — tldr 로", () => {
    expect(parseSummaryJson('{"ko":"요약입니다.","en":"Summary."}')).toEqual({ ko: { tldr: "요약입니다.", points: [] }, en: { tldr: "Summary.", points: [] } });
  });
  it("코드 울타리와 설명이 붙어도 읽는다", () => {
    expect(parseSummaryJson('물론입니다.\n```json\n{"ko": {"tldr": "가", "points": []}, "en": {"tldr": "a", "points": []}}\n```\n끝.').ko.tldr).toBe("가");
  });
  it("둘 다 비면 오류 — 공급자 실패로 기록되게", () => {
    expect(() => parseSummaryJson("")).toThrow();
    expect(() => parseSummaryJson("{}")).toThrow();
  });
});
