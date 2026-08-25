import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "./requireAuth";
import { requirePostAccess } from "./requirePostAccess";

type TableName = "posts" | "works" | "calendars";

/**
 * 대상 행을 복구/영구삭제할 수 있는지 확인하고 세션 클라이언트를 넘긴다.
 *
 * 전에는 두 함수 모두 requireAuth 만 하고 service_role 로 지웠다. 로그인한 멤버라면 누구나
 * 남의 글을 영구 삭제할 수 있었다는 뜻이다 — 같은 글의 수정·삭제(PATCH/DELETE)는 canEditPost
 * 로 막고 있으면서 휴지통 경로만 열려 있었다. 되돌릴 수 없는 쪽이 더 느슨했다.
 *
 * calendars 에는 소유권 개념(author_ids)이 없어 로그인 확인까지만 하고, 나머지는
 * calendars_member_all 정책이 맡는다.
 */
async function authorizeTrashAction(
  table: TableName,
  id: string,
): Promise<{ supabase: SupabaseClient; error?: never } | { supabase?: never; error: NextResponse }> {
  if (table === "calendars") {
    const auth = await requireAuth();
    return auth.error ? { error: auth.error } : { supabase: auth.supabase };
  }
  const access = await requirePostAccess(table, id);
  return access.error ? { error: access.error } : { supabase: access.supabase };
}

/** 휴지통에서 복구 */
export async function restoreFromTrash(table: TableName, id: string) {
  const auth = await authorizeTrashAction(table, id);
  if (auth.error) return auth.error;

  const { error } = await auth.supabase
    .from(table)
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** 영구 삭제 */
export async function purgeForever(table: TableName, id: string) {
  const auth = await authorizeTrashAction(table, id);
  if (auth.error) return auth.error;

  const { error } = await auth.supabase.from(table).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
