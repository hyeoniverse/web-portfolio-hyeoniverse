import { describe, it, expect } from "vitest";
import { ABOUT_TEXT_DEFAULTS as D, applyAboutTexts, listRule } from "@/app/about/_data/texts";

describe("aboutTexts", () => {
  it("덮어쓰기가 없으면 기본값 그대로", () => {
    expect(applyAboutTexts(undefined)).toBe(D);
    expect(applyAboutTexts({})).toBe(D);
  });

  it("고친 장면만 바뀌고 다른 장 · 장면은 같은 참조", () => {
    const faq = structuredClone(D.landing.faq);
    faq.items[0].q.ko = "새 질문";
    const out = applyAboutTexts({ landing: { faq } });
    expect(out.landing.faq.items[0].q.ko).toBe("새 질문");
    expect(out.landing.trust).toBe(D.landing.trust);
    expect(out.showcase).toBe(D.showcase);
    expect(D.landing.faq.items[0].q.ko).not.toBe("새 질문");
  });

  it("목록 항목을 늘리고 줄이고 옮길 수 있다", () => {
    const faq = structuredClone(D.landing.faq);
    const [first, ...rest] = faq.items;
    faq.items = [...rest, first, { ...first, q: { ko: "추가", en: "Added" } }];
    const out = applyAboutTexts({ landing: { faq } });
    expect(out.landing.faq.items).toHaveLength(D.landing.faq.items.length + 1);
    expect(out.landing.faq.items[0].q.ko).toBe(D.landing.faq.items[1].q.ko);
    expect(out.landing.faq.items.at(-1)!.q.en).toBe("Added");
  });

  it("모양이 틀린 값은 기본값으로 채우고 모르는 칸 · 장면은 버린다", () => {
    const out = applyAboutTexts({
      landing: { faq: { eyebrow: 3, items: "x", junk: 1 } as unknown, nope: { a: 1 } },
      unknown: { x: 1 },
    });
    expect(out.landing.faq.items).toEqual(D.landing.faq.items);
    expect(out.landing.faq.eyebrow).toEqual(D.landing.faq.eyebrow);
    expect("junk" in out.landing.faq).toBe(false);
  });

  it("그림과 번호로 묶인 목록은 길이를 바꿀 수 없다", () => {
    expect(listRule("decisions.securityLayers")).toBe("locked");
    expect(listRule("ai.fallbackPanel.features.2.providers")).toBe("locked");
    expect(listRule("showcase.toc")).toBe("fixed");
    expect(listRule("landing.faq.items")).toBe("free");
    const shorter = { securityLayers: D.decisions.securityLayers.slice(1) };
    expect(applyAboutTexts({ decisions: shorter }).decisions.securityLayers).toHaveLength(D.decisions.securityLayers.length);
    /* 옮기기만 되는 목록 — 순서는 따르고, 길이가 다르면 기본값 */
    const toc = [...D.showcase.toc].reverse();
    expect(applyAboutTexts({ showcase: { toc } }).showcase.toc[0].href).toBe(toc[0].href);
    expect(applyAboutTexts({ showcase: { toc: toc.slice(1) } }).showcase.toc).toEqual(D.showcase.toc);
  });

  it("글이 아닌 칸(이미지 · 경로)은 저장값을 쓰지 않는다", () => {
    const hero = structuredClone(D.showcase.hero);
    hero.shots[0].width = 1;
    (hero.shots[0] as { src: string }).src = "/evil.png";
    const out = applyAboutTexts({ showcase: { hero } });
    expect(out.showcase.hero.shots[0].width).toBe(D.showcase.hero.shots[0].width);
    expect(out.showcase.hero.shots[0].src).toBe(D.showcase.hero.shots[0].src);
  });
});
