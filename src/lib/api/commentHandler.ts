import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { getIdentity } from "@/utils/commenterIdentity";
import { notifyAdmin } from "@/lib/adminNotify";
import { notifyCommenter } from "@/lib/commenterNotify";
import { isValidUUID, sanitizeContent, validatePassword, validateEmail, validateNickname } from "@/utils/commentValidation";
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

    if (error) return jsonServerError(error, "commentHandler");
    // 내용 보존형 삭제라 tombstone 행에도 DB엔 원문·commenter_hash 가 남아 있다.
    // 공개 응답에선 비워서 노출을 막는다 (UI 는 is_deleted 면 placeholder 를 그림).
    // 관리자 GET(/api/admin/comments)은 원문을 그대로 반환해 복구 미리보기에 쓴다.
    const rows = Array.isArray(data)
      ? data.map((r) => {
          const row = r as unknown as Record<string, unknown>;
          return row.is_deleted ? { ...row, content: "", commenter_hash: "" } : row;
        })
      : data;
    return jsonOk(rows);
  }

  async function POST(request: Request) {
    try {
      const body = await request.json();
      const targetId = body[foreignKey];
      const { parent_id, commenter_id, nickname, password, content, is_admin: clientIsAdmin, notify_email } = body;

      if (!targetId || !content) return jsonError("Missing required fields");
      if (!isValidUUID(targetId)) return jsonError(`Invalid ${foreignKey}`);
      if (parent_id && !isValidUUID(parent_id)) return jsonError("Invalid parent_id");

      const contentResult = sanitizeContent(content);
      if (!contentResult.valid) return jsonError(contentResult.error!);

      const emailResult = validateEmail(notify_email);
      if (!emailResult.valid) return jsonError(emailResult.error!);

      const nicknameResult = validateNickname(nickname);
      if (!nicknameResult.valid) return jsonError(nicknameResult.error!);

      const adminDb = createAdminClient();

      // Admin comment — verify server-side via Supabase auth
      if (clientIsAdmin) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return jsonError("Not authorized", 403, { code: "UNAUTHORIZED" });

        const { data, error } = await adminDb
          .from(table)
          .insert({
            [foreignKey]: targetId,
            parent_id: parent_id || null,
            nickname: "Admin",
            /* admin 댓글만 빈 해시가 정상이다 — 인증을 Supabase 세션이 하므로 비밀번호가 없다.
               PATCH·DELETE 도 세션 분기에서 먼저 처리하고 빠지니 빈 해시 검사에 걸리지 않는다.
               익명 댓글은 아래 validatePassword 가 빈 값을 막아 이 상태로 저장될 수 없다. */
            password_hash: "",
            content: contentResult.value,
            is_admin: true,
          })
          .select(selectFieldsSafe)
          .single();

        if (error) return jsonServerError(error, "commentHandler");
        const row = data as unknown as Record<string, unknown>;

        // Notify parent comment author if this is a reply
        if (parent_id) {
          notifyCommenter({
            table,
            parentId: parent_id,
            replyNickname: "Admin",
            replyContent: contentResult.value,
            url: notifyUrl(targetId),
          });
        }

        notifyAdmin({
          type: parent_id ? "reply" : "comment",
          title: parent_id ? `Admin replied on ${notifyLabel}` : `Admin commented on ${notifyLabel}`,
          message: `Admin: ${contentResult.value.slice(0, 200)}`,
          metadata: { [foreignKey]: targetId, comment_id: row.id as string, url: notifyUrl(targetId) },
        });

        return jsonOk(data, 201);
      }

      /* validatePassword 가 빈 값을 거절하므로, 여기를 통과한 pwResult.value 는 항상 채워져 있다.
         예전엔 빈 값을 valid 로 통과시켰고 저장부가 `value ? hash : ""` 로 받아, 비밀번호 없이
         만들어진 댓글이 빈 문자열 해시로 남았다. 대조할 비밀번호가 없으니 작성자도 고칠 수 없다.
         빈 값 분기를 남겨 두면 validatePassword 가 다시 느슨해질 때 그 상태가 조용히 부활한다. */
      const pwResult = validatePassword(password);
      if (!pwResult.valid) return jsonError(pwResult.error!);

      if (commenter_id) {
        const identity = getIdentity(commenter_id, targetId);
        const passwordHash = await bcrypt.hash(pwResult.value, 10);
        const displayNickname = nickname || `${identity.emoji} ${identity.name}`;

        const insertData: Record<string, unknown> = {
          [foreignKey]: targetId,
          parent_id: parent_id || null,
          nickname: displayNickname,
          commenter_hash: identity.hash,
          password_hash: passwordHash,
          content: contentResult.value,
          is_admin: false,
        };

        // Store notify email if provided
        if (emailResult.value) {
          insertData.notify_email = emailResult.value;
        }

        const { data, error } = await adminDb
          .from(table)
          .insert(insertData)
          .select(selectFieldsSafe)
          .single();

        if (error) return jsonServerError(error, "commentHandler");
        const row = data as unknown as Record<string, unknown>;

        // Notify parent comment author if this is a reply
        if (parent_id) {
          notifyCommenter({
            table,
            parentId: parent_id,
            replyNickname: displayNickname,
            replyContent: contentResult.value,
            url: notifyUrl(targetId),
          });
        }

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

        const passwordHash = await bcrypt.hash(pwResult.value, 10);

        const { data, error } = await adminDb
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

        if (error) return jsonServerError(error, "commentHandler");
        const row = data as unknown as Record<string, unknown>;

        if (parent_id) {
          notifyCommenter({
            table,
            parentId: parent_id,
            replyNickname: nickname,
            replyContent: contentResult.value,
            url: notifyUrl(targetId),
          });
        }

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
      return jsonServerError(error, "commentHandler");
    }
  }

  async function PATCH(request: Request) {
    try {
      const body = await request.json();
      const { id, content, password } = body;

      if (!id || !content) return jsonError("Missing required fields");
      if (!isValidUUID(id)) return jsonError("Invalid id");

      const patchContent = sanitizeContent(content);
      if (!patchContent.valid) return jsonError(patchContent.error!);

      const adminDb = createAdminClient();

      // Admin: authorize via Supabase session
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await adminDb
          .from(table)
          .update({ content: patchContent.value, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select(selectFieldsSafe)
          .single();
        if (error) return jsonServerError(error, "commentHandler");
        return jsonOk(data);
      }

      const { data: comment } = await adminDb
        .from(table)
        .select("password_hash")
        .eq("id", id)
        .single();

      if (!comment) return jsonError("Comment not found", 404, { code: "COMMENT_NOT_FOUND" });

      // commenter_hash 기반 인증 경로는 제거됨 — simpleHash 가 31-bit 비암호 해시라
      // commenter_id 를 brute force 로 위변조 가능했음. 익명 사용자는 비번이 유일한 인증.
      if (!comment.password_hash) {
        return jsonError("Password required — contact admin to edit this comment", 403, { code: "COMMENT_NO_PASSWORD" });
      }
      if (!password) return jsonError("Password required", 401, { code: "COMMENT_PASSWORD_REQUIRED" });
      const authorized = await bcrypt.compare(password, comment.password_hash);
      if (!authorized) return jsonError("Not authorized", 403, { code: "COMMENT_PASSWORD_WRONG" });

      const { data, error } = await adminDb
        .from(table)
        .update({ content: patchContent.value, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(selectFieldsSafe)
        .single();

      if (error) return jsonServerError(error, "commentHandler");
      return jsonOk(data);
    } catch (error) {
      return jsonServerError(error, "commentHandler");
    }
  }

  return { GET, POST, PATCH };
}
