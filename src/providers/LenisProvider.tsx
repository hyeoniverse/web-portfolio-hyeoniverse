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
import { setLenisInstance } from "@/utils/scroll";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface LenisContextType {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, options?: ScrollToOptions) => void;
  stop: () => void;
  start: () => void;
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
});

// Expo ease out function
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
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize Lenis
    const lenisInstance = new Lenis({
      duration: options.duration ?? 1.2,
      easing: expoEaseOut,
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: options.smoothWheel ?? true,
      wheelMultiplier: options.wheelMultiplier ?? 1,
      touchMultiplier: options.touchMultiplier ?? 2,
      infinite: options.infinite ?? true,
    });

    lenisRef.current = lenisInstance;
    setLenis(lenisInstance);

    // Set Lenis instance for scroll utilities
    setLenisInstance(lenisInstance);

    // Sync Lenis scroll with GSAP ScrollTrigger
    lenisInstance.on("scroll", ScrollTrigger.update);

    // Use GSAP ticker for consistent RAF loop
    gsap.ticker.add((time) => {
      lenisInstance.raf(time * 1000);
    });

    // Disable lag smoothing for smoother animations
    gsap.ticker.lagSmoothing(0);

    // Set up ScrollTrigger scroller proxy for Lenis
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

    // Refresh ScrollTrigger when Lenis is ready
    ScrollTrigger.refresh();

    // Expose lenis to window for debugging
    if (typeof window !== "undefined") {
      (window as typeof window & { lenis?: Lenis }).lenis = lenisInstance;
    }

    return () => {
      // Cleanup
      setLenisInstance(null);
      lenisInstance.destroy();
      gsap.ticker.remove((time) => lenisInstance.raf(time * 1000));
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
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

  return (
    <LenisContext.Provider value={{ lenis, scrollTo, stop, start }}>
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

export default LenisProvider;
