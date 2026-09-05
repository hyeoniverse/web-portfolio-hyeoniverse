import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkLockout, recordFailure, clearFailures } from "@/lib/auth/loginLockout";
import { checkOrRegisterDevice, sendNewDeviceEmail } from "@/lib/auth/knownDevices";

// POST /api/admin/auth — 로그인
export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return jsonError("Email and password are required", 400);
  }

  // 1) lockout 체크 — 잠금 중이면 즉시 거부
  const pre = await checkLockout(email);
  if (pre.locked) {
    return NextResponse.json(
      {
        error: "Account temporarily locked",
        code: "locked",
        remainingSeconds: pre.remainingSeconds,
      },
      { status: 423 }, // Locked
    );
  }

  // 2) 실제 인증
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 3) 실패 카운트 증가 + 임계값 초과 시 lockout
    const fail = await recordFailure(email);
    if (fail.locked) {
      return NextResponse.json(
        {
          error: "Too many failed attempts. Account locked.",
          code: "locked",
          remainingSeconds: fail.remainingSeconds,
        },
        { status: 423 },
      );
    }
    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? "unknown",
        attemptsLeft: fail.attemptsLeft,
      },
      { status: 401 },
    );
  }

  // 4) 성공 — 카운터 reset
  await clearFailures(email);

  // 5) 새 기기 인증 — fingerprint 확인. trusted 아니면 즉시 signOut + 메일.
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "";
  const device = await checkOrRegisterDevice({
    userId: data.user!.id,
    userAgent,
    ip,
  });

  if (device.kind === "pending") {
    // 세션 회수 — 이메일 승인 후에야 정상 로그인 가능
    await supabase.auth.signOut();
    const origin = h.get("origin") ?? new URL(request.url).origin;
    const approveUrl = `${origin}/api/admin/auth/approve-device?token=${encodeURIComponent(device.token)}`;
    await sendNewDeviceEmail({
      to: data.user!.email!,
      approveUrl,
      userAgent,
      ip,
    });
    return NextResponse.json(
      {
        status: "device_pending",
        message: "New device — check your email to approve this sign-in.",
      },
      { status: 202 }, // Accepted (pending email verification)
    );
  }

  return NextResponse.json({ user: data.user });
}

// DELETE /api/admin/auth — 로그아웃
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
