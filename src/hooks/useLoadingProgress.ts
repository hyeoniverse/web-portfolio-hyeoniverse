"use client";

import { useState, useEffect, useRef } from "react";

interface LoadingScreenResult {
  isLoading: boolean;
  isTransitioning: boolean;
}

/* 로딩 화면을 최소한 이만큼은 보여 준다.
   예전에는 1,200ms 였다. 자원이 빨리 준비돼도 그만큼 내용을 가리고 있었고,
   화면이 눈에 차오르는 속도(Speed Index)가 1.2초 늦어졌다. 연출은 남기되 대기만 줄인다. */
const MIN_DISPLAY_MS = 300;
const TRANSITION_MS = 400;

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
    if (hasCompletedRef.current) return;
    let mounted = true;

    const complete = () => {
      if (!mounted || hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      hasCompletedInitialLoad = true;

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
      /* 예전에는 window.load(=마지막 자원 하나까지 다 내려옴)를 기다렸다. 화면 아래쪽 사진이나
         3D 자료까지 포함이라, 정작 보여 줄 준비가 끝난 뒤에도 한참을 더 가리고 있었다.
         화면에 그릴 준비가 됐는지를 보는 DOMContentLoaded 로 바꾼다. */
      new Promise<void>((resolve) => {
        if (document.readyState !== "loading") return resolve();
        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
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
