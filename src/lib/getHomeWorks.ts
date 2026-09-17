import { cache } from "react";
import { projects } from "@/data/projects";
import type { Project } from "@/data/projects";
import { toWorkItems, toPostItems, toRepoItems, type WorkItem, type RepoOverride } from "@/data/works";
import type { Work } from "@/types/work";
import type { Post } from "@/types/post";
import { workToProject } from "@/types/work";
import { scoreOf } from "@/lib/popularity";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getProfileData } from "@/lib/getProfileData";
import { getGithubShowcase, loginFromLinks, withReadmeMeta } from "@/lib/githubShowcase";
import { findOwnerAuthor } from "@/utils/resolvePostAuthors";
import type { Author } from "@/types/author";

/** work row + 댓글 수 (관계 count) — 인기 점수 계산용 */
type RankedRow = Work & { work_comments?: Array<{ count: number }> };

/**
 * 홈 Selected Works 랭킹 — 핀 → 인기순 → 최신순.
 *
 * 인기 점수는 posts 와 동일(lib/popularity.ts scoreOf): view_count + like_count*3 + comments*5.
 * 정렬은 (is_pinned ↓, score ↓, created_at ↓). 이 순서 한 번으로 "핀 우선, 없으면 인기순, 그다음 최신순"이
 * 자동으로 된다. 가중 점수라 SQL ORDER BY 대신 JS 에서 계산·정렬한다(getPopularPostIds 와 동일 방식).
 *
 * DB 를 못 쓰면(환경변수 없음·조회 실패) 정적 projects.ts 순서로 fallback. /works 페이지의 sort_order 정렬과는 별개.
 * 발행된 작업물이 없는 것은 실패가 아니라 답이므로, 자동일 때는 글 → GitHub 저장소 순으로 내려간다(#1046).
 * 설정(homeWorks.source)에서 하나로 고정하면 그것만 본다 — 고정한 것이 비면 홈은 이 칸을 안 그린다(#1047).
 */
async function fetchHomeWorks(): Promise<WorkItem[]> {
  const siteConfig = await getSiteConfig();
  const source = siteConfig.homeWorks?.source ?? "auto";
  const auto = source === "auto";

  if (auto || source === "works") {
    const ranked = await fetchRankedProjects();
    /* null 만 정적 목록으로 돌아간다 — 빈 배열은 "발행된 게 없다" 는 답이라 그대로 비워야 한다.
       예전에는 둘을 길이로만 봐서, 관리자에서 작업물을 전부 내리면 홈에 정적 목록이 대신 떴다(#1046). */
    if (ranked === null) return toWorkItems(projects);
    if (ranked.length > 0) return toWorkItems(ranked);
    if (!auto) return [];
  }

  if (auto || source === "posts") {
    const posts = await fetchCoveredPosts();
    if (posts.length > 0) return toPostItems(posts);
    if (!auto) return [];
  }

  /* 남은 건 GitHub. 아무것도 못 채우면 빈 배열이고, 홈은 이 칸을 아예 그리지 않는다 —
     첫 화면이 "볼 게 없다"고 말하게 두지 않으려는 것이다. */
  const picked = siteConfig.homeWorks?.repos ?? [];
  return toRepoItems(await fetchRepoCards(picked, auto), picked);
}

/** 표지가 있는 발행된 글 — 원을 채워야 하므로 표지 없는 글은 뺀다.
    슬러그도 있어야 한다. 빈 슬러그인 글이 섞이면 주소가 `/posts/` 가 되어 글이 아니라 목록으로 간다 */
async function fetchCoveredPosts(): Promise<Post[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data } = await createAdminClient()
      .from("posts")
      .select("*")
      .eq("published", true)
      .not("cover_image", "is", null)
      .neq("cover_image", "")
      .not("slug", "is", null)
      .neq("slug", "")
      .order("created_at", { ascending: false })
      .limit(11);
    return (data ?? []) as Post[];
  } catch {
    return [];
  }
}

/** 홈이 보여줄 저장소. 홈 설정에서 고른 것이 있으면 그 순서 그대로,
    없으면 프로필이 고른 것, 그것도 없으면 스타 많은 순 소유 저장소.
    사용자명은 프로필 화면이 쓰는 설정을 그대로 본다 — 두 군데로 갈리지 않게 */
async function fetchRepoCards(picked: readonly RepoOverride[], auto: boolean) {
  try {
    const [profileData, siteConfig] = await Promise.all([getProfileData(), getSiteConfig()]);
    const gh = profileData.github;
    /* 프로필의 GitHub 영역을 꺼 뒀으면 자동으로 여기까지 내려오지는 않는다.
       홈에서 GitHub 을 콕 집어 고른 경우는 그 뜻을 따른다 — 프로필을 껐다고 홈까지 막을 이유는 없다 */
    if (auto && gh?.enabled === false) return [];
    const owner = findOwnerAuthor((siteConfig.authors as Author[] | undefined) ?? []);
    const login = loginFromLinks(owner?.links);
    if (!login) return [];

    /* 덮어쓰기만 해 둔 항목(picked: false)은 고른 것이 아니다 — 자동 채움을 그대로 두고
       내용만 바꾼 것이라, 이게 선택으로 세어지면 자동 목록이 통째로 좁아진다(#1057) */
    const names = picked.filter((r) => r.picked !== false).map((r) => r.name).filter(Boolean);
    const showcase = await getGithubShowcase(login, names.length > 0 ? names : (gh?.repos ?? []));
    if (!showcase) return [];
    // 고른 것이 있으면 그것만 — 이름이 안 맞아 하나도 못 찾으면 비어 있는 게 맞는 답이다
    const picks = names.length > 0
      ? showcase.repos
      : (showcase.repos.length > 0 ? showcase.repos : showcase.topRepos);
    /* 보여줄 것이 정해진 뒤에 README 를 읽는다 — 저장소마다 요청이 하나씩 더 나가므로(#1053) */
    return withReadmeMeta(picks);
  } catch {
    return [];
  }
}

/** 발행된 작업물을 인기순으로. DB 를 못 쓰면(환경변수 없음·조회 실패) null — 발행된 게 없으면 빈 배열 */
async function fetchRankedProjects(): Promise<Project[] | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("works")
      .select("*, work_comments(count)")
      .eq("published", true)
      .is("deleted_at", null);

    if (error || !data) return null;
    if (data.length === 0) return [];

    return (data as RankedRow[])
      .map((w) => {
        const comments = Array.isArray(w.work_comments) ? w.work_comments[0]?.count ?? 0 : 0;
        const score = scoreOf({ view: w.view_count ?? 0, like: w.like_count ?? 0, comments });
        return { work: w, score };
      })
      .sort((a, b) => {
        // 핀 우선 → 인기 점수 → 최신
        if (a.work.is_pinned !== b.work.is_pinned) return a.work.is_pinned ? -1 : 1;
        if (b.score !== a.score) return b.score - a.score;
        return (b.work.created_at ?? "").localeCompare(a.work.created_at ?? "");
      })
      .map((r) => workToProject(r.work));
  } catch {
    return null;
  }
}

/** 요청당 1회 조회 (page.tsx 가 부른다) */
export const getHomeWorks = cache(fetchHomeWorks);
