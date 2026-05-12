"use client";

import { useEffect } from "react";
import { useLenis } from "@/providers/LenisProvider";

/**
 * 정적인(스크롤 길이가 길지 않은) admin/dashboard 페이지에서 mount 시 lenis 를 잠시 멈추고
 * 무한 스크롤을 끄고 top 으로 강제 이동. unmount 시 다시 무한 스크롤 복원.
 *
 * 사용처: admin/(dashboard)/page.tsx, /comments/page.tsx, /settings/page.tsx 등.
 * 동일한 블록이 4곳에 복붙돼 있던 걸 한 곳으로 묶음 — 두 곳은 cleanup 에서 setInfinite(true)
 * 를 빠뜨려 다른 페이지로 이동 후에도 lenis 가 non-infinite 인 채로 남던 버그도 해결.
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
      setInfinite(true);
    };
  }, [setInfinite, lenis, stop, start]);
}
