import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { repoToProject } from "@/lib/getWorksProjects";
import { STARS, CONSTELLATIONS } from "@/app/works/_components/WorksEmptyState/starMap";
import { PETALS } from "@/app/works/_components/WorksEmptyState/petalMap";
import WorksEmptyState from "@/app/works/_components/WorksEmptyState/WorksEmptyState";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { siteConfig } from "@/config/site.config";
import type { SiteConfigData } from "@/config/site.config";
import type { GithubRepoCard } from "@/lib/githubShowcase";

/* 발행한 작업물이 없을 때의 작업물 목록(#1062).
   저장소는 Project 로 바뀌어 기존 배치·상세 화면을 그대로 타고, 저장소까지 없으면 은하수 화면이 온다. */

const repo = (over: Partial<GithubRepoCard> = {}): GithubRepoCard => ({
  name: "alpha", owner: "me", fullName: "me/alpha",
  url: "https://github.com/me/alpha", description: "저장소 소개",
  language: "TypeScript", stars: 3, forks: 0, topics: [],
  pushedAt: "2026-04-05T00:00:00Z", defaultBranch: "main",
  ...over,
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

/* 빈 화면은 원통 배치(작업물 0개)를 품는다 — 그 배치가 테마와 설정을 읽는다.
   3D 캔버스는 dynamic(ssr:false) 이라 jsdom 에서는 붙지 않고, DOM 부분만 그려진다.
   jsdom 에는 matchMedia 가 없어 배치의 포인터 판별이 쓴다 — 자리만 채운다 */
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }),
  });
}

const withProviders = (children: React.ReactNode, config: unknown = siteConfig) => (
  <SiteConfigProvider initialConfig={config as SiteConfigData}>
    <ThemeProvider>{children}</ThemeProvider>
  </SiteConfigProvider>
);

describe("repoToProject", () => {
  it("목록·상세가 받는 Project 모양으로 바꾼다", () => {
    const project = repoToProject(repo(), undefined, 0);
    // 주소는 저장소 이름 — 작업물이 하나도 없을 때만 목록을 채우므로 부딪히지 않는다
    expect(project.slug).toBe("alpha");
    expect(project.id).toBe("gh-me-alpha");
    expect(project.number).toBe("01");
    expect(project.githubUrl).toBe("https://github.com/me/alpha");
    // 좋아요·댓글을 받을 자리가 없다는 표시
    expect(project.external).toBe(true);
    expect(project.contentType).toBe("markdown");
    // 아래 줄은 낱말 자리라 주 언어가 온다
    expect(project.category.ko).toBe("TypeScript");
  });

  it("본문은 걸러낸 README 다 — 남이 쓴 HTML 이 그대로 그려지면 안 된다", () => {
    const card = repo({
      readme: {
        title: "Alpha",
        summary: "한 줄 소개",
        image: "",
        markdown: '# Alpha\n\n<script>alert(1)</script>\n<img src="docs/a.png" alt="그림">\n본문',
      },
    });
    const project = repoToProject(card, undefined, 1);
    expect(project.content.ko).not.toContain("alert");
    expect(project.content.ko).not.toMatch(/<[^>]+>/);
    // 상대경로 그림은 저장소 raw 주소로 펴진다
    expect(project.content.ko).toContain("https://raw.githubusercontent.com/me/alpha/main/docs/a.png");
    // 제목·소개는 README 에서 온다
    expect(project.title.en).toBe("Alpha");
    expect(project.summary?.ko).toBe("한 줄 소개");
  });

  it("설정에서 덮어쓴 표지·제목·대표 기술을 그대로 쓴다", () => {
    const project = repoToProject(repo(), { name: "alpha", cover: "/c.jpg", title: "Custom", tech: "Next.js" }, 0);
    expect(project.image).toBe("/c.jpg");
    expect(project.title.en).toBe("Custom");
    expect(project.category.en).toBe("Next.js");
  });

  it("README 가 없으면 본문이 비어 있다 — 상세는 그래도 열린다", () => {
    expect(repoToProject(repo(), undefined, 0).content.ko).toBe("");
  });
});

describe("은하수 배경", () => {
  it("별 좌표는 고정이다 — 그릴 때마다 뽑으면 서버와 화면이 어긋난다", () => {
    expect(STARS).toHaveLength(520);
    // 값이 정해져 있다는 뜻 — 숫자가 바뀌면 배경이 바뀐 것이다
    expect(Number.isFinite(STARS[0].x)).toBe(true);
    /* 화면(0~1000)보다 넓은 자리에 뿌린다 — 하늘이 도는 동안 모서리가 비지 않게 */
    expect(STARS.every((s) => s.x >= -250 && s.x <= 1250 && s.y >= -250 && s.y <= 1250)).toBe(true);
    // 그래도 화면 안이 성기면 안 된다 — 절반 이상은 보이는 자리에 있어야 한다
    const onScreen = STARS.filter((s) => s.x >= 0 && s.x <= 1000 && s.y >= 0 && s.y <= 1000);
    expect(onScreen.length).toBeGreaterThan(200);
    // 가장 흐린 별도 밝은 바탕에서 보일 만큼은 된다
    expect(Math.min(...STARS.map((s) => s.o))).toBeGreaterThan(0.35);
    /* 반짝이는 별은 일부만 — 전부면 소란스럽고, 몇 개만이면 멈춰 보인다 */
    const twinkling = STARS.filter((s) => s.twinkle).length;
    expect(twinkling).toBeGreaterThan(STARS.length * 0.2);
    expect(twinkling).toBeLessThan(STARS.length * 0.6);
  });

  it("별자리는 이어 그릴 별을 가리킨다", () => {
    for (const c of CONSTELLATIONS) {
      for (const [a, b] of c.lines) {
        expect(c.stars[a]).toBeDefined();
        expect(c.stars[b]).toBeDefined();
      }
    }
  });

  it("어두운 테마에서는 비어 있다고 말하고 하늘을 깐다", () => {
    /* 빈 화면은 설정에서 문구를 읽고(비었으면 번역 파일), 원통의 인트로 패널을 그대로 쓴다.
       하늘은 어두운 테마에서만 — 밝은 쪽은 꽃잎이 내려온다 */
    localStorage.setItem("theme", "dark");
    const { getByText, queryByText } = render(withProviders(<WorksEmptyState />));
    expect(getByText("아직 발행한 작업물이 없습니다.")).toBeTruthy();
    // 별자리 이름이 성도처럼 얹힌다
    expect(getByText("ORION")).toBeTruthy();
    /* 보여줄 것이 없으면 인트로 패널은 그리지 않는다 — 몽이만 남긴다(#1062) */
    expect(queryByText(siteConfig.works.introTitle_ko)).toBeNull();
  });

  it("밝은 테마에서는 별 대신 꽃잎이 내려온다", () => {
    /* 밝은 바탕에 별을 뿌리면 종이에 찍은 점으로 보인다 — 밝은 쪽은 봄날로 둔다 */
    localStorage.setItem("theme", "light");
    const { container, queryByText } = render(withProviders(<WorksEmptyState />));
    // 별자리는 없고 꽃잎이 깔린다
    expect(queryByText("ORION")).toBeNull();
    expect(container.querySelectorAll('[class*="petal"]').length).toBeGreaterThan(30);
    expect(PETALS).toHaveLength(36);
    expect(PETALS.every((p) => p.x >= 0 && p.x <= 100 && p.duration > 0)).toBe(true);
  });

  it("설정에 적은 문구가 번역 파일의 기본 문장을 대신한다", () => {
    const config = {
      ...siteConfig,
      works: { ...siteConfig.works, emptyTitle_ko: "아직 아무것도 없습니다", emptySub_ko: "곧 채웁니다" },
    };
    const { getByText } = render(withProviders(<WorksEmptyState />, config));
    expect(getByText("아직 아무것도 없습니다")).toBeTruthy();
    expect(getByText("곧 채웁니다")).toBeTruthy();
  });
});
