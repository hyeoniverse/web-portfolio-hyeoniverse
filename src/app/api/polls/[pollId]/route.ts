import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIp } from "@/utils/getIp";
import { jsonError } from "@/lib/api/response";
import { fetchContentRows } from "@/lib/api/contentRows";
import { hitRateLimit, ipRateKey } from "@/lib/api/rateLimit";
import { collectPolls, type PollBlock } from "@/lib/pollUsage";

/* 투표 id — 편집기가 randomUUID(없으면 "p-…")로 만든다. ilike · or 필터에 그대로 넣으므로 모양을 좁힌다 */
const POLL_ID_RE = /^[\w-]{1,64}$/;

interface RouteContext {
  params: Promise<{ pollId: string }>;
}

// 옵션별 집계 + 내 투표(IP 기준) 반환
async function tally(pollId: string, ip: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("poll_votes")
    .select("option_id, ip")
    .eq("poll_id", pollId);
  if (error) throw error;
  const counts: Record<string, number> = {};
  const mine: string[] = [];
  for (const row of data ?? []) {
    counts[row.option_id] = (counts[row.option_id] ?? 0) + 1;
    if (row.ip === ip) mine.push(row.option_id);
  }
  return { counts, total: (data ?? []).length, mine };
}

/**
 * 공개된 글 · 프로젝트 본문에 든 투표 정의. 없으면 null — 비공개 · 휴지통 글의 투표나 지어낸 id.
 * 예전엔 정의를 보지 않아, 아무 poll_id · option_id 로 표를 쌓거나 단일 선택 투표에 여러 표를 넣을 수 있었다.
 */
async function findPublishedPoll(pollId: string): Promise<PollBlock | null> {
  const { posts, works } = await fetchContentRows(createAdminClient(), pollId, { publishedOnly: true });
  return collectPolls(posts, works).get(pollId)?.poll ?? null;
}

// GET /api/polls/[pollId] — 옵션별 집계 + 내 투표
export async function GET(request: Request, context: RouteContext) {
  const { pollId } = await context.params;
  if (!POLL_ID_RE.test(pollId ?? "")) return jsonError("Invalid poll id");
  try {
    return NextResponse.json(await tally(pollId, getIp(request)));
  } catch {
    return jsonError("Failed to load poll", 500);
  }
}

// POST /api/polls/[pollId] — 선택 세트로 교체. body: { optionIds } (legacy { optionId })
//  - 복수 선택: 받은 옵션 모두 · 단일 선택: 첫 옵션만 — 어느 쪽인지는 본문의 투표 정의가 정한다
//  - 빈 배열 = 투표 취소
export async function POST(request: Request, context: RouteContext) {
  const { pollId } = await context.params;
  if (!POLL_ID_RE.test(pollId ?? "")) return jsonError("Invalid poll id");
  if (!(await hitRateLimit("poll-vote", ipRateKey(request), { windowSec: 600, max: 30 }))) {
    return jsonError("Too many requests", 429, { code: "RATE_LIMITED" });
  }

  let body: { optionIds?: unknown; optionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid body");
  }
  // 선택 세트 제출 — { optionIds } 우선, legacy { optionId } 허용
  const raw = Array.isArray(body.optionIds)
    ? body.optionIds
    : typeof body.optionId === "string"
      ? [body.optionId]
      : [];
  const ids = [...new Set(raw.filter((x): x is string => typeof x === "string" && !!x))];

  const ip = getIp(request);
  const admin = createAdminClient();
  try {
    // 단일 · 복수 선택, 옵션, 기간은 본문의 정의를 따른다 — 요청의 multiple 은 보지 않는다
    const poll = await findPublishedPoll(pollId);
    if (!poll) return jsonError("Poll not found", 404);
    const now = Date.now();
    if ((poll.startAt && now < new Date(poll.startAt).getTime()) || (poll.endAt && now > new Date(poll.endAt).getTime())) {
      return jsonError("Poll is closed", 403);
    }
    const optionIds = new Set(poll.options.map((o) => o.id));
    if (ids.some((id) => !optionIds.has(id))) return jsonError("Invalid option");
    const finalIds = poll.multiple ? ids : ids.slice(0, 1);

    // 기존 선택을 통째로 지우고 새 선택으로 교체 (빈 배열 = 투표 취소)
    await admin.from("poll_votes").delete().eq("poll_id", pollId).eq("ip", ip);
    if (finalIds.length) {
      await admin
        .from("poll_votes")
        .insert(finalIds.map((option_id) => ({ poll_id: pollId, option_id, ip })));
    }
    return NextResponse.json(await tally(pollId, ip));
  } catch {
    return jsonError("Failed to vote", 500);
  }
}
