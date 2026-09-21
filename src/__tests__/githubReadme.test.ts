import { describe, it, expect } from "vitest";
import { parseReadme, absolutizeReadmeImage } from "@/lib/githubReadme";
import { repoView } from "@/data/works";
import type { GithubRepoCard } from "@/lib/githubShowcase";

/* README 에서 표지·제목·설명을 뽑아 저장소 칸의 기본값으로 쓴다(#1053).
   실제 저장소들의 README 모양을 그대로 본떠 둔다 — 배지가 먼저 오는 것, 상대경로 이미지,
   날짜만 있는 줄, 제목이 아예 없는 것까지 실물에서 나온 경우들이다. */

describe("parseReadme", () => {
  it("제목·설명·이미지를 뽑는다", () => {
    const meta = parseReadme(`# 큐알유(QRU): QR코드로 만드는 디지털 명함

![banner](docs/hero.png)

QRU 는 QR 과 Who Are You 를 결합한 이름으로, 정보를 입력해 QR 코드를 만드는 웹 앱입니다.
`);
    expect(meta.title).toBe("큐알유(QRU): QR코드로 만드는 디지털 명함");
    expect(meta.image).toBe("docs/hero.png");
    expect(meta.summary).toContain("QR 과 Who Are You");
  });

  it("배지와 장식 배너는 표지로 잡지 않는다", () => {
    const meta = parseReadme(`![build](https://img.shields.io/badge/build-passing-green)
![banner](https://capsule-render.vercel.app/api?type=soft&text=hello)

# 프로젝트

![real](https://example.com/cover.png)
`);
    expect(meta.image).toBe("https://example.com/cover.png");
  });

  it("HTML img 와 상대경로도 읽는다", () => {
    const meta = parseReadme(`# CHATBuddy

<img src="readme/title.png" width="100%">
`);
    expect(meta.image).toBe("readme/title.png");
  });

  it("날짜만 있는 줄은 설명으로 쓰지 않는다", () => {
    const meta = parseReadme(`# CHATBuddy 챗벗

📅 2023.01.16 ~ 2023.03.31

마음의 우울감을 덜어 주는 친구 같은 AI 채팅 서비스입니다.
`);
    expect(meta.summary).toBe("마음의 우울감을 덜어 주는 친구 같은 AI 채팅 서비스입니다.");
  });

  it("표·목록·인용과 코드 블록은 설명으로 쓰지 않는다", () => {
    const meta = parseReadme(`# 프로젝트

\`\`\`bash
npm install 어쩌구저쩌구 하는 설치 명령입니다
\`\`\`

- 목록 항목이라 설명이 아니다
> 인용문도 설명이 아니다

이 문장이 실제 소개 문단입니다.
`);
    expect(meta.summary).toBe("이 문장이 실제 소개 문단입니다.");
  });

  it("마크다운 표식과 참조식 링크를 걷어낸다", () => {
    const meta = parseReadme(`# *SproutFarm 새싹 농장*

[MDN Web Docs][] 는 **열린** 협업 프로젝트로 웹 기술을 문서로 남깁니다.
`);
    expect(meta.title).toBe("SproutFarm 새싹 농장");
    expect(meta.summary).toBe("MDN Web Docs 는 열린 협업 프로젝트로 웹 기술을 문서로 남깁니다.");
  });

  it("제목이 없으면 비운 채로 둔다 — 부르는 쪽이 저장소 이름으로 돌아간다", () => {
    expect(parseReadme("배너만 있고 제목이 없는 README 입니다.").title).toBe("");
    expect(parseReadme("").summary).toBe("");
  });
});

describe("absolutizeReadmeImage", () => {
  it("상대경로는 기본 브랜치의 raw 주소로 편다", () => {
    expect(absolutizeReadmeImage("readme/title.png", "me", "repo", "main"))
      .toBe("https://raw.githubusercontent.com/me/repo/main/readme/title.png");
    expect(absolutizeReadmeImage("./docs/a.png", "me", "repo", "dev"))
      .toBe("https://raw.githubusercontent.com/me/repo/dev/docs/a.png");
  });

  it("GitHub 이 내주는 호스트의 절대주소는 그대로 둔다", () => {
    expect(absolutizeReadmeImage("https://user-images.githubusercontent.com/1/a.png", "me", "repo", "main"))
      .toBe("https://user-images.githubusercontent.com/1/a.png");
  });

  it("그릴 수 없는 호스트는 버린다 — 낯선 주소 하나가 페이지 전체를 500 으로 만든다", () => {
    expect(absolutizeReadmeImage("https://example.com/a.png", "me", "repo", "main")).toBe("");
    expect(absolutizeReadmeImage("http://raw.githubusercontent.com/a.png", "me", "repo", "main")).toBe("");
  });
});

describe("repoView 의 값 고르는 순서", () => {
  const card = (readme?: GithubRepoCard["readme"]): GithubRepoCard => ({
    name: "alpha", owner: "me", fullName: "me/alpha",
    url: "https://github.com/me/alpha", description: "깃허브 저장소 소개",
    language: "TypeScript", stars: 0, forks: 0, topics: [],
    pushedAt: "2026-01-01T00:00:00Z", defaultBranch: "main", readme,
  });

  it("README 가 있으면 그 제목·표지를 쓴다", () => {
    const view = repoView(card({ title: "README 제목", summary: "README 설명", image: "/readme.png" }));
    expect(view.title.en).toBe("README 제목");
    expect(view.cover).toBe("/readme.png");
  });

  it("README 가 없으면 저장소 이름과 주 언어로 내려간다", () => {
    const view = repoView(card());
    expect(view.title.en).toBe("alpha");
    expect(view.tech).toBe("TypeScript");
    expect(view.cover).toBe("");
  });
});
