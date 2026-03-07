import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateSecretsCache } from "@/lib/getSecret";

/** 편집 가능한 키 목록 */
const ALLOWED_KEYS = [
  "NEXT_PUBLIC_WEB3FORMS_KEY",
  "NEXT_PUBLIC_FORMSPREE_ID",
  "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
  "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
  "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  "UNSPLASH_ACCESS_KEY",
  "NANOBANANA_API_KEY",
  "HUGGINGFACE_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_TRANSLATE_API_KEY",
  "DEEPL_API_KEY",
  "RESEND_API_KEY",
] as const;

// GET /api/admin/secrets — 저장된 값 조회 (마스킹)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("config")
    .eq("id", "secrets")
    .single();

  const secrets = (data?.config as Record<string, string>) ?? {};

  // 각 키의 상태: DB 값 → process.env fallback
  const result: Record<string, { value: string; source: "db" | "env" | "none" }> = {};
  for (const key of ALLOWED_KEYS) {
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

  return NextResponse.json({ secrets: result });
}

// PUT /api/admin/secrets — 값 저장
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates = body.secrets as Record<string, string> | undefined;
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateSecretsCache();

  return NextResponse.json({ success: true });
}

// POST /api/admin/secrets — 비밀번호 확인 후 원본 값 반환
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password, key } = await request.json();
  if (!password || !key) {
    return NextResponse.json({ error: "Password and key required" }, { status: 400 });
  }

  // 비밀번호 재확인
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (authError) {
    return NextResponse.json({ error: "Invalid password" }, { status: 403 });
  }

  if (!ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number])) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
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

  return NextResponse.json({ value });
}

function mask(val: string): string {
  if (val.length <= 6) return "••••••";
  return val.slice(0, 3) + "•".repeat(Math.min(val.length - 6, 20)) + val.slice(-3);
}
