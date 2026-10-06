/**
 * AI 요약 프롬프트(lib/api/aiSummaryProviders.buildSummaryPrompt) — 글 · 작업물 · 모든 공급자가 같은 문장을 쓴다.
 * 예시 하나와 피할 예를 싣고, 관리자 옵션(말투 · 분량 · 초점 · 키워드 수 · 덧붙임 · 추가 지시)이 문장에 들어간다.
 */
import { describe, expect, it } from "vitest";
import { buildSummaryPrompt } from "@/lib/api/aiSummaryProviders";
import { DEFAULT_SUMMARY_OPTIONS, sanitizeSummaryOptions } from "@/lib/ai/summary";

describe("buildSummaryPrompt", () => {
  it("기본은 합니다체 · 출력 키 다섯 · 예시와 피할 예", () => {
    const p = buildSummaryPrompt("post", { title: "제목", ko: "본문", en: "body" });
    expect(p).toContain("합니다체");
    expect(p).toContain('"points": [{"label": "", "text": ""}]');
    expect(p).toContain("**double asterisks**");
    expect(p).toContain("## Avoid");
    expect(p).toContain("Title: 제목");
  });

  it("옵션이 문장으로 들어간다", () => {
    const p = buildSummaryPrompt("work", {}, { ...DEFAULT_SUMMARY_OPTIONS, tone: "friendly", length: "short", focus: "process", keywords: 0, note: false, instruction: "접근성을 강조" });
    expect(p).toContain("해요체");
    expect(p).toContain('"points": 2 to 3 items');
    expect(p).toContain("Lead with how");
    expect(p).toContain('"keywords": always an empty array');
    expect(p).toContain('"note": always ""');
    expect(p).toContain("접근성을 강조");
  });

  it("원문은 한 언어만 — 한국어가 있으면 한국어, 뼈대로 3,500자 안", () => {
    const long = Array.from({ length: 80 }, (_, i) => `<h2>절 ${i}</h2><p>${"첫 문장입니다. ".repeat(3)}${"뒤 문장. ".repeat(40)}</p>`).join("");
    const p = buildSummaryPrompt("work", { ko: long, en: "<p>English body</p>" });
    const body = p.split("Outline (Korean):\n")[1];
    expect(body).not.toContain("<h2>");
    expect(body.length).toBeLessThanOrEqual(3500);
    expect(p).not.toContain("English body");
    expect(buildSummaryPrompt("post", { ko: "", en: "<p>Only english</p>" })).toContain("Outline (English):\nOnly english");
  });
});

describe("sanitizeSummaryOptions", () => {
  it("모르는 값은 기본으로, 지시문은 300자로", () => {
    const o = sanitizeSummaryOptions({ tone: "shout", length: "normal", keywords: 7, note: "yes", instruction: "가".repeat(500) });
    expect(o.tone).toBe("formal");
    expect(o.keywords).toBe(5);
    expect(o.note).toBe(true);
    expect(o.instruction).toHaveLength(300);
    expect(sanitizeSummaryOptions(undefined)).toEqual(DEFAULT_SUMMARY_OPTIONS);
  });

  it("temperature 는 0~1 로 자르고 숫자가 아니면 자동, 토큰 · 공급자는 고른 값만", () => {
    expect(sanitizeSummaryOptions({ temperature: 1.8 }).temperature).toBe(1);
    expect(sanitizeSummaryOptions({ temperature: -1 }).temperature).toBe(0);
    expect(sanitizeSummaryOptions({ temperature: "hot" }).temperature).toBeNull();
    expect(sanitizeSummaryOptions({ maxTokens: 99999 }).maxTokens).toBe(1024);
    expect(sanitizeSummaryOptions({ provider: "groq" }).provider).toBe("groq");
    expect(sanitizeSummaryOptions({ provider: "evil" }).provider).toBe("auto");
  });
});
