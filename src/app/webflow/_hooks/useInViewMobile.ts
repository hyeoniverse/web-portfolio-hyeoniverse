"use client";

import { useEffect, useState } from "react";
import { checkMobileLayout } from "./mobileCheck";

/**
 * Observes `.animate` elements inside the given container and toggles
 * a visibility class when they enter / leave the viewport.
 * Active only when in mobile/short-viewport layout (vertical scroll).
 * Reactively enables/disables on resize.
 */
export function useInViewMobile(
  containerRef: React.RefObject<HTMLElement | null>,
  animateClass: string,
  visibleClass: string,
) {
  const [mobile, setMobile] = useState(checkMobileLayout);

  // Track viewport size changes
  useEffect(() => {
    const onResize = () => setMobile(checkMobileLayout());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      // Remove visible classes when switching to desktop mode
      targets.forEach((el) => el.classList.remove(visibleClass));
    };
  }, [containerRef, animateClass, visibleClass, mobile]);
}
