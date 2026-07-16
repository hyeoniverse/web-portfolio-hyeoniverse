import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth(GitHub 등) 콜백 — provider 리다이렉트가 `?code=` 를 들고 돌아오면 세션으로 교환한다.
 * (이슈 #334 P1-b)
 *
 * signInWithOAuth 의 redirectTo 가 이 경로를 가리킨다. 성공 시 `next` 로, 실패 시 로그인 페이지로.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // open redirect 방지 — 사이트 내부 경로만 허용
  const nextParam = searchParams.get("next") || "/admin";
  const next = nextParam.startsWith("/") ? nextParam : "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/admin/login?error=oauth`);
}
