import { NextResponse } from "next/server";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/works/[id]/extend-retention — 휴지통 보관 기간 +30일 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  /* 보관 기간 연장도 작업물에 대한 쓰기다. */
  const { supabase, error: authError } = await requirePostAccess("works", id);
  if (authError) return authError;

  const { data: row } = await supabase
    .from("works")
    .select("purge_after, deleted_at")
    .eq("id", id)
    .maybeSingle<{ purge_after: string | null; deleted_at: string | null }>();

  /* 존재와 권한은 requirePostAccess 가 확인했다 — 여기서 0행이면 정책이 막은 것이지 없는 게 아니다.
     "휴지통에 없다" 는 진짜 상태 오류라 따로 구분한다. */
  if (!row) return policyBlocked();
  if (!row.deleted_at) {
    return NextResponse.json({ error: "Not in trash" }, { status: 400 });
  }

  const base = row.purge_after && new Date(row.purge_after) > new Date()
    ? new Date(row.purge_after)
    : new Date();
  const next = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("works")
    .update({ purge_after: next })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, purge_after: next });
}
