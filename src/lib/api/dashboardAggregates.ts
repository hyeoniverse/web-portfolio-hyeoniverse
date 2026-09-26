/**
 * 관리자 대시보드의 순수 집계 — 조회한 행을 화면이 쓰는 모양으로 바꾼다.
 *
 * 원래는 `/api/admin/dashboard` 의 GET 핸들러 안에 인라인으로 있었다. 그 핸들러는 290줄인데
 * 대부분이 "쿼리 결과를 reduce 해서 목록을 만드는" 코드였고, 라우트 안에 있으니 테스트할
 * 방법이 없었다 — 확인하려면 실제 DB 를 붙여 라우트를 부르는 수밖에 없었다.
 *
 * 여기 있는 함수는 전부 인자로 받은 행만 보고 결과를 만든다. DB 도, 시각도, 환경변수도
 * 읽지 않는다(날짜를 다루는 fillDailyViews 만 "오늘" 을 인자로 받는다).
 */

/* ── 카테고리·태그 ── */

export type PostAggRow = {
  category: string | null;
  tags: string[] | null;
  view_count: number | null;
};

export type CategoryStat = { name: string; postCount: number; views: number };
export type TagStat = { tag: string; count: number };

/** 조회수 많은 카테고리 6개와 많이 쓰인 태그 12개. */
export function aggregateCategoriesAndTags(rows: PostAggRow[]): {
  categories: CategoryStat[];
  tags: TagStat[];
} {
  const categoryMap = new Map<string, { count: number; views: number }>();
  const tagMap = new Map<string, number>();

  for (const p of rows) {
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

  const categories = Array.from(categoryMap, ([name, v]) => ({
    name,
    postCount: v.count,
    views: v.views,
  }))
    // 조회수가 같으면 글이 많은 쪽을 앞에 둔다.
    .sort((a, b) => b.views - a.views || b.postCount - a.postCount)
    .slice(0, 6);

  const tags = Array.from(tagMap, ([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return { categories, tags };
}

/* ── 트래픽 ── */

export type VisitRow = {
  referrer: string | null;
  device_kind: string | null;
  os: string | null;
  browser: string | null;
  device_model: string | null;
};

type ShareStat = { count: number; pct: number };
export type DeviceKind = "desktop" | "mobile" | "tablet";

export type TrafficStats = {
  referrers: Array<{ source: string } & ShareStat>;
  devices: Array<{ kind: DeviceKind } & ShareStat>;
  operatingSystems: Array<{ name: string } & ShareStat>;
  browsers: Array<{ name: string } & ShareStat>;
  deviceModels: Record<DeviceKind, Array<{ model: string } & ShareStat>>;
};

const DEVICE_KINDS = ["desktop", "mobile", "tablet"] as const;

function tally(map: Map<string, number>, key: string | null): void {
  if (key) map.set(key, (map.get(key) ?? 0) + 1);
}

/** 상위 n개를 비율과 함께. 비율의 분모는 전체 방문 수다(항목 합이 아니라). */
function topWithShare<T>(
  map: Map<string, number>,
  total: number,
  limit: number,
  build: (key: string, count: number, pct: number) => T,
): T[] {
  if (total === 0) return [];
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, n]) => build(k, n, Math.round((n / total) * 100)));
}

/** 방문 기록에서 유입 경로·기기·OS·브라우저·기기 모델 분포를 뽑는다. */
export function aggregateTraffic(rows: VisitRow[]): TrafficStats {
  const refMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const osMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  // 기기 종류 안에서 다시 모델별로 — 화면에서 펼쳐 보는 용도다.
  const modelByDevice: Record<string, Map<string, number>> = {
    desktop: new Map(),
    mobile: new Map(),
    tablet: new Map(),
  };

  for (const v of rows) {
    tally(refMap, v.referrer);
    tally(deviceMap, v.device_kind);
    tally(osMap, v.os);
    tally(browserMap, v.browser);
    if (v.device_kind && v.device_model && modelByDevice[v.device_kind]) {
      tally(modelByDevice[v.device_kind], v.device_model);
    }
  }

  const total = rows.length;

  const deviceModels = {
    desktop: [],
    mobile: [],
    tablet: [],
  } as TrafficStats["deviceModels"];
  for (const kind of DEVICE_KINDS) {
    // 모델 비율의 분모는 전체 방문이 아니라 그 기기 종류의 방문 수다.
    const subtotal = [...modelByDevice[kind].values()].reduce((s, n) => s + n, 0);
    deviceModels[kind] = topWithShare(modelByDevice[kind], subtotal, 10, (model, count, pct) => ({
      model,
      count,
      pct,
    }));
  }

  return {
    referrers: topWithShare(refMap, total, 6, (source, count, pct) => ({ source, count, pct })),
    // 기기는 상위 n개가 아니라 세 종류를 정해진 순서로 보여 준다. 0건인 것만 뺀다.
    devices: DEVICE_KINDS.map((kind) => {
      const count = deviceMap.get(kind) ?? 0;
      return { kind, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    }).filter((d) => d.count > 0),
    operatingSystems: topWithShare(osMap, total, 8, (name, count, pct) => ({ name, count, pct })),
    browsers: topWithShare(browserMap, total, 8, (name, count, pct) => ({ name, count, pct })),
    deviceModels,
  };
}

/* ── 트래픽 분석 확장(#1161) ── */

/** 봇 행 제외 PostgREST or() 필터 — 봇도 행으로 남기기 시작해서 사람 지표 쿼리는 전부 이걸 건다.
 *  neq 만 쓰면 device_kind 가 NULL 인 옛 행까지 걸러지므로 is.null 을 함께 허용한다. */
export const HUMAN_VISITS_FILTER = "device_kind.is.null,device_kind.neq.bot";

export type AnalyticsVisitRow = VisitRow & {
  country?: string | null;
  path?: string | null;
  created_at?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

export type Channel = "search" | "social" | "community" | "dev" | "direct" | "other";

/* 호스트 → 채널. 서브도메인이 붙어도 잡히도록 "그 도메인이거나 그 서브도메인" 으로 본다. */
const CHANNEL_HOSTS: Array<[Channel, string[]]> = [
  ["search", [
    "google.com", "google.co.kr", "naver.com", "bing.com", "duckduckgo.com",
    "daum.net", "yahoo.com", "baidu.com", "yandex.com", "brave.com",
    "ecosia.org", "startpage.com", "search.marginalia.nu", "kagi.com", "perplexity.ai",
  ]],
  ["social", [
    "t.co", "twitter.com", "x.com", "instagram.com", "facebook.com", "fb.me",
    "linkedin.com", "lnkd.in", "threads.net", "youtube.com", "youtu.be", "tiktok.com",
    "pinterest.com", "kakao.com", "band.us", "discord.com", "discordapp.com",
    "t.me", "telegram.org", "slack.com",
  ]],
  ["community", [
    "reddit.com", "news.ycombinator.com", "disquiet.io", "careerly.co.kr",
    "okky.kr", "clien.net", "dcinside.com", "fmkorea.com", "ruliweb.com",
    "velog.io", "tistory.com", "medium.com", "brunch.co.kr", "dev.to",
    "hashnode.com", "geeknews.chat", "hada.io",
  ]],
  ["dev", [
    "github.com", "gitlab.com", "stackoverflow.com", "npmjs.com", "vercel.com",
    "vercel.app", "supabase.com", "codepen.io", "codesandbox.io",
  ]],
];

/* 자기 사이트에서 온 referer 는 내부 이동이므로 직접 방문으로 친다. */
const OWN_HOSTS = ["hyeoniverse.com", "localhost", "127.0.0.1"];

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** referrer 호스트를 유입 채널로 분류한다. */
export function classifyChannel(host: string | null): Channel {
  if (!host || host === "Direct") return "direct";
  const h = host.toLowerCase();
  if (OWN_HOSTS.some((d) => hostMatches(h, d))) return "direct";
  for (const [channel, domains] of CHANNEL_HOSTS) {
    if (domains.some((d) => hostMatches(h, d))) return channel;
  }
  return "other";
}

export type ChannelStat = {
  channel: Channel;
  count: number;
  pct: number;
  /** 채널 안의 상위 호스트 — 화면에서 펼쳐 보는 용도. direct 는 비어 있다. */
  hosts: Array<{ host: string; count: number; pct: number }>;
};

/** 유입 경로를 채널(검색/SNS/커뮤니티/개발/직접/기타)로 묶는다. 호스트 드릴다운 포함. */
export function aggregateChannels(rows: AnalyticsVisitRow[]): ChannelStat[] {
  const byChannel = new Map<Channel, Map<string, number>>();
  for (const v of rows) {
    const channel = classifyChannel(v.referrer);
    const hostMap = byChannel.get(channel) ?? new Map<string, number>();
    // direct 는 호스트가 의미 없으니 한 덩어리로 센다.
    tally(hostMap, channel === "direct" ? "Direct" : (v.referrer ?? "Direct"));
    byChannel.set(channel, hostMap);
  }
  const total = rows.length;
  if (total === 0) return [];
  return [...byChannel.entries()]
    .map(([channel, hostMap]) => {
      const count = [...hostMap.values()].reduce((s, n) => s + n, 0);
      return {
        channel,
        count,
        pct: Math.round((count / total) * 100),
        hosts:
          channel === "direct"
            ? []
            : topWithShare(hostMap, count, 8, (host, n, pct) => ({ host, count: n, pct })),
      };
    })
    .sort((a, b) => b.count - a.count);
}

/** 국가별 방문 상위 — country 는 ISO alpha-2, 없는 행(마이그레이션 전·로컬)은 제외. */
export function aggregateCountries(
  rows: AnalyticsVisitRow[],
): Array<{ code: string; count: number; pct: number }> {
  const map = new Map<string, number>();
  let total = 0;
  for (const v of rows) {
    if (v.country) {
      tally(map, v.country);
      total += 1;
    }
  }
  return topWithShare(map, total, 8, (code, count, pct) => ({ code, count, pct }));
}

/** 랜딩 페이지 상위 — path 없는 행(마이그레이션 전)은 제외. 뒤 슬래시는 정규화. */
export function aggregateLandingPages(
  rows: AnalyticsVisitRow[],
): Array<{ path: string; count: number; pct: number }> {
  const map = new Map<string, number>();
  let total = 0;
  for (const v of rows) {
    if (v.path) {
      const norm = v.path.length > 1 ? v.path.replace(/\/+$/, "") : v.path;
      tally(map, norm || "/");
      total += 1;
    }
  }
  return topWithShare(map, total, 8, (path, count, pct) => ({ path, count, pct }));
}

const KST_HOUR_DOW = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  hour: "numeric",
  hour12: false,
  weekday: "short",
});

/** 방문 시간대 히트맵 — KST 기준 요일(0=일)×시각(0~23) 행렬. */
export function aggregateVisitHeatmap(rows: AnalyticsVisitRow[]): {
  matrix: number[][];
  max: number;
} {
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let max = 0;
  for (const v of rows) {
    if (!v.created_at) continue;
    const d = new Date(v.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const parts = KST_HOUR_DOW.formatToParts(d);
    const dow = DOW.indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
    // hour12:false 여도 자정을 "24" 로 주는 런타임이 있다 — 0~23 으로 접는다.
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "-1") % 24;
    if (dow < 0 || hour < 0) continue;
    matrix[dow][hour] += 1;
    if (matrix[dow][hour] > max) max = matrix[dow][hour];
  }
  return { matrix, max };
}

/** 신규 vs 재방문 — 기간 내 방문자(유니크 ip) 중 기간 시작 전에 이미 왔던 ip 가 재방문. */
export function aggregateNewVsReturning(
  allVisits: Array<{ ip: string | null; date: string | null }>,
  windowStart: string,
): { newCount: number; returningCount: number; returningPct: number } {
  const firstSeen = new Map<string, string>();
  for (const v of allVisits) {
    if (!v.ip || !v.date) continue;
    const cur = firstSeen.get(v.ip);
    if (!cur || v.date < cur) firstSeen.set(v.ip, v.date);
  }
  let newCount = 0;
  let returningCount = 0;
  // 기간 내에 온 유니크 방문자만 본다 — 같은 사람이 기간 내 여러 날 와도 한 명이다.
  const inWindow = new Set<string>();
  for (const v of allVisits) {
    if (v.ip && v.date && v.date >= windowStart) inWindow.add(v.ip);
  }
  for (const ip of inWindow) {
    if ((firstSeen.get(ip) ?? windowStart) < windowStart) returningCount += 1;
    else newCount += 1;
  }
  const total = newCount + returningCount;
  return {
    newCount,
    returningCount,
    returningPct: total > 0 ? Math.round((returningCount / total) * 100) : 0,
  };
}

/** 일별 방문(유니크 ip·일) — 최근 days 일을 빈 날짜 0 으로 채워 돌려준다(#1161 트래픽 추이). */
export function aggregateDailyVisits(
  allVisits: Array<{ ip: string | null; date: string | null }>,
  days: number,
  today: Date = new Date(),
): Array<{ day: string; count: number }> {
  const map = new Map<string, number>();
  for (const v of allVisits) {
    if (!v.ip || !v.date) continue;
    map.set(v.date, (map.get(v.date) ?? 0) + 1);
  }
  return fillDailyViews(
    [...map.entries()].map(([day, views]) => ({ day, views })),
    days,
    today,
  ).map((d) => ({ day: d.day, count: d.views }));
}

/** 직전 동기간 대비 증감률(%). 이전 값이 0 이면 비교가 성립 안 함 — null. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** 방문 급증 판정 — 오늘 방문이 직전 7일 평균의 3배 이상.
 *  절대 하한(15)을 두는 이유: 평균 1~2건짜리 저트래픽에선 3배가 6건이라 매번 울린다. */
export function isTrafficSpike(todayCount: number, prev7Total: number): boolean {
  return todayCount >= 15 && todayCount >= (prev7Total / 7) * 3;
}

/** UTM 캠페인 — utm_source 있는 방문만. source·medium·campaign 조합으로 묶는다. */
export function aggregateUtmCampaigns(
  rows: AnalyticsVisitRow[],
): Array<{ source: string; medium: string | null; campaign: string | null; count: number }> {
  const map = new Map<string, { source: string; medium: string | null; campaign: string | null; count: number }>();
  for (const v of rows) {
    if (!v.utm_source) continue;
    const key = `${v.utm_source}\u0000${v.utm_medium ?? ""}\u0000${v.utm_campaign ?? ""}`;
    const cur = map.get(key) ?? {
      source: v.utm_source,
      medium: v.utm_medium ?? null,
      campaign: v.utm_campaign ?? null,
      count: 0,
    };
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

/* ── 일별 조회수 ── */

const KST_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date → KST 기준 "YYYY-MM-DD". */
export function kstDateStr(d: Date): string {
  return KST_FMT.format(d);
}

/**
 * N일치를 빈 날짜 0 으로 채워 돌려준다. 화면이 잘라 쓰기만 하면 되도록 구멍을 없앤다.
 *
 * `today` 를 인자로 받는 이유는 이 함수를 테스트할 수 있게 하기 위해서다 —
 * 안에서 현재 시각을 읽으면 결과가 부를 때마다 달라진다.
 */
export function fillDailyViews(
  raw: Array<{ day: string; views: number }>,
  days: number,
  today: Date = new Date(),
): Array<{ day: string; views: number }> {
  const map = new Map<string, number>();
  for (const r of raw) map.set(r.day, Number(r.views) || 0);

  /* KST 자정 경계를 정확히 맞추려고 문자열로 다룬다.
     Date 산술로 하면 실행 환경의 시간대에 따라 하루가 밀린다. */
  const [y, m, d] = kstDateStr(today).split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));

  const out: Array<{ day: string; views: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(anchor);
    day.setUTCDate(day.getUTCDate() - i);
    const key = day.toISOString().slice(0, 10);
    out.push({ day: key, views: map.get(key) ?? 0 });
  }
  return out;
}
