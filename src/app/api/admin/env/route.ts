import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSecret } from "@/lib/getSecret";

/** 환경 변수 설정 여부 확인 (값은 노출하지 않음) */
const ENV_KEYS = [
  "NEXT_PUBLIC_WEB3FORMS_KEY",
  "NEXT_PUBLIC_FORMSPREE_ID",
  "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
  "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
  "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  "NANOBANANA_API_KEY",
  "HUGGINGFACE_API_KEY",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status: Record<string, boolean> = {};
  for (const key of ENV_KEYS) {
    status[key] = !!(await getSecret(key));
  }

  return NextResponse.json({ status });
}
