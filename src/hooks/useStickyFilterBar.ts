"use client";

import { useEffect, useRef, useState } from "react";

interface UseStickyFilterBarOptions {
  /** scroll-direction hide/show 일시 정지용 외부 ref.
   *  true 일 때 hide/show 무시 (e.g., 태그/카테고리 expand 직후 layout shift scroll 흡수) */
  cooldownRef?: React.RefObject<boolean>;
  /** scroll 방향 전환 threshold (default 3px) */
  scrollThreshold?: number;
  /** 누적 거리 → hide/show 트리거 (default 15px) */
  triggerDistance?: number;
}

interface UseStickyFilterBarResult {
  /** filterBar 바로 위에 0-height div 로 둘 ref — sentinel 이 viewport top 라인 넘으면 stuck */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** position: sticky 적용된 filter bar element ref */
  filterBarRef: React.RefObject<HTMLDivElement | null>;
  /** sentinel 이 화면 밖 = filterBar 가 stick 중 */
  isStuck: boolean;
  /** scroll-down 으로 일시 숨김 상태 */
  barHidden: boolean;
}

/** posts 페이지 + tag 페이지 등 sticky filter bar 의 공통 동작.
 *  - IntersectionObserver 로 sentinel 감지 → isStuck
 *  - scroll-direction (누적 거리 기반) → barHidden hide/show
 *  - cooldownRef 외부 ref 로 layout shift scroll 무시 가능 */
export function useStickyFilterBar(opts: UseStickyFilterBarOptions = {}): UseStickyFilterBarResult {
  const { cooldownRef, scrollThreshold = 3, triggerDistance = 15 } = opts;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const isStuckRef = useRef(false);
  const lastScrollY = useRef(0);

  // sentinel → IntersectionObserver. rootMargin 으로 sticky top 라인 정확 추적
  useEffect(() => {
    const el = sentinelRef.current;
    const fb = filterBarRef.current;
    if (!el || !fb) return;
    let observer: IntersectionObserver | null = null;
    const setup = () => {
      observer?.disconnect();
      const stickyTop = parseFloat(window.getComputedStyle(fb).top) || 0;
      observer = new IntersectionObserver(
        ([entry]) => {
          const stuck = !entry.isIntersecting;
          isStuckRef.current = stuck;
          setIsStuck(stuck);
          if (!stuck) setBarHidden(false);
        },
        { rootMargin: `-${stickyTop + 1}px 0px 0px 0px`, threshold: 0 },
      );
      observer.observe(el);
    };
    setup();
    // viewport/폰트 변경 시 stickyTop 재계산
    window.addEventListener("resize", setup);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", setup);
    };
  }, []);

  // scroll-direction hide/show. stuck 일 때만 동작.
  useEffect(() => {
    let accumulated = 0;
    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (cooldownRef?.current) return;
      if (!isStuckRef.current) { accumulated = 0; return; }
      // 방향 전환 시 누적값 리셋
      if (
        (accumulated > 0 && delta < -scrollThreshold) ||
        (accumulated < 0 && delta > scrollThreshold)
      ) {
        accumulated = 0;
      }
      accumulated += delta;
      if (accumulated > triggerDistance) {
        setBarHidden(true);
        accumulated = 0;
      } else if (accumulated < -triggerDistance) {
        setBarHidden(false);
        accumulated = 0;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [cooldownRef, scrollThreshold, triggerDistance]);

  return { sentinelRef, filterBarRef, isStuck, barHidden };
}
