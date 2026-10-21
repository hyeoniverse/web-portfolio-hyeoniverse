import { createHash } from "crypto";
import { MAIL_FROM } from "@/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, escapeHtml } from "@/lib/mail/template";
import { deviceKey } from "@/lib/auth/uaParser";
import { logMail } from "@/lib/mail/log";

/** UA 기반 device fingerprint — parsed browser+OS+device 만 해시 (버전 변동 무시).
 *  Chrome auto-update 등으로 UA minor 가 바뀌어도 같은 fingerprint 가 나와 중복 row 가 안 생김. */
function fingerprintFromUA(userAgent: string): string {
  return createHash("sha256").update(deviceKey(userAgent)).digest("hex").slice(0, 32);
}

/** 로그인 직후 호출 — 기기 기록(설정 › 계정 의 기기 목록). 처음 보는 기기면 기록하고 isNew.
 *  예전엔 새 기기를 이메일 승인 전까지 막았지만, 그 검사는 우리 로그인 API 에서만 돌아 Supabase 직접 로그인 · GitHub 로그인이
 *  비켜 갔다. 이제 막는 일은 2단계 인증(lib/auth/mfa)이 요청마다 하고, 여기는 알림만 한다. */
export async function recordDevice(args: {
  userId: string;
  userAgent: string;
  ip: string;
}): Promise<{ isNew: boolean }> {
  const supabase = createAdminClient();
  const fingerprint = fingerprintFromUA(args.userAgent);
  const now = new Date().toISOString();

  const { data: rows } = await supabase
    .from("admin_known_devices")
    .select("id, fingerprint, user_agent")
    .eq("user_id", args.userId);
  // 같은 fingerprint, 아니면 같은 browser+OS+device 의 옛 row(fingerprint 방식이 바뀌기 전 것)
  const key = deviceKey(args.userAgent);
  const known = (rows ?? []).find((r) => r.fingerprint === fingerprint)
    ?? (rows ?? []).find((r) => deviceKey(r.user_agent ?? "") === key);

  if (known) {
    await supabase
      .from("admin_known_devices")
      .update({ fingerprint, user_agent: args.userAgent, ip_address: args.ip, last_seen_at: now, approved: true, approve_token: null, approve_token_expires_at: null })
      .eq("id", known.id);
    return { isNew: false };
  }

  await supabase.from("admin_known_devices").insert({
    user_id: args.userId,
    fingerprint,
    user_agent: args.userAgent,
    ip_address: args.ip,
    approved: true,
  });

  const { notifyAdmin } = await import("@/lib/adminNotify");
  await notifyAdmin({
    type: "device_login",
    title: "새 기기에서 로그인",
    message: `처음 보는 기기에서 로그인했습니다.\nUA: ${args.userAgent}\nIP: ${args.ip}`,
    metadata: { user_id: args.userId, ip: args.ip, user_agent: args.userAgent },
  });
  return { isNew: true };
}

/** Resend 로 새 기기 로그인 알림 메일 발송 — 본인이 아니면 비밀번호를 바꾸게 */
export async function sendNewDeviceEmail(args: {
  to: string;
  userAgent: string;
  ip: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // 메일 미설정 — silent fail (DB 에 token 은 이미 남아 admin 이 직접 확인 가능)

  const time = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const body = `
    <h1 class="title">New device sign-in</h1>
    <p class="body">Your admin account was signed in from a new device.</p>
    <table class="meta">
      <tr><td class="label">Time</td><td>${escapeHtml(time)}</td></tr>
      <tr><td class="label">IP</td><td>${escapeHtml(args.ip || "-")}</td></tr>
      <tr><td class="label">Browser</td><td style="word-break: break-all;">${escapeHtml(args.userAgent)}</td></tr>
    </table>
  `;
  const footer = "If this wasn't you, change your password now. Two-factor authentication still blocks access without your authenticator app.";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: args.to,
        subject: "[Security] New device sign-in",
        html: emailLayout({ title: "New device sign-in", body, footer }),
      }),
    });
    /* 실패하면 승인 메일이 안 가 로그인이 막힌다 — 원인을 호출 기록에 남긴다 */
    await logMail("new-device", res);
  } catch (e) {
    // 메일 실패는 무시 — token 은 DB 에 남음. 기록만 남긴다
    await logMail("new-device", e);
  }
}
