import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPendingInvite, consumeInvite } from "@/lib/api/authorInvites";
import { getUserRole } from "@/lib/api/roles";

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
  if (!code) return fail("인증 코드가 전달되지 않았습니다. Supabase의 Redirect URLs에 /auth/callback이 허용되어 있는지 확인해 주세요.");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email) {
    const admin = createAdminClient();
    const email = user.email.toLowerCase();
    const role = getUserRole(user);

    // 초대받지 않은 계정 차단 — owner / 기존 멤버(role 보유) / 초대받은 이메일만 허용.
    // owner·기존멤버는 DB 조회 없이 통과. 미해당이면 초대 조회(실패 시 차단 — fail-closed).
    let allowed = role.isOwner || role.role !== null;
    if (!allowed) {
      try {
        const { data: inviteRow } = await admin.from("author_invites").select("email").eq("email", email).maybeSingle();
        allowed = !!inviteRow;
      } catch {
        allowed = false;
      }
    }
    if (!allowed) {
      // 세션 종료 + 방금 생성된 계정 삭제 후 차단
      await supabase.auth.signOut();
      try { await admin.auth.admin.deleteUser(user.id); } catch { /* noop */ }
      return fail("초대받지 않은 계정입니다. 사이트 관리자에게 초대를 요청해 주세요.");
    }

    // 대기중 초대 소비 → app_metadata(role/author_id/level) 부여
    try {
      const invite = await getPendingInvite(admin, user.email);
      if (invite) {
        await consumeInvite(admin, user, invite);
        // 방금 발급된 JWT 엔 새 app_metadata 가 없다 → 세션 새로고침해 role 을 토큰에 반영.
        await supabase.auth.refreshSession();
      }
    } catch { /* 초대 적용 실패해도 로그인 자체는 진행 */ }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
