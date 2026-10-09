// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createMissLimiter, postSource, sourceHash, workSource } from "@/lib/api/contentTranslate";

/* /api/content-translate 의 원문 고르기 · 캐시 해시 · 공급자 호출 상한 */

describe("postSource", () => {
  it("한국어 본문이 있으면 한국어 칸들", () => {
    const s = postSource({ title: "제목", title_en: "Title", excerpt: "요약", content: "본문", content_en: "Body", content_type: "richtext" });
    expect(s).toEqual({ lang: "ko", html: true, fields: { title: "제목", excerpt: "요약", content: "본문" } });
  });

  it("한국어 본문이 없으면 영어 칸들 — 영어 제목이 비면 한국어 제목", () => {
    const s = postSource({ title: "제목", title_en: "", excerpt: "요약", excerpt_en: "Sum", content: "", content_en: "Body", content_type: "markdown" });
    expect(s).toEqual({ lang: "en", html: false, fields: { title: "제목", excerpt: "Sum", content: "Body" } });
  });

  it("본문이 둘 다 없으면 null", () => {
    expect(postSource({ title: "제목", content: "", content_en: null })).toBeNull();
  });
});

describe("workSource", () => {
  it("복사된 영어 README 는 한국어 본문으로 보지 않는다", () => {
    const readme = "# Tool\n\nA small CLI tool for developers.";
    const s = workSource({ title: "Tool", title_en: "Tool", content_ko: readme, content_en: readme, subtitle_en: "CLI", description_en: "Desc" });
    expect(s?.lang).toBe("en");
    expect(s?.fields).toEqual({ title: "Tool", subtitle: "CLI", description: "Desc", content: readme });
  });

  it("한국어 본문이 있으면 한국어 칸들", () => {
    const s = workSource({ title: "작품", content_ko: "<p>한국어 본문입니다</p>", content_en: "", subtitle_ko: "부제", description_ko: "설명", content_type: "richtext" });
    expect(s).toEqual({ lang: "ko", html: true, fields: { title: "작품", subtitle: "부제", description: "설명", content: "<p>한국어 본문입니다</p>" } });
  });
});

describe("sourceHash", () => {
  it("같은 원문이면 같고, 한 칸만 바뀌어도 달라진다", () => {
    const a = postSource({ title: "제목", excerpt: "요약", content: "본문" })!;
    const b = postSource({ title: "제목", excerpt: "요약", content: "본문" })!;
    const c = postSource({ title: "제목", excerpt: "요약", content: "본문 고침" })!;
    expect(sourceHash(a)).toBe(sourceHash(b));
    expect(sourceHash(a)).not.toBe(sourceHash(c));
  });
});

describe("createMissLimiter", () => {
  it("IP 당 상한 · 창이 지나면 풀린다", () => {
    const take = createMissLimiter(2, 100, 1000);
    expect(take("a", 0)).toBe(true);
    expect(take("a", 10)).toBe(true);
    expect(take("a", 20)).toBe(false);
    expect(take("b", 20)).toBe(true);
    expect(take("a", 1010)).toBe(true);
  });

  it("전체 상한", () => {
    const take = createMissLimiter(5, 2, 1000);
    expect(take("a", 0)).toBe(true);
    expect(take("b", 0)).toBe(true);
    expect(take("c", 0)).toBe(false);
  });
});
