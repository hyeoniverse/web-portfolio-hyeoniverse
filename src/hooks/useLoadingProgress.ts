"use client";

import { useState, useEffect, useRef } from "react";

// ============================================
// 타입
// ============================================
interface LoadingScreenResult {
  isLoading: boolean;
  isTransitioning: boolean;
}

// ============================================
// 상수
// ============================================
const LOADING_CONFIG = {
  minLoadingTime: 1500, // 로딩 화면을 표시할 최소 시간
  transitionDelay: 1200, // 퇴장 애니메이션 지속 시간 (로고 모프 + 와이프)
} as const;

// ============================================
// useLoadingScreen - 초기 로드 전용
// ============================================

// 모듈 레벨 플래그: 부모 트리 변경으로 인한 컴포넌트 리마운트에도 유지됨
// (예: RecaptchaProvider가 Fragment에서 GoogleReCaptchaProvider로 전환될 때)
let hasCompletedInitialLoad = false;

/** 초기 로딩이 완료됐는지 여부 (모듈 레벨 플래그 조회) */
export function isInitialLoadComplete(): boolean {
  return hasCompletedInitialLoad;
}

export function useLoadingScreen(): LoadingScreenResult {
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const hasCompletedRef = useRef(hasCompletedInitialLoad);
  const fontsLoadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // 폰트 로드 상태 추적
    if (document.fonts) {
      document.fonts.ready.then(() => {
        fontsLoadedRef.current = true;
      });
    } else {
      fontsLoadedRef.current = true;
    }

    // 완료 조건 체크
    const checkReady = () => {
      if (!mounted || hasCompletedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const minTimePassed = elapsed >= LOADING_CONFIG.minLoadingTime;
      const isReady =
        document.readyState === "complete" && fontsLoadedRef.current;

      if (minTimePassed && isReady) {
        completeLoading();
      }
    };

    // 로딩 완료 시퀀스
    const completeLoading = () => {
      if (!mounted || hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      hasCompletedInitialLoad = true;

      // 짧은 일시 정지 후 퇴장 전환 시작
      setTimeout(() => {
        if (!mounted) return;
        setIsTransitioning(true);

        // 전환 애니메이션 후 로딩 화면 숨김
        setTimeout(() => {
          if (!mounted) return;
          setIsLoading(false);
          setIsTransitioning(false);
        }, LOADING_CONFIG.transitionDelay);
      }, 400);
    };

    // 폴링 시작
    const checkInterval = setInterval(checkReady, 60);
    checkReady();

    // 폴백: 최대 시간 후 강제 완료
    const maxTimeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        completeLoading();
      }
    }, 5000);

    // load 이벤트 리스닝
    const handleLoad = () => {
      setTimeout(checkReady, 100);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      mounted = false;
      clearInterval(checkInterval);
      clearTimeout(maxTimeout);
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  return { isLoading, isTransitioning };
}
