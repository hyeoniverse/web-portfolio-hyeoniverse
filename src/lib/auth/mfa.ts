import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 2단계 인증(OTP 앱 · TOTP) — 관리 화면 · 관리 API 는 aal2 세션만 받는다.
 *
 * 비밀번호(또는 GitHub)만으로 만든 세션은 aal1 이다. 예전엔 새 기기 승인 · 로그인 잠금을 우리 로그인 API 에서만 봐서,
 * Supabase 에 직접 로그인(/auth/v1/token)하거나 GitHub 로 들어오면 둘 다 거치지 않았다.
 * 이제 요청마다 세션 등급을 본다 — proxy(화면 · /api/admin), requireAuth(나머지 관리 API), DB 정책(app_role 등, aal2 만).
 *
 * 등급은 getUser() 로 검증한 바로 그 세션 토큰의 aal 클레임에서 읽는다 — getUser() 뒤에만 부른다.
 * 소유자는 설정 › 계정 에서 강제를 끌 수 있다(DB security_settings · mfa_required()) — 끄면 aal1 도 통과한다.
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

/** 강제 여부 — DB 에 묻는다. 답을 못 받으면(마이그레이션 전 · 장애) 켜진 것으로(fail-closed) */
export async function isMfaRequired(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("mfa_required");
    return error ? true : data !== false;
  } catch {
    return true;
  }
}

/** 이 세션이 관리 기능을 써도 되는가 — aal2 거나, 강제가 꺼져 있거나. 강제 여부는 aal1 일 때만 묻는다 */
export async function passesMfa(supabase: SupabaseClient): Promise<boolean> {
  if ((await getMfaState(supabase)).verified) return true;
  return !(await isMfaRequired(supabase));
}

/** 등급이 모자라도 열어야 하는 곳 — OTP 등록 · 확인 화면과 그 API */
export function isMfaPath(pathname: string): boolean {
  return pathname === MFA_PAGE || pathname.startsWith(`${MFA_PAGE}/`) || pathname === "/api/admin/auth/mfa";
}
