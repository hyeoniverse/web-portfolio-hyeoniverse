import type { RateLimitRule } from "./rateLimit";

/** 익명 댓글 작성 — IP 마다 10분 10개 · 하루 50개 */
export const COMMENT_CREATE_LIMITS: RateLimitRule[] = [
  { windowSec: 600, max: 10 },
  { windowSec: 86400, max: 50 },
];

/** 댓글 비밀번호 확인(고치기 · 지우기) — IP · 댓글마다 10분 5번 · 하루 20번 */
export const COMMENT_PASSWORD_LIMITS: RateLimitRule[] = [
  { windowSec: 600, max: 5 },
  { windowSec: 86400, max: 20 },
];

/** 답글 알림 메일 — 받는 주소마다 하루 5통 */
export const NOTIFY_MAIL_LIMIT: RateLimitRule = { windowSec: 86400, max: 5 };
