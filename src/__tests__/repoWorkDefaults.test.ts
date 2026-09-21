import { describe, it, expect } from "vitest";
import {
  inferRepoCategory,
  inferRepoNatureKey,
  natureLabel,
  repoContentFallback,
  repoCoverFallback,
  repoYear,
} from "@/lib/repoWorkDefaults";
import type { GithubRepoCard } from "@/lib/githubShowcase";

/* GitHub 저장소를 작업물로 들일 때 발행에 필요한 칸을 채운다 — 분류·성격은 저장소 단서로 고르고,
   README 가 없거나 그림이 없으면 저장소 정보로 채운다. 들인 뒤 저장할 때 필수 칸이 비었다고 막히지 않게. */

const OPTIONS = [
  { en: "Web App", ko: "웹앱" },
  { en: "Mobile App", ko: "모바일 앱" },
  { en: "Desktop App", ko: "데스크탑 앱" },
  { en: "Library", ko: "라이브러리" },
  { en: "Tool", ko: "도구" },
  { en: "Game", ko: "게임" },
  { en: "Backend", ko: "API · 백엔드" },
  { en: "AI / ML", ko: "AI / ML" },
  { en: "Automation", ko: "자동화" },
  { en: "Extension", ko: "확장 프로그램" },
  { en: "Interactive / Visual", ko: "인터랙티브 / 비주얼" },
  { en: "Etc", ko: "기타" },
];

function repo(over: Omit<Partial<GithubRepoCard>, "readme"> & { readme?: string } = {}): GithubRepoCard {
  const { readme, ...rest } = over;
  return {
    name: "sample",
    owner: "hyeoniverse",
    fullName: "hyeoniverse/sample",
    url: "https://github.com/hyeoniverse/sample",
    description: "",
    language: "",
    stars: 0,
    forks: 0,
    topics: [],
    pushedAt: "2025-03-10T00:00:00Z",
    defaultBranch: "main",
    ...rest,
    ...(readme !== undefined ? { readme: { title: "", summary: "", image: "", markdown: readme } } : {}),
  } as GithubRepoCard;
}

const categoryOf = (r: GithubRepoCard) => inferRepoCategory(r, OPTIONS)?.en;

describe("inferRepoCategory — 등록된 분류 가운데서 고른다", () => {
  it("웹 언어만 쓴 저장소는 웹앱", () => {
    expect(categoryOf(repo({ language: "TypeScript", languages: ["TypeScript", "CSS", "HTML"] }))).toBe("Web App");
  });

  it("Swift 저장소는 모바일 앱", () => {
    expect(categoryOf(repo({ language: "Swift", languages: ["Swift"] }))).toBe("Mobile App");
  });

  it("README 가 안드로이드 앱이라고 하면, ChatGPT 를 불러도 모바일 앱", () => {
    expect(categoryOf(repo({ language: "Java", languages: ["Java"], readme: "# ChatBuddy\nAndroid 앱. ChatGPT API 로 대화한다." }))).toBe("Mobile App");
  });

  it("웹으로 빌드한 Unity 게임은 언어가 HTML 이어도 게임", () => {
    expect(categoryOf(repo({ language: "HTML", languages: ["HTML", "JavaScript", "CSS"], readme: "Unity 로 만든 농장 게임입니다." }))).toBe("Game");
  });

  it("딥러닝 모델 저장소는 AI / ML", () => {
    expect(categoryOf(repo({ language: "Python", languages: ["Python"], readme: "KoELECTRA 로 악성 댓글 분류 모델을 학습했다." }))).toBe("AI / ML");
  });

  it("PyQt 키오스크 앱은 데스크탑 앱", () => {
    expect(categoryOf(repo({ owner: "2023-ICT-Kiosks", language: "Python", languages: ["Python"] }))).toBe("Desktop App");
  });

  it("README 의 설치법(npm install)만으로 라이브러리로 보지 않는다", () => {
    expect(categoryOf(repo({ language: "TypeScript", languages: ["TypeScript"], readme: "## 설치\n```\nnpm install\n```" }))).toBe("Web App");
  });

  it("단서가 없으면 기타, 기타도 없으면 첫 분류, 분류가 하나도 없으면 null", () => {
    expect(categoryOf(repo({ language: "Haskell", languages: ["Haskell"] }))).toBe("Etc");
    expect(inferRepoCategory(repo({ language: "Haskell" }), [{ en: "Web App", ko: "웹앱" }])?.en).toBe("Web App");
    expect(inferRepoCategory(repo(), [])).toBeNull();
  });

  it("설정에서 지운 분류는 고르지 않고 다음 규칙으로 넘어간다", () => {
    const noMobile = OPTIONS.filter((o) => o.en !== "Mobile App");
    expect(inferRepoCategory(repo({ language: "Swift", languages: ["Swift"] }), noMobile)?.en).toBe("Etc");
  });
});

describe("inferRepoNatureKey — 만든 동기", () => {
  it("데브코스 조직의 저장소는 스터디 프로젝트", () => {
    expect(inferRepoNatureKey(repo({ owner: "Devcourse-NewPick", name: "front" }))).toBe("study");
  });

  it("공모전·해커톤 문구가 있으면 공모전", () => {
    expect(inferRepoNatureKey(repo({ readme: "GDSC Solution Challenge 출품작" }))).toBe("contest");
    expect(inferRepoNatureKey(repo({ description: "2024 공모전 수상작" }))).toBe("contest");
  });

  it("캡스톤·졸업작품은 학교 과제", () => {
    expect(inferRepoNatureKey(repo({ readme: "2024 캡스톤 디자인 프로젝트" }))).toBe("academic");
  });

  it("README 의 git clone 설치법은 클론 코딩이 아니다", () => {
    expect(inferRepoNatureKey(repo({ readme: "## 시작하기\n```\ngit clone https://github.com/a/b\n```" }))).toBe("side");
    expect(inferRepoNatureKey(repo({ description: "넷플릭스 클론 코딩" }))).toBe("clone");
  });

  it("단서가 없으면 사이드 프로젝트", () => {
    expect(inferRepoNatureKey(repo())).toBe("side");
  });

  it("라벨은 편집 화면의 성격 프리셋과 같은 문구다", () => {
    expect(natureLabel("side")).toEqual({ ko: "사이드 프로젝트", en: "Side Project" });
    expect(natureLabel("study")).toEqual({ ko: "스터디 프로젝트", en: "Study Project" });
  });
});

describe("빈칸 채우기", () => {
  it("대표 이미지는 GitHub 저장소 소개 카드", () => {
    expect(repoCoverFallback(repo({ owner: "PurrFectDay", name: "PurrFectDay." }))).toBe("https://opengraph.githubassets.com/1/PurrFectDay/PurrFectDay.");
  });

  it("연도는 마지막 push 한 해, 모르면 올해", () => {
    expect(repoYear(repo({ pushedAt: "2023-11-02T00:00:00Z" }))).toBe("2023");
    expect(repoYear(repo({ pushedAt: "" }), new Date("2026-09-21T00:00:00Z"))).toBe("2026");
  });

  it("README 가 없으면 저장소 정보로 본문을 만든다 — 소개가 없어도 비지 않는다", () => {
    const ko = repoContentFallback(repo({ description: "나만의 macOS 스타일 포트폴리오" }), ["TypeScript", "CSS"], "ko");
    expect(ko).toContain("나만의 macOS 스타일 포트폴리오");
    expect(ko).toContain("[hyeoniverse/sample](https://github.com/hyeoniverse/sample)");
    expect(ko).toContain("TypeScript · CSS");
    expect(ko).toContain("2025-03");
    expect(repoContentFallback(repo(), [], "en")).toContain("Imported from the GitHub repository");
    expect(repoContentFallback(repo(), [], "ko").trim().length).toBeGreaterThan(0);
  });
});
