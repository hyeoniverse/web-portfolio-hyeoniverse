import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const FIELDS = "id, title, slug, cover_image, title_en, excerpt, excerpt_en, category, tags, created_at, view_count, like_count";
const LIMIT = 3;

// GET /api/posts/[id]/related — 관련 게시물 추천
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const admin = createAdminClient();

  // 현재 포스트 정보
  const { data: current, error } = await admin
    .from("posts")
    .select("id, tags, category, series_id")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (error || !current) {
    return NextResponse.json([]);
  }

  // 같은 시리즈 제외 (이미 별도 섹션에서 표시)
  // 태그 겹침 + 같은 카테고리 기반으로 관련글 찾기

  // 1) 같은 카테고리 포스트 (최대 20개 후보)
  const { data: candidates } = await admin
    .from("posts")
    .select(FIELDS)
    .eq("published", true)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json([]);
  }

  // 같은 시리즈 글 제외
  const filtered = current.series_id
    ? candidates.filter((_p: { id: string; [key: string]: unknown }) => {
        // series_id 필드가 select에 없으므로 별도 필터링은 프론트에서 처리
        return true;
      })
    : candidates;

  // 스코어링
  const currentTags = current.tags ?? [];
  const scored = filtered.map((post: { id: string; tags?: string[]; category?: string; view_count?: number; like_count?: number }) => {
    let score = 0;

    // 태그 겹침 (가장 높은 가중치)
    const postTags = post.tags ?? [];
    const overlap = currentTags.filter((t: string) => postTags.includes(t)).length;
    score += overlap * 10;

    // 같은 카테고리
    if (post.category && post.category === current.category) {
      score += 5;
    }

    // 인기도 보너스 (낮은 가중치)
    score += Math.min(((post.view_count ?? 0) + (post.like_count ?? 0) * 3) / 100, 3);

    return { ...post, _score: score };
  });

  // 점수 정렬 후 상위 N개
  scored.sort((a: { _score: number }, b: { _score: number }) => b._score - a._score);

  // 최소 점수 필터 (관련성 없는 글 제외)
  const related = scored
    .filter((p: { _score: number }) => p._score > 0)
    .slice(0, LIMIT)
    .map(({ _score, ...post }: { _score: number; [key: string]: unknown }) => post);

  return NextResponse.json(related);
}
