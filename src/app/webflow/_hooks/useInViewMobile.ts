"use client";

import { useEffect } from "react";
import { checkMobileLayout } from "./mobileCheck";

/**
 * 컨테이너 내부의 `.animate` 요소를 관찰하고
 * 뷰포트 진입/이탈 시 가시성 클래스를 토글.
 * 모바일/낮은 뷰포트 레이아웃(세로 스크롤)에서만 활성화.
 * 브레이크포인트 변경 시 리마운트는 BreakpointGuard가 처리.
 */
export function useInViewMobile(
  containerRef: React.RefObject<HTMLElement | null>,
  animateClass: string,
  visibleClass: string,
) {
  const mobile = checkMobileLayout();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mobile) return;

    const targets = container.querySelectorAll<HTMLElement>(`.${animateClass}`);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(visibleClass);
          } else {
            entry.target.classList.remove(visibleClass);
          }
        });
      },
      { threshold: 0.15 },
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      targets.forEach((el) => el.classList.remove(visibleClass));
    };
  }, [containerRef, animateClass, visibleClass, mobile]);
}
