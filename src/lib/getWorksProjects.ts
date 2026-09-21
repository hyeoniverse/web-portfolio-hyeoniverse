import { cache } from "react";
import { getWorks } from "@/lib/getWorks";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getProfileData } from "@/lib/getProfileData";
import { listOwnedRepos, loginFromLinks, withReadmeMeta } from "@/lib/githubShowcase";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";
import { readmeToMarkdown } from "@/lib/readmeMarkdown";
import { repoView, type RepoOverride } from "@/data/works";
import type { Project } from "@/data/projects";
import type { GithubRepoCard } from "@/lib/githubShowcase";
import {
  inferRepoCategory,
  inferRepoNatureKey,
  natureLabel,
  repoContentFallback,
  repoCoverFallback,
  repoYear,
  type CategoryOption,
} from "@/lib/repoWorkDefaults";

/** 불러오기 창에 늘어놓을 저장소 수 — 최근에 손댄 순으로 자른다 */
const REPO_LIMIT = 30;

/**
 * 작업물 목록·상세가 쓰는 목록 — DB 의 작업물이 전부다.
 *
 * 예전에는 발행한 작업물이 없으면 GitHub 저장소가 그 자리를 채웠다(#1062). 지금은 저장소를
 * 관리 화면에서 **발행 상태로 들여오므로**(showcase/import) 그 자리를 채울 일이 없다. 대신
 * 아무것도 없으면 비어 있는 그대로 둔다 — 목록 화면이 은하수 배경의 빈 화면을 그린다.
 */
async function fetchWorksProjects(): Promise<Project[]> {
  return getWorks();
}

/**
 * 불러오기 창에 늘어놓을 저장소 — 소유 계정과 조직의 저장소를 최근에 손댄 순으로.
 *
 * 홈 화면 설정(고른 저장소·숨긴 저장소)은 보지 않는다. 그 설정은 홈의 원에 무엇을 띄울지를
 * 정하는 것이지 "무엇을 작업물로 들일 수 있는지" 가 아니다. 예전에는 같은 함수를 써서, 홈에서
 * 숨겨 둔 저장소가 불러오기 목록에서도 통째로 사라졌다.
 *
 * README 는 여기서 읽지 않는다 — 목록에는 이름만 있으면 되고, 저장소마다 요청이 하나씩 더 나간다.
 */
async function fetchRepoCandidates(): Promise<GithubRepoCard[]> {
  const [profileData, siteConfig] = await Promise.all([getProfileData(), getSiteConfig()]);
  const owner = findOwnerAuthor((siteConfig.authors as Author[] | undefined) ?? []);
  const login = loginFromLinks(owner?.links);
  if (!login) return [];
  const { repos } = await listOwnedRepos(login, profileData.github?.orgs ?? []);
  return repos.slice(0, REPO_LIMIT);
}

/** 요청당 1회 조회 */
export const getRepoCandidates = cache(fetchRepoCandidates);

/**
 * 고른 저장소만 Project 모양으로 — 그때 README 를 읽는다.
 *
 * Project 로 바꿔 두는 것은 들여온 뒤의 작업물과 같은 모양이어야 하기 때문이다.
 */
export async function getRepoProjectsBySlug(slugs: readonly string[]): Promise<Project[]> {
  const want = new Set(slugs.map((s) => s.toLowerCase()));
  const [candidates, siteConfig] = await Promise.all([getRepoCandidates(), getSiteConfig()]);
  const picked = candidates.filter((r) => want.has(r.name.toLowerCase()));
  const withReadme = await withReadmeMeta(picked);
  /* 분류는 설정에 등록된 작업물 분류 가운데서 고른다 — 없는 이름을 만들지 않는다 */
  const categoryOptions: CategoryOption[] = ((siteConfig.works?.categories ?? []) as unknown[]).map((item) =>
    typeof item === "string" ? { ko: item, en: item } : (item as CategoryOption),
  );
  /* 제목·표지는 README 에서 온다 — 홈 설정에 적어 두던 덮어쓰기 값은 더 쓰지 않는다
     (그 설정 자체를 없앴다. 들여온 뒤에는 작업물 편집 화면에서 고친다) */
  return withReadme.map((repo, i) => repoToProject(repo, undefined, i, categoryOptions));
}

/* 카드 크기는 돌려 쓴다 — flow 는 크기로 카드의 폭과 위아래 자리(align-self)를 정해 리듬을 만든다.
   앞 여섯 칸은 손으로 적은 작업물 목록(data/projects.ts)과 같은 순서다 — flow 의 메타 위치 변주도
   여섯 칸 주기라, 그 목록에서 보던 짝이 그대로 나온다. 뒤 여섯 칸은 같은 크기를 다른 순서로 두어
   일곱 번째 카드부터 앞 마디가 그대로 되풀이되지 않게 한다(다섯 칸 주기였을 때는 크기와 변주의
   짝이 마디마다 어긋나 자리가 비슷해 보였다). */
const SIZES = [
  "large", "small", "medium", "tall", "wide", "small",
  "medium", "wide", "large", "small", "tall", "medium",
] as const;

/**
 * 저장소에 쓰인 기술 — 많이 쓴 언어부터, 그 뒤에 저장소 주제(topic).
 *
 * 대표는 맨 앞이다. 목록·상세가 기술을 앞에서부터 늘어놓으므로 가장 많이 쓴 언어가 먼저 보인다.
 * 언어 목록은 보여줄 저장소에만 붙어 있어서(요청이 하나 더 나간다), 없으면 주 언어 하나로 돈다.
 */
function repoTech(repo: GithubRepoCard): string[] {
  const langs = repo.languages?.length ? repo.languages : (repo.language ? [repo.language] : []);
  const seen = new Set(langs.map((l) => l.toLowerCase()));
  /* 주제는 언어와 겹치지 않는 것만 — "python" 주제를 달아 둔 저장소가 많다 */
  const topics = repo.topics.filter((t) => !seen.has(t.toLowerCase()));
  return [...langs, ...topics];
}

/**
 * 저장소 하나 → 목록·상세가 받는 Project.
 *
 * 표지·제목·대표 기술은 홈의 원과 같은 함수(repoView)가 고른다. 본문은 README 원문을 걸러 쓴다 —
 * 원문을 그대로 두면 남이 쓴 HTML 이 그대로 그려진다(readmeMarkdown 참고).
 *
 * 발행에 필요한 칸(분류·성격·연도·대표 이미지·본문)은 비워 두지 않는다 — 저장소 단서로 고른 초안을 넣는다
 * (repoWorkDefaults). 비워 두면 들인 작업물을 저장할 때마다 필수 칸이 비었다고 막혔다.
 */
export function repoToProject(
  repo: GithubRepoCard,
  set: RepoOverride | undefined,
  index: number,
  categoryOptions: readonly CategoryOption[] = [],
): Project {
  const view = repoView(repo, set);
  const tech = repoTech(repo);
  const markdown = repo.readme?.markdown
    ? readmeToMarkdown(repo.readme.markdown, { owner: repo.owner, name: repo.name, branch: repo.defaultBranch })
    : "";
  const summary = repo.readme?.summary || repo.description || "";
  const year = repoYear(repo);
  /* 설정에 손으로 적은 말이 있으면 그걸, 없으면 저장소 단서로 등록된 분류 가운데서 고른다.
     repoView.tech 는 적은 게 없으면 주 언어로 떨어지므로 분류로 쓰지 않는다(언어는 분류가 아니다) */
  const manual = set?.tech || set?.description || set?.description_ko || "";
  const inferred = manual ? null : inferRepoCategory(repo, categoryOptions);
  const category = manual ? { ko: manual, en: manual } : inferred ?? { ko: "", en: "" };
  const nature = natureLabel(inferRepoNatureKey(repo));

  return {
    id: `gh-${repo.owner}-${repo.name}`,
    /* 주소에 저장소 이름을 쓴다 — 저장소가 목록을 채우는 건 작업물이 하나도 없을 때라 작업물
       슬러그와 부딪히지 않는다. 대문자가 섞인 저장소 이름(MacFolio)도 주소는 소문자로 굳힌다 */
    slug: repo.name.toLowerCase(),
    number: String(index + 1).padStart(2, "0"),
    title: view.title,
    subtitle: { ko: summary, en: summary },
    /* 언어는 분류가 아니다 — Python 같은 말이 분류 칸에 앉으면 손으로 적은 작업물의 분류
       ("웹", "브랜딩" …)와 섞인다. 언어·주제는 아래 tech 로 가고, 분류는 설정에 사람이 적어 둔
       말이 있을 때만 쓴다(없으면 비운다 — 들여올 때 관리 화면에서 고르면 된다) */
    category,
    categories: category.ko || category.en ? { ko: [category.ko], en: [category.en] } : { ko: [], en: [] },
    nature,
    year,
    description: { ko: summary, en: summary },
    role: { ko: "", en: "" },
    tech,
    /* README 에 그림이 없으면 GitHub 이 만들어 주는 저장소 소개 카드 */
    image: view.cover || repoCoverFallback(repo),
    size: SIZES[index % SIZES.length],
    /* README 가 없으면(없는 저장소가 많다) 저장소 정보로 짧게 채운다 */
    content: {
      ko: markdown || repoContentFallback(repo, tech, "ko"),
      en: markdown || repoContentFallback(repo, tech, "en"),
    },
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
