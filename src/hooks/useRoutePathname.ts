"use client";

import { usePathname } from "next/navigation";

/**
 * 주소 정리 — 배포(Vercel)가 다시 그린 홈의 "/index" 를 "/" 로 되돌린다.
 *
 * Vercel 이 60초마다 다시 그린(ISR) 홈은 페이지 정보에 주소가 "/" 가 아니라 "/index" 로 실린다
 * (HTML 안의 `"c":["","index"]`). 빌드 때 처음 그린 홈과 로컬 `next start` 가 다시 그린 홈은 "/" 다.
 * 서버와 브라우저가 모두 그 값을 읽으므로, 주소로 홈인지 가르는 곳이 홈을 못 알아봤다
 * (레이아웃 푸터가 숨지 않아 홈에 푸터가 두 개 그려졌다, #1100).
 */
export function normalizeRoutePath(pathname: string | null | undefined): string {
  if (!pathname) return "";
  return pathname === "/index" ? "/" : pathname;
}

/** 지금 주소 — usePathname 과 같되 "/index" 를 "/" 로 읽는다(normalizeRoutePath). 비어 있으면 "" */
export function useRoutePathname(): string {
  return normalizeRoutePath(usePathname());
}
