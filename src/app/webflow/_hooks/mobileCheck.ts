export const MOBILE_WIDTH = 1024;
export const MIN_DESKTOP_HEIGHT = 640;

/**
 * 모바일/태블릿 레이아웃을 사용해야 하는지 반환:
 * 너비 ≤ 1024px 또는 높이 < 640px (100vh 패널에 콘텐츠가 맞지 않음).
 */
export function checkMobileLayout(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth <= MOBILE_WIDTH ||
    window.innerHeight < MIN_DESKTOP_HEIGHT
  );
}
