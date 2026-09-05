import { NextResponse } from "next/server";
import { jsonError, jsonServerError } from "@/lib/api/response";
import { requireOwner } from "@/lib/api/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyInviteToExistingUser, type AuthorInvite } from "@/lib/api/authorInvites";
import { PERM, parsePermissionLevelInput } from "@/lib/api/roles";

/** 초대 메일 발송 (Resend). API key 없으면 skip(초대 기록은 남으므로 링크 수동 전달 가능). */
async function sendInviteEmail(email: string, loginUrl: string): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "no_api_key" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Hyeoniverse <noreply@hyeoniverse.com>",
        to: email,
        subject: "작성자로 초대되었습니다 · You've been invited as an author",
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h3 style="margin: 0 0 8px;">작성자 초대 · Author invite</h3>
            <p style="color: #555;">아래 링크에서 <b>GitHub 로 로그인</b>하면 작성자 권한이 부여됩니다.<br/>
            Sign in with <b>GitHub</b> at the link below to get author access.</p>
            <p style="margin: 16px 0;"><a href="${loginUrl}" style="background:#111;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;">로그인 · Sign in</a></p>
            <p style="font-size: 12px; color: #999;">이 초대는 이 이메일로 GitHub 에 로그인해야 유효합니다. · Use the GitHub account with this email.</p>
          </div>
        `,
      }),
    });
    if (res.ok) return { sent: true };
    // 실패 시 Resend 가 본문에 담아주는 사유까지 그대로 전달(도메인 미인증 등 원인 파악용)
    const detail = await res.json().catch(() => null);
    const msg = detail?.message || detail?.error?.message || detail?.name;
    return { sent: false, reason: msg ? `HTTP ${res.status} — ${msg}` : `HTTP ${res.status}` };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

/** 저자 초대 생성 + 메일 발송. owner 전용. */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const authorId = typeof body?.author_id === "string" ? body.author_id : "";
  if (!email || !authorId) {
    return jsonError("email and author_id required", 400);
  }
  /* 생략하면 기본 저자. 값을 보냈는데 PERM 에 없는 값이면 조용히 낮추지 않고 거절한다. */
  const level = body?.permission_level === undefined
    ? PERM.AUTHOR
    : parsePermissionLevelInput(body.permission_level);
  if (level === null) {
    return jsonError("권한 레벨이 올바르지 않습니다.", 400);
  }

  const admin = createAdminClient();
  const invite: AuthorInvite = {
    email, author_id: authorId, permission_level: level,
    invited_by: auth.user.email ?? null, created_at: new Date().toISOString(), consumed_at: null,
  };
  const { error } = await admin.from("author_invites").upsert(
    { email, author_id: authorId, permission_level: level, invited_by: invite.invited_by, consumed_at: null },
    { onConflict: "email" },
  );
  if (error) return jsonServerError(error, "POST /api/admin/authors/invite");

  // 이미 가입된 계정이면 즉시 권한 부여(로그인 안 기다림). 없으면 로그인 시 콜백에서 매칭.
  const appliedNow = await applyInviteToExistingUser(admin, invite);

  const { origin } = new URL(request.url);
  const emailRes = await sendInviteEmail(email, `${origin}/admin/login`);

  return NextResponse.json({ ok: true, appliedNow, emailed: emailRes.sent, emailReason: emailRes.reason });
}

/** 초대 목록. owner 전용. */
export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const { data, error } = await admin.from("author_invites").select("*").order("created_at", { ascending: false });
  if (error) return jsonServerError(error, "GET /api/admin/authors/invite");
  return NextResponse.json({ invites: data ?? [] });
}

/** 초대 취소(삭제). owner 전용. ?email= */
export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const email = (new URL(request.url).searchParams.get("email") ?? "").toLowerCase();
  if (!email) return jsonError("email required", 400);
  const admin = createAdminClient();
  const { error } = await admin.from("author_invites").delete().eq("email", email);
  if (error) return jsonServerError(error, "DELETE /api/admin/authors/invite");
  return NextResponse.json({ ok: true });
}
