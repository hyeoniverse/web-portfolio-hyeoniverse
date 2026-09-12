import type { ApiErrorCode } from "@/lib/apiError";

/**
 * Supabase 인증 오류를 화면 코드로(#862). Supabase 가 쓴 문장은 영어라, 알아볼 수 있는 사유만 코드로 바꿔
 * 화면 언어 문구로 보이게 한다. 모르는 사유는 undefined — 화면은 그 자리의 대체 문구를 쓴다.
 * 코드 목록: node_modules/@supabase/auth-js/dist/module/lib/error-codes.d.ts
 */
export function authErrorCode(error: { code?: string } | null | undefined): ApiErrorCode | undefined {
  switch (error?.code) {
    case "invalid_credentials":
      return "AUTH_PASSWORD_WRONG";
    case "email_not_confirmed":
      return "AUTH_EMAIL_NOT_CONFIRMED";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "AUTH_RATE_LIMITED";
    case "same_password":
      return "ACCOUNT_SAME_PASSWORD";
    case "weak_password":
      return "ACCOUNT_PASSWORD_WEAK";
    case "email_exists":
    case "user_already_exists":
      return "ACCOUNT_EMAIL_TAKEN";
    case "email_address_invalid":
      return "ACCOUNT_EMAIL_INVALID";
    default:
      return undefined;
  }
}
