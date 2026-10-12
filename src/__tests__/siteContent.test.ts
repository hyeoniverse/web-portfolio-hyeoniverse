import { describe, expect, it } from "vitest";
import { acceptContentString, siteContentHash, siteContentSource, sourceLangOf } from "@/lib/siteContent";

describe("siteContent — 사이트 내용 글 묶음", () => {
  const config = {
    hero: { headline: ["Creative", "Developer"], subtext: ["Based in Seoul"], scrollLabel: "Scroll down" },
    homeIntro: { tagline: "I craft {aesthetics}.", description: "" },
    services: { label: "What I Do", items: [{ title: "Web", desc: "React" }] },
    marquee: { words: ["CREATIVE", "Developer"] },
    cta: { label: "Reach out", title: ["Up for a"], buttonText: "Get in touch" },
    posts: { categories: [{ ko: "개발", en: "Dev", children: [{ ko: "프론트", en: "Frontend" }] }] },
    works: { categories: [{ ko: "웹", en: "Web" }] },
  };

  it("홈 글 · 카테고리(자식까지) · 태그 · 작업물 카테고리를 겹침 없이 정렬해 모은다", () => {
    const src = siteContentSource(config, { tags: ["리액트", "Next.js", "리액트"], workCategories: ["Web", "Mobile"] });
    expect(src).toEqual([...new Set(src)].sort());
    for (const s of ["Creative", "I craft {aesthetics}.", "What I Do", "Dev", "Frontend", "Web", "Mobile", "리액트", "Next.js", "Get in touch"]) {
      expect(src).toContain(s);
    }
    expect(src).not.toContain("");
  });

  it("한글이 있으면 한국어 원문", () => {
    expect(sourceLangOf("리액트")).toBe("ko");
    expect(sourceLangOf("React")).toBe("en");
  });

  it("강조 자리({ })가 어긋나거나 빈 번역은 버린다", () => {
    expect(acceptContentString("I craft {aesthetics}.", "{美学}を作る。")).toBe("{美学}を作る。");
    expect(acceptContentString("I craft {aesthetics}.", "美学を作る。")).toBeNull();
    expect(acceptContentString("Dev", "  ")).toBeNull();
  });

  it("원문 목록이 같으면 같은 해시", () => {
    expect(siteContentHash(["a", "b"])).toBe(siteContentHash(["a", "b"]));
    expect(siteContentHash(["a", "b"])).not.toBe(siteContentHash(["a", "c"]));
  });
});
