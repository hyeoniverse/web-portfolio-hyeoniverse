import { requireOwner } from "@/lib/api/requireRole";
import { jsonOk, jsonServerError } from "@/lib/api/response";
import { fetchContentRows } from "@/lib/api/contentRows";
import { collectPolls } from "@/lib/pollUsage";

// GET /api/admin/polls — 글·프로젝트에 든 투표 블록과 옵션별 표 수 (라이브러리 탭)
export async function GET() {
  const { supabase, error: authError } = await requireOwner();
  if (authError) return authError;
  try {
    const rows = await fetchContentRows(supabase, "data-poll-id=");
    const polls = collectPolls(rows.posts, rows.works);
    const ids = [...polls.keys()];
    const counts = new Map<string, Map<string, number>>();
    const voters = new Map<string, Set<string>>();
    if (ids.length) {
      const { data, error } = await supabase.from("poll_votes").select("poll_id, option_id, ip").in("poll_id", ids);
      if (error) throw error;
      for (const v of data ?? []) {
        const c = counts.get(v.poll_id) ?? new Map<string, number>();
        c.set(v.option_id, (c.get(v.option_id) ?? 0) + 1);
        counts.set(v.poll_id, c);
        const s = voters.get(v.poll_id) ?? new Set<string>();
        s.add(v.ip);
        voters.set(v.poll_id, s);
      }
    }
    const items = [...polls.values()].map(({ poll, where }) => {
      const c = counts.get(poll.pollId);
      return {
        ...poll,
        options: poll.options.map((o) => ({ ...o, count: c?.get(o.id) ?? 0 })),
        votes: [...(c?.values() ?? [])].reduce((a, b) => a + b, 0),
        voters: voters.get(poll.pollId)?.size ?? 0,
        where,
      };
    });
    return jsonOk({ items });
  } catch (e) {
    return jsonServerError(e, "GET /api/admin/polls");
  }
}
