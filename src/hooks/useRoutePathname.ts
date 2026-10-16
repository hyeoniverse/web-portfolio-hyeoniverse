"use client";

import { usePathname } from "next/navigation";
import { appPathOnBlogHost, isBlogHost } from "@/lib/siteHosts";

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

/** 브라우저 주소 경로 → 앱 경로. 블로그 주소(blog.hyeoniverse.com/x)는 proxy 가 /posts/x 를 그리지만 브라우저의
    usePathname 은 주소창 그대로 /x 를 돌려준다(서버는 /posts/x). 둘을 앱 경로로 맞춰 하이드레이션 전후 값이 같게 한다 */
export function toRoutePath(pathname: string): string {
  if (!pathname || typeof window === "undefined" || !isBlogHost(window.location.host)) return pathname;
  return appPathOnBlogHost(pathname);
}

/** 지금 주소 — usePathname 과 같되 "/index" 를 "/" 로, 블로그 주소의 짧은 경로를 앱 경로(/posts/…)로 읽는다. 비어 있으면 "" */
export function useRoutePathname(): string {
  return toRoutePath(normalizeRoutePath(usePathname()));
}
