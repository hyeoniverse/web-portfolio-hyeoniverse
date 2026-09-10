import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import OverviewPanel from "@/app/about/_components/panels/OverviewPanel";
import type { SiteConfigData } from "@/config/site.config";

/* Overview 패널의 값은 두 곳에서 온다 — 관리자가 고친 siteConfig.about.overview_* 가 이기고,
   없으면 content/about/overview.md 에서 구워진 폴백을 쓴다.
   실제 사이트 설정에는 overview 값이 들어 있어서 화면으로는 폴백 경로가 한 번도 안 타진다.
   그래서 여기서 설정을 비운 채 렌더해 폴백이 실제로 그려지는지 본다. */

const FALLBACK = {
  overview_description_ko: "폴백 설명",
  overview_description_en: "fallback description",
  overview_highlights: "칩하나, 칩둘",
  overview_stats: [{ value: "42", label_ko: "폴백 수치", label_en: "fallback stat" }],
};

function draw(about: Record<string, unknown>) {
  return renderToStaticMarkup(
    <SiteConfigProvider initialConfig={{ about } as unknown as SiteConfigData}>
      <LanguageProvider>
        <OverviewPanel language="ko" overview={FALLBACK} />
      </LanguageProvider>
    </SiteConfigProvider>,
  );
}

describe("OverviewPanel", () => {
  it("관리자 값이 없으면 폴백(content/about/overview.md)을 그린다", () => {
    const html = draw({});
    expect(html).toContain("폴백 설명");
    expect(html).toContain("칩하나");
    expect(html).toContain("칩둘");
    expect(html).toContain("폴백 수치");
    expect(html).toContain("42");
  });

  it("관리자가 설명을 적었으면 그것이 이긴다", () => {
    const html = draw({ overview_description_ko: "관리자 설명" });
    expect(html).toContain("관리자 설명");
    expect(html).not.toContain("폴백 설명");
  });

  it("관리자가 설명만 적고 칩·수치를 비웠으면 그 둘은 폴백으로 되돌아간다", () => {
    const html = draw({ overview_description_ko: "관리자 설명" });
    expect(html).toContain("칩하나");
    expect(html).toContain("폴백 수치");
  });

  /* 설명을 한 줄도 안 적었으면 관리자 편집본을 쓰지 않는다 — 원래 있던 전부 아니면 전무 규칙이다.
     칩만 남아 있는 반쪽 상태가 화면에 나가지 않게 막는다. */
  it("설명이 없으면 관리자가 적은 칩·수치도 쓰지 않는다", () => {
    const html = draw({ overview_highlights: "관리자칩", overview_stats: [{ value: "1", label_ko: "관리자수치", label_en: "admin" }] });
    expect(html).not.toContain("관리자칩");
    expect(html).not.toContain("관리자수치");
    expect(html).toContain("칩하나");
    expect(html).toContain("폴백 수치");
  });

  it("폴백이 없어도(md 가 비었을 때) 터지지 않는다", () => {
    const html = renderToStaticMarkup(
      <SiteConfigProvider initialConfig={{ about: {} } as unknown as SiteConfigData}>
        <LanguageProvider>
          <OverviewPanel language="ko" overview={null} />
        </LanguageProvider>
      </SiteConfigProvider>,
    );
    expect(html).toContain("<div");
  });
});
