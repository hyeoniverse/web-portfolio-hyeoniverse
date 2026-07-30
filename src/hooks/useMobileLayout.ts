import { useSyncExternalStore } from "react";
import { BREAKPOINT } from "@/constants";

export const MOBILE_WIDTH = BREAKPOINT.tablet;
export const MIN_DESKTOP_HEIGHT = 700;

/**
 * 모바일/태블릿 레이아웃을 사용해야 하는지 반환:
 * 너비 ≤ 1024px 또는 높이 ≤ 700px.
 * CSS @media (max-height: 700px) 와 일치하도록 ≤ 사용.
 */
export function checkMobileLayout(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth <= MOBILE_WIDTH ||
    window.innerHeight <= MIN_DESKTOP_HEIGHT
  );
}

// ── 반응형 훅: resize 시 자동 업데이트 ──

let listeners: Array<() => void> = [];
let cachedMobile = false;
let initialized = false;

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  cachedMobile = checkMobileLayout();
  window.addEventListener("resize", () => {
    const next = checkMobileLayout();
    if (next !== cachedMobile) {
      cachedMobile = next;
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(cb: () => void) {
  ensureInit();
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): boolean {
  ensureInit();
  return cachedMobile;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * checkMobileLayout()의 반응형 버전.
 * 뷰포트 리사이즈 시 자동으로 컴포넌트를 리렌더링.
 */
export function useMobileLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
