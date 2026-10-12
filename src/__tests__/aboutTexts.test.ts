import { describe, it, expect } from "vitest";
import { ABOUT_TEXT_DEFAULTS, applyAboutTexts, collectTextLeaves } from "@/app/about/_data/texts";

describe("aboutTexts", () => {
  it("덮어쓰기가 없으면 기본값 그대로", () => {
    expect(applyAboutTexts(undefined)).toBe(ABOUT_TEXT_DEFAULTS);
    expect(applyAboutTexts({})).toBe(ABOUT_TEXT_DEFAULTS);
  });

  it("고친 글만 바뀌고 나머지는 같은 참조로 남는다", () => {
    const out = applyAboutTexts({ landing: { "faq.items.0.q.ko": "새 질문" } });
    expect(out.landing.faq.items[0].q.ko).toBe("새 질문");
    expect(out.landing.faq.items[0].q.en).toBe(ABOUT_TEXT_DEFAULTS.landing.faq.items[0].q.en);
    expect(out.landing.faq.items[1]).toBe(ABOUT_TEXT_DEFAULTS.landing.faq.items[1]);
    expect(out.showcase).toBe(ABOUT_TEXT_DEFAULTS.showcase);
    /* 기본값은 건드리지 않는다 */
    expect(ABOUT_TEXT_DEFAULTS.landing.faq.items[0].q.ko).not.toBe("새 질문");
  });

  it("빈 글 · 없는 경로 · 글자가 아닌 자리는 건너뛴다", () => {
    const out = applyAboutTexts({
      landing: { "faq.items.0.q.ko": "  ", "nope.ko": "x", "faq.items": "x" },
      unknown: { "a.ko": "x" },
    });
    expect(out.landing).toBe(ABOUT_TEXT_DEFAULTS.landing);
  });

  it("편집 칸 — ko/en 글과 숫자 · 단위 칸을 모으고, 경로는 다시 적용할 수 있다", () => {
    for (const [ch, defaults] of Object.entries(ABOUT_TEXT_DEFAULTS)) {
      const leaves = collectTextLeaves(defaults);
      expect(leaves.length, ch).toBeGreaterThan(0);
      for (const leaf of leaves.slice(0, 5)) {
        const out = applyAboutTexts({ [ch]: { [leaf.path]: "★" } }) as unknown as Record<string, unknown>;
        const got = leaf.path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], out[ch]);
        expect(got, `${ch}.${leaf.path}`).toBe("★");
      }
    }
    expect(collectTextLeaves(ABOUT_TEXT_DEFAULTS.showcase).some((l) => l.path === "facts.items.0.value")).toBe(true);
    expect(collectTextLeaves(ABOUT_TEXT_DEFAULTS.showcase).some((l) => l.path.startsWith("hero.shots"))).toBe(false);
  });
});
