import type { TFunction } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";

/**
 * 화면이 화면 언어 문구로 바꿀 수 있는 실패 코드(#862).
 *
 * 서버는 실패 응답에 `{ error, code, params }` 를 싣고(`jsonError`), 브라우저 쪽 검사는 `CodedError` 를 던진다.
 * 화면은 `errorText` 로 문구를 얻는다. 문구는 사전 `apiErrors.<코드>` 에 두고, 관리자 화면에서만 나오는 것은
 * `admin.apiErrors.<코드>` 에 둔다. 코드를 더하면 두 언어 문구도 함께 더한다(apiErrorCodes 검사가 확인한다).
 *
 * 코드는 사용자가 평소 쓰다 만날 수 있는 실패에만 붙인다. "Invalid id" 처럼 화면이 정상적으로 부르면
 * 나오지 않는 API 계약 오류는 코드 없이 두고, 화면은 그 자리의 대체 문구를 보인다.
 */
export const API_ERROR_CODES = [
  "UPLOAD_TOO_LARGE",
  "UPLOAD_BODY_TOO_LARGE",
  "UPLOAD_UNREADABLE",
  "UPLOAD_NO_EXTENSION",
  "UPLOAD_TYPE_NOT_ALLOWED",
  "UPLOAD_TYPE_MISMATCH",
  "UPLOAD_CONVERT_FAILED",
  "UPLOAD_ONLY_IMAGE",
  "UPLOAD_ONLY_AUDIO",
  "UPLOAD_ONLY_PDF",
  "UPLOAD_ONLY_FONT",
  "UPLOAD_STILL_TOO_LARGE",
  "UNAUTHORIZED",
  "FORBIDDEN_LEVEL",
  "FORBIDDEN_OWNER",
  "AUTH_PASSWORD_WRONG",
  "AUTH_EMAIL_NOT_CONFIRMED",
  "AUTH_RATE_LIMITED",
  "ACCOUNT_OAUTH_ONLY",
  "ACCOUNT_CURRENT_PASSWORD_REQUIRED",
  "ACCOUNT_CURRENT_PASSWORD_WRONG",
  "ACCOUNT_PASSWORD_TOO_SHORT",
  "ACCOUNT_PASSWORD_WEAK",
  "ACCOUNT_SAME_PASSWORD",
  "ACCOUNT_EMAIL_TAKEN",
  "ACCOUNT_EMAIL_INVALID",
  "MEMBER_NOT_FOUND",
  "MEMBER_OWNER_LOCKED",
  "MEMBER_CANNOT_DELETE_SELF",
  "MEMBER_CANNOT_DELETE_OWNER",
  "GITHUB_NOT_LINKED",
  "NOTIFICATION_NOT_FOUND",
  "ACCESS_REQUEST_ALREADY_RESOLVED",
  "ACCESS_REQUEST_NO_AUTHOR_PROFILE",
  "ACCESS_REQUEST_POST_GONE",
  "ACCESS_REQUEST_WORK_GONE",
  "SETTINGS_OWNER_ONLY",
  "PROFILE_DELETE_OTHERS",
  "PROFILE_EDIT_OTHERS",
  "PROFILE_ADD_OTHERS",
  "GITHUB_REPO_FORMAT",
  "GITHUB_TOKEN_MISSING",
  "GITHUB_TOKEN_INVALID",
  "GITHUB_TOKEN_FORBIDDEN",
  "GITHUB_REPO_NOT_FOUND",
  "GITHUB_REPO_FORBIDDEN",
  "GITHUB_RATE_LIMITED",
  "GITHUB_REQUEST_FAILED",
  "GITHUB_OWNER_LINK_MISSING",
  "COMMENT_NOT_FOUND",
  "COMMENT_NO_PASSWORD",
  "COMMENT_PASSWORD_REQUIRED",
  "COMMENT_PASSWORD_WRONG",
  "COMMENT_ALREADY_REMOVED",
  "SESSION_STALE",
  "POST_OWN_ONLY",
  "WORK_TEAM_ONLY",
  "WORK_TEAM_LINK_ADMIN_ONLY",
  "POST_TITLE_TOO_LONG",
  "SERIES_TITLE_TOO_LONG",
  "SERIES_NOT_FOUND",
  "UNSPLASH_KEY_MISSING",
  "PEXELS_KEY_MISSING",
  "COVER_SEARCH_FAILED",
  "COVER_DOWNLOAD_FAILED",
  "AI_PROMPT_TOO_LONG",
  "AI_NOT_CONFIGURED",
  "AI_GENERATE_FAILED",
  "TRANSLATION_NOT_CONFIGURED",
  "TRANSLATION_FAILED",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export type ErrorParams = Record<string, string | number>;

/** 코드를 실은 오류 — 실패 응답이나 브라우저 쪽 검사가 만든다. `message` 는 로그·개발용이다. */
export class CodedError extends Error {
  readonly code?: ApiErrorCode;
  readonly params?: ErrorParams;
  /** 서버 응답에서 만든 경우 HTTP 상태 */
  readonly status?: number;

  constructor(message: string, opts: { code?: ApiErrorCode; params?: ErrorParams; status?: number } = {}) {
    super(message);
    this.name = "CodedError";
    this.code = opts.code;
    this.params = opts.params;
    this.status = opts.status;
  }
}

/** 실패 응답 본문을 `CodedError` 로. 본문이 비었거나 JSON 이 아니어도 상태는 남긴다 */
export function errorFromBody(body: unknown, status?: number): CodedError {
  const b = body && typeof body === "object" ? (body as { error?: unknown; code?: unknown; params?: unknown }) : {};
  const message = typeof b.error === "string" && b.error ? b.error : `Request failed${status ? ` (${status})` : ""}`;
  return new CodedError(message, {
    code: typeof b.code === "string" ? (b.code as ApiErrorCode) : undefined,
    params: b.params && typeof b.params === "object" ? (b.params as ErrorParams) : undefined,
    status,
  });
}

/** 실패한 fetch 응답을 `CodedError` 로. 413·게이트웨이 오류처럼 본문이 JSON 이 아니어도 된다 */
export async function errorFromResponse(res: Response): Promise<CodedError> {
  return errorFromBody(await res.json().catch(() => null), res.status);
}

/**
 * 오류를 화면 언어 문구로. `CodedError` 나 실패 응답 본문(`{ error, code, params }`)의 코드가 사전에 있으면
 * 그 문구를, 아니면 `fallback` 을 돌려준다. 서버가 쓴 문장(`error`)은 화면 언어와 다를 수 있어 쓰지 않는다.
 */
export function errorText(err: unknown, t: TFunction, fallback: string): string {
  const src = err && typeof err === "object" ? (err as { code?: unknown; params?: unknown }) : null;
  const code = typeof src?.code === "string" ? src.code : "";
  if (!code) return fallback;
  const params = src?.params && typeof src.params === "object" ? (src.params as ErrorParams) : undefined;
  for (const key of [`apiErrors.${code}`, `admin.apiErrors.${code}`]) {
    const text = t(key);
    /* t() 는 없는 키에 키 경로를 그대로 돌려준다 */
    if (text !== key) return params ? fillTemplate(text, params) : text;
  }
  return fallback;
}
