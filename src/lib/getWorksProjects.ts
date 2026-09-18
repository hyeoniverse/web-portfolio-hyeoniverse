import { cache } from "react";
import { getWorks } from "@/lib/getWorks";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getShowcaseRepos } from "@/lib/getShowcaseRepos";
import { readmeToMarkdown } from "@/lib/readmeMarkdown";
import { repoView, type RepoOverride } from "@/data/works";
import type { Project } from "@/data/projects";
import type { GithubRepoCard } from "@/lib/githubShowcase";

/** 작업물이 없을 때 목록을 채울 저장소 수 — 가로 스크롤 한 화면에 담기는 정도 */
const REPO_LIMIT = 12;

/**
 * 작업물 목록·상세가 쓰는 목록 — 발행한 작업물이 없으면 GitHub 저장소가 그 자리에 온다(#1062).
 *
 * 저장소를 Project 모양으로 바꿔 넘기는 것은, 목록의 여섯 배치(flow·cylinder·cinematic·grid·
 * split·fullscreen)와 상세 화면이 이미 Project 를 받아 그리기 때문이다. 저장소용 화면을 따로
 * 만들면 배치 여섯 개를 다시 구현해야 하고, 그중 하나만 고쳐도 둘이 어긋난다.
 *
 * 홈이 작업물 → 표지 있는 글 → 저장소 순으로 내려가는 것과 규칙이 같다. 저장소까지 없으면
 * 빈 배열이고, 그때 목록 화면이 은하수 배경의 빈 화면을 그린다.
 */
async function fetchWorksProjects(): Promise<Project[]> {
  const works = await getWorks();
  /* 빈 배열은 "발행된 게 없다" 는 답이다 — DB 를 못 쓰면 getWorks 가 정적 목록을 준다(#1046) */
  if (works.length > 0) return works;

  const [repos, siteConfig] = await Promise.all([
    getShowcaseRepos(REPO_LIMIT, true),
    getSiteConfig(),
  ]);
  const overrides = (siteConfig.homeWorks?.repos ?? []) as RepoOverride[];
  const byName = new Map(overrides.map((o) => [o.name, o]));
  // 조직 저장소는 `owner/name` 으로, 개인 저장소는 이름만으로 적혀 있다
  return repos.map((repo, i) => repoToProject(repo, byName.get(repo.fullName) ?? byName.get(repo.name), i));
}

/** 카드 크기는 돌려 쓴다 — 배치(flow·grid)가 크기를 섞어 리듬을 만든다 */
const SIZES = ["large", "small", "medium", "tall", "wide"] as const;

/**
 * 저장소 하나 → 목록·상세가 받는 Project.
 *
 * 표지·제목·대표 기술은 홈의 원과 같은 함수(repoView)가 고른다. 본문은 README 원문을 걸러 쓴다 —
 * 원문을 그대로 두면 남이 쓴 HTML 이 그대로 그려진다(readmeMarkdown 참고).
 */
export function repoToProject(repo: GithubRepoCard, set: RepoOverride | undefined, index: number): Project {
  const view = repoView(repo, set);
  const markdown = repo.readme?.markdown
    ? readmeToMarkdown(repo.readme.markdown, { owner: repo.owner, name: repo.name, branch: repo.defaultBranch })
    : "";
  const summary = repo.readme?.summary || repo.description || "";
  const year = repo.pushedAt ? repo.pushedAt.slice(0, 4) : "";

  return {
    id: `gh-${repo.owner}-${repo.name}`,
    /* 주소에 저장소 이름을 그대로 쓴다 — 저장소가 목록을 채우는 건 작업물이 하나도 없을 때라
       작업물 슬러그와 부딪히지 않는다 */
    slug: repo.name,
    number: String(index + 1).padStart(2, "0"),
    title: view.title,
    subtitle: { ko: summary, en: summary },
    category: { ko: view.tech, en: view.tech },
    year,
    description: { ko: summary, en: summary },
    role: { ko: "", en: "" },
    tech: repo.topics.length > 0 ? repo.topics : (repo.language ? [repo.language] : []),
    image: view.cover,
    size: SIZES[index % SIZES.length],
    content: { ko: markdown, en: markdown },
    contentType: "markdown",
    gallery: [],
    githubUrl: repo.url,
    summary: { ko: summary, en: summary },
    /* 사이트 밖 자료다 — 좋아요·댓글을 받을 자리가 없고, 관리자 편집 화면도 없다 */
    external: true,
  };
}

/** 요청당 1회 조회 */
export const getWorksProjects = cache(fetchWorksProjects);
