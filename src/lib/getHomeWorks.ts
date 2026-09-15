import { cache } from "react";
import { projects } from "@/data/projects";
import type { Project } from "@/data/projects";
import { toWorkItems, type WorkItem } from "@/data/works";
import type { Work } from "@/types/work";
import { workToProject } from "@/types/work";
import { scoreOf } from "@/lib/popularity";

/** work row + 댓글 수 (관계 count) — 인기 점수 계산용 */
type RankedRow = Work & { work_comments?: Array<{ count: number }> };

/**
 * 홈 Selected Works 랭킹 — 핀 → 인기순 → 최신순.
 *
 * 인기 점수는 posts 와 동일(lib/popularity.ts scoreOf): view_count + like_count*3 + comments*5.
 * 정렬은 (is_pinned ↓, score ↓, created_at ↓). 이 순서 한 번으로 "핀 우선, 없으면 인기순, 그다음 최신순"이
 * 자동으로 된다. 가중 점수라 SQL ORDER BY 대신 JS 에서 계산·정렬한다(getPopularPostIds 와 동일 방식).
 *
 * DB 미접근/에러/빈 경우 정적 projects.ts 순서로 fallback. /works 페이지의 sort_order 정렬과는 별개.
 */
async function fetchHomeWorks(): Promise<WorkItem[]> {
  const ranked = await fetchRankedProjects();
  return toWorkItems(ranked.length > 0 ? ranked : projects);
}

async function fetchRankedProjects(): Promise<Project[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("works")
      .select("*, work_comments(count)")
      .eq("published", true)
      .is("deleted_at", null);

    if (error || !data || data.length === 0) return [];

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
    return [];
  }
}

/** 요청당 1회 조회 (page.tsx 가 부른다) */
export const getHomeWorks = cache(fetchHomeWorks);
