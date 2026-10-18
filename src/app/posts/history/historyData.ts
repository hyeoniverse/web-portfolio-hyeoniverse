import type { HistoryEntry } from "@/lib/posts";
import { SITE_TIME_ZONE } from "@/constants";

/** 글의 날짜 — 예약 발행이면 그 시각 */
export const dateOf = (p: HistoryEntry) => p.scheduled_at ?? p.created_at;

/** 한국 시간 기준 YYYY-MM-DD */
export const dayKeyOf = (p: HistoryEntry) =>
  new Date(dateOf(p)).toLocaleDateString("en-CA", { timeZone: SITE_TIME_ZONE });

/** TIL 글인가 — 태그에 TIL 태그(대소문자 무관)가 있으면 */
export const isTil = (p: HistoryEntry, tilTag: string) =>
  (p.tags ?? []).some((t) => t.trim().toLowerCase() === tilTag.trim().toLowerCase());

export interface MonthGroup {
  /** YYYY-MM */
  key: string;
  year: number;
  month: number;
  posts: HistoryEntry[];
}

/** 달별로 묶는다 — order 가 "desc" 면 최신 달 먼저(달 안의 글도 최신 먼저), "asc" 면 오래된 것 먼저 */
export function groupByMonth(posts: HistoryEntry[], order: "desc" | "asc"): MonthGroup[] {
  const map = new Map<string, HistoryEntry[]>();
  for (const p of posts) {
    const key = dayKeyOf(p).slice(0, 7);
    map.set(key, [...(map.get(key) ?? []), p]);
  }
  const sign = order === "desc" ? -1 : 1;
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -sign : sign))
    .map(([key, list]) => ({
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)) - 1,
      posts: [...list].sort((a, b) => (dateOf(a) < dateOf(b) ? -sign : sign)),
    }));
}
