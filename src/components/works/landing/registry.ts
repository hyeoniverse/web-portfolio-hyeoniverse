/**
 * 랜딩 페이지 — 설정의 '작업물 상세 화면'이 랜딩이면 모든 작업물 상세를 랜딩으로 그린다(데이터: works.landing ›
 * 저장소 기본 데이터 › 카드 정보로 만든 기본 랜딩, landingData.ts). 사이트 메뉴 · 전환 · 셸이 같이 읽어서 가벼운 판별만 둔다.
 */

/** 저장소에 기본 랜딩 데이터가 있는 작업물 — 목록에서 미리 받아 두어 판 전환이 바로 시작되게 */
export const LANDING_PAGE_SLUGS = ["hyeoniverse", "macfolio"] as const;

/** 이 작업물을 랜딩으로 그리는가 — 랜딩 설정이면 모든 작업물(전용 데이터가 없으면 기본 랜딩) */
export function hasLandingPage(slug: string | null | undefined): slug is string {
  return !!slug;
}

/** 지금 경로가 랜딩으로 그려지는 작업물 상세인가 — 사이트 메뉴가 참고 사이트처럼 간략해지는 기준(/works/<slug>) */
export function isLandingPath(pathname: string, detailStyle: string | undefined): boolean {
  if (detailStyle !== "landing") return false;
  return /^\/works\/[^/]+\/?$/.test(pathname);
}
