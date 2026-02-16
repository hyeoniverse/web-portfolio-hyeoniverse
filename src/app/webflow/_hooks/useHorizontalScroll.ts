"use client";

import {
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
} from "react";
import gsap from "gsap";
import { useLenis } from "@/providers/LenisProvider";
import { checkMobileLayout, useMobileLayout } from "./mobileCheck";

// 패널 상수
const PANEL_COUNT = 11; // 한 세트의 패널 수
const NAV_SECTION_COUNT = 10; // breakPanel 제외한 네비게이션 섹션 수

// 애니메이션 상수
const SCROLL_LERP = 0.08;

export function useHorizontalScroll(
  styles: Record<string, string>,
  infinite: boolean = true,
): {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  activeSection: number;
  goToSection: (navIndex: number) => void;
  scrollBy: (deltaX: number) => void;
} {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef({ scrollX: 0, targetScrollX: 0 });
  const [activeSection, setActiveSection] = useState(0);
  const mobile = useMobileLayout();
  const { setInfinite, scrollTo: lenisScrollTo } = useLenis();

  // 외부에서 스크롤 제어 (usePinnedScroll 연동용)
  const scrollBy = useCallback((deltaX: number) => {
    scrollStateRef.current.targetScrollX += deltaX;
  }, []);

  // 섹션 이동
  const goToSection = useCallback(
    (navIndex: number) => {
      const track = trackRef.current;
      if (!track) return;

      if (checkMobileLayout()) {
        // 모바일: 기존 scrollIntoView 방식
        const panels = track.querySelectorAll(
          `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
        );
        let count = 0;
        for (let i = 0; i < panels.length; i++) {
          if (panels[i].classList.contains(styles.breakPanel)) continue;
          if (count === navIndex) {
            (panels[i] as HTMLElement).scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
            return;
          }
          count++;
        }
        return;
      }

      // 데스크탑: 가장 가까운 해당 패널을 찾아서 targetScrollX 조정
      const panels = track.querySelectorAll<HTMLElement>(
        `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
      );

      let bestTarget: HTMLElement | undefined;
      let bestDist = Infinity;
      let navCount = 0;

      for (let i = 0; i < panels.length; i++) {
        if (panels[i].classList.contains(styles.breakPanel)) continue;
        if ((infinite ? navCount % NAV_SECTION_COUNT : navCount) === navIndex) {
          const rect = panels[i].getBoundingClientRect();
          const dist = Math.abs(rect.left);
          if (dist < bestDist) {
            bestDist = dist;
            bestTarget = panels[i];
          }
        }
        navCount++;
      }

      if (bestTarget) {
        const rect = bestTarget.getBoundingClientRect();
        scrollStateRef.current.targetScrollX += rect.left;
      }
    },
    [styles, infinite],
  );

  // Lenis 무한 스크롤 비활성화 — useLayoutEffect 사용:
  // BreakpointGuard 리마운트 시 old cleanup(setInfinite(true)) 이후
  // paint 전에 즉시 infinite=false 복원 → Lenis가 infinite=true 상태로
  // 프레임을 처리하는 시간 창 제거
  useLayoutEffect(() => {
    setInfinite(false);
    return () => setInfinite(true);
  }, [setInfinite]);

  // 리사이즈 시 infinite=false 재적용 — LenisProvider의 resize 핸들러가
  // width > 768에서 infinite=true로 덮어쓰는 것을 방지
  // (webflow 페이지에서는 항상 infinite=false 필요)
  useEffect(() => {
    const handleResize = () => setInfinite(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setInfinite]);

  // 데스크탑: wheel + RAF + lerp + 무한 래핑
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || mobile) {
      if (mobile) {
        // 모바일 전환: 스크롤 위치 리셋
        lenisScrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
      }
      return;
    }

    const state = scrollStateRef.current;

    // DOM 측정
    const allPanels = gsap.utils.toArray<HTMLElement>(
      `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
      track,
    );

    if (allPanels.length < PANEL_COUNT) return;

    // 한 세트 너비 계산
    let oneSetWidth = 0;
    for (let i = 0; i < PANEL_COUNT && i < allPanels.length; i++) {
      oneSetWidth += allPanels[i].offsetWidth;
    }

    // 전체 트랙 너비 계산
    let totalWidth = 0;
    for (let i = 0; i < allPanels.length; i++) {
      totalWidth += allPanels[i].offsetWidth;
    }

    // 초기 위치: 무한이면 중간 세트, 아니면 처음
    const middleSetFirst = infinite ? allPanels[PANEL_COUNT] : null;
    const initialX = middleSetFirst ? -middleSetFirst.offsetLeft : 0;

    // 스크롤 상태 초기화
    state.scrollX = 0;
    state.targetScrollX = 0;

    // 초기 위치 설정
    gsap.set(track, { x: initialX });

    // Hero 패널(각 세트의 첫 패널)을 제외한 .animate 요소 초기 숨김
    allPanels.forEach((panel, i) => {
      if (i % PANEL_COUNT === 0) return; // Hero는 보임
      const items = panel.querySelectorAll(`.${styles.animate}`);
      if (items.length > 0) gsap.set(items, { opacity: 0, y: 40 });
    });

    // 이벤트 핸들러
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      state.targetScrollX += e.deltaY;
    };

    section.addEventListener("wheel", handleWheel, { passive: false });

    // RAF 애니메이션 루프
    const animate = () => {
      // 부드러운 스크롤 보간
      state.scrollX +=
        (state.targetScrollX - state.scrollX) * SCROLL_LERP;

      // 무한 래핑 또는 클램프
      if (infinite && oneSetWidth > 0) {
        while (state.scrollX > oneSetWidth * 1.5) {
          state.scrollX -= oneSetWidth;
          state.targetScrollX -= oneSetWidth;
        }
        while (state.scrollX < -oneSetWidth * 0.5) {
          state.scrollX += oneSetWidth;
          state.targetScrollX += oneSetWidth;
        }
      } else if (!infinite) {
        const maxScroll = totalWidth - window.innerWidth;
        state.targetScrollX = gsap.utils.clamp(0, maxScroll, state.targetScrollX);
        state.scrollX = gsap.utils.clamp(0, maxScroll, state.scrollX);
      }

      // 트랙 위치 업데이트
      gsap.set(track, { x: initialX - state.scrollX });

      // 패널 애니메이션 (뷰포트 기반)
      const vw = window.innerWidth;
      allPanels.forEach((panel, i) => {
        if (i % PANEL_COUNT === 0) return; // Hero 스킵

        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length === 0) return;

        const rect = panel.getBoundingClientRect();

        // 입장 진행도: 패널 왼쪽 가장자리가 뷰포트 80% → 50%
        const entryProgress = gsap.utils.clamp(
          0,
          1,
          (0.8 - rect.left / vw) / 0.3,
        );
        // 퇴장 진행도: 패널 오른쪽 가장자리가 뷰포트 50% → 20%
        const exitProgress = gsap.utils.clamp(
          0,
          1,
          (0.5 - rect.right / vw) / 0.3,
        );

        const opacity = Math.min(entryProgress, 1 - exitProgress);
        const y = exitProgress > 0 ? -30 * exitProgress : 40 * (1 - entryProgress);

        gsap.set(items, { opacity: Math.max(0, opacity), y });
      });

      // 활성 섹션 탐지 (뷰포트 중앙에 가장 가까운 패널)
      const viewportCenter = vw / 2;
      let closestNavIdx = 0;
      let closestDist = Infinity;
      let navIdx = 0;

      for (let i = 0; i < allPanels.length; i++) {
        const isBreak = allPanels[i].classList.contains(styles.breakPanel);
        if (isBreak) continue;

        const rect = allPanels[i].getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - viewportCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestNavIdx = infinite ? navIdx % NAV_SECTION_COUNT : navIdx;
        }
        navIdx++;
      }

      setActiveSection(closestNavIdx);

      rafId = requestAnimationFrame(animate);
    };

    let rafId = requestAnimationFrame(animate);

    // 리사이즈 핸들러
    const handleResize = () => {
      let sw = 0;
      for (let i = 0; i < PANEL_COUNT && i < allPanels.length; i++) {
        sw += allPanels[i].offsetWidth;
      }
      oneSetWidth = sw;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      section.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      // GSAP 인라인 transform 정리 (모바일 전환 시 column 레이아웃 방해 방지)
      gsap.set(track, { clearProps: "transform" });
      allPanels.forEach((panel) => {
        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length > 0) gsap.set(items, { clearProps: "opacity,y" });
      });
    };
  }, [styles, mobile, infinite, lenisScrollTo]);

  // 모바일: IntersectionObserver로 활성 섹션 추적
  useEffect(() => {
    if (!mobile) return;
    const track = trackRef.current;
    if (!track) return;

    const allPanels = track.querySelectorAll<HTMLElement>(
      `.${styles.panel}, .${styles.panelWide}`,
    );

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

  return { sectionRef, trackRef, activeSection, goToSection, scrollBy };
}
