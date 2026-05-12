import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { isValidUUID } from "@/utils/commentValidation";
import { jsonOk, jsonError, jsonServerError } from "./response";

interface CommentDetailHandlerOptions {
  table: "comments" | "work_comments";
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 댓글 삭제 전략:
 * - 답글 있음 → 항상 tombstone (deleted_by로 주체 구분)
 * - 답글 없음 + self 삭제 → hard delete (완전 숨김)
 * - 답글 없음 + admin 삭제 → tombstone (모더레이션 투명성)
 *
 * hard delete 후 부모가 soft-deleted이고 다른 답글이 없으면 부모도 hard delete.
 */
async function softOrHardDelete(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  id: string,
  deletedBy: "self" | "admin",
  forceHard = false,
) {
  // 답글 존재 여부 확인
  const { count } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  const hasReplies = !!(count && count > 0);

  // 관리자 강제 삭제 — 답글 없으면 hard delete
  if (forceHard && deletedBy === "admin" && !hasReplies) {
    // hard delete 후 부모 정리 로직으로 진행
  } else if (hasReplies || deletedBy === "admin") {
    // tombstone: 답글 있거나 admin 삭제 — 닉네임 유지
    const { error } = await admin
      .from(table)
      .update({
        is_deleted: true,
        deleted_by: deletedBy,
        content: "",
        password_hash: "",
        commenter_hash: "",
      })
      .eq("id", id);
    return { error };
  }

  // hard delete — 답글 없는 self 삭제만
  // 먼저 parent_id 확인 (삭제 후 부모 정리용)
  const { data: self } = await admin
    .from(table)
    .select("parent_id")
    .eq("id", id)
    .single();

  const parentId = self?.parent_id;

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return { error };

  // 부모가 soft-deleted이고 self 작성자에 의한 것이며 다른 답글이 없으면 부모도 hard delete
  // (admin tombstone은 모더레이션 기록으로 유지)
  if (parentId) {
    const { data: parent } = await admin
      .from(table)
      .select("id, is_deleted, deleted_by")
      .eq("id", parentId)
      .single();

    if (parent?.is_deleted && parent?.deleted_by !== "admin") {
      const { count: siblingCount } = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("parent_id", parentId);

      if (!siblingCount || siblingCount === 0) {
        await admin.from(table).delete().eq("id", parentId);
      }
    }
  }

  return { error: null };
}

export function createCommentDeleteHandler(opts: CommentDetailHandlerOptions) {
  const { table } = opts;

  async function DELETE(request: Request, context: RouteContext) {
    const { id } = await context.params;

    if (!isValidUUID(id)) return jsonError("Invalid id");

    const admin = createAdminClient();

    // admin 세션 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 이미 admin 삭제된 tombstone이면 완전 삭제
      const { data: existing } = await admin
        .from(table)
        .select("is_deleted, deleted_by")
        .eq("id", id)
        .single();

      if (existing?.is_deleted && existing?.deleted_by === "admin") {
        const { error } = await admin.from(table).delete().eq("id", id);
        if (error) return jsonServerError(error);
        return jsonOk({ success: true, hardDeleted: true });
      }

      const { error } = await softOrHardDelete(admin, table, id, "admin");
      if (error) return jsonServerError(error);
      return jsonOk({ success: true });
    }

    const body = await request.json();
    const { password } = body;

    const { data: comment } = await admin
      .from(table)
      .select("password_hash")
      .eq("id", id)
      .single();

    if (!comment) return jsonError("Comment not found", 404);

    // commenter_hash 기반 인증 경로는 제거됨 — simpleHash brute-force 로 위변조 가능했음.
    // 익명 사용자는 비번이 유일한 인증.
    if (!comment.password_hash) {
      return jsonError("Password required — contact admin to delete this comment", 403);
    }
    if (!password) return jsonError("Password required", 401);
    const authorized = await bcrypt.compare(password, comment.password_hash);
    if (!authorized) return jsonError("Not authorized", 403);

    const { error } = await softOrHardDelete(admin, table, id, "self");
    if (error) return jsonServerError(error);
    return jsonOk({ success: true });
  }

  return { DELETE };
}
