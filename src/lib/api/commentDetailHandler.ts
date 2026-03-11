import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { getIdentity } from "@/utils/commenterIdentity";
import { isValidUUID } from "@/utils/commentValidation";
import { jsonOk, jsonError, jsonServerError } from "./response";

interface CommentDetailHandlerOptions {
  table: "comments" | "work_comments";
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 답글이 있으면 soft delete, 없으면 hard delete.
 * hard delete 후 부모가 soft-deleted이고 다른 답글이 없으면 부모도 hard delete.
 */
async function softOrHardDelete(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  id: string,
) {
  // 답글 존재 여부 확인
  const { count } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if (count && count > 0) {
    // soft delete — 내용만 비우고 is_deleted 표시
    const { error } = await admin
      .from(table)
      .update({
        is_deleted: true,
        content: "",
        nickname: "",
        password_hash: "",
        commenter_hash: "",
      })
      .eq("id", id);
    return { error };
  }

  // hard delete — 답글 없는 댓글
  // 먼저 parent_id 확인 (삭제 후 부모 정리용)
  const { data: self } = await admin
    .from(table)
    .select("parent_id")
    .eq("id", id)
    .single();

  const parentId = self?.parent_id;

  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return { error };

  // 부모가 soft-deleted이고 다른 답글이 없으면 부모도 hard delete
  if (parentId) {
    const { data: parent } = await admin
      .from(table)
      .select("id, is_deleted")
      .eq("id", parentId)
      .single();

    if (parent?.is_deleted) {
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
      const { error } = await softOrHardDelete(admin, table, id);
      if (error) return jsonServerError(error);
      return jsonOk({ success: true });
    }

    const body = await request.json();
    const { commenter_id, target_id, password } = body;

    const { data: comment } = await admin
      .from(table)
      .select("commenter_hash, password_hash")
      .eq("id", id)
      .single();

    if (!comment) return jsonError("Comment not found", 404);

    let authorized = false;
    if (commenter_id && target_id && comment.commenter_hash) {
      const identity = getIdentity(commenter_id, target_id);
      authorized = comment.commenter_hash === identity.hash;
    }
    if (!authorized && password && comment.password_hash) {
      authorized = await bcrypt.compare(password, comment.password_hash);
    }
    if (!authorized) return jsonError("Not authorized", 403);

    const { error } = await softOrHardDelete(admin, table, id);
    if (error) return jsonServerError(error);
    return jsonOk({ success: true });
  }

  return { DELETE };
}
