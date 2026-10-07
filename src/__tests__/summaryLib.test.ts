/** AI 요약 저장 모양 · 뼈대 추출 · 해시(lib/ai/summary) */
import { describe, expect, it } from "vitest";
import { extractSkeleton, parseInline, parseStoredSummary, serializeSummary, storedSummaryHash, summaryHash, summaryToPlain } from "@/lib/ai/summary";

describe("저장 모양", () => {
  it("JSON 은 구조로, 예전 줄글은 문단으로 읽는다", () => {
    expect(parseStoredSummary('{"tldr":"한 줄","body":"본문","points":[{"label":"성능","text":"**빨라짐**"}],"note":"주의","keywords":["k"],"takeaway":"끝","hash":"x"}'))
      .toEqual({ kind: "structured", tldr: "한 줄", emoji: "", keywords: ["k"], blocks: [
        { type: "paragraph", text: "본문" },
        { type: "list", items: [{ label: "성능", text: "**빨라짐**" }] },
        { type: "callout", tone: "info", text: "주의" },
        { type: "quote", text: "끝" },
      ] });
    /* 예전 문자열 항목 — "머리말: 내용" 이면 갈라 두고, 아니면 머리말 없이 */
    expect(parseStoredSummary('{"tldr":"한 줄","points":["성능: 빨라졌습니다","그냥 문장"]}')).toMatchObject({
      blocks: [{ type: "list", items: [{ label: "성능", text: "빨라졌습니다" }, { text: "그냥 문장" }] }],
    });
    expect(parseStoredSummary("그냥 요약 문장입니다.")).toEqual({ kind: "text", text: "그냥 요약 문장입니다." });
    expect(parseStoredSummary("")).toBeNull();
  });
  it("해시는 JSON 에만 있다", () => {
    const s = serializeSummary({ tldr: "t", hash: "abcd1234" });
    expect(storedSummaryHash(s)).toBe("abcd1234");
    expect(storedSummaryHash("줄글")).toBeUndefined();
  });
  it("같음 판정용 글은 메타 · 꾸밈 기호를 뺀다", () => {
    expect(summaryToPlain(parseStoredSummary('{"tldr":"t","body":"b","points":[{"label":"L","text":"**x** `y`"}],"hash":"1"}'))).toBe("t b L x y");
  });

  it("글 안 꾸밈은 **굵게** · `코드` 만 조각으로", () => {
    expect(parseInline("LCP **9.7초 → 2.7초** 와 `useMemo`")).toEqual([
      { kind: "text", text: "LCP " }, { kind: "strong", text: "9.7초 → 2.7초" }, { kind: "text", text: " 와 " }, { kind: "code", text: "useMemo" },
    ]);
    expect(parseInline("<b>no</b>")).toEqual([{ kind: "text", text: "<b>no</b>" }]);
  });
});

describe("summaryHash", () => {
  it("같은 본문은 같고 다르면 다르다", () => {
    expect(summaryHash("a", "b")).toBe(summaryHash("a", "b"));
    expect(summaryHash("a", "b")).not.toBe(summaryHash("a", "c"));
    expect(summaryHash("a", "b")).toHaveLength(8);
  });
});

describe("extractSkeleton", () => {
  it("짧은 글은 통째로, 코드 · 이미지는 뺀다", () => {
    const out = extractSkeleton("<h2>제목</h2><p>문단입니다.</p><pre>const x = 1</pre><img src=\"a.png\"><ul><li>항목</li></ul>");
    expect(out).toBe("## 제목\n문단입니다.\n- 항목");
  });
  it("긴 글은 소제목 · 첫 문장 · 글머리 · 마지막 문단만 남겨 상한 안으로", () => {
    const paras = Array.from({ length: 60 }, (_, i) => `<h3>절 ${i}</h3><p>이 절의 첫 문장은 이것입니다. ${"군더더기 문장이 길게 이어집니다. ".repeat(30)}</p>`).join("");
    const out = extractSkeleton(paras, 4000);
    expect(out.length).toBeLessThanOrEqual(4000);
    expect(out).toContain("## 절 0");
    expect(out).toContain("이 절의 첫 문장은 이것입니다.");
    /* 가운데 절은 첫 문장만 남는다(첫 · 마지막 문단만 길게) */
    const lines = out.split("\n");
    expect(lines[lines.indexOf("## 절 30") + 1]).toBe("이 절의 첫 문장은 이것입니다.");
  });
  it("태그 없는 글은 줄 단위로 — 마크다운 제목 · 글머리를 알아본다", () => {
    expect(extractSkeleton("# 큰 제목\n\n본문.\n- 하나\n- 둘")).toBe("## 큰 제목\n본문.\n- 하나\n- 둘");
  });
});
