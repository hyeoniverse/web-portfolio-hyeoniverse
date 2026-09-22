import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/providers/LanguageProvider";
import WorkArticleInfoGrid from "@/components/works/WorkArticleInfoGrid";
import { serializePeriodAsYear } from "@/components/works/workEditor/periodFormat";
import type { Project } from "@/data/projects";

/* 기간으로 저장한 연도가 상세 정보 칸에 JSON 그대로 찍히던 문제(#1115) */

const project = (year: string): Project =>
  ({
    id: "1",
    number: "01",
    slug: "p",
    title: { ko: "제목", en: "Title" },
    subtitle: { ko: "", en: "" },
    category: { ko: "", en: "" },
    year,
    description: { ko: "", en: "" },
    role: { ko: "", en: "" },
    tech: [],
    image: "",
    size: "large",
    gallery: [],
  }) as unknown as Project;

function markup(year: string, viewLang: "ko" | "en") {
  return renderToStaticMarkup(
    <LanguageProvider>
      <WorkArticleInfoGrid project={project(year)} viewLang={viewLang} />
    </LanguageProvider>,
  );
}

describe("작업물 상세 연도", () => {
  it("기간으로 저장한 연도는 읽을 수 있는 글자로 찍는다", () => {
    const html = markup(serializePeriodAsYear({ start: "2024-03", end: "2024-06", format: "yearMonth" }), "ko");
    expect(html).toContain("2024.03 - 2024.06");
    expect(html).not.toContain("&quot;start&quot;");
  });

  it("진행 중은 보는 언어를 따른다", () => {
    const year = serializePeriodAsYear({ start: "2026-02", ongoing: true, format: "yearMonth" });
    expect(markup(year, "ko")).toContain("2026.02 - 현재");
    expect(markup(year, "en")).toContain("2026.02 - Present");
  });

  it("단일 연도는 그대로 찍는다", () => {
    expect(markup("2024", "ko")).toContain(">2024<");
  });
});
