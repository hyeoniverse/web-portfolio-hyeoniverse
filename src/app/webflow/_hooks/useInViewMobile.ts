"use client";

import { useEffect } from "react";

/**
 * Observes `.animate` elements inside the given container and toggles
 * a visibility class when they enter / leave the viewport.
 * Active only at ≤ 1024 px (mobile / tablet vertical scroll).
 */
export function useInViewMobile(
  containerRef: React.RefObject<HTMLElement | null>,
  animateClass: string,
  visibleClass: string,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.innerWidth > 1024 && window.innerHeight > 700) return;

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

    return () => observer.disconnect();
  }, [containerRef, animateClass, visibleClass]);
}
