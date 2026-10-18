/**
 * 지금 화면이 공개 사이트인지 · 블로그(/posts 아래)인지 · 관리 화면인지 — 라우트로 가르는 곳은 여기 하나다.
 * 네비게이션 · 메뉴 서랍 · 푸터 · 관리 권한 확인이 이 값을 쓴다. 화면별로 무엇이 다른지는
 * 네비게이션의 NAV_SECTIONS(Navigation/navigationData) 에 모아 둔다.
 */
export type NavSection = "site" | "blog" | "admin";

export function navSectionOf(pathname: string): NavSection {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname === "/posts" || pathname.startsWith("/posts/")) return "blog";
  return "site";
}
