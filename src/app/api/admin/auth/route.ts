import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkLockout, recordFailure, clearFailures } from "@/lib/auth/loginLockout";
import { recordDevice, sendNewDeviceEmail } from "@/lib/auth/knownDevices";
import { hitRateLimit, ipRateKey } from "@/lib/api/rateLimit";
import { getIp } from "@/utils/getIp";

// POST /api/admin/auth — 로그인(1단계: 비밀번호). 성공하면 aal1 세션이 생기고, proxy 가 2단계 인증 화면으로 보낸다(lib/auth/mfa)
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  // 잠금 키는 소문자 — 대소문자를 바꿔 가며 계정마다 횟수를 늘리지 못하게(Supabase 는 대소문자를 가리지 않는다)
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return jsonError("Email and password are required", 400);
  }

  // 0) IP 마다 상한 — 계정 잠금은 계정 하나만 지킨다. 여러 계정을 돌아가며 시도하는 것까지 묶는다
  if (!(await hitRateLimit("admin-login", ipRateKey(request), { windowSec: 600, max: 20 }))) {
    return jsonError("Too many requests", 429, { code: "AUTH_RATE_LIMITED" });
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
    /* 실패 사유는 하나로 — Supabase 메시지(없는 계정 · 메일 미확인 등)를 그대로 내보내면 계정이 있는지 드러난다 */
    return NextResponse.json(
      { error: "Invalid credentials", code: "invalid_credentials", attemptsLeft: fail.attemptsLeft },
      { status: 401 },
    );
  }

  // 4) 성공 — 카운터 reset
  await clearFailures(email);

  // 5) 기기 기록 — 처음 보는 기기면 알림 메일(막지는 않는다 — 막는 일은 2단계 인증)
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const ip = getIp(request);
  const device = await recordDevice({ userId: data.user!.id, userAgent, ip });
  if (device.isNew) await sendNewDeviceEmail({ to: data.user!.email!, userAgent, ip });

  return NextResponse.json({ user: data.user });
}

// DELETE /api/admin/auth — 로그아웃(이 브라우저만)
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.json({ success: true });
}
