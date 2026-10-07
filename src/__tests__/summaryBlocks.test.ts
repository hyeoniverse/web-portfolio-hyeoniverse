import { describe, expect, it } from "vitest";
import { DEFAULT_SUMMARY_OPTIONS, MAX_SUMMARY_BLOCKS, parseInline, parseStoredSummary, serializeSummary, summaryToPlain } from "@/lib/ai/summary";
import { DEFAULT_SUMMARY_GUIDE, SUMMARY_GUIDE_MAX, sanitizeSummaryGuide } from "@/lib/ai/summaryGuide";
import { buildSummaryPrompt, parseSummaryJson, toStored } from "@/lib/api/aiSummaryProviders";

describe("블록 요약 읽기", () => {
  it("블록 여덟 가지를 읽고, 모르는 종류 · 빈 블록은 버린다", () => {
    const raw = JSON.stringify({
      emoji: "⚡",
      tldr: "t",
      blocks: [
        { type: "paragraph", text: "p" },
        { type: "list", title: "목록", items: [{ emoji: "✅", label: "L", text: "x" }, "머리: 내용", { text: "" }] },
        { type: "steps", items: [{ text: "하나" }, { text: "둘" }] },
        { type: "metrics", items: [{ label: "점수", value: 77, from: 50 }, { label: "빈 값", value: "" }] },
        { type: "compare", beforeLabel: "전", afterLabel: "후", items: [{ label: "검색", before: "느림", after: "빠름" }] },
        { type: "callout", tone: "warn", text: "주의" },
        { type: "callout", tone: "loud", text: "모르는 톤은 팁" },
        { type: "quote", text: "한 줄" },
        { type: "heading", text: "소제목" },
        { type: "video", text: "모르는 종류" },
        { type: "paragraph", text: "" },
      ],
      keywords: ["k"],
      hash: "h",
    });
    const d = parseStoredSummary(raw);
    expect(d).toMatchObject({ kind: "structured", emoji: "⚡", tldr: "t", keywords: ["k"] });
    if (d?.kind !== "structured") throw new Error("structured");
    expect(d.blocks.map((b) => b.type)).toEqual(["paragraph", "list", "steps", "metrics", "compare", "callout", "callout", "quote"]);
    expect(d.blocks[1]).toEqual({ type: "list", title: "목록", items: [{ emoji: "✅", label: "L", text: "x" }, { label: "머리", text: "내용" }] });
    expect(d.blocks[3]).toEqual({ type: "metrics", items: [{ label: "점수", value: "77", from: "50" }] });
    expect(d.blocks[6]).toMatchObject({ tone: "tip" });
  });

  it("블록은 상한까지만", () => {
    const blocks = Array.from({ length: 20 }, (_, i) => ({ type: "paragraph", text: `p${i}` }));
    const d = parseStoredSummary(JSON.stringify({ tldr: "t", blocks }));
    expect(d?.kind === "structured" && d.blocks.length).toBe(MAX_SUMMARY_BLOCKS);
  });

  it("예전 칸 모양은 블록으로 바꿔 읽는다", () => {
    const d = parseStoredSummary(JSON.stringify({
      tldr: "t",
      metrics: [{ label: "LCP", value: "2s", from: "4s" }],
      body: "도입",
      points: [{ section: "문제", label: "A", text: "a" }, { section: "해결", label: "B", text: "b" }, { section: "해결", label: "C", text: "c" }],
      note: "주의",
      keywords: ["k"],
      takeaway: "끝",
    }));
    if (d?.kind !== "structured") throw new Error("structured");
    expect(d.blocks.map((b) => b.type)).toEqual(["metrics", "paragraph", "heading", "list", "heading", "list", "callout", "quote"]);
    expect(d.blocks[5]).toEqual({ type: "list", items: [{ label: "B", text: "b" }, { label: "C", text: "c" }] });
  });

  it("같음 판정용 글은 블록 글을 이어 붙이고 꾸밈 기호를 뺀다", () => {
    const d = parseStoredSummary(serializeSummary({
      tldr: "t",
      blocks: [{ type: "steps", items: [{ label: "L", text: "**x** ==y== `z`" }] }, { type: "compare", items: [{ label: "c", before: "a", after: "b" }] }],
      keywords: ["k"],
    }));
    expect(summaryToPlain(d)).toBe("t L x y z c a b k");
  });

  it("이모지 칸에 낱말이 오면 버린다", () => {
    expect(parseStoredSummary('{"tldr":"t","emoji":"rocket"}')).toMatchObject({ emoji: "" });
    expect(parseStoredSummary('{"tldr":"t","emoji":"🚀"}')).toMatchObject({ emoji: "🚀" });
  });

  it("공급자 응답의 블록을 받아 저장한다", () => {
    const r = parseSummaryJson('{"ko":{"tldr":"t","blocks":[{"type":"quote","text":"q"}],"keywords":["k"]},"en":{"tldr":"e","blocks":[]}}');
    expect(r.ko.blocks).toEqual([{ type: "quote", text: "q" }]);
    expect(JSON.parse(toStored(r.ko, "h"))).toEqual({ tldr: "t", blocks: [{ type: "quote", text: "q" }], keywords: ["k"], hash: "h" });
  });

  it("형광펜은 ==…== 로", () => {
    expect(parseInline("a ==b== **c** `d`").map((p) => p.kind)).toEqual(["text", "mark", "text", "strong", "text", "code"]);
  });
});

describe("블록 프롬프트", () => {
  it("블록 여덟 가지를 설명하고, 고정 칸은 제목 · 키워드뿐", () => {
    const p = buildSummaryPrompt("post", { ko: "본문" });
    for (const t of ["paragraph", "list", "steps", "metrics", "compare", "callout", "quote", "heading"]) expect(p).toContain(`{"type": "${t}"`);
    expect(p).toContain('{"ko": {"emoji": "", "tldr": "", "blocks": [], "keywords": []}');
    expect(p).toContain("Copy neither the facts nor the shape");
  });

  it("글은 모양이 다른 예시 셋, 작업물은 둘", () => {
    const count = (s: string) => (s.match(/^\{"emoji":/gm) ?? []).length;
    expect(count(buildSummaryPrompt("post", {}))).toBe(3);
    expect(count(buildSummaryPrompt("work", {}))).toBe(2);
  });

  it("옵션 — 분량은 블록 수 · 글자 수, 주의 블록을 끌 수 있다", () => {
    const p = buildSummaryPrompt("post", {}, { ...DEFAULT_SUMMARY_OPTIONS, length: "short", note: false });
    expect(p).toContain("2 to 3 blocks");
    expect(p).toContain("Do not add caveats");
  });

  it("작성 지침 — 비우면 기본값, 주면 그 글이 들어가고 고정 부분은 남는다", () => {
    expect(buildSummaryPrompt("post", {})).toContain("## Choosing blocks");
    const custom = buildSummaryPrompt("post", {}, DEFAULT_SUMMARY_OPTIONS, "## Voice\n- 반말 금지");
    expect(custom).toContain("- 반말 금지");
    expect(custom).not.toContain("## Choosing blocks");
    expect(custom).toContain("## Output");
    expect(custom).toContain("## Blocks — you choose");
  });

  it("지침 정리 — 제어 문자 빼고 상한으로 자르고, 비면 기본값", () => {
    expect(sanitizeSummaryGuide("")).toBe(DEFAULT_SUMMARY_GUIDE);
    expect(sanitizeSummaryGuide(42)).toBe(DEFAULT_SUMMARY_GUIDE);
    expect(sanitizeSummaryGuide("a\u0000b\nc")).toBe("ab\nc");
    expect(sanitizeSummaryGuide("x".repeat(SUMMARY_GUIDE_MAX + 50))).toHaveLength(SUMMARY_GUIDE_MAX);
  });

  it("지침과 예시에 이 사이트의 실제 수치가 없다", () => {
    const p = buildSummaryPrompt("post", {}) + buildSummaryPrompt("work", {});
    for (const leak of ["9.7", "2.7", "77점", "HYEONIVERSE", "Lighthouse", "120ms"]) expect(p).not.toContain(leak);
  });
});
