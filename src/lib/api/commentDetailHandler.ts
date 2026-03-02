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
      const { error } = await admin.from(table).delete().eq("id", id);
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

    const { error } = await admin.from(table).delete().eq("id", id);
    if (error) return jsonServerError(error);
    return jsonOk({ success: true });
  }

  return { DELETE };
}
