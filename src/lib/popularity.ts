import type { SupabaseClient } from "@supabase/supabase-js";

/** posts 인기 점수 — 모든 인기 관련 로직의 단일 소스.
 *  PostsClient HOT 배지, /api/posts sort=popular 정렬, admin 삭제 보호 모두 이 함수 사용. */
function scoreOf(args: { view: number; like: number; comments: number }): number {
  return (args.view ?? 0) + (args.like ?? 0) * 3 + (args.comments ?? 0) * 5;
}

/** score 내림차순 상위 N 개 post id Set. supabase 받아서 server-side 호출.
 *  score === 0 인 post 는 후보 제외 (조회/좋아요/댓글 어느 것도 없음 = 인기 정의 X). */
export async function getPopularPostIds(
  supabase: SupabaseClient,
  limit = 5,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, view_count, like_count, comments(count)")
    .eq("published", true)
    .is("deleted_at", null);

  if (error || !data) return new Set();

  const scored = data.map((p) => {
    const view = (p as { view_count?: number }).view_count ?? 0;
    const like = (p as { like_count?: number }).like_count ?? 0;
    const raw = (p as { comments?: Array<{ count: number }> }).comments;
    const comments = Array.isArray(raw) ? raw[0]?.count ?? 0 : 0;
    return { id: (p as { id: string }).id, score: scoreOf({ view, like, comments }) };
  });

  scored.sort((a, b) => b.score - a.score);
  return new Set(scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.id));
}
