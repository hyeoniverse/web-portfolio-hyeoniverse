"use client";

import { useEffect, useRef, useCallback } from "react";
import { useLenis } from "@/providers/LenisProvider";

interface ScrollProgressReturn {
  getProgress: () => number;
}

export function useScrollProgress(): ScrollProgressReturn {
  const { lenis } = useLenis();
  const progressRef = useRef(0);

  useEffect(() => {
    if (!lenis) return;

    const handleScroll = () => {
      const lenisAny = lenis as unknown as {
        scroll: number;
        limit: number;
      };
      const limit = lenisAny.limit;
      if (limit > 0) {
        progressRef.current = Math.min(1, Math.max(0, lenisAny.scroll / limit));
      }
    };

    lenis.on("scroll", handleScroll);
    handleScroll();

    return () => {
      lenis.off("scroll", handleScroll);
    };
  }, [lenis]);

  const getProgress = useCallback(() => progressRef.current, []);

  return { getProgress };
}
