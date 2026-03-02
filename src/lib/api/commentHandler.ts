import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { getIdentity } from "@/utils/commenterIdentity";
import { notifyAdmin } from "@/lib/adminNotify";
import { isValidUUID, sanitizeContent, validatePassword } from "@/utils/commentValidation";
import { jsonOk, jsonError, jsonServerError } from "./response";

interface CommentHandlerOptions {
  table: "comments" | "work_comments";
  foreignKey: "post_id" | "work_id";
  selectFields: string;
  selectFieldsSafe: string;
  notifyLabel: string;
  notifyUrl: (targetId: string) => string;
  /** post comments support legacy nickname+password auth */
  supportLegacyAuth?: boolean;
}

export function createCommentHandlers(opts: CommentHandlerOptions) {
  const { table, foreignKey, selectFields, selectFieldsSafe, notifyLabel, notifyUrl, supportLegacyAuth } = opts;

  async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get(foreignKey);

    if (!targetId) return jsonError(`${foreignKey} is required`);

    const admin = createAdminClient();
    let { data, error } = await admin
      .from(table)
      .select(selectFields)
      .eq(foreignKey, targetId)
      .order("created_at", { ascending: true });

    if (error?.message?.includes("like_count")) {
      const fallback = await admin
        .from(table)
        .select(selectFieldsSafe)
        .eq(foreignKey, targetId)
        .order("created_at", { ascending: true });
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (error) return jsonServerError(error);
    return jsonOk(data);
  }

  async function POST(request: Request) {
    try {
      const body = await request.json();
      const targetId = body[foreignKey];
      const { parent_id, commenter_id, nickname, password, content } = body;

      if (!targetId || !content) return jsonError("Missing required fields");
      if (!isValidUUID(targetId)) return jsonError(`Invalid ${foreignKey}`);
      if (parent_id && !isValidUUID(parent_id)) return jsonError("Invalid parent_id");

      const contentResult = sanitizeContent(content);
      if (!contentResult.valid) return jsonError(contentResult.error!);
      const pwResult = validatePassword(password);
      if (!pwResult.valid) return jsonError(pwResult.error!);

      const admin = createAdminClient();

      if (commenter_id) {
        const identity = getIdentity(commenter_id, targetId);
        const passwordHash = pwResult.value ? await bcrypt.hash(pwResult.value, 10) : "";

        const { data, error } = await admin
          .from(table)
          .insert({
            [foreignKey]: targetId,
            parent_id: parent_id || null,
            nickname: `${identity.emoji} ${identity.name}`,
            commenter_hash: identity.hash,
            password_hash: passwordHash,
            content: contentResult.value,
            is_admin: false,
          })
          .select(selectFieldsSafe)
          .single();

        if (error) return jsonServerError(error);
        const row = data as unknown as Record<string, unknown>;

        notifyAdmin({
          type: parent_id ? "reply" : "comment",
          title: parent_id ? `New reply on ${notifyLabel}` : `New comment on ${notifyLabel}`,
          message: `${identity.emoji} ${identity.name}: ${contentResult.value.slice(0, 200)}`,
          metadata: { [foreignKey]: targetId, comment_id: row.id as string, url: notifyUrl(targetId) },
        });

        return jsonOk(data, 201);
      }

      // 레거시: nickname + password (post comments only)
      if (supportLegacyAuth) {
        if (!nickname || !password) return jsonError("Missing required fields");

        const passwordHash = await bcrypt.hash(pwResult.value || password, 10);

        const { data, error } = await admin
          .from(table)
          .insert({
            [foreignKey]: targetId,
            parent_id: parent_id || null,
            nickname,
            password_hash: passwordHash,
            content: contentResult.value,
            is_admin: false,
          })
          .select(selectFieldsSafe)
          .single();

        if (error) return jsonServerError(error);
        const row = data as unknown as Record<string, unknown>;

        notifyAdmin({
          type: parent_id ? "reply" : "comment",
          title: parent_id ? `New reply on ${notifyLabel}` : `New comment on ${notifyLabel}`,
          message: `${nickname}: ${contentResult.value.slice(0, 200)}`,
          metadata: { [foreignKey]: targetId, comment_id: row.id as string, url: notifyUrl(targetId) },
        });

        return jsonOk(data, 201);
      }

      return jsonError("Missing required fields");
    } catch (error) {
      return jsonServerError(error);
    }
  }

  async function PATCH(request: Request) {
    try {
      const body = await request.json();
      const { id, commenter_id, target_id, content, password } = body;

      if (!id || !content) return jsonError("Missing required fields");
      if (!isValidUUID(id)) return jsonError("Invalid id");

      const patchContent = sanitizeContent(content);
      if (!patchContent.valid) return jsonError(patchContent.error!);

      const admin = createAdminClient();

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

      const { data, error } = await admin
        .from(table)
        .update({ content: patchContent.value, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(selectFieldsSafe)
        .single();

      if (error) return jsonServerError(error);
      return jsonOk(data);
    } catch (error) {
      return jsonServerError(error);
    }
  }

  return { GET, POST, PATCH };
}
