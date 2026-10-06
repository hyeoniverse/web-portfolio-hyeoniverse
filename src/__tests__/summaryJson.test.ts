/** 요약 응답 파싱(lib/api/aiSummaryProviders.parseSummaryJson) — 새 모양({tldr, points}) · 예전 모양(문장) · 울타리가 붙은 글을 다 읽는다 */
import { describe, expect, it } from "vitest";
import { parseSummaryJson } from "@/lib/api/aiSummaryProviders";

describe("parseSummaryJson", () => {
  it("구조 모양", () => {
    const r = parseSummaryJson('{"ko":{"tldr":"한 줄입니다.","body":"본문.","keywords":["a","b"],"takeaway":"끝."},"en":{"tldr":"One line.","points":["a"]}}');
    expect(r.ko).toMatchObject({ tldr: "한 줄입니다.", body: "본문.", keywords: ["a", "b"], takeaway: "끝." });
    expect(r.en).toMatchObject({ tldr: "One line.", points: [{ label: "", text: "a" }] });
  });
  it("예전 문장 모양도 받는다 — tldr 로", () => {
    const r = parseSummaryJson('{"ko":"요약입니다.","en":"Summary."}');
    expect(r.ko.tldr).toBe("요약입니다.");
    expect(r.en.tldr).toBe("Summary.");
  });
  it("코드 울타리와 설명이 붙어도 읽는다", () => {
    expect(parseSummaryJson('물론입니다.\n```json\n{"ko": {"tldr": "가", "points": []}, "en": {"tldr": "a", "points": []}}\n```\n끝.').ko.tldr).toBe("가");
  });
  it("둘 다 비면 오류 — 공급자 실패로 기록되게", () => {
    expect(() => parseSummaryJson("")).toThrow();
    expect(() => parseSummaryJson("{}")).toThrow();
  });
});
