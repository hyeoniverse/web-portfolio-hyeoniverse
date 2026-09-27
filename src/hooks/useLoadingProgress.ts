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
/* 이미지 풀 로고(워드마크)의 등장 길이 — Navigation 의 로딩 연출 프리셋 중 가장 긴 것
   (wipe: 딜레이 0.15 + 0.8초)과 맞춘 값. framer 는 JS 구동이라 getAnimations 로 잴 수 없어
   상수로 기다린다. */
const IMAGE_WORDMARK_INTRO_MS = 800;

/* 로딩 로고(워드마크) 등장 애니메이션이 끝날 때까지 기다린다 — 빠른 로드에서 로고가
   반쯤 그려진 채 shrink+crossfade 로 넘어가 버리지 않게.
   - 글자 로고: 마지막 글자의 rise/sharpen 애니메이션이 끝난 뒤 LOGO_HOLD_MS 만큼 머문다.
   - 이미지 풀 로고([data-loading-wordmark]): img 로드 후 페이드 길이 + LOGO_HOLD_MS 만큼 머문다.
     예전엔 즉시 resolve 라 인트로가 최소 대기(300ms)만에 끝나 워드마크가 보이지도 않았다.
   - 숏만 있는 이미지·배지 로고: 즉시 resolve → 예전 속도 유지.
   애니메이션이 등록되기 전에 재지 않도록 두 프레임 뒤 수집한다. */
function waitForLogoIntro(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve();
    const hold = () => setTimeout(resolve, LOGO_HOLD_MS);
    let tries = 0;
    const collect = () => {
      const letters = document.querySelectorAll("[data-loading-letter]");
      if (letters.length) {
        const anims = Array.from(letters).flatMap((el) => el.getAnimations());
        if (!anims.length) return hold();
        return void Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(hold);
      }
      const wordmark = document.querySelector<HTMLElement>("[data-loading-wordmark]");
      if (!wordmark) {
        /* 모바일 폭은 BreakpointGuard 첫 리마운트로 로고 DOM 이 한두 프레임 비어 있다.
           그 틈에 재면 로고 없는 사이트로 판정돼 인트로가 최소 대기만에 끝난다(워드마크
           안 보임) — 몇 프레임 더 보고 판단한다. 진짜 로고 없는 구성은 이 재시도(~0.3초)가
           MIN_DISPLAY_MS 안이라 체감 지연이 없다. */
        if (tries++ < 20) return void requestAnimationFrame(collect);
        return resolve();
      }
      const img = wordmark.querySelector("img");
      const ready = img && !img.complete
        ? new Promise<void>((r) => {
            img.addEventListener("load", () => r(), { once: true });
            img.addEventListener("error", () => r(), { once: true });
          })
        : Promise.resolve();
      ready.then(() => setTimeout(resolve, IMAGE_WORDMARK_INTRO_MS + LOGO_HOLD_MS));
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
