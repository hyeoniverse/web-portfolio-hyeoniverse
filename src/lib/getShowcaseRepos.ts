import { cache } from "react";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getProfileData } from "@/lib/getProfileData";
import { getGithubShowcase, loginFromLinks, withReadmeMeta, homeRepoPool, repoKey, type GithubRepoCard } from "@/lib/githubShowcase";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";
import type { RepoOverride } from "@/data/works";

/**
 * 공개 화면이 보여줄 GitHub 저장소 — 홈 Selected Works 와 작업물 목록이 같이 쓴다(#1062).
 *
 * 고르는 규칙은 한 곳에만 있어야 한다. 홈은 원으로, 작업물 목록은 카드로 그리지만 "무엇을
 * 보여줄지" 는 같은 설정(홈 설정의 저장소 목록, 프로필에서 고른 저장소, 빼 둔 것)에서 온다.
 *
 * 홈에서 GitHub 을 콕 집어 고른 경우가 아니면(auto) 프로필의 GitHub 영역을 꺼 둔 뜻을 따른다.
 */
async function fetchShowcaseRepos(limit: number, auto: boolean): Promise<GithubRepoCard[]> {
  try {
    const [profileData, siteConfig] = await Promise.all([getProfileData(), getSiteConfig()]);
    const gh = profileData.github;
    if (auto && gh?.enabled === false) return [];

    const owner = findOwnerAuthor((siteConfig.authors as Author[] | undefined) ?? []);
    const login = loginFromLinks(owner?.links);
    if (!login) return [];

    const picked = (siteConfig.homeWorks?.repos ?? []) as RepoOverride[];
    /* 덮어쓰기만 해 둔 항목(picked: false)은 고른 것이 아니다 — 자동 채움을 그대로 두고
       내용만 바꾼 것이라, 이게 선택으로 세어지면 목록이 통째로 좁아진다(#1057) */
    const names = picked.filter((r) => r.picked !== false).map((r) => r.name).filter(Boolean);
    const showcase = await getGithubShowcase(login, names.length > 0 ? names : (gh?.repos ?? []));
    if (!showcase) return [];

    /* 고른 것이 있으면 그것만 — 이름이 안 맞아 하나도 못 찾으면 비어 있는 게 맞는 답이다.
       자동일 때는 프로필에서 고른 것 뒤를 스타 많은 순으로 메운다(#1062) */
    const pool = names.length > 0 ? showcase.repos : homeRepoPool(showcase, limit);

    /* 설정에서 빼 둔 저장소는 내보내지 않는다. 고른 것이 있을 때는 보지 않는다 —
       고르는 행위 자체가 표시 여부를 말하므로 나중에 고른 쪽이 이긴다 */
    const hidden = new Set(picked.filter((r) => r.hidden).map((r) => r.name));
    const shown = names.length > 0 || hidden.size === 0
      ? pool
      : pool.filter((repo) => !hidden.has(repoKey(repo, login)));

    /* 보여줄 것이 정해진 뒤에 README 를 읽는다 — 저장소마다 요청이 하나씩 더 나가므로(#1053) */
    return withReadmeMeta(shown.slice(0, limit));
  } catch {
    return [];
  }
}

/** 요청당 1회 조회 — 같은 요청 안에서 홈·작업물이 같이 불러도 GitHub 에는 한 번만 나간다 */
export const getShowcaseRepos = cache(fetchShowcaseRepos);
