import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import type { DashboardData } from "@/types";
import {
  aggregateCategoriesAndTags,
  aggregateChannels,
  aggregateNewVsReturning,
  aggregateTraffic,
  fillDailyViews,
  HUMAN_VISITS_FILTER,
  kstDateStr,
  type AnalyticsVisitRow,
  type PostAggRow,
} from "@/lib/api/dashboardAggregates";

// GET /api/admin/dashboard — 어드민 대시보드용 집계 데이터
// posts/works/comments 카운트 + 최근 항목 + 알림 + 인기 게시물 + AI 키 상태를
// 단일 응답으로 반환. 모든 쿼리는 Promise.all로 병렬 실행.
export async function GET() {
  /* 사이트 전체 통계·중재 데이터라 admin 등급 이상만 본다. requireAuth 만 있을 때는
     레벨 1 저자도 방문 통계·댓글·알림 집계를 볼 수 있었다.
     집계는 요청자 시야로 좁히면 안 되므로(저자 세션으로 읽으면 자기 글만 잡힌다)
     조회 자체는 service_role 을 유지하고, 대신 라우트를 등급으로 막는다. */
  const { error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

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
    allPostsAgg,
    trafficAgg,
    allVisitsAgg,
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
      .select("id, title, slug, view_count, like_count, category, created_at")
      .is("deleted_at", null)
      .eq("published", true)
      .gt("view_count", 0)
      .order("view_count", { ascending: false })
      .limit(5),
    admin.rpc("sum_post_views").maybeSingle(),
    admin.from("site_settings").select("config").eq("id", "secrets").maybeSingle(),
    // 일별 조회수 — 차트·달력·날짜 선택기용 (KST 기준). 클라이언트에서 기간 슬라이스.
    // 고정 90일 창이었는데 추적이 그보다 길어지자 앞이 잘려 달력이 과거로 못 갔다(#1154).
    // 가장 오래된 기록부터 오늘까지를 창으로 쓴다 — 90일 하한(차트 기본 구간·WoW 슬라이스),
    // 2년 캡(응답 크기). 첫 기록 조회는 이 항목 안에서 직렬이라 다른 집계와는 계속 병렬이다.
    (async () => {
      const { data: first } = await admin
        .from("post_views")
        .select("viewed_date")
        .order("viewed_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      const end = new Date();
      const todayKst = kstDateStr(end);
      let days = 90;
      const firstDay = (first as { viewed_date?: string } | null)?.viewed_date;
      if (firstDay) {
        const [fy, fm, fd] = firstDay.split("-").map(Number);
        const [ty, tm, td] = todayKst.split("-").map(Number);
        const span = Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000) + 1;
        days = Math.min(Math.max(span, 90), 730);
      }
      const start = new Date(end);
      start.setDate(start.getDate() - (days - 1));
      const res = await admin.rpc("daily_post_views", {
        p_start: kstDateStr(start),
        p_end: todayKst,
      });
      return { ...res, days };
    })(),
    // 카테고리/태그 집계용 — 발행된 게시물 전체
    admin
      .from("posts")
      .select("category, tags, view_count")
      .is("deleted_at", null)
      .eq("published", true),
    // 트래픽 분석 — site_visits 메타 (최근 30일).
    // 컬럼을 나열하지 않고 * 로 받는다 — 분석 컬럼(country·path·utm_*, #1161)은 마이그레이션
    // 전 DB 엔 없어서, 나열하면 쿼리 전체가 죽고 기기 분석까지 같이 사라진다.
    (() => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return admin
        .from("site_visits")
        .select("*")
        .gte("date", start.toISOString().slice(0, 10))
        .or(HUMAN_VISITS_FILTER);
    })(),
    // 신규/재방문 판별용 전체 방문 이력 — ip 하루 1행이라 크기가 작다 (방문자수×방문일수)
    admin.from("site_visits").select("ip, date").or(HUMAN_VISITS_FILTER),
  ]);

  const { categories, tags } = aggregateCategoriesAndTags(
    (allPostsAgg.data ?? []) as PostAggRow[],
  );

  const trafficRows = (trafficAgg.data ?? []) as AnalyticsVisitRow[];
  const { devices, operatingSystems, browsers, deviceModels } = aggregateTraffic(trafficRows);

  // 트래픽 간략 세트(#1161) — 심화(국가·랜딩·시간대·UTM)는 /api/admin/traffic 이 가진다
  const channels = aggregateChannels(trafficRows);
  const windowStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();
  const newVsReturning = aggregateNewVsReturning(
    (allVisitsAgg.data ?? []) as Array<{ ip: string | null; date: string | null }>,
    windowStart,
  );

  const filledDailyViews = fillDailyViews(
    (dailyViewsRes.data ?? []) as Array<{ day: string; views: number }>,
    dailyViewsRes.days,
  );
  // 방문당 평균 조회수 — 최근 30일 조회수 합 / 최근 30일 방문 수
  const views30 = filledDailyViews.slice(-30).reduce((s, d) => s + d.views, 0);
  const visits30 = trafficRows.length;
  const visitSummary = {
    visits30,
    views30,
    viewsPerVisit: visits30 > 0 ? Math.round((views30 / visits30) * 10) / 10 : 0,
  };

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
      // 첫 기록~오늘 일별 조회수. 누락된 날짜는 0 으로 채워서 클라이언트에서 슬라이스 해서 그릴 수 있게.
      dailyViews: filledDailyViews,
      categories,
      tags,
      devices,
      operatingSystems,
      browsers,
      deviceModels,
      channels,
      newVsReturning,
      visitSummary,
    },
    services,
  } satisfies DashboardData);
}
