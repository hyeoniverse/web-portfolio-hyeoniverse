import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, escapeHtml } from "@/lib/mail/template";

/** UA 기반 device fingerprint — IP는 변동이 크므로 제외.
 *  UA 도 완벽하진 않지만 사이드 채널 정보 없이 server 에서 얻을 수 있는 가장 안정적 단서. */
export function fingerprintFromUA(userAgent: string): string {
  return createHash("sha256").update(userAgent || "unknown").digest("hex").slice(0, 32);
}

const APPROVE_TOKEN_TTL_HOURS = 24;

export type DeviceCheckResult =
  | { kind: "trusted" }
  | { kind: "pending"; token: string };

/** 로그인 직후 호출. fingerprint 가 trusted 면 last_seen 만 업데이트,
 *  처음 보는 fingerprint 면 row 생성 + approve 토큰 발급 → 호출자에게 token 반환. */
export async function checkOrRegisterDevice(args: {
  userId: string;
  userAgent: string;
  ip: string;
}): Promise<DeviceCheckResult> {
  const supabase = createAdminClient();
  const fingerprint = fingerprintFromUA(args.userAgent);
  const now = new Date();

  const { data: existing } = await supabase
    .from("admin_known_devices")
    .select("id, approved, approve_token, approve_token_expires_at")
    .eq("user_id", args.userId)
    .eq("fingerprint", fingerprint)
    .maybeSingle<{
      id: string;
      approved: boolean;
      approve_token: string | null;
      approve_token_expires_at: string | null;
    }>();

  if (existing?.approved) {
    await supabase
      .from("admin_known_devices")
      .update({ last_seen_at: now.toISOString(), ip_address: args.ip })
      .eq("id", existing.id);
    return { kind: "trusted" };
  }

  // pending 상태 — 새로 만들거나 기존 token 갱신
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + APPROVE_TOKEN_TTL_HOURS * 3600_000).toISOString();

  if (existing) {
    await supabase
      .from("admin_known_devices")
      .update({
        approve_token: token,
        approve_token_expires_at: expiresAt,
        last_seen_at: now.toISOString(),
        user_agent: args.userAgent,
        ip_address: args.ip,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("admin_known_devices").insert({
      user_id: args.userId,
      fingerprint,
      user_agent: args.userAgent,
      ip_address: args.ip,
      approved: false,
      approve_token: token,
      approve_token_expires_at: expiresAt,
    });
  }

  return { kind: "pending", token };
}

/** 이메일 링크에서 호출 — token 검증 + approve. */
export async function approveDeviceByToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_known_devices")
    .select("id, approve_token_expires_at, approved")
    .eq("approve_token", token)
    .maybeSingle<{ id: string; approve_token_expires_at: string | null; approved: boolean }>();

  if (!data) return { ok: false, reason: "invalid" };
  if (data.approved) return { ok: true }; // idempotent
  if (
    !data.approve_token_expires_at ||
    new Date(data.approve_token_expires_at).getTime() < Date.now()
  ) {
    return { ok: false, reason: "expired" };
  }

  await supabase
    .from("admin_known_devices")
    .update({
      approved: true,
      approve_token: null,
      approve_token_expires_at: null,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  return { ok: true };
}

/** Resend 로 새 기기 인증 이메일 발송 */
export async function sendNewDeviceEmail(args: {
  to: string;
  approveUrl: string;
  userAgent: string;
  ip: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // 메일 미설정 — silent fail (DB 에 token 은 이미 남아 admin 이 직접 확인 가능)

  const time = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const body = `
    <h1 class="title">New device sign-in</h1>
    <p class="body">A new device tried to sign in to your admin account.</p>
    <table class="meta">
      <tr><td class="label">Time</td><td>${escapeHtml(time)}</td></tr>
      <tr><td class="label">IP</td><td>${escapeHtml(args.ip || "-")}</td></tr>
      <tr><td class="label">Browser</td><td style="word-break: break-all;">${escapeHtml(args.userAgent)}</td></tr>
    </table>
    <p class="body" style="margin-top: 20px;">
      <a class="cta" href="${args.approveUrl}">Approve this device</a>
    </p>
  `;
  const footer = `If this wasn't you, ignore this email and change your password immediately. The link expires in ${APPROVE_TOKEN_TTL_HOURS} hours.`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio <onboarding@resend.dev>",
        to: args.to,
        subject: "[Security] New device sign-in",
        html: emailLayout({ title: "New device sign-in", body, footer }),
      }),
    });
  } catch {
    // 메일 실패는 무시 — token 은 DB 에 남음
  }
}
