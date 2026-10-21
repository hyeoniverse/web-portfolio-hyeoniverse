import { timingSafeEqual } from "node:crypto";

/**
 * cron 라우트 호출 확인 — `Authorization: Bearer ${CRON_SECRET}` 만 받는다.
 *
 * 예전엔 `x-vercel-cron: 1` 헤더가 있으면 비밀값 확인을 건너뛰었는데, 그 헤더는 아무 클라이언트나 붙일 수 있다.
 * Vercel Cron 도 CRON_SECRET 이 설정돼 있으면 같은 Bearer 헤더를 붙여 보낸다(지금 예약 작업은 pg_cron 이 맡는다).
 * 비교는 시간 차이로 비밀값이 새지 않게 timingSafeEqual 로 한다. CRON_SECRET 이 없으면 모두 거절(fail-closed).
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
