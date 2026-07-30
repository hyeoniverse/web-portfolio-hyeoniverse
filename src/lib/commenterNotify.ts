/**
 * 댓글 작성자 알림 — 답글이 달리면 부모 댓글 작성자에게 이메일 발송 (Resend)
 * notify_email 컬럼이 있는 댓글에만 발송
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { MAIL_FROM } from "@/constants";

interface NotifyCommenterOptions {
  table: "comments" | "work_comments";
  parentId: string;
  replyNickname: string;
  replyContent: string;
  url: string;
}

export async function notifyCommenter(opts: NotifyCommenterOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const admin = createAdminClient();
    const { data: parent } = await admin
      .from(opts.table)
      .select("nickname, notify_email, content")
      .eq("id", opts.parentId)
      .single();

    console.log("[notifyCommenter] parent:", opts.parentId, "notify_email:", parent?.notify_email ?? "없음");

    if (!parent?.notify_email) return;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: parent.notify_email,
        subject: `New reply to your comment`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <p style="color: #999; font-size: 13px; margin: 0 0 4px;">Your comment:</p>
            <blockquote style="margin: 0 0 16px; padding: 8px 12px; border-left: 3px solid #eee; color: #888; font-size: 13px;">
              ${escapeHtml((parent.content ?? "").slice(0, 200))}
            </blockquote>
            <p style="color: #333; margin: 0 0 8px;">
              <strong>${escapeHtml(opts.replyNickname)}</strong> replied:
            </p>
            <blockquote style="margin: 0 0 16px; padding: 8px 12px; border-left: 3px solid #0066cc; color: #333;">
              ${escapeHtml(opts.replyContent.slice(0, 300))}
            </blockquote>
            ${opts.url ? `<p><a href="${opts.url}" style="color: #0066cc;">View conversation</a></p>` : ""}
            <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
            <p style="font-size: 12px; color: #999;">
              You received this email because you enabled reply notifications.
            </p>
          </div>
        `,
      }),
    });
    const resBody = await res.json();
    console.log("[notifyCommenter] Resend response:", res.status, resBody);
  } catch (err) {
    console.error("[notifyCommenter] error:", err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
