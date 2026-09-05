import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deviceKey } from "@/lib/auth/uaParser";

/** DELETE /api/admin/auth/devices/[id]
 *  특정 기기 등록 해제. UI 에서 같은 browser+OS+device 로 묶인 모든 row 를 같이 삭제
 *  (legacy raw-UA hash 중복 row 도 깔끔히 정리). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const admin = createAdminClient();
  // 대상 row 의 user_agent 로 deviceKey 계산 → 같은 group 의 모든 row 제거
  const { data: target } = await admin
    .from("admin_known_devices")
    .select("user_agent")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ user_agent: string | null }>();

  if (!target) return NextResponse.json({ success: true });

  const targetKey = deviceKey(target.user_agent ?? "");
  const { data: all } = await admin
    .from("admin_known_devices")
    .select("id, user_agent")
    .eq("user_id", user.id);

  const idsToDelete = (all ?? [])
    .filter((r) => deviceKey(r.user_agent ?? "") === targetKey)
    .map((r) => r.id);

  if (idsToDelete.length === 0) return NextResponse.json({ success: true });

  const { error } = await admin
    .from("admin_known_devices")
    .delete()
    .in("id", idsToDelete)
    .eq("user_id", user.id);

  if (error) return jsonServerError(error, "DELETE /api/admin/auth/devices/[id]");
  return NextResponse.json({ success: true, deletedCount: idsToDelete.length });
}
