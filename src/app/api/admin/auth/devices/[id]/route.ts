import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** DELETE /api/admin/auth/devices/[id]
 *  특정 기기 등록 해제. 다시 그 기기에서 로그인하면 새 기기 인증 흐름 재발생.
 *  현재 기기 자체를 삭제해도 supabase 세션은 살아있음 — 그건 별도 logout 으로. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  // user_id 매칭 확인 — 남의 기기 못 지우게
  const { error } = await admin
    .from("admin_known_devices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
