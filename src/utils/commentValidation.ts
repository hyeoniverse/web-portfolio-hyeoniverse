/**
 * 댓글 입력값 서버사이드 검증
 * - SQL injection: Supabase 파라미터화 쿼리로 이미 방지
 * - XSS: React JSX 이스케이프로 이미 방지
 * - 여기서는 길이 제한, UUID 포맷, 제어문자 제거 등 추가 검증
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

/** 댓글 content 검증 + 정제 */
export function sanitizeContent(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string") {
    return { valid: false, value: "", error: "Content must be a string" };
  }

  const trimmed = stripControlChars(raw).trim();

  if (!trimmed) {
    return { valid: false, value: "", error: "Content is empty" };
  }

  if (trimmed.length > 2000) {
    return { valid: false, value: "", error: "Content exceeds 2000 characters" };
  }

  return { valid: true, value: trimmed };
}

/** 비밀번호 검증 (bcrypt 72바이트 제한) */
export function validatePassword(raw: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: true, value: "" }; // password is optional
  }

  const trimmed = raw.trim();

  if (new TextEncoder().encode(trimmed).length > 72) {
    return { valid: false, value: "", error: "Password exceeds 72 bytes (bcrypt limit)" };
  }

  return { valid: true, value: trimmed };
}
