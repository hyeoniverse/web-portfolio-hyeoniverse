import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { getSiteConfig } from "@/lib/getSiteConfig";

/** GET /api/admin/tags — 모든 게시물에서 distinct tag + 사용 횟수 + 태그별 post 목록 (admin 전용)
 *  response: {
 *    tags: string[],
 *    counts: Record<string, number>,
 *    posts: Array<{ id, title, title_en, tags, slug }>,
 *    descriptions: 설정의 태그 설명(tagDescriptions) — 글 편집기가 태그를 더할 때 태그 메모 초기값으로 쓴다.
 *      모든 페이지에 싣는 사이트 설정에서는 빠져 있어 여기서 준다(#944)
 *  } */
type PostRow = {
  id: string;
  title: string | null;
  title_en: string | null;
  tags: string[] | null;
  slug: string | null;
  category: string | null;
  published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  view_count: number | null;
};

export async function GET() {
  /* 태그는 사이트 전체의 어휘지 개인 데이터가 아니다. 편집기(PostEditor)의 태그 추천이
     이 목록을 쓰므로 요청자 시야로 좁히면 사람마다 다른 후보가 뜬다.
     그래서 여기는 의도적으로 service_role 을 유지한다(4단계 정리 대상 아님). */
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  // 태그(posts)와 tech(works)를 공유 사전으로 통합 — 두 어휘를 union 해서 집계.
  const [postsRes, worksRes, config] = await Promise.all([
    admin
      .from("posts")
      .select("id, title, title_en, tags, slug, category, published, created_at, updated_at, view_count")
      .is("deleted_at", null)
      .limit(1000),
    admin
      .from("works")
      .select("tech")
      .is("deleted_at", null)
      .limit(1000),
    getSiteConfig(),
  ]);

  if (postsRes.error) {
    console.error("/api/admin/tags supabase error:", postsRes.error);
    return jsonServerError(postsRes.error, "GET /api/admin/tags");
  }

  const posts = (postsRes.data ?? []) as PostRow[];
  const counts: Record<string, number> = {};
  for (const p of posts) {
    if (!p.tags) continue;
    for (const t of p.tags) {
      if (!t) continue;
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }
  // works.tech 도 같은 사전에 합산 (공유 어휘). works 쿼리 실패해도 posts 태그는 유지.
  const worksCounts: Record<string, number> = {};
  for (const w of (worksRes.data ?? []) as { tech: string[] | null }[]) {
    if (!w.tech) continue;
    for (const t of w.tech) {
      if (!t) continue;
      counts[t] = (counts[t] ?? 0) + 1;
      worksCounts[t] = (worksCounts[t] ?? 0) + 1;
    }
  }

  const tags = Object.keys(counts).sort((a, b) => a.localeCompare(b, "ko"));
  return NextResponse.json({
    tags,
    counts,
    worksCounts,
    descriptions: config.tagDescriptions ?? {},
    posts: posts.map((p) => ({
      id: p.id,
      title: p.title ?? "",
      title_en: p.title_en ?? "",
      tags: p.tags ?? [],
      slug: p.slug ?? "",
      category: p.category ?? "",
      published: !!p.published,
      published_at: null,
      created_at: p.created_at,
      updated_at: p.updated_at,
      view_count: p.view_count ?? 0,
    })),
  });
}
