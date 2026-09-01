import { describe, it, expect } from "vitest";
import { loadPanelFiles } from "@/lib/about/loadPanelFiles";
import { securityPanel, processPanel } from "@/lib/about/panelMarkdown";
import { itemToMarkdown } from "@/lib/about/decisionsMarkdown";
import { aboutSecurity, aboutProcess, aboutDecisions } from "@/data/generated/aboutContent";

/** 실제 파일과 같은 모양으로 만든 업로드 목록. */
const asFiles = <T,>(items: T[], write: (i: T, l: "ko" | "en") => string, base = "item") =>
  items.flatMap((item, i) => {
    const n = `${String(i + 1).padStart(2, "0")}-${base}${i}`;
    return [
      { name: `${n}.md`, text: write(item, "ko") },
      { name: `${n}.en.md`, text: write(item, "en") },
    ];
  });

describe("업로드한 md 를 패널 값으로", () => {
  it("Security — 파일에서 읽은 값이 원본과 같다", () => {
    const r = loadPanelFiles("security", asFiles(aboutSecurity, securityPanel.write))!;
    expect(r.warnings).toEqual([]);
    expect(r.count).toBe(aboutSecurity.length);
    expect(r.values["about.security"]).toEqual(aboutSecurity);
  });

  it("Process — 마찬가지", () => {
    const r = loadPanelFiles("process", asFiles(aboutProcess, processPanel.write))!;
    expect(r.values["about.process"]).toEqual(aboutProcess);
  });

  it("Design Decisions — id 와 본문이 살아서 온다", () => {
    const files = aboutDecisions.flatMap((item, i) => {
      const n = `${String(i + 1).padStart(2, "0")}-${item.id}`;
      return [
        { name: `${n}.md`, text: itemToMarkdown(item, "ko") },
        { name: `${n}.en.md`, text: itemToMarkdown(item, "en") },
      ];
    });
    const r = loadPanelFiles("troubleshooting", files)!;
    expect(r.warnings).toEqual([]);
    expect(r.values["about.troubleshooting"]).toEqual(aboutDecisions);
  });

  /* 파일명 순서가 곧 표시 순서다. 브라우저가 넘기는 순서는 보장되지 않는다. */
  it("파일명 순으로 정렬한다", () => {
    const files = [
      { name: "02-b.md", text: securityPanel.write(aboutSecurity[1], "ko") },
      { name: "01-a.md", text: securityPanel.write(aboutSecurity[0], "ko") },
    ];
    const r = loadPanelFiles("security", files)!;
    expect((r.values["about.security"] as typeof aboutSecurity)[0].title_ko).toBe(aboutSecurity[0].title_ko);
  });

  it("en 파일만 있으면 그 항목은 버린다 (ko 가 기준)", () => {
    const r = loadPanelFiles("security", [
      { name: "01-a.en.md", text: securityPanel.write(aboutSecurity[0], "en") },
    ])!;
    expect(r.count).toBe(0);
  });

  it("md 가 아닌 파일은 무시한다", () => {
    const r = loadPanelFiles("security", [{ name: "readme.txt", text: "hi" }])!;
    expect(r.count).toBe(0);
    expect(r.warnings[0]).toContain(".md");
  });

  it("겹친 id 는 건너뛰고 알린다", () => {
    const md = itemToMarkdown(aboutDecisions[0], "ko");
    const r = loadPanelFiles("troubleshooting", [
      { name: "01-x.md", text: md },
      { name: "02-y.md", text: md },
    ])!;
    expect(r.count).toBe(1);
    expect(r.warnings.join()).toContain("겹칩니다");
  });

  /* Overview·Credits 는 항목이 아니라 평평한 키 여러 개를 채운다. */
  it("Overview 는 여러 경로를 한 번에 채운다", () => {
    const r = loadPanelFiles("overview", [{
      name: "overview.md",
      text: "---\nhighlights: [A, B]\n---\n# Overview\n\n소개 문단\n",
    }])!;
    expect(r.values["about.overview_description_ko"]).toBe("소개 문단");
    expect(r.values["about.overview_highlights"]).toBe("A, B");
  });

  it("md 를 못 쓰는 패널이면 null", () => {
    expect(loadPanelFiles("erd", [{ name: "a.md", text: "# x" }])).toBeNull();
  });

  /* 상대 경로 이미지는 서빙 경로로 바꾼다. 파일이 실제로 있는지는 브라우저가 못 본다 —
     그건 동기화가 잡는다. */
  it("상대 경로 이미지를 서빙 경로로 바꾼다", () => {
    const r = loadPanelFiles("troubleshooting", [{
      name: "01-x.md",
      text: "---\nid: x\n---\n# 제목\n\n## Context\n본문\n\n## Considerations\n원인\n\n## Decision\n해결\n\n![도형](./01-x/a.svg)\n\n## Key Insight\n교훈\n",
    }])!;
    const item = (r.values["about.troubleshooting"] as Array<{ images?: Array<{ src: string }> }>)[0];
    expect(item.images?.[0].src).toBe("/content/about/decisions/01-x/a.svg");
  });
});
