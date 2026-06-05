import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
import { jsonOk, jsonError } from "@/lib/api/response";

// GET /api/admin/notifications — 알림 목록 (최근 50개)
// 테이블이 없거나 query 실패 시에도 200 + 빈 리스트로 graceful degradation —
// nav 폴링이 매번 401/500 으로 콘솔을 도배하지 않게 함.
// 인증 없을 때도 200 + 빈 리스트 (info leak 없음, polling 콘솔 노이즈 제거).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return jsonOk({ notifications: [], unreadCount: 0 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[admin/notifications] query failed:", error.message);
      return jsonOk({ notifications: [], unreadCount: 0 });
    }

    const { count } = await admin
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);

    return jsonOk({ notifications: data ?? [], unreadCount: count ?? 0 });
  } catch (e) {
    console.warn("[admin/notifications] unexpected error:", e);
    return jsonOk({ notifications: [], unreadCount: 0 });
  }
}

/** ids 가 string[] 인지 element 단위까지 검사 */
function asStringIdArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((id) => typeof id === "string")) return null;
  return v;
}

// PATCH /api/admin/notifications — 읽음 처리
export async function PATCH(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { ids, markAllRead } = body;
  const admin = createAdminClient();

  if (markAllRead) {
    await admin.from("admin_notifications").update({ read: true }).eq("read", false);
  } else {
    const idArr = asStringIdArray(ids);
    if (idArr) {
      await admin.from("admin_notifications").update({ read: true }).in("id", idArr);
    }
  }

  return jsonOk({ success: true });
}

// DELETE /api/admin/notifications — 알림 삭제
export async function DELETE(request: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const { ids, deleteAll } = body;
  const admin = createAdminClient();

  if (deleteAll) {
    // .neq("id", "") 는 일부 PostgREST 환경에서 not-equal 매치 안 잡힘 — created_at >= epoch 로 전체 row 매칭
    const { error: delErr } = await admin
      .from("admin_notifications")
      .delete()
      .gte("created_at", "1970-01-01T00:00:00Z");
    if (delErr) return jsonError(delErr.message, 500);
  } else {
    const idArr = asStringIdArray(ids);
    if (idArr) {
      await admin.from("admin_notifications").delete().in("id", idArr);
    }
  }

  return jsonOk({ success: true });
}
