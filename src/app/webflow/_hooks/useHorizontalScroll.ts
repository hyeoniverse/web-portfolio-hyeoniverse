"use client";

import {
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useLenis } from "@/providers/LenisProvider";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
}

export function useHorizontalScroll(
  styles: Record<string, string>,
): {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  activeSection: number;
  goToSection: (navIndex: number) => void;
} {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const { setInfinite } = useLenis();

  // Navigate to section via ScrollTrigger
  const goToSection = useCallback((navIndex: number) => {
    const track = trackRef.current;
    const tween = scrollTweenRef.current;
    if (!track || !tween) return;

    const panels = track.querySelectorAll(
      `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
    );

    // Map nav index to DOM panel index (skip breakPanels)
    let count = 0;
    let target: HTMLElement | undefined;
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].classList.contains(styles.breakPanel)) continue;
      if (count === navIndex) {
        target = panels[i] as HTMLElement;
        break;
      }
      count++;
    }
    if (!target) return;

    const st = tween.scrollTrigger;
    if (!st) return;

    // Calculate the scroll position for this panel
    const trackWidth = track.scrollWidth - window.innerWidth;
    const panelLeft = target.offsetLeft;
    const ratio = panelLeft / trackWidth;
    const scrollTo = st.start + (st.end - st.start) * ratio;

    gsap.to(window, {
      scrollTo: { y: scrollTo },
      duration: 1,
      ease: "power2.inOut",
    });
  }, [styles]);

  // Disable Lenis infinite scroll on this page
  useEffect(() => {
    setInfinite(false);
    return () => setInfinite(true);
  }, [setInfinite]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    // Skip horizontal scroll on mobile/tablet
    if (window.innerWidth <= 1024) return;

    const ctx = gsap.context(() => {
      // Main horizontal scroll tween
      const scrollTween = gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      scrollTweenRef.current = scrollTween;

      // Per-panel content reveal + active section tracking
      const panels = gsap.utils.toArray<HTMLElement>(
        `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
        track,
      );

      let navIndex = 0;
      panels.forEach((panel, index) => {
        const isBreak = panel.classList.contains(styles.breakPanel);
        const currentNavIndex = navIndex;

        // Track active section (skip breakPanel)
        ScrollTrigger.create({
          trigger: panel,
          containerAnimation: scrollTween,
          start: "left 60%",
          end: "right 40%",
          onEnter: () => {
            if (!isBreak) setActiveSection(currentNavIndex);
          },
          onEnterBack: () => {
            if (!isBreak) setActiveSection(currentNavIndex);
          },
        });

        if (!isBreak) navIndex++;

        if (index === 0) return; // Hero already visible

        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length === 0) return;

        // Entrance: fade in + slide up as panel enters from right
        gsap.from(items, {
          opacity: 0,
          y: 40,
          stagger: 0.06,
          scrollTrigger: {
            trigger: panel,
            containerAnimation: scrollTween,
            start: "left 80%",
            end: "left 50%",
            scrub: 0.6,
          },
        });

        // Exit: fade out + slide down when more than half is hidden
        gsap.to(items, {
          opacity: 0,
          y: -30,
          stagger: 0.04,
          scrollTrigger: {
            trigger: panel,
            containerAnimation: scrollTween,
            start: "right 50%",
            end: "right 20%",
            scrub: 0.6,
          },
        });
      });
    }, section);

    return () => ctx.revert();
  }, [styles]);

  return { sectionRef, trackRef, activeSection, goToSection };
}
