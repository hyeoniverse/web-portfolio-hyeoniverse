import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/api/requireRole";
import { jsonError, jsonOk, jsonServerError } from "@/lib/api/response";
import { authErrorCode } from "@/lib/api/authErrorCode";
import { invalidateSecretsCache } from "@/lib/getSecret";

/** 편집 가능한 키 목록 */
const EDITABLE_KEYS = [
  "NEXT_PUBLIC_WEB3FORMS_KEY",
  "NEXT_PUBLIC_FORMSPREE_ID",
  "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
  "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
  "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  "UNSPLASH_ACCESS_KEY",
  "PEXELS_API_KEY",
  "NANOBANANA_API_KEY",
  "HUGGINGFACE_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_TRANSLATE_API_KEY",
  "DEEPL_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "GITHUB_TOKEN",
] as const;

const READ_ONLY_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  /* cron 인증 비밀 — 잘못 건드리면 예약 발행/휴지통 purge 등 모든 cron 망가짐. UI 는 노출만, 편집 X */
  "CRON_SECRET",
] as const;

const ALLOWED_KEYS = EDITABLE_KEYS;

// GET /api/admin/secrets — 저장된 값 조회 (마스킹)
/* 사이트 전역 API 키 저장소다. requireAuth 만 걸려 있던 동안에는 로그인한 아무 멤버나
   PUT/DELETE 로 키를 덮어쓰거나 지울 수 있었다(번역·AI 공급자를 자기 키로 바꾸는 것 포함).
   GET 은 값을 마스킹해 돌려주지만, 어떤 키가 설정돼 있는지 자체가 운영 정보다.
   저자 관리·사이트 설정과 같은 등급으로 올린다. */
export async function GET() {
  const { error: authError } = await requireOwner();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "secrets")
    .single();

  const secrets = (data?.config as Record<string, string>) ?? {};

  // 각 키의 상태: DB 값 → process.env fallback
  const result: Record<string, { value: string; source: "db" | "env" | "none"; readOnly?: boolean }> = {};
  for (const key of EDITABLE_KEYS) {
    const dbVal = secrets[key] || "";
    const envVal = process.env[key] || "";
    if (dbVal) {
      result[key] = { value: mask(dbVal), source: "db" };
    } else if (envVal) {
      result[key] = { value: mask(envVal), source: "env" };
    } else {
      result[key] = { value: "", source: "none" };
    }
  }

  for (const key of READ_ONLY_KEYS) {
    const envVal = process.env[key] || "";
    result[key] = {
      value: envVal ? mask(envVal) : "",
      source: envVal ? "env" : "none",
      readOnly: true,
    };
  }

  return jsonOk({ secrets: result });
}

// PUT /api/admin/secrets — 값 저장
export async function PUT(request: Request) {
  const { error: authError } = await requireOwner();
  if (authError) return authError;

  const body = await request.json();
  const updates = body.secrets as Record<string, string> | undefined;
  if (!updates || typeof updates !== "object") {
    return jsonError("Invalid body", 400);
  }

  // 허용된 키만 필터링
  const filtered: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in updates) {
      filtered[key] = updates[key];
    }
  }

  const admin = createAdminClient();

  // 기존 값과 머지
  const { data: existing } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "secrets")
    .single();

  const merged = { ...((existing?.config as Record<string, string>) ?? {}), ...filtered };

  // 빈 값은 제거
  for (const key of Object.keys(merged)) {
    if (!merged[key]) delete merged[key];
  }

  const { error } = await admin
    .from("site_settings")
    .upsert({ id: "secrets", config: merged, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return jsonServerError(error, "PUT /api/admin/secrets");

  invalidateSecretsCache();

  return jsonOk({ success: true });
}

// POST /api/admin/secrets — 비밀번호 확인 후 원본 값 반환
export async function POST(request: Request) {
  const { user, error: authError } = await requireOwner();
  if (authError) return authError;

  const { password, key } = await request.json();
  if (!password || !key) {
    return jsonError("Password and key required", 400);
  }

  // 비밀번호 재확인 — requireOwner 이후라 user 보장됨.
  // 세션 미-persist 전용 클라이언트로 검증한다: SSR 클라이언트로 signInWithPassword 하면
  // 현재 admin 세션이 회전되는 부작용이 있고, 세션 저장 단계의 예외가 자격증명 오류처럼
  // 뭉개질 수 있다. 여기선 검증만 필요하므로 세션을 저장하지 않는다.
  const verifier = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  // 실제 원인을 그대로 노출 — "Invalid password" 로 뭉개면 이메일 미확인·rate limit 등을 구분 못 함
  if (signInError) {
    /* 자격증명 오류·이메일 미확인·요청 과다를 화면이 구분해 보이도록 코드로 싣는다(#862) */
    const code = authErrorCode(signInError);
    return jsonError(signInError.message || "Invalid password", 403, code ? { code } : undefined);
  }

  if (!ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number])) {
    return jsonError("Invalid key", 400);
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "secrets")
    .single();

  const secrets = (data?.config as Record<string, string>) ?? {};
  const dbVal = secrets[key] || "";
  const envVal = process.env[key] || "";
  const value = dbVal || envVal || "";

  return jsonOk({ value });
}

// DELETE /api/admin/secrets — DB에서 키 삭제
export async function DELETE(request: Request) {
  const { error: authError } = await requireOwner();
  if (authError) return authError;

  const { key } = await request.json();
  if (!key || !ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number])) {
    return jsonError("Invalid key", 400);
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "secrets")
    .single();

  const config = { ...((existing?.config as Record<string, string>) ?? {}) };
  delete config[key];

  const { error } = await admin
    .from("site_settings")
    .upsert({ id: "secrets", config, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return jsonServerError(error, "DELETE /api/admin/secrets");

  invalidateSecretsCache();

  return jsonOk({ success: true });
}

function mask(val: string): string {
  if (val.length <= 6) return "••••••";
  return val.slice(0, 3) + "•".repeat(Math.min(val.length - 6, 20)) + val.slice(-3);
}
