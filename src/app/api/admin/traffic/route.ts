import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import type { TrafficData } from "@/types";
import {
  aggregateChannels,
  aggregateCountries,
  aggregateDailyVisits,
  aggregateLandingPages,
  aggregateNewVsReturning,
  aggregateTraffic,
  aggregateUtmCampaigns,
  aggregateVisitHeatmap,
  HUMAN_VISITS_FILTER,
  kstDateStr,
  pctChange,
  type AnalyticsVisitRow,
} from "@/lib/api/dashboardAggregates";

const ALLOWED_DAYS = [7, 14, 30, 90] as const;

// GET /api/admin/traffic?days=7|14|30|90 — 트래픽 전용 페이지(#1161) 집계.
// 대시보드 응답에서 트래픽 심화(국가·랜딩·시간대·UTM·기기 상세)를 분리해 왔다 —
// 대시보드는 간략 세트(요약·채널·기기)만 들고, 이 페이지가 전체를 가진다.
// 증감 배지는 직전 동기간(기간 바로 앞 같은 길이) 대비다.
export async function GET(request: Request) {
  const { error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const admin = createAdminClient();

  const daysRaw = Number(new URL(request.url).searchParams.get("days"));
  const days = (ALLOWED_DAYS as readonly number[]).includes(daysRaw) ? daysRaw : 30;

  // 창 경계 — 방문의 date 컬럼과 같은 UTC 날짜 문자열 공간에서 계산한다
  const dayStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const windowStart = dayStr(days - 1);
  const prevStart = dayStr(2 * days - 1);

  const [trafficAgg, allVisitsAgg, botCountRes, dailyViewsRes, topContent] = await Promise.all([
    // 분석 컬럼(country·path·utm_*)은 마이그레이션 전 DB 엔 없다 — 나열하면 쿼리가 통째로 죽는다
    admin.from("site_visits").select("*").gte("date", windowStart).or(HUMAN_VISITS_FILTER),
    // 신규/재방문·일별 추이·직전 기간 비교용 전체 방문 이력 — ip 하루 1행이라 크기가 작다
    admin.from("site_visits").select("ip, date").or(HUMAN_VISITS_FILTER),
    // 봇 방문 수 — 집계에선 제외되지만 얼마나 걸러졌는지 보여준다
    admin
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .eq("device_kind", "bot")
      .gte("date", windowStart),
    // 방문당 조회수의 분자 — 기간 내 일별 조회수 (rpc 는 p_start·p_end 둘 다 필수)
    (() => {
      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      return admin.rpc("daily_post_views", {
        p_start: kstDateStr(start),
        p_end: kstDateStr(new Date()),
      });
    })(),
    // 기간 내 인기 콘텐츠 — 누적 view_count 가 아니라 창 안의 post_views 로 센다.
    // 글 정보 조인이 필요해 이 항목 안에서만 직렬, 다른 집계와는 병렬이다.
    (async (): Promise<TrafficData["topContent"]> => {
      const { data: viewRows } = await admin
        .from("post_views")
        .select("post_id")
        .gte("viewed_date", windowStart);
      const counts = new Map<string, number>();
      for (const r of (viewRows ?? []) as Array<{ post_id: string | null }>) {
        if (r.post_id) counts.set(r.post_id, (counts.get(r.post_id) ?? 0) + 1);
      }
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length === 0) return [];
      const { data: posts } = await admin
        .from("posts")
        .select("id, title, slug")
        .in("id", top.map(([id]) => id));
      const postMap = new Map(
        ((posts ?? []) as Array<{ id: string; title: string; slug: string }>).map((p) => [p.id, p]),
      );
      const total = [...counts.values()].reduce((s, n) => s + n, 0);
      return top.flatMap(([id, count]) => {
        const p = postMap.get(id);
        if (!p) return []; // 삭제됐거나 접근 불가한 글은 조용히 뺀다
        return [{ id, title: p.title, slug: p.slug, count, pct: Math.round((count / total) * 100) }];
      });
    })(),
  ]);

  const trafficRows = (trafficAgg.data ?? []) as AnalyticsVisitRow[];
  const allVisits = (allVisitsAgg.data ?? []) as Array<{ ip: string | null; date: string | null }>;
  const { devices, operatingSystems, browsers, deviceModels } = aggregateTraffic(trafficRows);

  const views = ((dailyViewsRes.data ?? []) as Array<{ views: number }>).reduce(
    (s, d) => s + (Number(d.views) || 0),
    0,
  );
  const visits = trafficRows.length;
  const newVsReturning = aggregateNewVsReturning(allVisits, windowStart);

  // 직전 동기간 — 이력에서 현재 창 이전만 남기고 같은 길이 창으로 다시 계산
  const prevHistory = allVisits.filter((v) => v.date && v.date < windowStart);
  const prevVisits = prevHistory.filter((v) => v.date && v.date >= prevStart).length;
  const prevNvr = aggregateNewVsReturning(prevHistory, prevStart);

  return NextResponse.json({
    days,
    // UTM 생성기 기준 도메인 — origin 을 쓰면 프리뷰 도메인이 링크에 박힌다. SITE_URL 이 정본
    siteUrl: (process.env.SITE_URL ?? "").replace(/\/+$/, ""),
    channels: aggregateChannels(trafficRows),
    devices,
    operatingSystems,
    browsers,
    deviceModels,
    countries: aggregateCountries(trafficRows),
    landingPages: aggregateLandingPages(trafficRows),
    visitHeatmap: aggregateVisitHeatmap(trafficRows),
    newVsReturning,
    utmCampaigns: aggregateUtmCampaigns(trafficRows),
    dailyVisits: aggregateDailyVisits(allVisits, days),
    botVisits: botCountRes.count ?? 0,
    topContent,
    changes: {
      visits: pctChange(visits, prevVisits),
      newVisitors: pctChange(newVsReturning.newCount, prevNvr.newCount),
      returning: pctChange(newVsReturning.returningCount, prevNvr.returningCount),
    },
    visitSummary: {
      visits30: visits,
      views30: views,
      viewsPerVisit: visits > 0 ? Math.round((views / visits) * 10) / 10 : 0,
    },
  } satisfies TrafficData);
}
