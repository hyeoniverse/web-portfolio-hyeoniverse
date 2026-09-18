import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { repoToProject } from "@/lib/getWorksProjects";
import { STARS, CONSTELLATIONS } from "@/app/works/_components/WorksEmptyState/starMap";
import WorksEmptyState from "@/app/works/_components/WorksEmptyState/WorksEmptyState";
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

afterEach(cleanup);

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
    expect(STARS).toHaveLength(220);
    expect(STARS[0]).toEqual(STARS[0]);
    // 값이 정해져 있다는 뜻 — 숫자가 바뀌면 배경이 바뀐 것이다
    expect(Number.isFinite(STARS[0].x)).toBe(true);
    expect(STARS.every((s) => s.x >= 0 && s.x <= 1000 && s.y >= 0 && s.y <= 1000)).toBe(true);
    // 반짝이는 별은 일부만
    expect(STARS.filter((s) => s.twinkle).length).toBeLessThan(STARS.length / 3);
  });

  it("별자리는 이어 그릴 별을 가리킨다", () => {
    for (const c of CONSTELLATIONS) {
      for (const [a, b] of c.lines) {
        expect(c.stars[a]).toBeDefined();
        expect(c.stars[b]).toBeDefined();
      }
    }
  });

  it("보여줄 것이 없으면 비어 있다고 말하고 하늘을 깐다", () => {
    const { getByText, container } = render(<WorksEmptyState />);
    expect(getByText("아직 발행한 작업물이 없습니다.")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
    // 별자리 이름이 성도처럼 얹힌다
    expect(getByText("ORION")).toBeTruthy();
  });
});
