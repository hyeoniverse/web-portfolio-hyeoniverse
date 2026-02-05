import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import type Lenis from "@studio-freight/lenis";

gsap.registerPlugin(ScrollTrigger);

// ============================================
// Lenis Instance Management
// ============================================
let lenisInstance: Lenis | null = null;

export const setLenisInstance = (lenis: Lenis | null) => {
  lenisInstance = lenis;
};

export const getLenisInstance = (): Lenis | null => {
  return lenisInstance;
};

// Expo ease out function for Lenis
const expoEaseOut = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

// ============================================
// Section Scroll (Lenis-aware)
// ============================================
export const scrollToSection = (
  id: string,
  opts: { duration?: number; offset?: number; onComplete?: () => void } = {}
): Promise<void> => {
  const { duration = 1.5, offset = 0, onComplete } = opts;
  const el = document.getElementById(id);

  if (!el) {
    console.warn(`[scrollToSection] element #${id} not found`);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    if (lenisInstance) {
      // Use Lenis for smooth scroll
      lenisInstance.scrollTo(el, {
        duration,
        offset,
        easing: expoEaseOut,
        onComplete: () => {
          onComplete?.();
          resolve();
        },
      });
    } else {
      // Fallback to native scroll
      el.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        onComplete?.();
        resolve();
      }, 800);
    }
  });
};

// ============================================
// Top/Bottom Scroll (Lenis-aware)
// ============================================
export const scrollToTop = (opts: { duration?: number } = {}) => {
  const { duration = 1.5 } = opts;

  if (lenisInstance) {
    lenisInstance.scrollTo(0, {
      duration,
      easing: expoEaseOut,
    });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

export const scrollToBottom = (opts: { duration?: number } = {}) => {
  const { duration = 1.5 } = opts;

  const maxScroll = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  ) - window.innerHeight;

  if (lenisInstance) {
    lenisInstance.scrollTo(maxScroll, {
      duration,
      easing: expoEaseOut,
    });
  } else {
    window.scrollTo({ top: maxScroll, behavior: "smooth" });
  }
};

// ============================================
// Scroll Control (Lenis)
// ============================================
export const stopScroll = () => {
  lenisInstance?.stop();
};

export const startScroll = () => {
  lenisInstance?.start();
};

// ============================================
// Body Scroll Lock (Lenis-aware)
// ============================================
export const preventBodyScroll = (
  prevent: boolean,
  scrollPosition?: number
): number | void => {
  if (lenisInstance) {
    if (prevent) {
      lenisInstance.stop();
      return lenisInstance.scroll;
    } else {
      lenisInstance.start();
      return;
    }
  }

  // Fallback for non-Lenis
  const body = document.body;

  if (prevent) {
    const currentScrollPosition = scrollPosition ?? window.pageYOffset;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.position = "fixed";
    body.style.top = `-${currentScrollPosition}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.paddingRight = `${scrollbarWidth}px`;
    body.style.overflow = "hidden";

    return currentScrollPosition;
  } else {
    const savedScrollPosition = Math.abs(Number.parseInt(body.style.top) || 0);

    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.paddingRight = "";
    body.style.overflow = "";

    window.scrollTo(0, savedScrollPosition);
  }
};

// ============================================
// Horizontal Scroll (GSAP + Lenis compatible)
// ============================================
interface HorizontalScrollProps {
  container: HTMLElement;
  wrapper?: HTMLElement | null;
  scrub?: number | boolean;
  pin?: boolean;
  anticipatePin?: number;
  onProgress?: (progress: number) => void;
}

export function createHorizontalScroll({
  container,
  wrapper,
  scrub = 1,
  pin = true,
  anticipatePin = 1,
  onProgress,
}: HorizontalScrollProps) {
  if (!container) return null;

  const scrollWrapper = wrapper || container.querySelector("[data-horizontal-wrapper]") as HTMLElement;
  if (!scrollWrapper) {
    console.warn("[createHorizontalScroll] No wrapper found");
    return null;
  }

  const items = Array.from(scrollWrapper.children) as HTMLElement[];
  if (!items.length) return null;

  // Calculate total scroll distance
  const totalWidth = scrollWrapper.scrollWidth;
  const viewportWidth = window.innerWidth;
  const scrollDistance = totalWidth - viewportWidth;

  // Create the horizontal scroll animation
  const tl = gsap.to(scrollWrapper, {
    x: () => -scrollDistance,
    ease: "none",
    scrollTrigger: {
      trigger: container,
      start: "top top",
      end: () => `+=${scrollDistance}`,
      pin,
      scrub,
      anticipatePin,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        onProgress?.(self.progress);
      },
    },
  });

  return tl;
}

// ============================================
// Refresh ScrollTrigger
// ============================================
export const refreshScrollTrigger = () => {
  ScrollTrigger.refresh();
};

// ============================================
// Kill all ScrollTriggers
// ============================================
export const killAllScrollTriggers = () => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
};

// ============================================
// Get scroll progress for a section
// ============================================
export const getSectionProgress = (sectionId: string): number => {
  const el = document.getElementById(sectionId);
  if (!el) return 0;

  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // 0 = section top at viewport bottom
  // 0.5 = section center at viewport center
  // 1 = section bottom at viewport top
  const progress = 1 - (rect.top + rect.height / 2) / (windowHeight + rect.height);

  return Math.max(0, Math.min(1, progress));
};
