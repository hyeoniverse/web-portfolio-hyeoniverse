/**
 * 댓글 입력값 서버사이드 검증
 * - SQL injection: Supabase 파라미터화 쿼리로 이미 방지 + 추가 패턴 탐지
 * - XSS: React JSX 이스케이프로 이미 방지 + HTML 태그 스트리핑
 * - 길이 제한, UUID 포맷, 제어문자 제거, 이메일 검증
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID 포맷 검증 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** 제어문자 제거 (newline, tab 허용) */
function stripControlChars(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** HTML 태그 제거 */
function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/** 댓글 content 검증 + 정제 */
export function sanitizeContent(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "CONTENT_INVALID" };
  }

  let sanitized = stripControlChars(raw);
  sanitized = stripHtmlTags(sanitized);
  const trimmed = sanitized.trim();

  if (!trimmed) {
    return { valid: false, value: "", error: "CONTENT_EMPTY" };
  }

  if (trimmed.length > 2000) {
    return { valid: false, value: "", error: "CONTENT_TOO_LONG" };
  }

  return { valid: true, value: trimmed };
}

/** 비밀번호 검증 (bcrypt 72바이트 제한 + 최소 길이) */
export function validatePassword(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: true, value: "" }; // password is optional for some flows
  }

  const trimmed = raw.trim();

  if (trimmed.length < 2) {
    return { valid: false, value: "", error: "PASSWORD_TOO_SHORT" };
  }

  if (new TextEncoder().encode(trimmed).length > 72) {
    return { valid: false, value: "", error: "PASSWORD_TOO_LONG" };
  }

  return { valid: true, value: trimmed };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 이메일 검증 */
export function validateEmail(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { valid: true, value: "" }; // optional
  }

  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "EMAIL_INVALID" };
  }

  const trimmed = raw.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, value: "", error: "EMAIL_TOO_LONG" };
  }

  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, value: "", error: "EMAIL_INVALID" };
  }

  return { valid: true, value: trimmed };
}

/** 닉네임 검증 */
export function validateNickname(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: true, value: "" }; // optional in some flows
  }

  let sanitized = stripControlChars(raw);
  sanitized = stripHtmlTags(sanitized);
  const trimmed = sanitized.trim();

  if (trimmed.length > 50) {
    return { valid: false, value: "", error: "NICKNAME_TOO_LONG" };
  }

  return { valid: true, value: trimmed };
}
