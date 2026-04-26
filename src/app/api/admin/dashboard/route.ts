import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/dashboard — 어드민 대시보드용 집계 데이터
// posts/works/comments 카운트 + 최근 항목 + 알림 + 인기 게시물 + AI 키 상태를
// 단일 응답으로 반환. 모든 쿼리는 Promise.all로 병렬 실행.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const AI_PROVIDER_KEYS = [
    "NANOBANANA_API_KEY",
    "HUGGINGFACE_API_KEY",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "DEEPL_API_KEY",
    "GOOGLE_TRANSLATE_API_KEY",
    "RESEND_API_KEY",
  ] as const;

  const [
    postsTotal,
    postsDrafts,
    postsPublished,
    recentPosts,
    worksTotal,
    worksDrafts,
    worksPublished,
    recentWorks,
    commentsTotal,
    recentComments,
    notifications,
    unreadNotifications,
    popularPosts,
    viewsAgg,
    secretsRow,
    dailyViewsRes,
  ] = await Promise.all([
    admin.from("posts").select("*", { count: "exact", head: true }).is("deleted_at", null),
    admin.from("posts").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("published", false),
    admin.from("posts").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("published", true),
    admin
      .from("posts")
      .select("id, title, slug, published, view_count, created_at, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5),
    admin.from("works").select("*", { count: "exact", head: true }).is("deleted_at", null),
    admin.from("works").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("published", false),
    admin.from("works").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("published", true),
    admin
      .from("works")
      .select("id, title, slug, published, created_at, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5),
    admin.from("comments").select("*", { count: "exact", head: true }).eq("is_deleted", false),
    admin
      .from("comments")
      .select("id, post_id, nickname, content, is_admin, created_at")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("admin_notifications")
      .select("id, type, title, message, read, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    admin.from("admin_notifications").select("*", { count: "exact", head: true }).eq("read", false),
    admin
      .from("posts")
      .select("id, title, slug, view_count, like_count")
      .is("deleted_at", null)
      .eq("published", true)
      .gt("view_count", 0)
      .order("view_count", { ascending: false })
      .limit(5),
    admin.rpc("sum_post_views").maybeSingle(),
    admin.from("site_settings").select("config").eq("id", "secrets").maybeSingle(),
    // 최근 14일 일별 조회수 — 차트용
    (() => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 13);
      return admin.rpc("daily_post_views", {
        p_start: start.toISOString().slice(0, 10),
        p_end: end.toISOString().slice(0, 10),
      });
    })(),
  ]);

  // 인기 게시물 댓글 수도 표시하려면 별도 집계 필요. MVP는 view_count + like_count.

  // 최근 댓글 — post 정보 join
  let recentCommentsHydrated: Array<{
    id: string;
    nickname: string;
    content: string;
    is_admin: boolean;
    created_at: string;
    post_title: string;
    post_slug: string;
  }> = [];
  if (recentComments.data && recentComments.data.length > 0) {
    const postIds = [...new Set(recentComments.data.map((c) => c.post_id))];
    const { data: cPosts } = await admin
      .from("posts")
      .select("id, title, slug")
      .in("id", postIds);
    const postMap = new Map((cPosts ?? []).map((p) => [p.id, { title: p.title, slug: p.slug }]));
    recentCommentsHydrated = recentComments.data.map((c) => {
      const p = postMap.get(c.post_id);
      return {
        id: c.id,
        nickname: c.nickname,
        content: c.content.length > 100 ? c.content.slice(0, 100) + "…" : c.content,
        is_admin: c.is_admin,
        created_at: c.created_at,
        post_title: p?.title ?? "",
        post_slug: p?.slug ?? "",
      };
    });
  }

  // 총 조회수: RPC가 없으면 fallback으로 view_count 합산 직접 집계
  let totalPostViews = 0;
  // viewsAgg.data가 { sum: number } 형태일 것으로 기대. 없으면 fallback.
  const aggData = viewsAgg.data as { sum?: number } | null;
  if (aggData && typeof aggData.sum === "number") {
    totalPostViews = aggData.sum;
  } else {
    const { data: viewRows } = await admin
      .from("posts")
      .select("view_count")
      .is("deleted_at", null);
    totalPostViews = (viewRows ?? []).reduce((sum, r) => sum + (r.view_count ?? 0), 0);
  }

  // AI 서비스 키 상태 — DB 값 우선, 없으면 process.env, 둘 다 없으면 missing
  const dbSecrets = (secretsRow.data?.config as Record<string, string>) ?? {};
  const services: Record<string, "configured" | "missing"> = {};
  for (const key of AI_PROVIDER_KEYS) {
    const dbVal = dbSecrets[key];
    const envVal = process.env[key];
    services[key] = dbVal || envVal ? "configured" : "missing";
  }

  return NextResponse.json({
    posts: {
      total: postsTotal.count ?? 0,
      drafts: postsDrafts.count ?? 0,
      published: postsPublished.count ?? 0,
      recent: recentPosts.data ?? [],
    },
    works: {
      total: worksTotal.count ?? 0,
      drafts: worksDrafts.count ?? 0,
      published: worksPublished.count ?? 0,
      recent: recentWorks.data ?? [],
    },
    comments: {
      total: commentsTotal.count ?? 0,
      recent: recentCommentsHydrated,
    },
    notifications: {
      unreadCount: unreadNotifications.count ?? 0,
      recent: notifications.data ?? [],
    },
    stats: {
      totalPostViews,
      popularPosts: popularPosts.data ?? [],
      // 최근 14일치 일별 조회수. 누락된 날짜는 0 으로 채워서 클라이언트에서 곧장 차트로 그릴 수 있게.
      dailyViews: fillDailyViews(
        (dailyViewsRes.data ?? []) as Array<{ day: string; views: number }>,
        14,
      ),
    },
    services,
  });
}

/** 14일치 데이터를 빈 날짜 0 으로 padding. day 는 ISO date(YYYY-MM-DD), views 는 그날 조회수. */
function fillDailyViews(
  raw: Array<{ day: string; views: number }>,
  days: number,
): Array<{ day: string; views: number }> {
  const map = new Map<string, number>();
  for (const r of raw) {
    map.set(r.day, Number(r.views) || 0);
  }
  const out: Array<{ day: string; views: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, views: map.get(key) ?? 0 });
  }
  return out;
}
