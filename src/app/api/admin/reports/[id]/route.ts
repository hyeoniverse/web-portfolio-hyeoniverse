import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api/requireAuth";
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
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await context.params;
  if (!isValidUUID(id)) return jsonError("Invalid id");

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== "resolved" && status !== "dismissed") {
    return jsonError("status must be 'resolved' or 'dismissed'");
  }

  const admin = createAdminClient();

  // 대상 report 의 comment 정보 조회 → 동일 댓글에 대한 다른 pending 신고도 일괄 처리
  const { data: target } = await admin
    .from("comment_reports")
    .select("comment_id, comment_type")
    .eq("id", id)
    .maybeSingle();

  if (!target) return jsonError("Report not found", 404);

  const { error } = await admin
    .from("comment_reports")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("comment_id", target.comment_id)
    .eq("comment_type", target.comment_type)
    .eq("status", "pending");

  if (error) return jsonServerError(error);
  return jsonOk({ success: true });
}
