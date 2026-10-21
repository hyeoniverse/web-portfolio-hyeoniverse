import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/requireAuth";
import { requireOwner } from "@/lib/api/requireRole";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { getUserRole } from "@/lib/api/roles";
import { hitRateLimit, rateLimitKey } from "@/lib/api/rateLimit";
import { getMfaState, isMfaRequired } from "@/lib/auth/mfa";

/**
 * 2단계 인증(OTP 앱) 등록 · 확인 — /admin/mfa 화면이 부른다(lib/auth/mfa).
 * 아직 OTP 확인 전(aal1) 세션도 들어와야 하므로 proxy 의 MFA 검사에서 빠져 있고, 여기서 로그인 · 역할을 직접 본다.
 *
 * GET    — 지금 상태와 등록된 인증 앱
 * POST   — { action: "enroll" } QR · 비밀값 발급 / { action: "verify", factorId, code } 코드 확인 → 세션이 aal2 로 오른다
 * DELETE — { factorId } 인증 앱 지우기(aal2 세션만, 마지막 하나는 지울 수 없다)
 * PUT    — { required } 사이트 전체 2단계 인증 강제 켜기 · 끄기(소유자 · aal2 세션만)
 */

async function currentMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: jsonError("Unauthorized", 401, { code: "UNAUTHORIZED" }) } as const;
  const role = getUserRole(user);
  if (!role.isOwner && role.role === null) return { error: jsonError("Forbidden", 403) } as const;
  return { supabase, user } as const;
}

async function verifiedFactors(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp ?? [];
}

export async function GET() {
  const auth = await currentMember();
  if ("error" in auth) return auth.error;
  const [state, factors, required] = await Promise.all([
    getMfaState(auth.supabase),
    verifiedFactors(auth.supabase),
    isMfaRequired(auth.supabase),
  ]);
  return jsonOk({
    verified: state.verified,
    required,
    factors: factors.map((f) => ({ id: f.id, name: f.friendly_name ?? "", createdAt: f.created_at })),
  });
}

export async function POST(request: Request) {
  const auth = await currentMember();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; factorId?: unknown; code?: unknown };

  if (body.action === "enroll") {
    const state = await getMfaState(supabase);
    // 이미 인증 앱이 있으면 확인을 거친 세션만 더 붙일 수 있다(Supabase 도 같은 규칙)
    if (state.enrolled && !state.verified) return jsonError("Verify with your existing authenticator first", 403, { code: "MFA_REQUIRED" });

    // 등록하다 그만둔(확인 안 된) 것은 치운다 — 남아 있으면 같은 이름으로 다시 등록할 수 없다
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const issuer = new URL(request.url).hostname.replace(/^www\./, "");
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer,
      friendlyName: `${issuer} ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    });
    if (error || !data) return jsonServerError(error ?? new Error("enroll failed"), "POST /api/admin/auth/mfa enroll");
    return jsonOk({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  if (body.action === "verify") {
    const factorId = typeof body.factorId === "string" ? body.factorId : "";
    const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
    if (!factorId || !/^\d{6}$/.test(code)) return jsonError("Enter the 6-digit code", 400, { code: "MFA_CODE_INVALID" });
    // 6자리는 경우의 수가 적다 — 계정마다 시도 횟수를 묶는다
    if (!(await hitRateLimit("mfa-verify", rateLimitKey(user.id), { windowSec: 600, max: 10 }))) {
      return jsonError("Too many attempts", 429, { code: "RATE_LIMITED" });
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return jsonError("Invalid code", 400, { code: "MFA_CODE_INVALID" });
    return jsonOk({ verified: true });
  }

  return jsonError("Unknown action");
}

export async function DELETE(request: Request) {
  // 지우기는 확인을 거친 세션만(requireAuth 가 aal2 를 본다)
  const { supabase, error: authError } = await requireAuth();
  if (authError) return authError;
  const body = (await request.json().catch(() => ({}))) as { factorId?: unknown };
  const factorId = typeof body.factorId === "string" ? body.factorId : "";
  if (!factorId) return jsonError("Missing factorId");

  const factors = await verifiedFactors(supabase);
  if (!factors.some((f) => f.id === factorId)) return jsonError("Not found", 404);
  // 마지막 하나를 지우면 다음 요청부터 모든 관리 기능이 막힌다 — 새 앱을 먼저 붙이고 지운다
  if (factors.length <= 1) return jsonError("Add another authenticator before removing the last one", 400, { code: "MFA_LAST_FACTOR" });

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return jsonServerError(error, "DELETE /api/admin/auth/mfa");
  return jsonOk({ success: true });
}

export async function PUT(request: Request) {
  // 끄기 · 켜기는 소유자만, 그것도 OTP 확인을 거친 세션만 — 비밀번호만 훔친 세션이 강제를 끄지 못하게(requireAuth 가 aal2 를 본다)
  const { user, error: authError } = await requireOwner();
  if (authError) return authError;
  const body = (await request.json().catch(() => ({}))) as { required?: unknown };
  if (typeof body.required !== "boolean") return jsonError("required must be a boolean");

  const admin = createAdminClient();
  const { error } = await admin
    .from("security_settings")
    .upsert({ id: 1, mfa_required: body.required, updated_at: new Date().toISOString() });
  if (error) return jsonServerError(error, "PUT /api/admin/auth/mfa");

  const { notifyAdmin } = await import("@/lib/adminNotify");
  await notifyAdmin({
    type: "config_changed",
    title: body.required ? "2단계 인증 강제를 켰습니다" : "2단계 인증 강제를 껐습니다",
    message: `${user.email ?? user.id} 가 사이트 전체 2단계 인증 강제를 ${body.required ? "켰습니다" : "껐습니다"}.`,
    metadata: { user_id: user.id, mfa_required: body.required },
  });
  return jsonOk({ required: body.required });
}
