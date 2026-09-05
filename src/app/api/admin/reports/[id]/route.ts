import { requireRole } from "@/lib/api/requireRole";
import { policyBlocked } from "@/lib/api/requirePostAccess";
import { PERM } from "@/lib/api/roles";
import { isValidUUID } from "@/utils/commentValidation";
import { jsonOk, jsonError, jsonServerError } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/admin/reports/[id]
 *  body: { status: "resolved" | "dismissed" } — admin 이 신고를 처리.
 *  동일 댓글에 대한 다른 pending 신고들도 함께 status 변경해서 잔여 알림 노이즈 제거.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { supabase, error: authError } = await requireRole(PERM.ADMIN);
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidUUID(id)) return jsonError("Invalid id");

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== "resolved" && status !== "dismissed") {
    return jsonError("status must be 'resolved' or 'dismissed'");
  }

  // 대상 report 의 comment 정보 조회 → 동일 댓글에 대한 다른 pending 신고도 일괄 처리
  const { data: target } = await supabase
    .from("comment_reports")
    .select("comment_id, comment_type")
    .eq("id", id)
    .maybeSingle();

  /* admin 등급을 이미 확인했다 — 0행은 세션 토큰이 낡은 것이지 신고가 없는 게 아니다. */
  if (!target) return policyBlocked();

  const { error } = await supabase
    .from("comment_reports")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("comment_id", target.comment_id)
    .eq("comment_type", target.comment_type)
    .eq("status", "pending");

  if (error) return jsonServerError(error, "PATCH /api/admin/reports/[id]");

  /* 신고를 처리했으면 그 신고가 만든 알림도 읽음이다.
     예전에는 두 테이블이 따로 놀아서, 신고를 다 처리해도 알림 목록에는 안 읽음으로 남았다.
     신고 알림은 metadata.commentId 를 담고 있고 위에서 같은 댓글의 pending 신고를 한꺼번에
     처리하므로, 알림도 댓글 단위로 묶어 정리한다. */
  const { error: notifErr } = await supabase
    .from("admin_notifications")
    .update({ read: true })
    .eq("type", "report")
    .eq("read", false)
    .eq("metadata->>commentId", target.comment_id);
  // 알림 정리 실패가 신고 처리를 되돌리지는 않는다 — 기록만 남긴다.
  if (notifErr) console.warn("[admin/reports] 알림 읽음 처리 실패:", notifErr.message);

  return jsonOk({ success: true });
}
