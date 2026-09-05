/**
 * "방금 전 / N분 전 / N시간 전 / N일 전 / 절대 날짜" 상대시간 포맷.
 *
 * 같은 구현이 알림 페이지·대시보드·신고 목록·계정 탭·프로필 편집기·멤버 목록·네비게이션
 * 일곱 곳에 흩어져 있던 것을 모았다.
 *
 * `now` 를 인자로 받는 이유는 순수 함수로 두기 위해서다. 안에서 `Date.now()` 를 부르면
 * 렌더할 때마다 결과가 달라져 같은 입력에 다른 출력이 나오고, 서버에서 그린 HTML 과
 * 클라이언트의 첫 렌더가 어긋난다. 호출부는 `useNow()` 로 값을 받아 넘긴다.
 */

import type { Language } from "@/types/app";

export type RelativeTimeOptions = {
  /** 7일이 지나 절대 날짜로 떨어질 때 연도를 함께 적을지. 기본 true. */
  withYear?: boolean;
};

const MINUTE = 60_000;

export function formatRelativeTime(
  iso: string,
  now: number,
  language: Language,
  options?: RelativeTimeOptions,
): string {
  const date = new Date(iso);
  const time = date.getTime();
  // 파싱 실패(NaN)면 손대지 않고 원문을 그대로 돌려준다 — "Invalid Date" 를 보여주는 것보다 낫다.
  if (Number.isNaN(time)) return iso;

  const ko = language === "ko";
  const mins = Math.floor((now - time) / MINUTE);
  // 시계가 어긋나 미래로 나오는 경우(mins < 0)도 "방금 전" 으로 접는다.
  if (mins < 1) return ko ? "방금 전" : "just now";
  if (mins < 60) return ko ? `${mins}분 전` : `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return ko ? `${hours}시간 전` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return ko ? `${days}일 전` : `${days}d ago`;

  return date.toLocaleDateString(ko ? "ko-KR" : "en-US", {
    ...(options?.withYear === false ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
  });
}
