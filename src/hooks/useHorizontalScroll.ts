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
import { checkMobileLayout, useMobileLayout } from "@/hooks/useMobileLayout";

const SCROLL_LERP = 0.08;
const MAX_WHEEL_DELTA = 150;

export interface HorizontalScrollOptions {
  /** Infinite wrapping (default: false) */
  infinite?: boolean;
  /** Panels per set — infinite 모드 전용 (default: 11) */
  panelSetSize?: number;
  /** Nav sections per set — infinite 모드 전용 (default: panelSetSize - 1) */
  navSectionCount?: number;
  /** 모바일에서 .animateVisible 클래스 토글 (default: false) */
  mobileAnimateVisible?: boolean;
}

/**
 * 가로 스크롤 공통 훅.
 *
 * - 데스크톱: wheel → targetScrollX → LERP 보간 → gsap.set(track, { x })
 * - 모바일: 세로 스크롤 + IntersectionObserver
 * - 패널 셀렉터: styles.panel, panelWide, breakPanel 자동 탐지
 */
export function useHorizontalScroll(
  styles: Record<string, string>,
  options?: HorizontalScrollOptions,
): {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  activeSection: number;
  goToSection: (navIndex: number) => void;
  scrollBy: (deltaX: number) => void;
} {
  const {
    infinite = false,
    panelSetSize = 11,
    navSectionCount = infinite ? panelSetSize - 1 : 0,
    mobileAnimateVisible = false,
  } = options ?? {};

  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef({ scrollX: 0, targetScrollX: 0 });
  const [activeSection, setActiveSection] = useState(0);
  const mobile = useMobileLayout();
  const { setInfinite, scrollTo: lenisScrollTo } = useLenis();

  // ── 패널 셀렉터 빌드 ──
  const panelSelector = [styles.panel, styles.panelWide, styles.breakPanel]
    .filter(Boolean)
    .map((c) => `.${c}`)
    .join(", ");

  // breakPanel 없으면 빈 문자열 — 안전하게 비교 가능
  const breakClass = styles.breakPanel ?? "";

  // 외부에서 스크롤 제어 (usePinnedScroll 연동용)
  const scrollBy = useCallback((deltaX: number) => {
    scrollStateRef.current.targetScrollX += deltaX;
  }, []);

  // ── 섹션 이동 ──
  const goToSection = useCallback(
    (navIndex: number) => {
      const track = trackRef.current;
      if (!track) return;

      const panels = track.querySelectorAll<HTMLElement>(panelSelector);

      if (checkMobileLayout()) {
        let count = 0;
        for (let i = 0; i < panels.length; i++) {
          if (breakClass && panels[i].classList.contains(breakClass)) continue;
          if (count === navIndex) {
            panels[i].scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
          count++;
        }
        return;
      }

      // 데스크탑: 가장 가까운 해당 패널을 찾아서 targetScrollX 조정
      let bestTarget: HTMLElement | undefined;
      let bestDist = Infinity;
      let navCount = 0;

      for (let i = 0; i < panels.length; i++) {
        if (breakClass && panels[i].classList.contains(breakClass)) continue;
        const idx = infinite ? navCount % navSectionCount : navCount;
        if (idx === navIndex) {
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
    [panelSelector, breakClass, infinite, navSectionCount],
  );

  // ── Lenis 무한 스크롤 비활성화 ──
  // BreakpointGuard 리마운트 시 old cleanup(setInfinite(true)) 이후
  // paint 전에 즉시 infinite=false 복원
  useLayoutEffect(() => {
    setInfinite(false);
    return () => setInfinite(true);
  }, [setInfinite]);

  // 리사이즈 시 infinite=false 재적용 — LenisProvider의 resize 핸들러가
  // width > 768에서 infinite=true로 덮어쓰는 것을 방지
  useEffect(() => {
    const handleResize = () => setInfinite(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setInfinite]);

  // ── 데스크탑: wheel + RAF + lerp ──
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || mobile) {
      if (mobile) {
        lenisScrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
      }
      return;
    }

    const state = scrollStateRef.current;

    // DOM 측정
    const allPanels = gsap.utils.toArray<HTMLElement>(panelSelector, track);

    // 최소 패널 수 확인
    if (infinite && allPanels.length < panelSetSize) return;
    if (!infinite && allPanels.length === 0) return;

    // 한 세트 너비 (infinite 모드)
    let oneSetWidth = 0;
    if (infinite) {
      for (let i = 0; i < panelSetSize && i < allPanels.length; i++) {
        oneSetWidth += allPanels[i].offsetWidth;
      }
    }

    // 전체 트랙 너비
    let totalWidth = 0;
    for (let i = 0; i < allPanels.length; i++) {
      totalWidth += allPanels[i].offsetWidth;
    }

    // 초기 위치: infinite → 중간 세트, finite → 0
    const middleSetFirst = infinite ? allPanels[panelSetSize] : null;
    const initialX = middleSetFirst ? -middleSetFirst.offsetLeft : 0;

    // 스크롤 상태 초기화
    state.scrollX = 0;
    state.targetScrollX = 0;
    gsap.set(track, { x: initialX });

    // Hero 패널 제외 .animate 요소 초기 숨김
    allPanels.forEach((panel, i) => {
      const isHero = infinite ? i % panelSetSize === 0 : i === 0;
      if (isHero) return;
      const items = panel.querySelectorAll(`.${styles.animate}`);
      if (items.length > 0) gsap.set(items, { opacity: 0, y: 40 });
    });

    // wheel 이벤트 핸들러
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const clamped = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, e.deltaY));
      state.targetScrollX += clamped;
    };
    section.addEventListener("wheel", handleWheel, { passive: false });

    // RAF 애니메이션 루프
    const animate = () => {
      state.scrollX += (state.targetScrollX - state.scrollX) * SCROLL_LERP;

      // infinite 래핑 또는 clamp
      if (infinite && oneSetWidth > 0) {
        while (state.scrollX > oneSetWidth * 1.5) {
          state.scrollX -= oneSetWidth;
          state.targetScrollX -= oneSetWidth;
        }
        while (state.scrollX < -oneSetWidth * 0.5) {
          state.scrollX += oneSetWidth;
          state.targetScrollX += oneSetWidth;
        }
      } else {
        const maxScroll = totalWidth - window.innerWidth;
        state.targetScrollX = gsap.utils.clamp(
          0,
          maxScroll,
          state.targetScrollX,
        );
        state.scrollX = gsap.utils.clamp(0, maxScroll, state.scrollX);
      }

      // 트랙 위치 업데이트
      gsap.set(track, { x: initialX - state.scrollX });

      // 패널 애니메이션 (뷰포트 기반) — off-screen 패널 스킵
      const vw = window.innerWidth;
      allPanels.forEach((panel) => {
        const items = panel.querySelectorAll<HTMLElement>(
          `.${styles.animate}`,
        );
        if (items.length === 0) return;

        const rect = panel.getBoundingClientRect();
        // 뷰포트 밖이면 건너뛰기 (여유 마진 vw * 0.3)
        if (rect.right < -vw * 0.3 || rect.left > vw * 1.3) return;
        const entryProgress = gsap.utils.clamp(
          0,
          1,
          (0.8 - rect.left / vw) / 0.3,
        );
        const exitProgress = gsap.utils.clamp(
          0,
          1,
          (0.5 - rect.right / vw) / 0.3,
        );

        const count = items.length;
        const maxStagger = Math.min(0.15, 0.8 / Math.max(count, 1));

        items.forEach((item, idx) => {
          // 진입: 첫 번째 아이템부터 순차 등장
          const eS =
            count > 1 ? (idx / (count - 1)) * maxStagger : 0;
          const itemEntry = gsap.utils.clamp(
            0,
            1,
            (entryProgress - eS) / (1 - maxStagger),
          );
          // 퇴장: 마지막 아이템부터 순차 퇴장
          const xS =
            count > 1
              ? ((count - 1 - idx) / (count - 1)) * maxStagger
              : 0;
          const itemExit = gsap.utils.clamp(
            0,
            1,
            (exitProgress - xS) / (1 - maxStagger),
          );

          const opacity = Math.min(itemEntry, 1 - itemExit);
          const y =
            itemExit > 0
              ? -30 * itemExit
              : 40 * (1 - itemEntry);
          const rotateX =
            itemExit > 0
              ? 8 * itemExit
              : -8 * (1 - itemEntry);

          gsap.set(item, {
            opacity: Math.max(0, opacity),
            y,
            rotateX,
            transformPerspective: 800,
          });
        });
      });

      // 활성 섹션 탐지 — 뷰포트 중앙을 포함하는 패널 우선,
      // 없으면 중앙에 가장 가까운 패널 (extraWide 패널 조기 전환 방지)
      const viewportCenter = vw / 2;
      let closestNavIdx = 0;
      let closestDist = Infinity;
      let navIdx = 0;
      let found = false;

      for (let i = 0; i < allPanels.length; i++) {
        if (breakClass && allPanels[i].classList.contains(breakClass)) continue;
        const rect = allPanels[i].getBoundingClientRect();
        const idx = infinite && navSectionCount
          ? navIdx % navSectionCount
          : navIdx;

        // 뷰포트 중앙이 패널 범위 안에 있으면 확정
        if (rect.left <= viewportCenter && rect.right >= viewportCenter) {
          closestNavIdx = idx;
          found = true;
        }

        // 폴백: 중앙에 가장 가까운 패널
        if (!found) {
          const dist = Math.abs(rect.left + rect.width / 2 - viewportCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closestNavIdx = idx;
          }
        }
        navIdx++;
      }

      setActiveSection(closestNavIdx);
      rafId = requestAnimationFrame(animate);
    };

    let rafId = requestAnimationFrame(animate);

    // 리사이즈 핸들러
    const handleResize = () => {
      if (infinite) {
        let sw = 0;
        for (let i = 0; i < panelSetSize && i < allPanels.length; i++) {
          sw += allPanels[i].offsetWidth;
        }
        oneSetWidth = sw;
      } else {
        totalWidth = 0;
        for (let i = 0; i < allPanels.length; i++) {
          totalWidth += allPanels[i].offsetWidth;
        }
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      section.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      gsap.set(track, { clearProps: "transform" });
      allPanels.forEach((panel) => {
        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length > 0)
          gsap.set(items, { clearProps: "opacity,y,rotateX" });
      });
    };
  }, [
    styles,
    panelSelector,
    breakClass,
    mobile,
    infinite,
    panelSetSize,
    navSectionCount,
    lenisScrollTo,
  ]);

  // ── 모바일: IntersectionObserver로 활성 섹션 추적 ──
  useEffect(() => {
    if (!mobile) return;
    const track = trackRef.current;
    if (!track) return;

    // breakPanel 제외하고 네비게이션 인덱스 매핑
    const allPanels = track.querySelectorAll<HTMLElement>(panelSelector);
    const mapped: { el: HTMLElement; navIdx: number }[] = [];
    allPanels.forEach((panel) => {
      if (breakClass && panel.classList.contains(breakClass)) return;
      mapped.push({ el: panel, navIdx: mapped.length });
    });

    // rootMargin "-45% 0px -45% 0px" → 뷰포트 중앙 10% 영역만 감지
    // 패널이 화면 중앙에 왔을 때 섹션 전환
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const match = mapped.find((m) => m.el === entry.target);
            if (match) setActiveSection(match.navIdx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    mapped.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [mobile, panelSelector, breakClass]);

  // ── 모바일: .animate → .animateVisible 클래스 토글 ──
  useEffect(() => {
    if (!mobile || !mobileAnimateVisible) return;
    const track = trackRef.current;
    if (!track) return;

    const animateClass = styles.animate;
    const visibleClass = styles.animateVisible;
    if (!animateClass || !visibleClass) return;

    const targets = track.querySelectorAll<HTMLElement>(`.${animateClass}`);
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
  }, [mobile, mobileAnimateVisible, styles]);

  return { sectionRef, trackRef, activeSection, goToSection, scrollBy };
}
