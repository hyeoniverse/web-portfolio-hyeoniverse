"use client";

import { useRef, useLayoutEffect, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useLenis } from "@/providers/LenisProvider";
import { checkMobileLayout } from "./mobileCheck";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
}

export function useHorizontalScroll(
  styles: Record<string, string>,
): {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  scrollTweenRef: React.RefObject<gsap.core.Tween | null>;
  activeSection: number;
  goToSection: (navIndex: number) => void;
} {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const mobile = checkMobileLayout();
  const { setInfinite } = useLenis();

  // 섹션 이동 — 데스크톱(GSAP)과 모바일(scrollIntoView) 모두 처리
  const goToSection = useCallback(
    (navIndex: number) => {
      const track = trackRef.current;
      if (!track) return;

      const panels = track.querySelectorAll(
        `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
      );

      // 네비게이션 인덱스를 DOM 패널에 매핑 (breakPanel 제외)
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

      if (checkMobileLayout()) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const tween = scrollTweenRef.current;
      if (!tween) return;
      const scrollTriggerInstance = tween.scrollTrigger;
      if (!scrollTriggerInstance) return;

      const trackWidth = track.scrollWidth - window.innerWidth;
      const panelLeft = target.offsetLeft;
      const ratio = Math.min(panelLeft / trackWidth, 1);
      const scrollTo = scrollTriggerInstance.start + (scrollTriggerInstance.end - scrollTriggerInstance.start) * ratio;

      gsap.to(window, {
        scrollTo: { y: scrollTo },
        duration: 1,
        ease: "power2.inOut",
      });
    },
    [styles],
  );

  // 이 페이지에서 Lenis 무한 스크롤 비활성화
  useEffect(() => {
    setInfinite(false);
    return () => setInfinite(true);
  }, [setInfinite]);

  // GSAP 수평 스크롤 — 모바일 상태에 반응
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    // 모바일/낮은 뷰포트: 수평 스크롤 없음
    if (mobile) {
      scrollTweenRef.current = null;
      return;
    }

    const ctx = gsap.context(() => {
      // 메인 수평 스크롤 트윈
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

      // 패널별 콘텐츠 등장 + 활성 섹션 추적
      const panels = gsap.utils.toArray<HTMLElement>(
        `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
        track,
      );

      let navIndex = 0;
      panels.forEach((panel, index) => {
        const isBreak = panel.classList.contains(styles.breakPanel);
        const currentNavIndex = navIndex;

        // 활성 섹션 추적 (breakPanel 제외)
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

        if (index === 0) return; // Hero 패널은 이미 보임

        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length === 0) return;

        // 입장: 패널이 오른쪽에서 들어올 때 페이드 인 + 슬라이드 업
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

        // 퇴장: 절반 이상 숨겨지면 페이드 아웃 + 슬라이드 다운
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
  }, [styles, mobile]);

  // 모바일: IntersectionObserver로 활성 섹션 추적
  useEffect(() => {
    if (!mobile) return;
    const track = trackRef.current;
    if (!track) return;

    const allPanels = track.querySelectorAll<HTMLElement>(
      `.${styles.panel}, .${styles.panelWide}`,
    );

    // 네비게이션 인덱스 매핑 생성 (breakPanel 제외)
    const mapped: { el: HTMLElement; navIdx: number }[] = [];
    allPanels.forEach((panel) => {
      if (!panel.classList.contains(styles.breakPanel)) {
        mapped.push({ el: panel, navIdx: mapped.length });
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const match = mapped.find((m) => m.el === entry.target);
            if (match) setActiveSection(match.navIdx);
          }
        });
      },
      { threshold: 0.3 },
    );

    mapped.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [mobile, styles]);

  return { sectionRef, trackRef, scrollTweenRef, activeSection, goToSection };
}
