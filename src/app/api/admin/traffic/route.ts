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
  kstDateStr,
  pctChange,
} from "@/lib/api/dashboardAggregates";
import { aggregateIpVisitors, ipKey, loadExcludedIps, maskIp } from "@/lib/api/ipAnalytics";
import { countBotVisits, countPostViews, loadLandingRows, visitorHistory } from "@/lib/api/pageViewVisits";
import { getIp } from "@/utils/getIp";
import { loadPageViewStats } from "@/lib/api/pageViewStats";

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

  // 창 경계 — page_views.viewed_date 와 같은 KST 날짜 문자열 공간에서 계산한다
  const dayStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return kstDateStr(d);
  };
  const windowStart = dayStr(days - 1);
  const prevStart = dayStr(2 * days - 1);

  // '내 IP' — 이미 쌓인 기록도 집계에서 뺀다 (새 조회는 /api/page-views 가 기록 전에 거른다)
  const excludedIps = await loadExcludedIps(admin, { fresh: true });

  const [allLandings, botVisits, pageStats, topContent] = await Promise.all([
    // 방문(세션의 첫 조회) 전체 — 기간 집계 · 신규/재방문 · 일별 추이 · 직전 기간 비교가 모두 이 이력에서
    loadLandingRows(admin, excludedIps),
    // 봇 방문 수 — 집계에선 제외되지만 얼마나 걸러졌는지 보여준다
    countBotVisits(admin, windowStart),
    // 페이지 조회 · 머문 시간 (#1399)
    loadPageViewStats(admin, windowStart, dayStr(0), excludedIps),
    // 기간 내 인기 콘텐츠 — 누적 view_count 가 아니라 창 안의 /posts/{slug} 조회로 센다
    (async (): Promise<TrafficData["topContent"]> => {
      const counts = await countPostViews(admin, excludedIps, windowStart);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (top.length === 0) return [];
      const { data: posts } = await admin
        .from("posts")
        .select("id, title, slug")
        .in("slug", top.map(([slug]) => slug));
      const bySlug = new Map(
        ((posts ?? []) as Array<{ id: string; title: string; slug: string }>).map((p) => [p.slug, p]),
      );
      const total = [...counts.values()].reduce((s, n) => s + n, 0);
      return top.flatMap(([slug, count]) => {
        const p = bySlug.get(slug);
        if (!p) return []; // 삭제됐거나 slug 가 바뀐 글은 조용히 뺀다
        return [{ id: p.id, title: p.title, slug: p.slug, count, pct: Math.round((count / total) * 100) }];
      });
    })(),
  ]);

  const trafficRows = allLandings.filter((r) => r.date >= windowStart);
  const history = visitorHistory(allLandings);
  const requestIp = getIp(request);
  const { devices, operatingSystems, browsers, deviceModels } = aggregateTraffic(trafficRows);

  // 방문당 조회수 — 기간 내 페이지 조회 / 방문
  const views = pageStats?.total ?? 0;
  const visits = trafficRows.length;
  const newVsReturning = aggregateNewVsReturning(history, windowStart);

  // 직전 동기간 — 이력에서 현재 창 이전만 남기고 같은 길이 창으로 다시 계산
  const prevHistory = history.filter((v) => v.date && v.date < windowStart);
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
    dailyVisits: aggregateDailyVisits(history, days),
    botVisits,
    topContent,
    ipVisitors: aggregateIpVisitors(trafficRows),
    currentIp: maskIp(requestIp)
      ? { key: ipKey(requestIp), masked: maskIp(requestIp)!, excluded: excludedIps.has(requestIp) }
      : null,
    excludedIps: [...excludedIps].map((ip) => ({ key: ipKey(ip), masked: maskIp(ip) ?? ip })),
    changes: {
      visits: pctChange(visits, prevVisits),
      newVisitors: pctChange(newVsReturning.newCount, prevNvr.newCount),
      returning: pctChange(newVsReturning.returningCount, prevNvr.returningCount),
    },
    pageStats,
    visitSummary: {
      visits30: visits,
      views30: views,
      viewsPerVisit: visits > 0 ? Math.round((views / visits) * 10) / 10 : 0,
    },
  } satisfies TrafficData);
}
