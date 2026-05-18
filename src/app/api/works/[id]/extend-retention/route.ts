import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/works/[id]/extend-retention — 휴지통 보관 기간 +30일 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("works")
    .select("purge_after, deleted_at")
    .eq("id", id)
    .maybeSingle<{ purge_after: string | null; deleted_at: string | null }>();

  if (!row || !row.deleted_at) {
    return NextResponse.json({ error: "Not in trash" }, { status: 400 });
  }

  const base = row.purge_after && new Date(row.purge_after) > new Date()
    ? new Date(row.purge_after)
    : new Date();
  const next = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("works")
    .update({ purge_after: next })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, purge_after: next });
}
