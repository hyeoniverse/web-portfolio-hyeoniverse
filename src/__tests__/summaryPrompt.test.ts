/**
 * AI 요약 프롬프트(lib/api/aiSummaryProviders.buildSummaryPrompt) — 글 · 작업물 · 모든 공급자가 같은 문장을 쓴다.
 * 한국어 합니다체와 구조 출력({tldr, points}) 규칙이 들어 있고, 본문은 뼈대(lib/ai/summary.extractSkeleton)만 싣는다.
 */
import { describe, expect, it } from "vitest";
import { buildSummaryPrompt } from "@/lib/api/aiSummaryProviders";

describe("buildSummaryPrompt", () => {
  it("한국어는 합니다체, 출력은 언어마다 tldr · body · note · keywords · takeaway", () => {
    const p = buildSummaryPrompt("post", { title: "제목", ko: "본문", en: "body" });
    expect(p).toContain("합니다체");
    expect(p).toContain('{"ko": {"tldr": "...", "body": "...", "note": "...", "keywords": ["..."], "takeaway": "..."}');
    expect(p).toContain("Title: 제목");
  });

  it("본문은 뼈대로 — 태그를 벗기고 길어도 6,000자 안", () => {
    const long = Array.from({ length: 80 }, (_, i) => `<h2>절 ${i}</h2><p>${"첫 문장입니다. ".repeat(3)}${"뒤 문장. ".repeat(40)}</p>`).join("");
    const p = buildSummaryPrompt("work", { ko: long, en: "" });
    expect(p).not.toContain("<h2>");
    const body = p.split("Korean outline:\n")[1].split("\n\nEnglish outline:")[0];
    expect(body.length).toBeLessThanOrEqual(6000);
    expect(body).toContain("## 절 0");
    expect(p).toContain("English outline:\n(none)");
  });

  it("글과 작업물은 초점만 다르다", () => {
    expect(buildSummaryPrompt("post", {})).toContain("blog post");
    expect(buildSummaryPrompt("work", {})).toContain("portfolio project");
  });
});
