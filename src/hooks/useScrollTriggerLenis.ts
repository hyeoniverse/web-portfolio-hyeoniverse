"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/providers/LenisProvider";

/**
 * ScrollTrigger 를 쓰는 화면에서 Lenis 의 부드러운 스크롤과 맞춘다 — Lenis 가 스크롤할 때마다 ScrollTrigger 를 갱신하고,
 * Lenis 가 생기면 위치를 다시 잰다. LenisProvider 가 하던 일인데 거기 두면 gsap 이 모든 페이지에 실려 쓰는 화면으로 옮겼다.
 */
export function useScrollTriggerLenis() {
  const { lenis } = useLenis();
  useEffect(() => {
    if (!lenis) return;
    gsap.registerPlugin(ScrollTrigger);
    lenis.on("scroll", ScrollTrigger.update);
    ScrollTrigger.refresh();
    return () => {
      lenis.off("scroll", ScrollTrigger.update);
    };
  }, [lenis]);
}
