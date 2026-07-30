import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import type { DashboardData } from "@/types";

// GET /api/admin/dashboard — 어드민 대시보드용 집계 데이터
// posts/works/comments 카운트 + 최근 항목 + 알림 + 인기 게시물 + AI 키 상태를
// 단일 응답으로 반환. 모든 쿼리는 Promise.all로 병렬 실행.
export async function GET() {
  const { error: authError } = await requireAuth();
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
    // 최근 90일 일별 조회수 — 차트용 (KST 기준). 클라이언트에서 7/14/30/90 기간으로 슬라이스.
    (() => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 89);
      return admin.rpc("daily_post_views", {
        p_start: kstDateStr(start),
        p_end: kstDateStr(end),
      });
    })(),
    // 카테고리/태그 집계용 — 발행된 게시물 전체
    admin
      .from("posts")
      .select("category, tags, view_count")
      .is("deleted_at", null)
      .eq("published", true),
    // 트래픽 분석 — site_visits 메타 (최근 30일)
    (() => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return admin
        .from("site_visits")
        .select("referrer, device_kind, os, browser, device_model")
        .gte("date", start.toISOString().slice(0, 10));
    })(),
  ]);

  // 카테고리/태그 집계 (클라이언트 측 reduce)
  const allPostsRows = (allPostsAgg.data ?? []) as Array<{ category: string | null; tags: string[] | null; view_count: number | null }>;
  const categoryMap = new Map<string, { count: number; views: number }>();
  const tagMap = new Map<string, number>();
  for (const p of allPostsRows) {
    if (p.category) {
      const cur = categoryMap.get(p.category) ?? { count: 0, views: 0 };
      cur.count += 1;
      cur.views += p.view_count ?? 0;
      categoryMap.set(p.category, cur);
    }
    for (const t of p.tags ?? []) {
      tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
    }
  }
  const categories = Array.from(categoryMap, ([name, v]) => ({ name, postCount: v.count, views: v.views }))
    .sort((a, b) => b.views - a.views || b.postCount - a.postCount)
    .slice(0, 6);
  const tags = Array.from(tagMap, ([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // ── 트래픽 분석 — site_visits 메타 (referrer / device / os / browser / model) 집계 ──
  type VisitRow = {
    referrer: string | null;
    device_kind: string | null;
    os: string | null;
    browser: string | null;
    device_model: string | null;
  };
  const visitRows = (trafficAgg.data ?? []) as VisitRow[];

  const refMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();  // desktop/mobile/tablet
  const osMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  // 디바이스 종류별 모델 분포 (drill-down 용)
  const modelByDevice: Record<string, Map<string, number>> = { desktop: new Map(), mobile: new Map(), tablet: new Map() };

  for (const v of visitRows) {
    if (v.referrer) refMap.set(v.referrer, (refMap.get(v.referrer) ?? 0) + 1);
    if (v.device_kind) deviceMap.set(v.device_kind, (deviceMap.get(v.device_kind) ?? 0) + 1);
    if (v.os) osMap.set(v.os, (osMap.get(v.os) ?? 0) + 1);
    if (v.browser) browserMap.set(v.browser, (browserMap.get(v.browser) ?? 0) + 1);
    if (v.device_kind && v.device_model && modelByDevice[v.device_kind]) {
      const m = modelByDevice[v.device_kind];
      m.set(v.device_model, (m.get(v.device_model) ?? 0) + 1);
    }
  }

  const totalVisits = visitRows.length;
  const toPctList = <T,>(map: Map<string, number>, transform: (k: string, n: number) => T, limit: number, sortBySize = true): T[] => {
    const total = [...map.values()].reduce((s, n) => s + n, 0);
    if (total === 0) return [];
    const list = [...map.entries()].sort((a, b) => sortBySize ? b[1] - a[1] : 0).slice(0, limit);
    return list.map(([k, n]) => transform(k, n));
  };

  const referrers = toPctList(refMap, (source, count) => ({ source, count, pct: Math.round((count / totalVisits) * 100) }), 6);
  const devices = (["desktop", "mobile", "tablet"] as const)
    .map((kind) => {
      const count = deviceMap.get(kind) ?? 0;
      return { kind, count, pct: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0 };
    })
    .filter((d) => d.count > 0);
  const operatingSystems = toPctList(osMap, (name, count) => ({ name, count, pct: Math.round((count / totalVisits) * 100) }), 8);
  const browsers = toPctList(browserMap, (name, count) => ({ name, count, pct: Math.round((count / totalVisits) * 100) }), 8);
  const deviceModels: Record<"desktop" | "mobile" | "tablet", Array<{ model: string; count: number; pct: number }>> = {
    desktop: [], mobile: [], tablet: [],
  };
  for (const kind of ["desktop", "mobile", "tablet"] as const) {
    const subtotal = [...modelByDevice[kind].values()].reduce((s, n) => s + n, 0);
    if (subtotal === 0) continue;
    deviceModels[kind] = [...modelByDevice[kind].entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([model, count]) => ({ model, count, pct: Math.round((count / subtotal) * 100) }));
  }

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
      // 최근 90일치 일별 조회수. 누락된 날짜는 0 으로 채워서 클라이언트에서 슬라이스 해서 그릴 수 있게.
      dailyViews: fillDailyViews(
        (dailyViewsRes.data ?? []) as Array<{ day: string; views: number }>,
        90,
      ),
      categories,
      tags,
      referrers,
      devices,
      operatingSystems,
      browsers,
      deviceModels,
    },
    services,
  } satisfies DashboardData);
}

/** Date → KST 기준 "YYYY-MM-DD" 문자열 (Asia/Seoul timezone) */
const KST_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function kstDateStr(d: Date): string {
  return KST_FMT.format(d);
}

/** N일치 데이터를 빈 날짜 0 으로 padding. day 는 KST 기준 ISO date(YYYY-MM-DD). */
function fillDailyViews(
  raw: Array<{ day: string; views: number }>,
  days: number,
): Array<{ day: string; views: number }> {
  const map = new Map<string, number>();
  for (const r of raw) {
    map.set(r.day, Number(r.views) || 0);
  }
  const out: Array<{ day: string; views: number }> = [];
  /* KST 오늘부터 거꾸로 N일. KST 자정 boundary 를 정확히 매치하기 위해 string 연산 사용. */
  const todayKst = kstDateStr(new Date());
  const todayParts = todayKst.split("-").map(Number);
  const todayLocal = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayLocal);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, views: map.get(key) ?? 0 });
  }
  return out;
}
