import type { SupabaseClient } from "@supabase/supabase-js";
import { HUMAN_VISITS_FILTER, type AnalyticsVisitRow } from "./dashboardAggregates";
import type { JourneyRow } from "./visitJourneys";

/**
 * page_views 에서 방문 · 콘텐츠 조회 읽기(#1399) — 대시보드 · 트래픽 페이지가 같이 쓴다.
 *
 * 방문 = 세션의 첫 조회 줄(is_landing). 유입 · 기기 · 국가 · UTM 은 그 줄에만 있다. 봇 줄은 뺀다(봇 수는 따로 센다).
 * '내 IP' 는 이미 쌓인 줄도 뺀다. 한 번에 1000줄까지만 오는 응답 한도가 있어 나눠 받는다.
 */

const PAGE = 1000;

/** 집계 함수(dashboardAggregates)가 받는 모양 + IP · 날짜 · 방문자 */
export type LandingRow = AnalyticsVisitRow & { ip: string | null; date: string; visitor: string | null; search_term: string | null };

type Raw = {
  ip: string | null;
  visitor_id: string | null;
  viewed_date: string;
  viewed_at: string;
  migrated_from: string | null;
  path: string | null;
  referrer: string | null;
  device_kind: string | null;
  os: string | null;
  browser: string | null;
  device_model: string | null;
  country: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  search_term?: string | null;
};

const LANDING_COLUMNS =
  "ip, visitor_id, viewed_date, viewed_at, migrated_from, path, referrer, device_kind, os, browser, device_model, country, utm_source, utm_medium, utm_campaign";

/* 유입 검색어 칸(2026_10_23) — 마이그레이션 전이면 이 칸을 빼고 다시 읽는다 */
const SEARCH_TERM = ", search_term";

async function withSearchTerm<T>(read: (extra: string) => Promise<T[] | null>): Promise<T[] | null> {
  return (await read(SEARCH_TERM)) ?? read("");
}

async function pages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[] | null> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) return out.length ? out : null;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** 사람의 방문(첫 조회) — since(KST 날짜) 이후. since 를 비우면 전부 */
export async function loadLandingRows(
  admin: SupabaseClient,
  excluded: Set<string>,
  since?: string,
): Promise<LandingRow[]> {
  const rows = await withSearchTerm((extra) =>
    pages<Raw>((from, to) => {
      let q = admin.from("page_views").select(LANDING_COLUMNS + extra).eq("is_landing", true).or(HUMAN_VISITS_FILTER);
      if (since) q = q.gte("viewed_date", since);
      return q.order("viewed_at", { ascending: true }).range(from, to);
    }),
  );
  return (rows ?? [])
    .filter((r) => !r.ip || !excluded.has(r.ip))
    .map((r) => ({
      ip: r.ip,
      date: r.viewed_date,
      visitor: r.visitor_id,
      path: r.path,
      referrer: r.referrer,
      device_kind: r.device_kind,
      os: r.os,
      browser: r.browser,
      device_model: r.device_model,
      country: r.country,
      utm_source: r.utm_source,
      utm_medium: r.utm_medium,
      utm_campaign: r.utm_campaign,
      search_term: r.search_term ?? null,
      // 옛 방문 기록(site_visits)에서 옮긴 줄은 날짜만 있고 시각이 없다 — 시간대 히트맵에서 뺀다
      created_at: r.migrated_from === "site_visits" ? null : r.viewed_at,
    }));
}

/** 신규 · 재방문 판정용 — 방문자 id(옛 줄은 IP 에서 만든 값)를 ip 자리에 */
export function visitorHistory(rows: LandingRow[]): Array<{ ip: string | null; date: string | null }> {
  return rows.map((r) => ({ ip: r.visitor ?? r.ip, date: r.date }));
}

/** 봇 방문 수 — 집계에선 빠지지만 얼마나 걸러졌는지 보인다 */
export async function countBotVisits(admin: SupabaseClient, since: string): Promise<number> {
  const { count } = await admin
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .eq("is_landing", true)
    .eq("device_kind", "bot")
    .gte("viewed_date", since);
  return count ?? 0;
}

/**
 * 글 조회 수 — /posts/{slug} 경로의 조회를 slug 별로 센다(봇 · '내 IP' 제외).
 * from · to 는 KST 날짜(to 를 비우면 오늘까지).
 */
export async function countPostViews(
  admin: SupabaseClient,
  excluded: Set<string>,
  from: string,
  to?: string,
): Promise<Map<string, number>> {
  const rows = await pages<{ path: string; ip: string | null }>((a, b) => {
    let q = admin.from("page_views").select("path, ip").like("path", "/posts/%").or(HUMAN_VISITS_FILTER).gte("viewed_date", from);
    if (to) q = q.lte("viewed_date", to);
    return q.range(a, b);
  });
  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    if (r.ip && excluded.has(r.ip)) continue;
    const slug = r.path.split("/")[2];
    if (!slug || r.path.split("/").length !== 3) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
}

/** 방문 흐름 분석용 — since 이후 사람의 조회 줄(IP · 세션 · 경로 · 시각 · 머문 시간, 첫 조회의 유입 · 검색어 · 기기) */
export async function loadJourneyRows(admin: SupabaseClient, excluded: Set<string>, since: string): Promise<JourneyRow[]> {
  const rows = await withSearchTerm((extra) =>
    pages<JourneyRow>((from, to) =>
      admin
        .from("page_views")
        .select("ip, session_id, path, viewed_at, duration_ms, is_landing, referrer, device_kind" + extra)
        .or(HUMAN_VISITS_FILTER)
        .gte("viewed_date", since)
        .order("viewed_at", { ascending: true })
        .range(from, to),
    ),
  );
  return (rows ?? []).filter((r) => !r.ip || !excluded.has(r.ip));
}

/** 방문자 열쇠 — 방문자 id, 없으면 IP(옛 기록). 둘 다 없으면 셀 수 없다 */
export const visitorKey = (r: LandingRow): string | null => r.visitor ?? r.ip;
