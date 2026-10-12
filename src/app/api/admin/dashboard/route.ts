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
  kstDateStr,
  type PostAggRow,
} from "@/lib/api/dashboardAggregates";
import { loadExcludedIps } from "@/lib/api/ipAnalytics";
import { loadPageViewStats, loadPageViewTotals } from "@/lib/api/pageViewStats";
import { loadLandingRows, visitorHistory, visitorKey } from "@/lib/api/pageViewVisits";

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
  // '내 IP' 로 지정된 방문 · 조회는 트래픽 페이지와 같이 뺀다 (60초 캐시)
  const excludedIps = await loadExcludedIps(admin);

  const AI_PROVIDER_KEYS = [
    "NANOBANANA_API_KEY",
    "HUGGINGFACE_API_KEY",
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "GROQ_API_KEY",
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
    secretsRow,
    pageTotals,
    allPostsAgg,
    allLandings,
    pageStats30,
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
    admin.from("site_settings").select("config").eq("id", "secrets").maybeSingle(),
    // 페이지 조회수 합계 · 처음 센 날 (#1399)
    loadPageViewTotals(admin, excludedIps),
    // 카테고리/태그 집계용 — 발행된 게시물 전체
    admin
      .from("posts")
      .select("category, tags, view_count")
      .is("deleted_at", null)
      .eq("published", true),
    // 방문(세션의 첫 조회) 전체 — 최근 30일 유입 · 기기 집계와 신규/재방문 판별(이력) 둘 다 여기서
    loadLandingRows(admin, excludedIps),
    // 최근 30일 평균 머문 시간 (#1399) — 마이그레이션 전이면 null
    (() => {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return loadPageViewStats(admin, kstDateStr(start), kstDateStr(new Date()), excludedIps);
    })(),
  ]);

  const { categories, tags } = aggregateCategoriesAndTags(
    (allPostsAgg.data ?? []) as PostAggRow[],
  );

  // 최근 30일(오늘 포함) 방문 — 트래픽 간략 세트(#1161). 심화(국가·랜딩·시간대·UTM)는 /api/admin/traffic 이 가진다
  const windowStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return kstDateStr(d);
  })();
  const trafficRows = allLandings.filter((r) => r.date >= windowStart);
  const { devices, operatingSystems, browsers, deviceModels } = aggregateTraffic(trafficRows);
  const channels = aggregateChannels(trafficRows);
  const newVsReturning = aggregateNewVsReturning(visitorHistory(allLandings), windowStart);

  // 방문자 — 사이트에 들른 사람 수(방문자 id, 옛 기록은 IP). 전체 · 일별(KST)
  const allVisitors = new Set<string>();
  const dailyVisitorSets = new Map<string, Set<string>>();
  for (const r of allLandings) {
    const key = visitorKey(r);
    if (!key) continue;
    allVisitors.add(key);
    const set = dailyVisitorSets.get(r.date) ?? new Set<string>();
    set.add(key);
    dailyVisitorSets.set(r.date, set);
  }
  const since = allLandings[0]?.date ?? pageTotals?.since ?? null;
  // 일별 방문자 — 차트·달력·날짜 선택기용. 클라이언트에서 기간 슬라이스.
  // 고정 90일 창이었는데 추적이 그보다 길어지자 앞이 잘려 달력이 과거로 못 갔다(#1154).
  // 가장 오래된 기록부터 오늘까지를 창으로 쓴다 — 90일 하한(차트 기본 구간·WoW 슬라이스), 2년 캡(응답 크기).
  const chartDays = (() => {
    if (!since) return 90;
    const [fy, fm, fd] = since.split("-").map(Number);
    const [ty, tm, td] = kstDateStr(new Date()).split("-").map(Number);
    const span = Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000) + 1;
    return Math.min(Math.max(span, 90), 730);
  })();
  const dailyVisitors = fillDailyViews(
    [...dailyVisitorSets.entries()].map(([day, set]) => ({ day, views: set.size })),
    chartDays,
  );

  // 방문당 평균 조회수 — 최근 30일 페이지 조회 / 최근 30일 방문 수
  const views30 = pageStats30?.total ?? 0;
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
      // 맨 위 숫자 = 방문자. 방문(세션) · 페이지 조회 · 머문 시간은 그 옆에 작게
      visitors: { total: allVisitors.size, visits: allLandings.length, since },
      pageViews: {
        total: pageTotals?.total ?? 0,
        avgDurationMs30: pageStats30?.avgDurationMs ?? null,
      },
      popularPosts: popularPosts.data ?? [],
      // 첫 기록~오늘 일별 방문자. 누락된 날짜는 0 으로 채워서 클라이언트에서 슬라이스 해서 그릴 수 있게.
      dailyVisitors,
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
