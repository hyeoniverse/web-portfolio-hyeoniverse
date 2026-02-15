import type Lenis from "@studio-freight/lenis";

// ============================================
// Lenis 인스턴스 관리
// ============================================
let lenisInstance: Lenis | null = null;

export const setLenisInstance = (lenis: Lenis | null) => {
  lenisInstance = lenis;
};

// Lenis용 Expo ease out 함수
const expoEaseOut = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

// ============================================
// 섹션 스크롤 (Lenis 연동)
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
// 상단/하단 스크롤 (Lenis 연동)
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
