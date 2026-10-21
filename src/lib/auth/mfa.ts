import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 2단계 인증(OTP 앱 · TOTP) — 관리 화면 · 관리 API 는 aal2 세션만 받는다.
 *
 * 비밀번호(또는 GitHub)만으로 만든 세션은 aal1 이다. 예전엔 새 기기 승인 · 로그인 잠금을 우리 로그인 API 에서만 봐서,
 * Supabase 에 직접 로그인(/auth/v1/token)하거나 GitHub 로 들어오면 둘 다 거치지 않았다.
 * 이제 요청마다 세션 등급을 본다 — proxy(화면 · /api/admin), requireAuth(나머지 관리 API), DB 정책(app_role 등, aal2 만).
 *
 * 등급은 getUser() 로 검증한 바로 그 세션 토큰의 aal 클레임에서 읽는다 — getUser() 뒤에만 부른다.
 */
export const MFA_PAGE = "/admin/mfa";

export interface MfaState {
  /** 지금 세션이 OTP 확인을 거쳤는가 */
  verified: boolean;
  /** 확인된 인증 앱이 있는가 — 없으면 등록부터 */
  enrolled: boolean;
}

export async function getMfaState(supabase: SupabaseClient): Promise<MfaState> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return { verified: false, enrolled: false };
    return { verified: data.currentLevel === "aal2", enrolled: data.nextLevel === "aal2" };
  } catch {
    // 판정할 수 없으면 확인 안 된 것으로(fail-closed) — 막혀도 등록 · 확인 화면은 열린다
    return { verified: false, enrolled: false };
  }
}

/** 등급이 모자라도 열어야 하는 곳 — OTP 등록 · 확인 화면과 그 API */
export function isMfaPath(pathname: string): boolean {
  return pathname === MFA_PAGE || pathname.startsWith(`${MFA_PAGE}/`) || pathname === "/api/admin/auth/mfa";
}
