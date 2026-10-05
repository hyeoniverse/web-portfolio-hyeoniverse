/**
 * AI 요약 프롬프트(lib/api/aiSummaryProviders.buildSummaryPrompt) — 글 · 작업물 · 모든 공급자가 같은 문장을 쓴다.
 * 한국어 합니다체 규칙과 JSON 출력 규칙이 들어 있고, 본문의 HTML 태그는 벗겨 3,000자까지만 싣는다.
 */
import { describe, expect, it } from "vitest";
import { buildSummaryPrompt } from "@/lib/api/aiSummaryProviders";

describe("buildSummaryPrompt", () => {
  it("한국어는 합니다체, 출력은 ko · en JSON 하나", () => {
    const p = buildSummaryPrompt("post", { title: "제목", ko: "본문", en: "body" });
    expect(p).toContain("합니다체");
    expect(p).toContain('{"ko": "...", "en": "..."}');
    expect(p).toContain("Title: 제목");
  });

  it("본문의 HTML 태그를 벗기고 3,000자까지만 싣는다", () => {
    const long = "<p>" + "가".repeat(5000) + "</p>";
    const p = buildSummaryPrompt("work", { ko: long, en: "" });
    expect(p).not.toContain("<p>");
    const body = p.split("Korean content:\n")[1].split("\n\nEnglish content:")[0];
    expect(body.length).toBe(3000);
    expect(p).toContain("English content:\n(none)");
  });

  it("글과 작업물은 초점만 다르다", () => {
    expect(buildSummaryPrompt("post", {})).toContain("blog post");
    expect(buildSummaryPrompt("work", {})).toContain("portfolio project");
  });
});
