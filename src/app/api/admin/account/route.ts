import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meta = user.user_metadata ?? {};
  return NextResponse.json({
    email: user.email,
    pendingEmail: user.new_email || meta.pending_email || null,
    emailChangeSentAt: user.email_change_sent_at || meta.email_change_sent_at || null,
  });
}

// POST /api/admin/account — 이메일 확인 메일 재전송
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingEmail =
    user.new_email || user.user_metadata?.pending_email;

  if (!pendingEmail) {
    return NextResponse.json(
      { error: "No pending email change" },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.updateUser({ email: pendingEmail });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Confirmation email resent" });
}

// DELETE /api/admin/account — 이메일 변경 취소
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 현재 이메일로 다시 설정하면 pending이 취소됨
  const { error } = await supabase.auth.updateUser({ email: user.email! });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Email change cancelled" });
}

// PATCH /api/admin/account — 이메일/비밀번호 변경 (현재 비밀번호 확인 필수)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // 현재 비밀번호 확인 필수
  if (!body.currentPassword) {
    return NextResponse.json(
      { error: "Current password is required" },
      { status: 400 },
    );
  }

  // 현재 비밀번호로 재인증
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: body.currentPassword,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

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
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }
      if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
        return NextResponse.json(
          { error: "Password must include uppercase, lowercase, number, and special character" },
          { status: 400 },
        );
      }
    } else {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }
    }
    updates.password = body.password;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  const { error } = await supabase.auth.updateUser(updates);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 보안 알림 이메일을 원래 이메일로 발송
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
    alerts.push(
      sendSecurityAlert(user.email!, "Password Changed"),
    );
  }
  if (alerts.length > 0) {
    Promise.allSettled(alerts); // fire & forget
  }

  return NextResponse.json({
    message: "Updated successfully",
    emailConfirmationSent: !!updates.email,
  });
}
