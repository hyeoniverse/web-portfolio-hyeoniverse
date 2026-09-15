"use client";

import { useState, useEffect, useRef } from "react";

interface LoadingScreenResult {
  isLoading: boolean;
  isTransitioning: boolean;
}

/* 로딩 화면을 최소한 이만큼은 보여 준다.
   예전에는 1,200ms 였다. 자원이 빨리 준비돼도 그만큼 내용을 가리고 있었고,
   화면이 눈에 차오르는 속도(Speed Index)가 1.2초 늦어졌다. 연출은 남기되 대기만 줄인다.
   글자 로고(워드마크)는 아래 등장 대기가 별도로 더 붙는다. */
const MIN_DISPLAY_MS = 300;
const TRANSITION_MS = 400;
/* 워드마크 등장이 끝난 뒤 완성된 상태로 잠깐 머무는 시간(전환 시작 전 한 박자). */
const LOGO_HOLD_MS = 250;

/* 로딩 로고(텍스트 워드마크) 등장 애니메이션이 끝날 때까지 기다린다 — 빠른 로드에서 글자가
   반쯤 그려진 채 shrink+crossfade 로 넘어가 버리지 않게. 마지막 글자의 rise/sharpen 이 끝난 뒤
   LOGO_HOLD_MS 만큼 더 머문 뒤 resolve. 이미지·배지 로고엔 [data-loading-letter] 가 없어 즉시
   resolve → 예전 속도 유지. 애니메이션이 등록되기 전에 재지 않도록 두 프레임 뒤 수집한다. */
function waitForLogoIntro(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve();
    const hold = () => setTimeout(resolve, LOGO_HOLD_MS);
    const collect = () => {
      const letters = document.querySelectorAll("[data-loading-letter]");
      if (!letters.length) return resolve();
      const anims = Array.from(letters).flatMap((el) => el.getAnimations());
      if (!anims.length) return hold();
      Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(hold);
    };
    requestAnimationFrame(() => requestAnimationFrame(collect));
  });
}

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
      // 로고 워드마크 등장이 끝날 때까지 (글자 로고에서만 대기, 그 외엔 즉시)
      waitForLogoIntro(),
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
