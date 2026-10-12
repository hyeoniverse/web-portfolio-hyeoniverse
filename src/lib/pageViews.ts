/**
 * 페이지 조회 기록(#1399)의 규칙 — 브라우저(VisitTracker)와 서버(/api/page-views)가 같이 쓴다.
 *
 * 페이지가 보일 때마다 경로를 보내고, 떠날 때(다른 페이지 · 탭 닫기 · 탭 숨김) 보인 채 있었던 시간을 그 조회에 더한다.
 * 같은 사람이 같은 페이지를 30분 안에 다시 보면 서버가 한 번으로 센다(record_page_view).
 */

/** 방문(세션)의 끝 — 이만큼 아무 페이지도 안 보면 다음 조회는 새 방문. 일반 분석 도구의 기준과 같다 */
export const PAGE_VIEW_SESSION_MS = 30 * 60 * 1000;

/** 한 번에 보내는 머문 시간의 상한 — 서버는 한 조회에 2시간까지 더한다 */
export const PAGE_VIEW_MAX_DURATION_MS = 2 * 60 * 60 * 1000;

/** 이보다 짧게 보인 시간은 보내지 않는다(바로 넘긴 페이지 · 숨김과 동시에 떠남) */
export const PAGE_VIEW_MIN_DURATION_MS = 500;

/** 기록하지 않는 경로 — 관리 화면 · API */
const SKIP = /^\/(admin|api)(\/|$)/;

/**
 * 기록할 경로로 다듬는다 — / 로 시작하는 경로만, 쿼리 · 해시를 떼고 끝의 / 를 지운다(루트는 그대로), 200자까지.
 * 관리 화면 · API · 형태가 이상한 값은 null(기록하지 않음). 값은 브라우저가 보내므로 서버도 다시 거른다.
 */
export function normalizePagePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (SKIP.test(path)) return null;
  return path.slice(0, 200);
}

/** 세션 id — 브라우저가 만든 임의 값(crypto.randomUUID) */
export function isSessionId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v);
}

/** 조회 id — 서버가 돌려준 page_views.id */
export function isPageViewId(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** 보낼 머문 시간 — 정수 ms, 상한을 넘으면 상한 */
export function clampDuration(ms: unknown): number | null {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < PAGE_VIEW_MIN_DURATION_MS) return null;
  return Math.min(Math.round(ms), PAGE_VIEW_MAX_DURATION_MS);
}
