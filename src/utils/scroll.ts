import type Lenis from "@studio-freight/lenis";

// ============================================
// Lenis Instance Management
// ============================================
let lenisInstance: Lenis | null = null;

export const setLenisInstance = (lenis: Lenis | null) => {
  lenisInstance = lenis;
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

  const maxScroll =
    Math.max(
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
