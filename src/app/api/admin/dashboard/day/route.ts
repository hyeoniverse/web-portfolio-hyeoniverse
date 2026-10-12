import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { loadExcludedIps } from "@/lib/api/ipAnalytics";
import { countPostViews } from "@/lib/api/pageViewVisits";

/**
 * GET /api/admin/dashboard/day?date=YYYY-MM-DD
 * 특정 날짜의 인기 게시물 top 5 — 페이지 조회(page_views)의 /posts/{slug} 조회를 그날 기준으로 센다.
 */
export async function GET(request: Request) {
  /* 사이트 전체 통계·중재 데이터라 admin 등급 이상만 본다. requireAuth 만 있을 때는
     레벨 1 저자도 방문 통계·댓글·알림 집계를 볼 수 있었다.
     집계는 요청자 시야로 좁히면 안 되므로(저자 세션으로 읽으면 자기 글만 잡힌다)
     조회 자체는 service_role 을 유지하고, 대신 라우트를 등급으로 막는다. */
  const { error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError("invalid date (YYYY-MM-DD)", 400);
  }

  const admin = createAdminClient();
  // 그날(KST) /posts/{slug} 페이지 조회를 slug 별로 — 대시보드 일별 차트와 같은 기록 · 같은 날짜 기준
  const counts = await countPostViews(admin, await loadExcludedIps(admin), date, date);
  const totalViews = [...counts.values()].reduce((s, n) => s + n, 0);
  if (totalViews === 0) return jsonOk({ topPosts: [], totalViews: 0 });

  const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ids = topIds.map(([id]) => id);

  const { data: posts, error } = await admin
    .from("posts")
    .select("id, title, slug")
    .in("slug", ids);
  if (error) return jsonServerError(error, "GET /api/admin/dashboard/day");

  const postMap = new Map((posts ?? []).map((p) => [p.slug, p]));
  const topPosts = topIds
    .map(([slug, n]) => {
      const p = postMap.get(slug);
      return p ? { id: p.id, title: p.title, slug: p.slug, views: n } : null;
    })
    .filter((p): p is { id: string; title: string; slug: string; views: number } => p !== null);

  return jsonOk({ topPosts, totalViews });
}
