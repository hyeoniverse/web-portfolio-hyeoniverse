/* 본문에 든 투표 블록 — plateSerializer 가 `<div data-poll data-poll-id=… data-poll-title=…>
   <div data-poll-option data-option-id=…>라벨</div>…</div>` 로 저장한다. 라이브러리 탭이 투표를 모아 보려고
   본문 HTML 에서 다시 읽는다(서버라 DOM 없이 정규식으로). 표는 poll_votes 에 poll_id 로 따로 쌓인다. */
import type { ContentRow } from "./api/contentRows";

export interface PollOption { id: string; label: string }
export interface PollBlock {
  pollId: string;
  title: string;
  multiple: boolean;
  startAt: string | null;
  endAt: string | null;
  options: PollOption[];
}
export interface PollWhere { kind: "post" | "work"; id: string; title: string; slug: string }

const POLL_RE = /<div data-poll data-poll-id="([^"]*)"([^>]*)>((?:<div data-poll-option[^>]*>[^<]*<\/div>)*)<\/div>/g;
const OPTION_RE = /<div data-poll-option data-option-id="([^"]*)"[^>]*>([^<]*)<\/div>/g;

/** esc() 의 반대 — 따옴표·꺾쇠·앰퍼샌드만 되돌린다 */
function unesc(s: string): string {
  return s.replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? unesc(m[1]) : null;
}

/** 본문 HTML 의 투표 블록들 (poll id 가 빈 것은 뺀다) */
export function extractPolls(html: string | null | undefined): PollBlock[] {
  if (!html) return [];
  const out: PollBlock[] = [];
  for (const m of html.matchAll(POLL_RE)) {
    const pollId = unesc(m[1]);
    if (!pollId) continue;
    const attrs = m[2];
    out.push({
      pollId,
      title: attr(attrs, "data-poll-title") ?? "",
      multiple: attr(attrs, "data-multiple") === "true",
      startAt: attr(attrs, "data-start"),
      endAt: attr(attrs, "data-end"),
      options: [...m[3].matchAll(OPTION_RE)].map((o) => ({ id: unesc(o[1]), label: unesc(o[2]) })),
    });
  }
  return out;
}

/** 글·프로젝트 행들 → 투표 id 별 (처음 본 블록 정의, 쓰는 곳들). 한·영 본문에 같은 투표가 있어도 한 곳으로 센다 */
export function collectPolls(posts: ContentRow[], works: ContentRow[]): Map<string, { poll: PollBlock; where: PollWhere[] }> {
  const out = new Map<string, { poll: PollBlock; where: PollWhere[] }>();
  const add = (kind: PollWhere["kind"], row: ContentRow) => {
    const seen = new Set<string>();
    for (const html of row.html) {
      for (const poll of extractPolls(html)) {
        const entry = out.get(poll.pollId) ?? { poll, where: [] };
        if (!seen.has(poll.pollId)) {
          entry.where.push({ kind, id: row.id, title: row.title, slug: row.slug });
          seen.add(poll.pollId);
        }
        out.set(poll.pollId, entry);
      }
    }
  };
  posts.forEach((r) => add("post", r));
  works.forEach((r) => add("work", r));
  return out;
}
