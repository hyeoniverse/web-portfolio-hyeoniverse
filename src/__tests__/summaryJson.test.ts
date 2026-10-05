/** 요약 응답 파싱(lib/api/aiSummaryProviders.parseSummaryJson) — 코드 울타리 · 앞뒤 글이 붙어도 ko · en 을 꺼낸다 */
import { describe, expect, it } from "vitest";
import { parseSummaryJson } from "@/lib/api/aiSummaryProviders";

describe("parseSummaryJson", () => {
  it("순수 JSON", () => {
    expect(parseSummaryJson('{"ko":"요약입니다.","en":"Summary."}')).toEqual({ ko: "요약입니다.", en: "Summary." });
  });
  it("코드 울타리와 설명이 붙어도 읽는다", () => {
    expect(parseSummaryJson('물론입니다.\n```json\n{"ko": "가", "en": "a"}\n```\n끝.')).toEqual({ ko: "가", en: "a" });
  });
  it("둘 다 비면 오류 — 공급자 실패로 기록되게", () => {
    expect(() => parseSummaryJson("")).toThrow();
    expect(() => parseSummaryJson("{}")).toThrow();
  });
});
