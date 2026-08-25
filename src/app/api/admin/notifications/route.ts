import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonOk, jsonError } from "@/lib/api/response";

// 댓글 계열 알림 타입 (탭 "댓글" 묶음)
const COMMENT_TYPES = ["comment", "reply", "like"];

// GET /api/admin/notifications — 알림 목록
//   ?offset=0&limit=50  페이지네이션 (기본 최근 50). "더보기" 로 offset 을 늘려 append.
//   ?meta=1             전체·타입별 실제 총계(totalCount·typeCounts) + hasMore 포함.
//                       알림 페이지 전용 — nav 폴링(무param)은 계산을 생략해 가볍게 유지.
// 테이블이 없거나 query 실패 시에도 200 + 빈 리스트로 graceful degradation —
// nav 폴링이 매번 401/500 으로 콘솔을 도배하지 않게 함.
// 인증 없을 때도 200 + 빈 리스트 (info leak 없음, polling 콘솔 노이즈 제거).
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return jsonOk({ notifications: [], unreadCount: 0 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const withMeta = searchParams.get("meta") === "1";

  try {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.warn("[admin/notifications] query failed:", error.message);
      return jsonOk({ notifications: [], unreadCount: 0 });
    }

    const { count: unread } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);
    const unreadCount = unread ?? 0;

    if (!withMeta) {
      return jsonOk({ notifications: data ?? [], unreadCount });
    }

    // 알림 페이지용 — 탭 카운트가 로드된 50개가 아니라 실제 총계를 반영하도록 전체·타입별 count 를 함께 반환.
    const [totalRes, reportRes, commentRes, pendingReportRes] = await Promise.all([
      supabase.from("admin_notifications").select("*", { count: "exact", head: true }),
      supabase.from("admin_notifications").select("*", { count: "exact", head: true }).eq("type", "report"),
      supabase.from("admin_notifications").select("*", { count: "exact", head: true }).in("type", COMMENT_TYPES),
      /* 신고 탭이 보여주는 것은 알림이 아니라 comment_reports 다(ReportsList). 배지에 알림 개수를
         쓰면 다 처리해도 숫자가 그대로 남아, 무엇이 밀려 있는지 알 수 없다. */
      supabase.from("comment_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const total = totalRes.count ?? 0;
    const report = reportRes.count ?? 0;
    const comment = commentRes.count ?? 0;
    return jsonOk({
      notifications: data ?? [],
      unreadCount,
      totalCount: total,
      typeCounts: { all: total, comment, report, system: Math.max(total - report - comment, 0) },
      pendingReportCount: pendingReportRes.count ?? 0,
      hasMore: offset + (data?.length ?? 0) < total,
    });
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
  const { supabase, error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const body = await request.json();
  const { ids, markAllRead } = body;

  if (markAllRead) {
    await supabase.from("admin_notifications").update({ read: true }).eq("read", false);
  } else {
    const idArr = asStringIdArray(ids);
    if (idArr) {
      await supabase.from("admin_notifications").update({ read: true }).in("id", idArr);
    }
  }

  return jsonOk({ success: true });
}

// DELETE /api/admin/notifications — 알림 삭제
export async function DELETE(request: Request) {
  const { supabase, error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const body = await request.json();
  const { ids, deleteAll } = body;

  if (deleteAll) {
    // .neq("id", "") 는 일부 PostgREST 환경에서 not-equal 매치 안 잡힘 — created_at >= epoch 로 전체 row 매칭
    const { error: delErr } = await supabase
      .from("admin_notifications")
      .delete()
      .gte("created_at", "1970-01-01T00:00:00Z");
    if (delErr) return jsonError(delErr.message, 500);
  } else {
    const idArr = asStringIdArray(ids);
    if (idArr) {
      await supabase.from("admin_notifications").delete().in("id", idArr);
    }
  }

  return jsonOk({ success: true });
}
