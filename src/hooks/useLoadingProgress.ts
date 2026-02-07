"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

// ============================================
// Types
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
// Constants
// ============================================
const LOADING_CONFIG = {
  minLoadingTime: 1500, // Minimum time to show loading screen (initial load)
  navigationLoadingTime: 1000, // Minimum time for client navigation
  transitionDelay: 600, // Exit animation duration
} as const;

// Pages that should show loading screen on navigation
const LOADING_ENABLED_PAGES = ["/"];

// ============================================
// useLoadingProgress - Real resource tracking
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

    // Register core items
    registerLoadingItem("dom-ready", "component", 2);
    registerLoadingItem("fonts", "font", 3);

    // Track fonts
    if (document.fonts) {
      document.fonts.ready.then(() => markAsLoaded("fonts"));
    } else {
      markAsLoaded("fonts");
    }

    // Track existing resources
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

    // Observe new resources
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
        // PerformanceObserver not supported
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
// useLoadingScreen - Simplified and reliable
// ============================================

// Module-level flag: survives component remounts caused by parent tree changes
// (e.g., RecaptchaProvider switching from Fragment to GoogleReCaptchaProvider)
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

  // Detect navigation to home and reset loading state
  useEffect(() => {
    const isNavigatingToLoadingPage =
      previousPathnameRef.current !== null &&
      previousPathnameRef.current !== pathname &&
      LOADING_ENABLED_PAGES.includes(pathname);

    if (isNavigatingToLoadingPage) {
      // Reset loading state for client navigation to home
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

    // Track fonts loaded state
    if (document.fonts) {
      document.fonts.ready.then(() => {
        fontsLoadedRef.current = true;
      });
    } else {
      fontsLoadedRef.current = true;
    }

    // Update progress based on real resources
    const updateProgress = () => {
      if (!mounted || hasCompletedRef.current) return;

      const resources = performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[];

      const loaded = resources.filter((r) => r.responseEnd > 0).length;
      const total = Math.max(resources.length, 1);

      // Calculate real progress
      let realProgress = 0;

      // Fonts (20% weight)
      if (fontsLoadedRef.current) {
        realProgress += 20;
      }

      // Resources (70% weight)
      realProgress += (loaded / total) * 70;

      // DOM ready (10% weight)
      if (document.readyState === "complete") {
        realProgress += 10;
      }

      // Smoothly animate to target
      setProgress((prev) => {
        const target = Math.min(realProgress, 99);
        const diff = target - prev;
        return prev + diff * 0.15;
      });

      // Check if we should complete
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

    // Complete loading sequence
    const completeLoading = () => {
      if (!mounted || hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      hasCompletedInitialLoad = true;

      // Animate to 100%
      setProgress(100);

      // Start exit transition after brief pause
      setTimeout(() => {
        if (!mounted) return;
        setIsTransitioning(true);

        // Hide loading screen after transition animation
        setTimeout(() => {
          if (!mounted) return;
          setIsLoading(false);
        }, LOADING_CONFIG.transitionDelay);
      }, 400);
    };

    // Start polling
    const progressInterval = setInterval(updateProgress, 60);
    updateProgress();

    // Fallback: Force complete after max time
    const maxTimeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        completeLoading();
      }
    }, 5000);

    // Listen for load event
    const handleLoad = () => {
      // Give a bit more time for fonts
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
