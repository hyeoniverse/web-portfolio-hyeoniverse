import type { VisitJourneys } from "@/types";

/**
 * 방문 흐름 분석(#1399) — 방문(세션)마다 본 페이지를 시간순으로 이어, 들어와서 무엇을 했는지 센다.
 *
 *   들어온 페이지 → 다음 페이지   방문의 첫 페이지에서 바로 이어 본 페이지(상위 10)
 *   나간 페이지                    방문의 마지막 페이지(상위 10) — 한 페이지만 보고 나간 방문은 이탈률로 따로
 *   최근 방문 경로                 최근 방문 10개의 이동 경로와 페이지마다 머문 시간
 *
 * 옛 기록에서 옮긴 줄은 경로를 모르거나 한 페이지뿐이라 흐름에 거의 잡히지 않는다(새 기록부터 쌓인다).
 */
export type JourneyRow = {
  ip?: string | null;
  session_id: string | null;
  path: string | null;
  viewed_at: string;
  duration_ms: number | null;
  is_landing: boolean;
  referrer: string | null;
  device_kind: string | null;
  search_term?: string | null;
};

export type Journey = VisitJourneys["recent"][number];

/** 조회 줄을 방문(세션)마다 묶어 시간순으로 — 세션 · 경로가 없는 줄은 뺀다 */
export function groupSessions(rows: JourneyRow[]): JourneyRow[][] {
  const sessions = new Map<string, JourneyRow[]>();
  for (const r of rows) {
    if (!r.session_id || !r.path) continue;
    const list = sessions.get(r.session_id) ?? [];
    list.push(r);
    sessions.set(r.session_id, list);
  }
  const out = [...sessions.values()];
  for (const list of out) list.sort((a, b) => (a.viewed_at < b.viewed_at ? -1 : a.viewed_at > b.viewed_at ? 1 : 0));
  return out;
}

/** 방문 하나의 경로 요약 — 첫 조회 줄의 유입 · 검색어 · 기기와 페이지마다 머문 시간 */
export function toJourney(list: JourneyRow[]): Journey {
  const landing = list.find((r) => r.is_landing) ?? list[0];
  return {
    startedAt: list[0].viewed_at,
    referrer: landing.referrer,
    searchTerm: landing.search_term ?? null,
    device: landing.device_kind,
    steps: list.map((r) => ({ path: r.path!, ms: r.duration_ms })),
  };
}

const TOP = 10;
const RECENT = 10;

export function analyzeJourneys(rows: JourneyRow[]): VisitJourneys {
  const next = new Map<string, number>();
  const exits = new Map<string, number>();
  let single = 0;
  const ordered = groupSessions(rows);
  for (const list of ordered) {
    const last = list[list.length - 1].path!;
    exits.set(last, (exits.get(last) ?? 0) + 1);
    if (list.length === 1) {
      single += 1;
    } else {
      const key = `${list[0].path}\n${list[1].path}`;
      next.set(key, (next.get(key) ?? 0) + 1);
    }
  }

  const total = ordered.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, TOP);

  const recent = ordered
    .sort((a, b) => (a[0].viewed_at < b[0].viewed_at ? 1 : a[0].viewed_at > b[0].viewed_at ? -1 : 0))
    .slice(0, RECENT)
    .map(toJourney);

  return {
    sessions: total,
    bounceRate: pct(single),
    nextPages: top(next).map(([key, count]) => {
      const [from, to] = key.split("\n");
      return { from, to, count };
    }),
    exitPages: top(exits).map(([path, count]) => ({ path, count, pct: pct(count) })),
    recent,
  };
}
