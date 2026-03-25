"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/providers/LenisProvider";

/* ── Mobile tab configuration ── */
export const MOBILE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "design", label: "Design" },
  { key: "tech", label: "Tech" },
  { key: "code", label: "Code" },
] as const;

export type MobileTab = (typeof MOBILE_TABS)[number]["key"];

interface UseMobileTabNavigationParams {
  isMobile: boolean;
  sectionRef: React.RefObject<HTMLElement | null>;
}

export function useMobileTabNavigation({
  isMobile,
  sectionRef,
}: UseMobileTabNavigationParams) {
  const { lenis, scrollTo: lenisScrollTo } = useLenis();

  /* ── Mobile tab state ── */
  const [mobileTab, setMobileTab] = useState<MobileTab>("overview");
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const [tabDirection, setTabDirection] = useState<1 | -1>(1);
  const lastScrollY = useRef(0);

  const handleTabChange = useCallback(
    (tab: MobileTab) => {
      if (tab === mobileTab) return;
      const fromIdx = MOBILE_TABS.findIndex((t) => t.key === mobileTab);
      const toIdx = MOBILE_TABS.findIndex((t) => t.key === tab);
      setTabDirection(toIdx > fromIdx ? 1 : -1);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      // 즉시 스크롤 리셋 — 탭 전환 시 이전 위치가 잠깐 보이는 것 방지
      const el = sectionRef.current;
      if (el) lenisScrollTo(el, { immediate: true, offset: 0 });
      setMobileTab(tab);
      setTabBarHidden(false);
    },
    [mobileTab, lenisScrollTo, sectionRef],
  );

  // 스크롤 방향 감지: 아래 → 접힘, 위 → 펼침 + 끝까지 스크롤 시 다음 탭
  useEffect(() => {
    if (!isMobile) return;
    const TRIGGER = 15;
    let accumulated = 0;
    let bottomHoldFrames = 0;
    const BOTTOM_THRESHOLD = 3;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      // 섹션 상단 근처에서는 항상 표시
      const top = sectionRef.current?.offsetTop ?? 0;
      if (y < top + 100) {
        setTabBarHidden(false);
        accumulated = 0;
        bottomHoldFrames = 0;
        return;
      }

      if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
      accumulated += delta;

      // Design System 패널(design 탭)에서는 탭바 항상 표시
      if (accumulated > TRIGGER && mobileTab !== "design") setTabBarHidden(true);
      else if (accumulated < -TRIGGER) setTabBarHidden(false);

      // 페이지 끝 도달 감지 → 다음 탭 전환
      // Lenis smooth scroll은 정확히 끝까지 안 갈 수 있으므로 여유값 10px
      const atBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 10;
      if (atBottom && delta > 0) {
        bottomHoldFrames++;
        if (bottomHoldFrames >= BOTTOM_THRESHOLD) {
          bottomHoldFrames = 0;
          setTabDirection(1);
          ScrollTrigger.getAll().forEach((st) => st.kill());
          setMobileTab((prev) => {
            const idx = MOBILE_TABS.findIndex((t) => t.key === prev);
            if (idx < MOBILE_TABS.length - 1) {
              setTabBarHidden(false);
              return MOBILE_TABS[idx + 1].key;
            }
            return prev;
          });
        }
      } else {
        bottomHoldFrames = 0;
      }

      // (상단 이전 탭 전환은 wheel/touch 이벤트에서 처리)
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, sectionRef, lenisScrollTo, mobileTab]);

  // 상단에서 위로 스크롤 → 이전 탭 (wheel + touch)
  useEffect(() => {
    if (!isMobile) return;
    let topAccum = 0;
    const THRESHOLD = 80;
    let touchStartY = 0;

    const isAtTop = () => {
      const sectionTop = sectionRef.current?.offsetTop ?? 0;
      return window.scrollY <= sectionTop + 10;
    };

    let transitioning = false;

    const goToPrevTab = () => {
      if (transitioning) return;
      transitioning = true;
      topAccum = 0;
      setTabDirection(-1);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      setMobileTab((prev) => {
        const idx = MOBILE_TABS.findIndex((t) => t.key === prev);
        if (idx > 0) {
          setTabBarHidden(false);
          return MOBILE_TABS[idx - 1].key;
        }
        return prev;
      });
    };

    const onWheel = (e: WheelEvent) => {
      if (transitioning) return;
      if (!isAtTop() || e.deltaY >= 0) { topAccum = 0; return; }
      topAccum += Math.abs(e.deltaY);
      if (topAccum >= THRESHOLD) goToPrevTab();
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (transitioning) return;
      if (!isAtTop()) { topAccum = 0; return; }
      const dy = e.touches[0].clientY - touchStartY;
      if (dy <= 0) { topAccum = 0; return; }
      topAccum = dy;
      if (topAccum >= THRESHOLD) goToPrevTab();
    };

    const onTouchEnd = () => { topAccum = 0; };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, sectionRef]);

  // ScrollTrigger refresh + 스크롤 리셋 — 공통 로직
  const refreshAndScroll = useCallback(() => {
    if (!isMobile) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lenis as any)?.resize?.();
        ScrollTrigger.refresh();
        // 이미 section top 근처에 있으면 스크롤 생략 — 튕김 방지
        const el = sectionRef.current;
        if (el) {
          const sectionTop = el.getBoundingClientRect().top + window.scrollY;
          if (Math.abs(window.scrollY - sectionTop) > 5) {
            lenisScrollTo(el, { immediate: true, offset: 0 });
          }
        }
        requestAnimationFrame(() => ScrollTrigger.update());
      });
    });
  }, [isMobile, lenis, lenisScrollTo, sectionRef]);

  // enter 애니메이션 완료 후 refresh — 탭 전환 시
  const handleTabAnimComplete = useCallback(() => {
    refreshAndScroll();
  }, [refreshAndScroll]);

  // 첫 로드 시 refresh (initial={false}라 onAnimationComplete 안 불림)
  useEffect(() => {
    if (!isMobile) return;
    refreshAndScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  return {
    mobileTab,
    tabBarHidden,
    tabDirection,
    handleTabChange,
    handleTabAnimComplete,
    MOBILE_TABS,
  };
}
