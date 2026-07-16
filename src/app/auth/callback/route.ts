import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPendingInvite, consumeInvite } from "@/lib/api/authorInvites";

/**
 * OAuth(GitHub 등) 콜백 — provider 리다이렉트가 `?code=` 를 들고 돌아오면 세션으로 교환한다.
 * (이슈 #334 P1-b)
 *
 * 실패 시 로그인 페이지로 `?error=oauth&reason=<상세>` 를 붙여 되돌린다(원인 파악용).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // open redirect 방지 — 사이트 내부 경로만 허용
  const nextParam = searchParams.get("next") || "/admin";
  const next = nextParam.startsWith("/") ? nextParam : "/admin";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/admin/login?error=oauth&reason=${encodeURIComponent(reason)}`);

  // provider 가 에러로 되돌린 경우(사용자 거부·설정 오류·redirect URL 미허용 등) — 그 사유를 그대로 전달
  const providerErr = searchParams.get("error_description") || searchParams.get("error");
  if (providerErr) return fail(providerErr);
  if (!code) return fail("인증 코드(code)가 없습니다. Supabase Redirect URLs 에 /auth/callback 이 허용됐는지 확인하세요.");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

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
