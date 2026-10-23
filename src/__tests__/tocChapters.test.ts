import { describe, expect, it } from "vitest";
import { appendTocEntry, extractHeadings } from "@/utils/headingUtils";

/* 목차 끝의 댓글 항목은 본문의 가장 높은 제목과 같은 단계로 — 1단계로 붙이면 h2 로 시작하는 글의 h2 가
   모두 소제목이 되어 첫 제목 아래로 들어가고 h3 는 목차에서 빠졌다 */
describe("appendTocEntry", () => {
  const html = "<h2>기존 방식</h2><p>…</p><h2>aal 클레임</h2><h3>1. proxy</h3><h2>정리</h2>";

  it("h2 로 시작하는 글이면 댓글도 2단계", () => {
    const toc = appendTocEntry(extractHeadings(html, false), { id: "comments", text: "댓글" });
    expect(toc.map((h) => h.level)).toEqual([2, 2, 3, 2, 2]);
    expect(toc.at(-1)).toEqual({ id: "comments", text: "댓글", level: 2 });
  });

  it("h1 이 있으면 1단계, 제목이 없으면 1단계", () => {
    expect(appendTocEntry(extractHeadings("# 제목\n## 소제목", true), { id: "comments", text: "댓글" }).at(-1)?.level).toBe(1);
    expect(appendTocEntry([], { id: "comments", text: "댓글" })).toEqual([{ id: "comments", text: "댓글", level: 1 }]);
  });
});
