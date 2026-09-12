import type { TFunction } from "@/providers/LanguageProvider";
import { errorText } from "@/lib/apiError";

/* 댓글 입력 검사는 사유 코드를 error 에 싣는다(utils/commentValidation) — 폼의 안내 문구 키로 바꾼다 */
const COMMENT_ERROR_HINTS: Record<string, string> = {
  CONTENT_INVALID: "comments.hintContent",
  CONTENT_EMPTY: "comments.hintContent",
  CONTENT_TOO_LONG: "comments.hintContentTooLong",
  PASSWORD_TOO_SHORT: "comments.hintPasswordTooShort",
  PASSWORD_TOO_LONG: "comments.hintPasswordTooLong",
  EMAIL_INVALID: "comments.invalidEmail",
  EMAIL_TOO_LONG: "comments.invalidEmail",
  NICKNAME_TOO_LONG: "comments.hintNicknameTooLong",
};

/**
 * 댓글 요청이 실패했을 때의 문구 — 쓰기·고치기·지우기가 함께 쓴다.
 * 입력 검사 코드(error)는 폼의 안내 문구로, 그 밖의 거절(code — 비밀번호·없는 댓글 등)은 사전 문구로(#862),
 * 둘 다 아니면 fallback. 서버 문장은 한 언어라 쓰지 않는다.
 */
export function commentErrorText(body: unknown, t: TFunction, fallback: string): string {
  const legacy = body && typeof body === "object" ? (body as { error?: unknown }).error : undefined;
  const hint = typeof legacy === "string" ? COMMENT_ERROR_HINTS[legacy] : undefined;
  return hint ? t(hint) : errorText(body, t, fallback);
}
