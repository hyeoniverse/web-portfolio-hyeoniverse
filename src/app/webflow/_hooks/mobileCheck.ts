export const MOBILE_WIDTH = 1024;
export const MIN_DESKTOP_HEIGHT = 640;

/**
 * Returns true when the viewport should use the mobile/tablet layout:
 * either width ≤ 1024px OR height < 750px (content can't fit in 100vh panels).
 */
export function checkMobileLayout(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth <= MOBILE_WIDTH ||
    window.innerHeight < MIN_DESKTOP_HEIGHT
  );
}
