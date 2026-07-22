"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * OS 의 "동작 줄이기" 설정을 구독한다.
 *
 * CSS 로 끌 수 있는 애니메이션은 `@media (prefers-reduced-motion: reduce)` 로
 * 처리하면 되지만, JS 로 매 프레임 좌표를 갱신하는 것(ChenFlow 의 force 시뮬레이션)은
 * CSS 가 손댈 수 없어서 값으로 읽어야 한다.
 *
 * SSR 에서는 false 로 시작한다 — 마운트 직후 effect 가 실제 값으로 맞춘다.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
