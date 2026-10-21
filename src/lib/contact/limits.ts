import type { RateLimitRule } from "@/lib/api/rateLimit";

/**
 * 문의 폼 공통 값 — 입력 길이 · 첨부 버킷 · IP 별 횟수 제한. 서버 전용.
 */

/** 첨부를 올리는 비공개 버킷(supabase/migrations/2026_10_19_contact_attachments_bucket.sql) */
export const CONTACT_BUCKET = "contact-attachments";
/** 메일에 싣는 첨부 내려받기 링크의 유효 기간 */
export const ATTACHMENT_LINK_TTL_SEC = 7 * 24 * 60 * 60;
/** 첨부 경로 모양 — <uuid>/<안전한 파일 이름>. 다른 모양은 보내기에서 받지 않는다 */
export const ATTACHMENT_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[\w.\- ]{1,120}$/;

export const FIELD_MAX = { name: 100, email: 200, title: 50, message: 5000 } as const;

/** 요청 IP — Vercel 은 x-forwarded-for 의 첫 값이 방문자다 */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** IP 별 횟수 제한 — 1차 방어(진짜 문지기는 reCAPTCHA). 공유 DB 에서 센다(lib/api/rateLimit) */
export const CONTACT_LIMITS: RateLimitRule[] = [
  { windowSec: 600, max: 5 },
  { windowSec: 86400, max: 20 },
];
