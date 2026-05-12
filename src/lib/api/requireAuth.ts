import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * API 라우트에서 인증된 사용자를 요구하는 헬퍼.
 *
 * 인증 실패 시 401 NextResponse를, 성공 시 User + 이미 생성된 supabase 클라이언트를 반환.
 * 핸들러 본문에서 supabase 가 또 필요하면 `createClient()` 를 다시 호출할 필요 없이 그대로 재사용.
 *
 * CSRF 방어는 middleware (Origin/Referer 체크) 에서 처리됨 — 모든 /api/* mutation 에 일괄 적용.
 */
export async function requireAuth(): Promise<
  | { user: User; supabase: SupabaseClient; error?: never }
  | { user?: never; supabase?: never; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, supabase };
}
