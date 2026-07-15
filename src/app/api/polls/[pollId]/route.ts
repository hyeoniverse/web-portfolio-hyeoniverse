import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIp } from "@/utils/getIp";
import { jsonError } from "@/lib/api/response";

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

// GET /api/polls/[pollId] — 옵션별 집계 + 내 투표
export async function GET(request: Request, context: RouteContext) {
  const { pollId } = await context.params;
  if (!pollId) return jsonError("Invalid poll id");
  try {
    return NextResponse.json(await tally(pollId, getIp(request)));
  } catch {
    return jsonError("Failed to load poll", 500);
  }
}

// POST /api/polls/[pollId] — 투표 토글. body: { optionId, multiple }
//  - multiple: 옵션별 토글(insert/delete)
//  - single : 기존 표 제거 후 다른 옵션이면 추가(같은 옵션 재클릭 = 취소)
export async function POST(request: Request, context: RouteContext) {
  const { pollId } = await context.params;
  if (!pollId) return jsonError("Invalid poll id");

  let body: { optionIds?: unknown; optionId?: unknown; multiple?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid body");
  }
  const multiple = !!body.multiple;
  // 선택 세트 제출 — { optionIds } 우선, legacy { optionId } 허용
  const raw = Array.isArray(body.optionIds)
    ? body.optionIds
    : typeof body.optionId === "string"
      ? [body.optionId]
      : [];
  const ids = [...new Set(raw.filter((x): x is string => typeof x === "string" && !!x))];
  const finalIds = multiple ? ids : ids.slice(0, 1);

  const ip = getIp(request);
  const admin = createAdminClient();
  try {
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
