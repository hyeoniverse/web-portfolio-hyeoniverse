import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider } from "@/providers/LanguageProvider";
import WorksActiveInfo from "@/app/works/_components/WorksActiveInfo";
import type { Project } from "@/data/projects";

/* 목록 아래 고정 제목의 글자 크기(#1062). 제목이 길면 작아지는데, 그 값(--title-units)을 바깥
   상자에 두면 작품이 바뀌는 순간 아직 화면에 남아 사라지는 중인 제목까지 새 크기로 바뀐다 —
   한 제목이 큰 채로 떴다가 작아지는 것처럼 보였다. 값은 제목 자신이 들고 있어야 한다. */

const project = (title: string, n: string): Project =>
  ({
    id: n,
    number: n,
    slug: n,
    title: { ko: title, en: title },
    subtitle: { ko: "", en: "" },
    category: { ko: "", en: "" },
    year: "2026",
    description: { ko: "", en: "" },
    role: { ko: "", en: "" },
    tech: [],
    image: "",
    size: "large",
    gallery: [],
  }) as unknown as Project;

function markup(projects: Project[], activeIndex: number) {
  return renderToStaticMarkup(
    <LanguageProvider>
      <WorksActiveInfo projects={projects} activeIndex={activeIndex} hidden={false} />
    </LanguageProvider>,
  );
}

describe("작업물 목록 고정 제목", () => {
  it("글자 크기 값은 바깥 상자가 아니라 제목 쪽이 들고 있다", () => {
    const html = markup([project("Some Long Project Title", "01")], 0);
    const divs = html.match(/<div[^>]*>/g) ?? [];
    const outer = divs[0];
    const withUnits = divs.filter((d) => d.includes("--title-units"));
    expect(outer).not.toContain("--title-units");
    expect(withUnits).toHaveLength(1);
    // 그 요소 안에 제목이 들어 있다 — 작품이 바뀌면 제목과 함께 새로 만들어진다
    expect(html.indexOf(withUnits[0])).toBeLessThan(html.indexOf("<h2"));
  });

  it("제목이 길수록 값이 커진다 — 그만큼 글자가 작아진다", () => {
    const short = markup([project("Home", "01")], 0);
    const long = markup([project("아주 긴 작업물 제목이 들어오는 경우", "02")], 0);
    const units = (html: string) => Number(html.match(/--title-units:\s*(\d+)/)![1]);
    expect(units(long)).toBeGreaterThan(units(short));
  });

  it("빈 자리를 가리켜도 그려진다", () => {
    expect(() => markup([], 3)).not.toThrow();
  });
});
