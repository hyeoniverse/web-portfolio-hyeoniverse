/* 공유 달력을 어느 글·프로젝트가 쓰는지 — 달력 블록은 본문 HTML 에 `data-calendar-id="…"` 로만 남는다
   (plateSerializer). 서버가 그 표시가 든 본문만 골라 오면 여기서 id 를 꺼내 달력별로 묶는다. */

export interface CalendarUsageRef {
  id: string;
  title: string;
  slug: string;
}

export interface CalendarUsage {
  posts: CalendarUsageRef[];
  works: CalendarUsageRef[];
}

const ID_RE = /data-calendar-id="([^"]+)"/g;

/** 본문 HTML 에 든 달력 id 들 (중복 없이) */
export function extractCalendarIds(html: string | null | undefined): string[] {
  if (!html) return [];
  return [...new Set([...html.matchAll(ID_RE)].map((m) => m[1]))];
}

/** 글·프로젝트 행들 → 달력 id 별 사용처. 한 글의 여러 칸(한·영 본문 등)에 같은 달력이 있어도 한 번만 센다 */
export function buildCalendarUsage(
  posts: { id: string; title: string; slug: string; html: (string | null | undefined)[] }[],
  works: { id: string; title: string; slug: string; html: (string | null | undefined)[] }[],
): Map<string, CalendarUsage> {
  const out = new Map<string, CalendarUsage>();
  const add = (kind: keyof CalendarUsage, row: { id: string; title: string; slug: string; html: (string | null | undefined)[] }) => {
    const ids = new Set(row.html.flatMap(extractCalendarIds));
    for (const cid of ids) {
      const u = out.get(cid) ?? { posts: [], works: [] };
      u[kind].push({ id: row.id, title: row.title, slug: row.slug });
      out.set(cid, u);
    }
  };
  posts.forEach((r) => add("posts", r));
  works.forEach((r) => add("works", r));
  return out;
}
