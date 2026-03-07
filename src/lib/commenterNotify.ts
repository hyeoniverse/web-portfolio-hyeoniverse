/**
 * 댓글 작성자 알림 — 답글이 달리면 부모 댓글 작성자에게 이메일 발송 (Resend)
 * notify_email 컬럼이 있는 댓글에만 발송
 */

import { createAdminClient } from "@/lib/supabase/admin";

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
      .select("nickname, notify_email")
      .eq("id", opts.parentId)
      .single();

    if (!parent?.notify_email) return;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio <onboarding@resend.dev>",
        to: parent.notify_email,
        subject: `New reply to your comment`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <p style="color: #333; margin: 0 0 12px;">
              <strong>${escapeHtml(opts.replyNickname)}</strong> replied to your comment:
            </p>
            <blockquote style="margin: 0 0 16px; padding: 8px 12px; border-left: 3px solid #ddd; color: #555;">
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
  } catch {
    // 이메일 실패는 무시
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
