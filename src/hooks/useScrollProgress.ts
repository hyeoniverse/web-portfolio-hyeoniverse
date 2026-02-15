"use client";

import { useEffect, useRef, useCallback } from "react";
import { useLenis } from "@/providers/LenisProvider";

interface ScrollProgressReturn {
  /** 누적 스크롤 거리 (페이지 1회 = 1.0, 무한 스크롤 시 계속 증가) */
  getCumulative: () => number;
}

export function useScrollProgress(): ScrollProgressReturn {
  const { lenis } = useLenis();
  const cumulativeRef = useRef(0);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    if (!lenis) return;

    const handleScroll = () => {
      const lenisAny = lenis as unknown as {
        scroll: number;
        limit: number;
      };
      const { scroll, limit } = lenisAny;
      if (limit <= 0) return;

      const currentNorm = scroll / limit;
      const lastNorm = lastScrollRef.current;
      let delta = currentNorm - lastNorm;

      // 무한 스크롤 래핑 감지: progress가 갑자기 큰 폭으로 뛰면 래핑
      if (delta > 0.5) {
        // 뒤로 래핑 (1→0 점프)
        delta -= 1;
      } else if (delta < -0.5) {
        // 앞으로 래핑 (0→1 점프)
        delta += 1;
      }

      cumulativeRef.current += delta;
      lastScrollRef.current = currentNorm;
    };

    lenis.on("scroll", handleScroll);
    handleScroll();

    return () => {
      lenis.off("scroll", handleScroll);
    };
  }, [lenis]);

  const getCumulative = useCallback(() => cumulativeRef.current, []);

  return { getCumulative };
}
