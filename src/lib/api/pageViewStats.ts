import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageViewStats } from "@/types";

/**
 * 페이지 조회 집계 읽기(#1399) — 대시보드 · 트래픽 페이지가 같이 쓴다. '내 IP' 는 인자로 넘겨 DB 에서 뺀다.
 * page_views 마이그레이션 전(함수 없음)이면 전부 null — 부르는 쪽이 예전 값으로 물러선다.
 */

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** 전체 합계와 처음 센 날(KST) */
export async function loadPageViewTotals(
  admin: SupabaseClient,
  excluded: Set<string>,
): Promise<{ total: number; since: string | null } | null> {
  const { data, error } = await admin.rpc("page_view_totals", { p_excluded: [...excluded] }).maybeSingle();
  if (error) return null;
  const row = data as { total?: unknown; since?: unknown } | null;
  return { total: num(row?.total) ?? 0, since: typeof row?.since === "string" ? row.since : null };
}

/** 일별 조회수(KST) — 빈 날은 없다(fillDailyViews 가 채운다) */
export async function loadDailyPageViews(
  admin: SupabaseClient,
  start: string,
  end: string,
  excluded: Set<string>,
): Promise<Array<{ day: string; views: number }> | null> {
  const { data, error } = await admin.rpc("daily_page_views", { p_start: start, p_end: end, p_excluded: [...excluded] });
  if (error) return null;
  return ((data ?? []) as Array<{ day: string; views: unknown }>).map((r) => ({ day: r.day, views: num(r.views) ?? 0 }));
}

/** 기간 집계 — page_view_stats 의 jsonb 를 화면 모양으로 */
export async function loadPageViewStats(
  admin: SupabaseClient,
  start: string,
  end: string,
  excluded: Set<string>,
): Promise<PageViewStats | null> {
  const { data, error } = await admin.rpc("page_view_stats", { p_start: start, p_end: end, p_excluded: [...excluded] });
  if (error || !data || typeof data !== "object") return null;
  return parsePageViewStats(data as Record<string, unknown>);
}

export function parsePageViewStats(d: Record<string, unknown>): PageViewStats {
  const paths = Array.isArray(d.top_paths) ? (d.top_paths as Array<Record<string, unknown>>) : [];
  return {
    total: num(d.total) ?? 0,
    avgDurationMs: num(d.avg_duration_ms),
    sessions: num(d.sessions) ?? 0,
    pagesPerSession: num(d.pages_per_session),
    avgSessionMs: num(d.avg_session_ms),
    topPaths: paths.flatMap((p) =>
      typeof p.path === "string" ? [{ path: p.path, views: num(p.views) ?? 0, avgMs: num(p.avg_ms) }] : [],
    ),
  };
}
