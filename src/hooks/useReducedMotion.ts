"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * 방문자 기기의 "동작 줄이기" 설정(docs/design-system.md 3.9-3 · 3.9-4).
 *
 * 저절로 도는 것(자동 넘김 · 순환 · 회전 · 배경 영상)은 이 값이 true 면 멈춘다.
 * 보는 중에 설정을 바꿔도 따라간다. 서버에서는 false — 첫 그림은 평소 모습이고, 붙은 뒤 바로 멈춘다.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
