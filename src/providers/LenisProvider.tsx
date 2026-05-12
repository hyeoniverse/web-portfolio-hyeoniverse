"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface LenisContextType {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, options?: ScrollToOptions) => void;
  stop: () => void;
  start: () => void;
  setInfinite: (value: boolean) => void;
}

interface ScrollToOptions {
  offset?: number;
  duration?: number;
  easing?: (t: number) => number;
  immediate?: boolean;
  lock?: boolean;
  onComplete?: () => void;
}

const LenisContext = createContext<LenisContextType>({
  lenis: null,
  scrollTo: () => {},
  stop: () => {},
  start: () => {},
  setInfinite: () => {},
});

// Expo ease out 함수
const expoEaseOut = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

interface LenisProviderProps {
  children: ReactNode;
  options?: {
    duration?: number;
    smoothWheel?: boolean;
    wheelMultiplier?: number;
    touchMultiplier?: number;
    infinite?: boolean;
  };
}

export function LenisProvider({ children, options = {} }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const infiniteOverrideRef = useRef<boolean | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Lenis 초기화
    const lenisInstance = new Lenis({
      duration: options.duration ?? 1.2,
      easing: expoEaseOut,
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: options.smoothWheel ?? true,
      wheelMultiplier: options.wheelMultiplier ?? 1,
      touchMultiplier: options.touchMultiplier ?? 2,
      infinite: infiniteOverrideRef.current ?? (options.infinite ?? false),
    });

    lenisRef.current = lenisInstance;
    setLenis(lenisInstance);

    // Lenis 스크롤과 GSAP ScrollTrigger 동기화
    lenisInstance.on("scroll", ScrollTrigger.update);

    // 일관된 RAF 루프를 위해 GSAP ticker 사용
    gsap.ticker.add((time) => {
      lenisInstance.raf(time * 1000);
    });

    // 더 부드러운 애니메이션을 위해 lag smoothing 비활성화
    gsap.ticker.lagSmoothing(0);

    // Lenis용 ScrollTrigger 스크롤러 프록시 설정
    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        if (arguments.length && value !== undefined) {
          lenisInstance.scrollTo(value, { immediate: true });
        }
        return lenisInstance.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType: "transform",
    });

    // Lenis 준비 시 ScrollTrigger 새로고침
    ScrollTrigger.refresh();

    // 디버깅용으로 window에 lenis 노출
    if (typeof window !== "undefined") {
      (window as typeof window & { lenis?: Lenis }).lenis = lenisInstance;
    }

    // 리사이즈 시 infinite 토글 — Lenis 의 runtime options 필드는 public 타입에 노출 안 됨
    type LenisWithOptions = Lenis & { options: { infinite: boolean } };
    const handleResize = () => {
      (lenisInstance as LenisWithOptions).options.infinite = infiniteOverrideRef.current ?? (options.infinite ?? false);
    };
    window.addEventListener("resize", handleResize);

    // 클린업을 위해 현재 raf ID 캡처
    const currentRafId = rafRef.current;

    return () => {
      // 클린업
      window.removeEventListener("resize", handleResize);
      lenisInstance.destroy();
      gsap.ticker.remove((time) => lenisInstance.raf(time * 1000));
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

      if (currentRafId) {
        cancelAnimationFrame(currentRafId);
      }
    };
  }, [options.duration, options.smoothWheel, options.wheelMultiplier, options.touchMultiplier, options.infinite]);

  const scrollTo = useCallback(
    (target: string | number | HTMLElement, scrollOptions: ScrollToOptions = {}) => {
      if (!lenisRef.current) return;

      lenisRef.current.scrollTo(target, {
        offset: scrollOptions.offset ?? 0,
        duration: scrollOptions.duration ?? 1.5,
        easing: scrollOptions.easing ?? expoEaseOut,
        immediate: scrollOptions.immediate ?? false,
        lock: scrollOptions.lock ?? false,
        onComplete: scrollOptions.onComplete,
      });
    },
    []
  );

  const stop = useCallback(() => {
    lenisRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    lenisRef.current?.start();
  }, []);

  const setInfinite = useCallback((value: boolean) => {
    infiniteOverrideRef.current = value;
    if (lenisRef.current) {
      (lenisRef.current as Lenis & { options: { infinite: boolean } }).options.infinite = value;
      // Lenis는 옵션 변경 후 stop→start 해야 즉시 반영
      lenisRef.current.stop();
      lenisRef.current.start();
    }
  }, []);

  return (
    <LenisContext.Provider value={{ lenis, scrollTo, stop, start, setInfinite }}>
      {children}
    </LenisContext.Provider>
  );
}

export function useLenis() {
  const context = useContext(LenisContext);
  if (!context) {
    throw new Error("useLenis must be used within a LenisProvider");
  }
  return context;
}
