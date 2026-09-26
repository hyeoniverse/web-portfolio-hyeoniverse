import type { TrafficData } from "@/types";

/* 트래픽 페이지 데모 데이터(#1161) — /admin/traffic?demo=1 에서만 쓴다.
   실데이터가 쌓이기 전에 UI 전체(국가·랜딩·UTM·증감 배지 포함)를 볼 수 있게 하는
   화면 확인용이고, DB 는 전혀 건드리지 않는다. days 를 시드로 써서 같은 기간이면
   같은 그림이 나온다. */

/** 시드 난수 — Math.random 이면 리렌더마다 차트가 바뀌어 확인용으로 못 쓴다 */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function makeDemoTrafficData(days: number): TrafficData {
  const rand = lcg(days * 7919 + 42);

  /* 일별 방문 — 주간 파형(주말 저조) + 완만한 성장 + 노이즈 */
  const dailyVisits: Array<{ day: string; count: number }> = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6 ? 0.55 : 1;
    const growth = 1 + ((days - i) / days) * 0.6;
    const count = Math.round((26 + rand() * 18) * weekend * growth);
    dailyVisits.push({ day: d.toISOString().slice(0, 10), count });
  }
  const visits = dailyVisits.reduce((s, d) => s + d.count, 0);

  /* 시간대 잔디 — 점심·저녁 피크, 새벽 저조 */
  const matrix = Array.from({ length: 7 }, (_, dow) =>
    Array.from({ length: 24 }, (_, hour) => {
      const peak =
        (hour >= 11 && hour <= 14 ? 1 : 0) + (hour >= 19 && hour <= 23 ? 1.4 : 0);
      const base = hour >= 2 && hour <= 7 ? 0.1 : 0.5;
      const weekend = dow === 0 || dow === 6 ? 0.6 : 1;
      const v = (base + peak) * weekend * rand() * 6;
      return Math.round(v);
    }),
  );
  const max = Math.max(...matrix.flat());

  const share = (pct: number) => ({ count: Math.round((visits * pct) / 100), pct });

  const newCount = Math.round(visits * 0.42);
  const returningCount = Math.round(visits * 0.21);

  return {
    days,
    siteUrl: "https://www.hyeoniverse.com",
    dailyVisits,
    botVisits: Math.round(visits * 0.18),
    changes: { visits: 23, newVisitors: 12, returning: -8 },
    channels: [
      {
        channel: "search",
        ...share(38),
        hosts: [
          { host: "google.com", count: 210, pct: 62 },
          { host: "search.naver.com", count: 88, pct: 26 },
          { host: "bing.com", count: 27, pct: 8 },
          { host: "duckduckgo.com", count: 14, pct: 4 },
        ],
      },
      { channel: "direct", ...share(27), hosts: [] },
      {
        channel: "social",
        ...share(15),
        hosts: [
          { host: "t.co", count: 74, pct: 55 },
          { host: "linkedin.com", count: 41, pct: 30 },
          { host: "instagram.com", count: 20, pct: 15 },
        ],
      },
      {
        channel: "community",
        ...share(10),
        hosts: [
          { host: "velog.io", count: 48, pct: 53 },
          { host: "news.ycombinator.com", count: 25, pct: 28 },
          { host: "disquiet.io", count: 17, pct: 19 },
        ],
      },
      {
        channel: "dev",
        ...share(7),
        hosts: [
          { host: "github.com", count: 51, pct: 81 },
          { host: "stackoverflow.com", count: 12, pct: 19 },
        ],
      },
      { channel: "other", ...share(3), hosts: [{ host: "newsletter.example.com", count: 26, pct: 100 }] },
    ],
    devices: [
      { kind: "desktop", ...share(58) },
      { kind: "mobile", ...share(36) },
      { kind: "tablet", ...share(6) },
    ],
    operatingSystems: [
      { name: "macOS", ...share(34) },
      { name: "Windows", ...share(28) },
      { name: "iOS", ...share(21) },
      { name: "Android", ...share(13) },
      { name: "Linux", ...share(4) },
    ],
    browsers: [
      { name: "Chrome", ...share(52) },
      { name: "Safari", ...share(27) },
      { name: "Edge", ...share(11) },
      { name: "Firefox", ...share(8) },
      { name: "Whale", ...share(2) },
    ],
    deviceModels: {
      desktop: [
        { model: "Mac", count: 168, pct: 58 },
        { model: "PC", count: 98, pct: 34 },
        { model: "Linux PC", count: 23, pct: 8 },
      ],
      mobile: [
        { model: "iPhone", count: 130, pct: 67 },
        { model: "Galaxy S24", count: 44, pct: 23 },
        { model: "Pixel 9", count: 19, pct: 10 },
      ],
      tablet: [
        { model: "iPad", count: 30, pct: 88 },
        { model: "Galaxy Tab", count: 4, pct: 12 },
      ],
    },
    countries: [
      { code: "KR", ...share(61) },
      { code: "US", ...share(14) },
      { code: "JP", ...share(8) },
      { code: "DE", ...share(5) },
      { code: "GB", ...share(4) },
      { code: "FR", ...share(3) },
      { code: "CA", ...share(3) },
      { code: "AU", ...share(2) },
    ],
    landingPages: [
      { path: "/", ...share(31) },
      { path: "/posts", ...share(22) },
      { path: "/works", ...share(15) },
      { path: "/posts/series-navigation-comments", ...share(12) },
      { path: "/about", ...share(9) },
      { path: "/profile", ...share(6) },
      { path: "/posts/tags/nextjs", ...share(5) },
    ],
    topContent: [
      { id: "demo-1", title: "시리즈 네비게이션과 댓글 시스템", slug: "series-navigation-comments", count: 312, pct: 34 },
      { id: "demo-2", title: "Next.js 16 마이그레이션 회고", slug: "next16-migration", count: 198, pct: 22 },
      { id: "demo-3", title: "CSS 토큰 시스템 설계기", slug: "css-token-system", count: 154, pct: 17 },
      { id: "demo-4", title: "Supabase RLS 전환 삽질기", slug: "supabase-rls", count: 121, pct: 13 },
      { id: "demo-5", title: "포트폴리오 성능 개선 일지", slug: "perf-diary", count: 87, pct: 10 },
    ],
    visitHeatmap: { matrix, max },
    newVsReturning: {
      newCount,
      returningCount,
      returningPct: Math.round((returningCount / (newCount + returningCount)) * 100),
    },
    utmCampaigns: [
      { source: "linkedin", medium: "social", campaign: "profile-2026", count: 34 },
      { source: "resume", medium: null, campaign: "2026", count: 21 },
      { source: "twitter", medium: "social", campaign: null, count: 9 },
    ],
    visitSummary: {
      visits30: visits,
      views30: Math.round(visits * 2.4),
      viewsPerVisit: 2.4,
    },
  };
}
