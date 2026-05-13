/**
 * 관리자 알림 — DB 로그 저장 + 이메일 발송 (Resend)
 * 댓글 작성 시 호출됨
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";

interface NotifyOptions {
  type: "comment" | "reply" | "like" | "report";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** DB에 알림 로그 저장 */
async function saveNotification(opts: NotifyOptions) {
  const admin = createAdminClient();
  await admin.from("admin_notifications").insert({
    type: opts.type,
    title: opts.title,
    message: opts.message,
    metadata: opts.metadata ?? {},
  });
}

/** Resend로 이메일 발송 (API key 없으면 skip) */
async function sendEmail(opts: NotifyOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  // delta 구조를 자동 병합해서 정확한 값 조회 — 이전엔 raw config.commentEmailNotify
  // 직접 접근해서 admin에서 토글 켜도 false 로 읽혀 메일이 안 가던 버그가 있었음
  const cfg = await getSiteConfig();
  if (!cfg.commentEmailNotify) return;

  const toEmail = cfg.contact?.email || process.env.ADMIN_EMAIL;
  if (!toEmail) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio <onboarding@resend.dev>",
        to: toEmail,
        subject: `[Portfolio] ${opts.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h3 style="margin: 0 0 8px;">${opts.title}</h3>
            <p style="color: #555; white-space: pre-wrap;">${opts.message}</p>
            ${opts.metadata?.url ? `<p><a href="${opts.metadata.url}">View</a></p>` : ""}
            <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
            <p style="font-size: 12px; color: #999;">This is an automated notification from your portfolio site.</p>
          </div>
        `,
      }),
    });
  } catch {
    // 이메일 실패는 무시 (알림 로그는 이미 DB에 저장됨)
  }
}

/** 관리자에게 알림 전송 (DB 로그 + 이메일) */
export async function notifyAdmin(opts: NotifyOptions) {
  // 둘 다 비동기로 실행 (실패해도 댓글 작성에 영향 없음)
  await Promise.allSettled([
    saveNotification(opts),
    sendEmail(opts),
  ]);
}
