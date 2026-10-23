/**
 * 전용 랜딩 페이지가 있는 작업물 — 설정의 '작업물 상세 화면'이 랜딩 페이지일 때 이 작업물만 랜딩으로 그린다(나머지는 게시물 형태).
 * 랜딩은 작업물마다 처음부터 따로 만든다(components/works/landing/pages) — 기존 캡처 · 본문을 끌어 쓰지 않고, 코드로 그린 화면과 데모로.
 * 서버(상세 레이아웃의 커버 생략)와 화면이 같이 읽어서 컴포넌트를 들이지 않는 이름 목록만 둔다.
 */
export const LANDING_PAGE_SLUGS = ["hyeoniverse", "macfolio"] as const;
export type LandingPageSlug = (typeof LANDING_PAGE_SLUGS)[number];

export function hasLandingPage(slug: string | null | undefined): slug is LandingPageSlug {
  return !!slug && (LANDING_PAGE_SLUGS as readonly string[]).includes(slug);
}

/** 지금 경로가 랜딩으로 그려지는 작업물 상세인가 — 사이트 메뉴가 참고 사이트처럼 간략해지는 기준(/works/<slug>) */
export function isLandingPath(pathname: string, detailStyle: string | undefined): boolean {
  if (detailStyle !== "landing") return false;
  const m = /^\/works\/([^/]+)\/?$/.exec(pathname);
  return !!m && hasLandingPage(decodeURIComponent(m[1]!));
}
