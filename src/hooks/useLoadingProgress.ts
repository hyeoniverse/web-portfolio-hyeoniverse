"use client";

import { useState, useEffect, useRef } from "react";

interface LoadingScreenResult {
  isLoading: boolean;
  isTransitioning: boolean;
}

const MIN_DISPLAY_MS = 1200;
const TRANSITION_MS = 400;
const STORAGE_KEY = "loading-screen-completed";

/* 모듈 레벨 변수는 server/client 모두 false 로 시작 (hydration mismatch 방지).
 * sessionStorage 읽기는 useEffect 안에서만 — 클라이언트 hydration 끝난 뒤. */
let hasCompletedInitialLoad = false;

export function isInitialLoadComplete(): boolean {
  return hasCompletedInitialLoad;
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

export function useLoadingScreen(): LoadingScreenResult {
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasCompletedRef = useRef(hasCompletedInitialLoad);

  useEffect(() => {
    /* hydration 끝난 뒤 sessionStorage 확인 — 이전에 완료했었다면 LoadingScreen 즉시 스킵.
     * (모듈 레벨에서 읽으면 server=false vs client=true 로 hydration mismatch 발생) */
    if (!hasCompletedRef.current && window.sessionStorage?.getItem(STORAGE_KEY) === "1") {
      hasCompletedRef.current = true;
      hasCompletedInitialLoad = true;
      setIsLoading(false);
      return;
    }
    if (hasCompletedRef.current) return;
    let mounted = true;

    const complete = () => {
      if (!mounted || hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      hasCompletedInitialLoad = true;
      try { window.sessionStorage?.setItem(STORAGE_KEY, "1"); } catch { /* private mode 등 */ }

      setIsTransitioning(true);
      setTimeout(() => {
        if (!mounted) return;
        setIsLoading(false);
        setIsTransitioning(false);
      }, TRANSITION_MS);
    };

    const start = Date.now();

    const checks = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise<void>((resolve) => {
        if (document.readyState === "complete") return resolve();
        window.addEventListener("load", () => resolve(), { once: true });
      }),
      ...Array.from(document.querySelectorAll<HTMLImageElement>("img[loading='eager'], img[fetchpriority='high']"))
        .filter((img) => !img.complete)
        .slice(0, 3)
        .map((img) => preloadImage(img.src)),
    ]);

    checks.then(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(complete, remaining);
    });

    // 안전장치: 3초 후 강제 완료
    const fallback = setTimeout(complete, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallback);
    };
  }, []);

  return { isLoading, isTransitioning };
}
