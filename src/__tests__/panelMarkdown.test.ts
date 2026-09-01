import { describe, it, expect } from "vitest";
import {
  parseSimpleMarkdown,
  securityPanel,
  featuresPanel,
  processPanel,
  overviewPanel,
  creditsPanel,
  slugify,
} from "@/lib/about/panelMarkdown";
import { siteConfig } from "@/config/site.config";
import { aboutSecurity, aboutFeatures, aboutProcess } from "@/data/generated/aboutContent";

/**
 * Design Decisions 와 같은 이유로 왕복을 붙든다 — 화면에서 뽑은 md 를 content/about/ 에
 * 넣고 동기화했을 때 같은 값이 돌아와야 한다. 실제 설정값을 그대로 통과시킨다.
 */
/* 실제 값은 이제 content/about/ 의 md 에서 구워진다 (site.config 기본값은 비어 있다). */
const about = {
  ...siteConfig.about,
  security: aboutSecurity,
  features: aboutFeatures,
  process: aboutProcess,
};

function trip<T>(
  item: T,
  panel: {
    write(item: T, lang: "ko" | "en"): string;
    read(ko: ReturnType<typeof parseSimpleMarkdown>, en: ReturnType<typeof parseSimpleMarkdown> | undefined): T;
  },
): T {
  const ko = parseSimpleMarkdown(panel.write(item, "ko"));
  const en = parseSimpleMarkdown(panel.write(item, "en"));
  expect(ko.warnings, `ko 경고: ${ko.warnings.join(" / ")}`).toEqual([]);
  expect(en.warnings, `en 경고: ${en.warnings.join(" / ")}`).toEqual([]);
  return panel.read(ko, en);
}

describe("Security 왕복", () => {
  it.each(about.security.map((s, i) => [s.title_en, s, i] as const))("%s", (_t, item) => {
    expect(trip(item, securityPanel)).toEqual(item);
  });
});

describe("Features 왕복", () => {
  it.each(about.features.map((f, i) => [f.title, f, i] as const))("%s", (_t, item) => {
    expect(trip(item, featuresPanel)).toEqual(item);
  });

  /* tech 는 config 에서 쉼표로 이은 한 줄, md 에서는 배열이다. 공백 처리가 어긋나면
     화면의 칩 개수가 달라진다. */
  it("tech 를 배열로 적었다가 다시 한 줄로 돌린다", () => {
    const md = featuresPanel.write(about.features[0], "ko");
    expect(md).toContain("tech: [Lenis, Infinite Scroll, Bridge Section]");
  });
});

describe("Process 왕복", () => {
  it.each(about.process.map((p, i) => [p.step, p, i] as const))("step %s", (_s, item) => {
    expect(trip(item, processPanel)).toEqual(item);
  });
});

describe("Overview 왕복", () => {
  const values = {
    overview_description_ko: about.overview_description_ko,
    overview_description_en: about.overview_description_en,
    overview_highlights: about.overview_highlights,
    overview_stats: about.overview_stats,
  };

  it("설명·highlights·stats 가 그대로 돌아온다", () => {
    expect(trip(values, overviewPanel)).toEqual(values);
  });

  /* 카드 라벨에 줄바꿈이 들어간다. 표 칸에는 실제 줄바꿈을 못 넣어 <br> 로 적는다. */
  it("라벨의 줄바꿈을 <br> 로 적고 되돌린다", () => {
    const md = overviewPanel.write(values, "ko");
    expect(md).toContain("| 6 Mo+ | 개발 기간<br>(2/5 – 진행 중) |");
    expect(trip(values, overviewPanel).overview_stats[0].label_ko).toBe(about.overview_stats[0].label_ko);
  });

  it("stats 가 없으면 표를 만들지 않는다", () => {
    const empty = { ...values, overview_stats: [] };
    expect(overviewPanel.write(empty, "ko")).not.toContain("## Stats");
    expect(trip(empty, overviewPanel).overview_stats).toEqual([]);
  });
});

describe("Credits 왕복", () => {
  it("이름과 한 줄 메모가 그대로 돌아온다", () => {
    const values = { creditsNames: ["someone", "another"], creditsNote_ko: "고맙습니다.", creditsNote: "Thanks." };
    const ko = parseSimpleMarkdown(creditsPanel.write(values, "ko"));
    const en = parseSimpleMarkdown(creditsPanel.write(values, "en"));
    expect(creditsPanel.read(ko, en)).toEqual(values);
  });
});

describe("공통", () => {
  it("en 파일이 없으면 ko 를 쓴다", () => {
    const item = about.security[0];
    const ko = parseSimpleMarkdown(securityPanel.write(item, "ko"));
    const back = securityPanel.read(ko, undefined);
    expect(back.title_en).toBe(item.title_ko);
    expect(back.description_en).toBe(item.description_ko);
  });

  it("제목이나 본문이 비면 경고한다", () => {
    const doc = parseSimpleMarkdown("---\nicon: db\n---\n");
    expect(doc.warnings).toHaveLength(2);
  });

  it("slugify 는 한글을 남기고 기호만 정리한다", () => {
    expect(slugify("SQL Injection")).toBe("sql-injection");
    expect(slugify("설계 및 디자인 시스템 구축")).toBe("설계-및-디자인-시스템-구축");
    expect(slugify("!!!")).toBe("item");
  });
});
