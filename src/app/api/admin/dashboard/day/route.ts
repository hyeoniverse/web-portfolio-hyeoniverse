import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/dashboard/day?date=YYYY-MM-DD
 * 특정 날짜의 인기 게시물 top 5 — post_views 시계열에서 그날 조회수 집계.
 * (works 는 시계열 view 기록이 없어 일별 분석 불가 — 게시물만 반환)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date (YYYY-MM-DD)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const start = `${date}T00:00:00.000Z`;
  // 다음 날 00:00 UTC 직전까지
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = next.toISOString();

  const { data: views, error } = await admin
    .from("post_views")
    .select("post_id")
    .gte("viewed_at", start)
    .lt("viewed_at", end);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!views || views.length === 0) {
    return NextResponse.json({ topPosts: [], totalViews: 0 });
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

  return NextResponse.json({ topPosts, totalViews: views.length });
}
