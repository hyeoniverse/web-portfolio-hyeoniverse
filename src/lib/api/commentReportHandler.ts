import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/utils/commentValidation";
import { getIp } from "@/utils/getIp";
import { notifyAdmin } from "@/lib/adminNotify";
import { jsonOk, jsonError, jsonServerError } from "./response";

interface ReportHandlerOptions {
  /** posts 댓글 → 'comments', works 댓글 → 'work_comments' */
  table: "comments" | "work_comments";
  /** notification metadata.url 에 들어갈 prefix (예: "/posts" → /posts/{slug}#comment-{id}) */
  contentRoute: "posts" | "works";
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** IP + UA + commentId 조합으로 reporter 식별 (동일 사용자 중복 신고 차단) */
function getReporterHash(request: Request, commentId: string): string {
  const ip = getIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  return crypto.createHash("sha256").update(`${ip}:${ua}:${commentId}`).digest("hex").slice(0, 32);
}

const MAX_REASON_LEN = 500;

export function createCommentReportHandler(opts: ReportHandlerOptions) {
  const { table, contentRoute } = opts;
  const commentType = contentRoute === "posts" ? "post" : "work";

  async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    if (!isValidUUID(id)) return jsonError("Invalid comment id");

    let body: { reason?: string };
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const reason = (body.reason ?? "").trim().slice(0, MAX_REASON_LEN);

    const admin = createAdminClient();

    // 신고 대상 댓글 존재 + 발행 상태 확인 (이미 삭제된 댓글은 신고 의미 없음)
    const { data: comment } = await admin
      .from(table)
      .select("id, content, nickname, post_id, work_id, is_deleted")
      .eq("id", id)
      .maybeSingle();

    if (!comment) return jsonError("Comment not found", 404, { code: "COMMENT_NOT_FOUND" });
    if (comment.is_deleted) return jsonError("Already removed", 409, { code: "COMMENT_ALREADY_REMOVED" });

    const reporterHash = getReporterHash(request, id);

    // 중복 신고 차단 — pending 상태인 동일 reporter+comment 가 이미 있으면 skip
    const { data: insertResult, error: insertError } = await admin
      .from("comment_reports")
      .insert({
        comment_id: id,
        comment_type: commentType,
        reason,
        reporter_hash: reporterHash,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      // unique constraint 충돌 = 이미 신고함 → 성공 응답 (사용자에겐 동일하게 보임)
      if (insertError.code === "23505") return jsonOk({ success: true, duplicated: true });
      return jsonServerError(insertError, "commentReportHandler");
    }

    // 게시물/작품 slug 조회 → admin notification metadata url 생성
    const contentId = comment.post_id ?? comment.work_id;
    let url = `/${contentRoute}`;
    if (contentId) {
      const contentTable = contentRoute === "posts" ? "posts" : "works";
      const { data: parent } = await admin
        .from(contentTable)
        .select("slug")
        .eq("id", contentId)
        .maybeSingle();
      const slug = (parent as { slug?: string } | null)?.slug;
      if (slug) url = `/${contentRoute}/${slug}#comment-${id}`;
    }

    const preview = (comment.content as string ?? "").slice(0, 100);
    const reasonPart = reason ? `\n사유: ${reason}` : "";
    await notifyAdmin({
      type: "report",
      title: "댓글이 신고되었습니다",
      message: `${comment.nickname ?? "(unknown)"}: "${preview}"${reasonPart}`,
      metadata: { url, commentId: id, commentType, reportId: insertResult?.id },
    });

    return jsonOk({ success: true });
  }

  return { POST };
}
