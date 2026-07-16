import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPendingInvite, consumeInvite } from "@/lib/api/authorInvites";

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
      // 초대 매칭 — 로그인 이메일이 대기중 초대와 일치하면 app_metadata(role/author_id/level) 부여.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const admin = createAdminClient();
          const invite = await getPendingInvite(admin, user.email);
          if (invite) {
            await consumeInvite(admin, user, invite);
            // 방금 발급된 JWT 엔 새 app_metadata 가 없다 → 세션 새로고침해 role 을 토큰에 반영.
            await supabase.auth.refreshSession();
          }
        }
      } catch { /* 초대 적용 실패해도 로그인 자체는 진행 */ }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/admin/login?error=oauth`);
}
