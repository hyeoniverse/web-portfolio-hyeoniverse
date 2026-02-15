"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

// ============================================
// 타입
// ============================================
interface LoadingItem {
  id: string;
  type: "component" | "image" | "font" | "script" | "stylesheet" | "resource";
  loaded: boolean;
  weight: number;
}

interface LoadingProgressResult {
  progress: number;
  isComplete: boolean;
  registerLoadingItem: (
    id: string,
    type: LoadingItem["type"],
    weight?: number
  ) => void;
  markAsLoaded: (id: string) => void;
  loadingItems: LoadingItem[];
}

interface LoadingScreenResult {
  isLoading: boolean;
  isTransitioning: boolean;
  progress: number;
}

// ============================================
// 상수
// ============================================
const LOADING_CONFIG = {
  minLoadingTime: 1500, // 로딩 화면을 표시할 최소 시간 (초기 로드)
  navigationLoadingTime: 1000, // 클라이언트 내비게이션 최소 시간
  transitionDelay: 1200, // 퇴장 애니메이션 지속 시간 (로고 모프 + 와이프)
} as const;

// 내비게이션 시 로딩 화면을 표시할 페이지
const LOADING_ENABLED_PAGES = ["/"];

// ============================================
// useLoadingProgress - 실제 리소스 추적
// ============================================
export function useLoadingProgress(): LoadingProgressResult {
  const [loadingItems, setLoadingItems] = useState<LoadingItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const initialized = useRef(false);

  const registerLoadingItem = useCallback(
    (id: string, type: LoadingItem["type"], weight = 1) => {
      setLoadingItems((prev) => {
        if (prev.some((item) => item.id === id)) return prev;
        return [...prev, { id, type, loaded: false, weight }];
      });
    },
    []
  );

  const markAsLoaded = useCallback((id: string) => {
    setLoadingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, loaded: true } : item))
    );
  }, []);

  useEffect(() => {
    if (loadingItems.length === 0) {
      setProgress(0);
      return;
    }

    const totalWeight = loadingItems.reduce(
      (sum, item) => sum + item.weight,
      0
    );
    const loadedWeight = loadingItems
      .filter((item) => item.loaded)
      .reduce((sum, item) => sum + item.weight, 0);

    const newProgress =
      totalWeight > 0 ? (loadedWeight / totalWeight) * 100 : 0;

    setProgress(newProgress);

    if (loadingItems.every((item) => item.loaded) && loadingItems.length > 0) {
      setIsComplete(true);
    }
  }, [loadingItems]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 핵심 항목 등록
    registerLoadingItem("dom-ready", "component", 2);
    registerLoadingItem("fonts", "font", 3);

    // 폰트 추적
    if (document.fonts) {
      document.fonts.ready.then(() => markAsLoaded("fonts"));
    } else {
      markAsLoaded("fonts");
    }

    // 기존 리소스 추적
    const trackResources = () => {
      const resources = performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[];

      resources.forEach((res) => {
        const id = `resource-${res.name}`;
        let type: LoadingItem["type"] = "resource";
        let weight = 1;

        switch (res.initiatorType) {
          case "img":
            type = "image";
            weight = 2;
            break;
          case "script":
            type = "script";
            weight = 2;
            break;
          case "link":
          case "css":
            type = "stylesheet";
            weight = 2;
            break;
        }

        registerLoadingItem(id, type, weight);
        if (res.responseEnd > 0) markAsLoaded(id);
      });
    };

    if (document.readyState === "complete") {
      trackResources();
      markAsLoaded("dom-ready");
    } else {
      window.addEventListener("load", () => {
        trackResources();
        markAsLoaded("dom-ready");
      });
    }

    // 새 리소스 관찰
    let observer: PerformanceObserver | null = null;

    if (typeof PerformanceObserver !== "undefined") {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const res = entry as PerformanceResourceTiming;
            const id = `resource-${res.name}`;

            let type: LoadingItem["type"] = "resource";
            let weight = 1;

            switch (res.initiatorType) {
              case "img":
                type = "image";
                weight = 2;
                break;
              case "script":
                type = "script";
                weight = 2;
                break;
              case "link":
              case "css":
                type = "stylesheet";
                weight = 2;
                break;
            }

            registerLoadingItem(id, type, weight);
            if (res.responseEnd > 0) markAsLoaded(id);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ["resource"] });
      } catch {
        // PerformanceObserver 미지원
      }
    }

    return () => {
      observer?.disconnect();
    };
  }, [registerLoadingItem, markAsLoaded]);

  return {
    progress: Math.min(progress, 100),
    isComplete,
    registerLoadingItem,
    markAsLoaded,
    loadingItems,
  };
}

// ============================================
// useLoadingScreen - 간소화 및 안정적 구현
// ============================================

// 모듈 레벨 플래그: 부모 트리 변경으로 인한 컴포넌트 리마운트에도 유지됨
// (예: RecaptchaProvider가 Fragment에서 GoogleReCaptchaProvider로 전환될 때)
let hasCompletedInitialLoad = false;

export function useLoadingScreen(): LoadingScreenResult {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);

  const startTimeRef = useRef<number>(Date.now());
  const hasCompletedRef = useRef(hasCompletedInitialLoad);
  const fontsLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const previousPathnameRef = useRef<string | null>(null);

  // 홈으로의 내비게이션 감지 및 로딩 상태 초기화
  useEffect(() => {
    const isNavigatingToLoadingPage =
      previousPathnameRef.current !== null &&
      previousPathnameRef.current !== pathname &&
      LOADING_ENABLED_PAGES.includes(pathname);

    if (isNavigatingToLoadingPage) {
      // 홈으로의 클라이언트 내비게이션 시 로딩 상태 초기화
      isInitialLoadRef.current = false;
      hasCompletedRef.current = false;
      startTimeRef.current = Date.now();
      setIsLoading(true);
      setIsTransitioning(false);
      setProgress(0);
    }

    previousPathnameRef.current = pathname;
  }, [pathname]);

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

    // 실제 리소스 기반 진행률 업데이트
    const updateProgress = () => {
      if (!mounted || hasCompletedRef.current) return;

      const resources = performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[];

      const loaded = resources.filter((r) => r.responseEnd > 0).length;
      const total = Math.max(resources.length, 1);

      // 실제 진행률 계산
      let realProgress = 0;

      // 폰트 (20% 가중치)
      if (fontsLoadedRef.current) {
        realProgress += 20;
      }

      // 리소스 (70% 가중치)
      realProgress += (loaded / total) * 70;

      // DOM 준비 (10% 가중치)
      if (document.readyState === "complete") {
        realProgress += 10;
      }

      // 목표값으로 부드럽게 애니메이션
      setProgress((prev) => {
        const target = Math.min(realProgress, 99);
        const diff = target - prev;
        return prev + diff * 0.15;
      });

      // 완료 여부 확인
      const elapsed = Date.now() - startTimeRef.current;
      const minTime = isInitialLoadRef.current
        ? LOADING_CONFIG.minLoadingTime
        : LOADING_CONFIG.navigationLoadingTime;
      const minTimePassed = elapsed >= minTime;
      const isReady = document.readyState === "complete" && fontsLoadedRef.current;

      if (minTimePassed && isReady && !hasCompletedRef.current) {
        completeLoading();
      }
    };

    // 로딩 완료 시퀀스
    const completeLoading = () => {
      if (!mounted || hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      hasCompletedInitialLoad = true;

      // 100%로 애니메이션
      setProgress(100);

      // 짧은 일시 정지 후 퇴장 전환 시작
      setTimeout(() => {
        if (!mounted) return;
        setIsTransitioning(true);

        // 전환 애니메이션 후 로딩 화면 숨김
        setTimeout(() => {
          if (!mounted) return;
          setIsLoading(false);
        }, LOADING_CONFIG.transitionDelay);
      }, 400);
    };

    // 폴링 시작
    const progressInterval = setInterval(updateProgress, 60);
    updateProgress();

    // 폴백: 최대 시간 후 강제 완료
    const maxTimeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        completeLoading();
      }
    }, 5000);

    // load 이벤트 리스닝
    const handleLoad = () => {
      // 폰트를 위해 약간의 추가 시간 부여
      setTimeout(updateProgress, 100);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

    return () => {
      mounted = false;
      clearInterval(progressInterval);
      clearTimeout(maxTimeout);
      window.removeEventListener("load", handleLoad);
    };
  }, [pathname]);

  return { isLoading, isTransitioning, progress };
}
