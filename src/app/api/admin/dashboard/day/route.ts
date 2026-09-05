import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";

/**
 * GET /api/admin/dashboard/day?date=YYYY-MM-DD
 * 특정 날짜의 인기 게시물 top 5 — post_views 시계열에서 그날 조회수 집계.
 * (works 는 시계열 view 기록이 없어 일별 분석 불가 — 게시물만 반환)
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
  // KST (Asia/Seoul, UTC+9) 기준 날짜 경계 — 대시보드 일별 차트가 KST 로 집계하므로 동일하게 매핑.
  // ISO 8601 형식의 +09:00 offset 으로 명시 → Date 가 UTC 로 정확히 변환.
  const start = new Date(`${date}T00:00:00+09:00`).toISOString();
  const nextKst = new Date(`${date}T00:00:00+09:00`);
  nextKst.setDate(nextKst.getDate() + 1);
  const end = nextKst.toISOString();

  const { data: views, error } = await admin
    .from("post_views")
    .select("post_id")
    .gte("viewed_at", start)
    .lt("viewed_at", end);

  if (error) return jsonServerError(error, "GET /api/admin/dashboard/day");

  if (!views || views.length === 0) {
    return jsonOk({ topPosts: [], totalViews: 0 });
  }

  // 클라이언트 측 aggregation (작은 day-scope 라 DB RPC 없이 처리)
  const counts = new Map<string, number>();
  for (const v of views) {
    counts.set(v.post_id, (counts.get(v.post_id) ?? 0) + 1);
  }

  const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const ids = topIds.map(([id]) => id);

  const { data: posts } = await admin
    .from("posts")
    .select("id, title, slug")
    .in("id", ids);

  const postMap = new Map((posts ?? []).map((p) => [p.id, p]));
  const topPosts = topIds
    .map(([id, n]) => {
      const p = postMap.get(id);
      return p ? { id, title: p.title, slug: p.slug, views: n } : null;
    })
    .filter((p): p is { id: string; title: string; slug: string; views: number } => p !== null);

  return jsonOk({ topPosts, totalViews: views.length });
}
