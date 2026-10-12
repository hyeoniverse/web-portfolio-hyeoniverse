/**
 * 페이지 조회 기록(#1399)의 규칙 — 브라우저(VisitTracker)와 서버(/api/page-views)가 같이 쓴다.
 *
 * 사이트의 조회 기록은 이것 하나다 — 방문(세션) · 방문자 · 유입 · 기기 · 글 · 작업물 조회수까지 page_views 에서 센다.
 * 페이지가 보일 때마다 경로를 보내고, 떠날 때(다른 페이지 · 탭 닫기 · 탭 숨김) 보인 채 있었던 시간을 그 조회에 더한다.
 * 같은 사람이 같은 페이지를 30분 안에 다시 보면 서버가 한 번으로 센다(record_page_view).
 * 방문의 첫 조회에는 유입 경로 · UTM 을 같이 보낸다(서버가 기기 · 국가를 붙인다).
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
 * 기록할 경로로 다듬는다 — / 로 시작하는 경로만, 쿼리 · 해시를 떼고 끝의 / 를 지우고(루트는 그대로) 인코딩을 푼다, 200자까지.
 * 관리 화면 · API · 형태가 이상한 값은 null(기록하지 않음). 값은 브라우저가 보내므로 서버도 다시 거른다.
 */
export function normalizePagePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  const trimmed = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  /* 한글 slug 는 %EC… 로 올 수 있다 — 글 · 작업물 조회수를 slug 로 맞추고 목록에서 읽히게 풀어 둔다 */
  let path = trimmed;
  try { path = decodeURIComponent(trimmed); } catch { /* 깨진 인코딩은 그대로 */ }
  if (SKIP.test(path)) return null;
  return path.slice(0, 200);
}

/** 세션 id · 방문자 id — 브라우저가 만든 임의 값(crypto.randomUUID) */
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

/** 랜딩 쿼리의 UTM — 값은 100자까지, 없으면 null */
export function parseUtm(search: unknown): { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } {
  const params = new URLSearchParams(typeof search === "string" ? search.slice(0, 500) : "");
  const pick = (k: string) => (params.get(k) ?? "").trim().slice(0, 100) || null;
  return { utm_source: pick("utm_source"), utm_medium: pick("utm_medium"), utm_campaign: pick("utm_campaign") };
}

/** 유입 경로 — document.referrer 의 호스트만(www. 뗌). 없거나 자기 사이트면 "Direct" */
export function referrerHost(ref: unknown, ownHost?: string): string {
  if (typeof ref !== "string" || !ref) return "Direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (!host || (ownHost && host === ownHost.replace(/^www\./, ""))) return "Direct";
    return host;
  } catch {
    return "Direct";
  }
}
