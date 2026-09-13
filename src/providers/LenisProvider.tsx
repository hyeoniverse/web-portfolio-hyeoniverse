"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  startTransition,
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
      // 무한스크롤은 Lenis 가 터치 스크롤을 직접 제어(syncTouch)할 때만 감긴다.
      // syncTouch 가 꺼져 있으면 터치는 브라우저 네이티브 스크롤이라 위치가 [0,limit] 로
      // clamp 돼 bottom→top 래핑이 실행되지 않는다(터치에서 무한스크롤이 안 되던 원인).
      // → infinite 와 항상 같이 켜고, 홈에서만 활성(아래 setInfinite 로 토글).
      syncTouch: infiniteOverrideRef.current ?? (options.infinite ?? false),
    });

    lenisRef.current = lenisInstance;
    /* startTransition — 페이지 본문은 loading.tsx 의 Suspense 경계 안에 있다. 그 코드가 아직 오는 중일 때 이 갱신이 급한
       갱신으로 경계에 닿으면 React 가 서버 HTML 을 버리고 로딩 화면부터 다시 그린다(느린 회선의 상세 페이지, #911).
       전환으로 두면 경계가 하이드레이션을 마칠 때까지 기다린다. LanguageProvider 와 같은 이유다 */
    startTransition(() => setLenis(lenisInstance));

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

    // 리사이즈 시 infinite/syncTouch 토글 — Lenis 의 runtime options 필드는 public 타입에 노출 안 됨
    type LenisWithOptions = Lenis & { options: { infinite: boolean; syncTouch: boolean } };
    const handleResize = () => {
      const on = infiniteOverrideRef.current ?? (options.infinite ?? false);
      const opts = (lenisInstance as LenisWithOptions).options;
      opts.infinite = on;
      opts.syncTouch = on; // 무한스크롤과 항상 동반 (터치 래핑 조건)
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
      const opts = (lenisRef.current as Lenis & { options: { infinite: boolean; syncTouch: boolean } }).options;
      opts.infinite = value;
      // 터치에서 래핑이 동작하려면 Lenis 가 터치를 제어해야 한다 — 홈(무한스크롤)에서만 동반 활성.
      // syncTouch 는 이벤트마다 live read 라 런타임 토글이 즉시 반영된다.
      opts.syncTouch = value;
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
