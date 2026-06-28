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

  let body: { optionId?: string; multiple?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid body");
  }
  const optionId = body.optionId;
  if (!optionId) return jsonError("Missing optionId");
  const multiple = !!body.multiple;

  const ip = getIp(request);
  const admin = createAdminClient();
  try {
    const { data: existing } = await admin
      .from("poll_votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("option_id", optionId)
      .eq("ip", ip)
      .maybeSingle();

    if (multiple) {
      if (existing) await admin.from("poll_votes").delete().eq("id", existing.id);
      else await admin.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, ip });
    } else {
      await admin.from("poll_votes").delete().eq("poll_id", pollId).eq("ip", ip);
      if (!existing) await admin.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, ip });
    }
    return NextResponse.json(await tally(pollId, ip));
  } catch {
    return jsonError("Failed to vote", 500);
  }
}
