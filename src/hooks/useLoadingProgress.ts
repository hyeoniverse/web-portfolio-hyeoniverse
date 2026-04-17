"use client";

import { useState, useEffect, useRef } from "react";

interface LoadingScreenResult {
  isLoading: boolean;
  isTransitioning: boolean;
}

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

    const checks = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise<void>((resolve) => {
        if (document.readyState === "complete") return resolve();
        window.addEventListener("load", () => resolve(), { once: true });
      }),
      // above-the-fold 이미지 프리로드
      ...Array.from(document.querySelectorAll<HTMLImageElement>("img[loading='eager'], img[fetchpriority='high']"))
        .filter((img) => !img.complete)
        .slice(0, 3)
        .map((img) => preloadImage(img.src)),
    ]);

    checks.then(complete);

    // 안전장치: 3초 후 강제 완료
    const fallback = setTimeout(complete, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallback);
    };
  }, []);

  return { isLoading, isTransitioning };
}
