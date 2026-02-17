"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";

export default function ScrollRestoration() {
  const pathname = usePathname();
  const { lenis } = useLenis();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // 경로 변경 시 Lenis + 네이티브 스크롤 모두 초기화
  useEffect(() => {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    }
    window.scrollTo(0, 0);
  }, [pathname, lenis]);

  return null;
}
