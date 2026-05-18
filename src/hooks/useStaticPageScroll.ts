"use client";

import { useEffect } from "react";
import { useLenis } from "@/providers/LenisProvider";

/**
 * 정적인(스크롤 길이가 길지 않은) admin/dashboard 페이지에서 mount 시 lenis 를 잠시 멈추고
 * 무한 스크롤을 끄고 top 으로 강제 이동.
 *
 * 사용처: admin/(dashboard)/page.tsx, /comments/page.tsx, /settings/page.tsx 등.
 * 무한 스크롤은 기본 OFF — opt-in 방식 (HomeClient 만 setInfinite(true)) 이므로
 * unmount 시 별도 복원 불필요.
 */
export function useStaticPageScroll() {
  const { setInfinite, lenis, stop, start } = useLenis();

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);
    return () => {
      clearTimeout(timer);
    };
  }, [setInfinite, lenis, stop, start]);
}
