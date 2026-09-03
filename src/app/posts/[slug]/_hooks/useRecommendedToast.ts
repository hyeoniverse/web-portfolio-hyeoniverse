"use client";

import { useState, useEffect, useCallback } from "react";

/* 추천 글 토스트 트리거 — 스크롤이 40% 를 넘으면 한 번 켜고 리스너를 뗀다(rAF 로 묶음). dismiss 하면 다시 안 뜬다. */
export function useRecommendedToast(postId: string) {
  const [showToast, setShowToast] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Scroll progress → toast trigger
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollH = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollH > 0 && window.scrollY / scrollH > 0.4) {
          setShowToast(true);
          window.removeEventListener("scroll", handleScroll);
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [postId]);

  const dismiss = useCallback(() => setDismissed(true), []);
  return { visible: showToast && !dismissed, dismiss };
}
