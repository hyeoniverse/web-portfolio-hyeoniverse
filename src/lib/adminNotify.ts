/**
 * 관리자 알림 — DB 로그 저장 + 이메일 발송 (Resend)
 * 댓글 작성 시 호출됨
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { MAIL_FROM } from "@/constants";
import { getSiteConfig } from "@/lib/getSiteConfig";

/** 알림 type 분류
 *  - 댓글계: comment / reply / like / report
 *  - 보안:   device_login (새 기기 시도) / device_approved (승인 완료) / login_lockout (5회 실패)
 *            / signout_all (전체 로그아웃 실행)
 *  - 운영:   ai_failure (AI fallback chain 전부 실패) / email_failure (Resend 발송 실패)
 *            / cron_error (cron job exception). UI 시스템 탭 (= 댓글/신고 외 모든 type) 에 자동 표시.
 *  - 권한:   access_request (저자가 남의 글에 대한 권한을 요청) */
interface NotifyOptions {
  type:
    | "comment" | "reply" | "like" | "report"
    | "device_login" | "device_approved" | "login_lockout" | "signout_all"
    | "ai_failure" | "email_failure" | "cron_error"
    | "config_changed" | "migration_applied"
    | "access_request";
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

  // 이메일 발송 실패는 이메일 자체 알림 무한 루프 막기 위해 DB log 만 (notifyAdmin 재호출 X)
  const logEmailFailure = async (reason: string) => {
    if (opts.type === "email_failure") return; // 자기 자신은 skip
    try {
      const admin = createAdminClient();
      await admin.from("admin_notifications").insert({
        type: "email_failure",
        title: "이메일 발송 실패",
        message: `"${opts.title}" 알림 메일 전송 중 오류: ${reason}`,
        metadata: { original_type: opts.type, reason },
      });
    } catch { /* swallow — DB 도 안 되면 어쩔 수 없음 */ }
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
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
    if (!res.ok) await logEmailFailure(`HTTP ${res.status}`);
  } catch (e) {
    await logEmailFailure(e instanceof Error ? e.message : "unknown");
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
