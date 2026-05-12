import { requireAuth } from "@/lib/api/requireAuth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";

async function sendSecurityAlert(to: string, action: string, detail?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const time = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio <onboarding@resend.dev>",
        to,
        subject: `[Security] ${action}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h3 style="margin: 0 0 8px;">Account ${action}</h3>
            ${detail ? `<p style="color: #555;">${detail}</p>` : ""}
            <p style="color: #555;">Time: ${time}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
            <p style="font-size: 12px; color: #999;">If you did not make this change, please secure your account immediately.</p>
          </div>
        `,
      }),
    });
  } catch {
    // 보안 메일 실패는 무시
  }
}

// GET /api/admin/account — 현재 유저 정보
export async function GET() {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const meta = user.user_metadata ?? {};
  return jsonOk({
    email: user.email,
    pendingEmail: user.new_email || meta.pending_email || null,
    emailChangeSentAt: user.email_change_sent_at || meta.email_change_sent_at || null,
  });
}

// POST /api/admin/account — 이메일 확인 메일 재전송
export async function POST() {
  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const pendingEmail = user.new_email || user.user_metadata?.pending_email;

  if (!pendingEmail) return jsonError("No pending email change", 400);

  const { error } = await supabase.auth.updateUser({ email: pendingEmail });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ message: "Confirmation email resent" });
}

// DELETE /api/admin/account — 이메일 변경 취소
export async function DELETE() {
  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  // 현재 이메일로 다시 설정하면 pending이 취소됨
  const { error } = await supabase.auth.updateUser({ email: user.email! });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ message: "Email change cancelled" });
}

// PATCH /api/admin/account — 이메일/비밀번호 변경 (현재 비밀번호 확인 필수)
export async function PATCH(request: Request) {
  const { user, supabase, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = await request.json();

  // 현재 비밀번호 확인 필수
  if (!body.currentPassword) {
    return jsonError("Current password is required", 400);
  }

  // 현재 비밀번호로 재인증
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: body.currentPassword,
  });

  if (signInError) return jsonError("Current password is incorrect", 400);

  const updates: { email?: string; password?: string } = {};

  if (body.email && body.email !== user.email) {
    updates.email = body.email;
  }

  if (body.password) {
    const config = await getSiteConfig();
    const policy = config.passwordPolicy ?? "secure";

    if (policy === "secure") {
      const pw = body.password;
      if (pw.length < 8) {
        return jsonError("Password must be at least 8 characters", 400);
      }
      if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
        return jsonError(
          "Password must include uppercase, lowercase, number, and special character",
          400,
        );
      }
    } else {
      if (body.password.length < 6) {
        return jsonError("Password must be at least 6 characters", 400);
      }
    }
    updates.password = body.password;
  }

  if (Object.keys(updates).length === 0) {
    return jsonOk({ message: "No changes" });
  }

  const { error } = await supabase.auth.updateUser(updates);

  if (error) return jsonError(error.message, 400);

  // 보안 알림 이메일을 원래 이메일로 발송 — serverless 환경에서 함수 종료 후 죽지 않도록 await
  const alerts: Promise<void>[] = [];
  if (updates.email) {
    alerts.push(
      sendSecurityAlert(
        user.email!,
        "Email Change Requested",
        `A request to change your email to <strong>${updates.email}</strong> has been made. A confirmation email was sent to the new address.`,
      ),
    );
  }
  if (updates.password) {
    alerts.push(sendSecurityAlert(user.email!, "Password Changed"));
  }
  if (alerts.length > 0) {
    await Promise.allSettled(alerts);
  }

  return jsonOk({
    message: "Updated successfully",
    emailConfirmationSent: !!updates.email,
  });
}
