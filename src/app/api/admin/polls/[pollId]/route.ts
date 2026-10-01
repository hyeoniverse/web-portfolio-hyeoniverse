import { requireOwner } from "@/lib/api/requireRole";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ pollId: string }>;
}

// DELETE /api/admin/polls/[pollId] — 이 투표의 표를 모두 지운다(초기화). 블록 자체는 글에 그대로 남는다
export async function DELETE(_request: Request, context: RouteContext) {
  const { error: authError } = await requireOwner();
  if (authError) return authError;
  const { pollId } = await context.params;
  if (!pollId) return jsonError("Invalid poll id", 400);
  try {
    /* 표 쓰기·지우기는 다른 투표 API 처럼 service role 로 한다 */
    const { error } = await createAdminClient().from("poll_votes").delete().eq("poll_id", pollId);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonServerError(e, "DELETE /api/admin/polls/[pollId]");
  }
}
