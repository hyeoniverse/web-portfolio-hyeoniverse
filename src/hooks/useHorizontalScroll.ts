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
/** 전역 Lenis 가 이 요소 위의 휠을 건드리지 않게 하는 표시 — Lenis 가 읽는 이름 그대로여야 한다 */
const LENIS_PREVENT_WHEEL = "data-lenis-prevent-wheel";

export interface HorizontalScrollOptions {
  /** Infinite wrapping (default: false) */
  infinite?: boolean;
  /** Panels per set — infinite 모드 전용 (default: 11) */
  panelSetSize?: number;
  /** Nav sections per set — infinite 모드 전용 (default: panelSetSize - 1) */
  navSectionCount?: number;
  /** 모바일에서 .animateVisible 클래스 토글 (default: false) */
  mobileAnimateVisible?: boolean;
  /** 트랙의 패널이 다 그려졌는지 (default: true). 무한 모드에서 앞뒤 세트를 브라우저에서 늦게 붙이면
      그때까지 false 로 두어, 한 세트만 있을 때 초기 위치를 잡지 않게 한다 */
  ready?: boolean;
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
    ready = true,
  } = options ?? {};

  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef({ scrollX: 0, targetScrollX: 0 });
  const initializedRef = useRef(false);
  const rafIdRef = useRef(0);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
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
        const vw = window.innerWidth;
        const offset = rect.width < vw ? rect.left - (vw - rect.width) / 2 : rect.left;
        scrollStateRef.current.targetScrollX += offset;
      }
    },
    [panelSelector, breakClass, infinite, navSectionCount],
  );

  // ── Lenis 무한 스크롤 비활성화 ──
  // 무한 스크롤은 기본 OFF — opt-in 방식이라 cleanup 복원 불필요
  useLayoutEffect(() => {
    setInfinite(false);
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
    // 이전 실행분 정리 (strict mode 재실행 시)
    cancelAnimationFrame(rafIdRef.current);
    if (wheelHandlerRef.current) sectionRef.current?.removeEventListener("wheel", wheelHandlerRef.current);
    if (resizeHandlerRef.current) window.removeEventListener("resize", resizeHandlerRef.current);
    /* 가로가 손을 떼면 Lenis 를 막아 둔 표시도 같이 걷는다 — 모바일로 내려갈 때 남으면 세로 스크롤이 죽는다 */
    sectionRef.current?.removeAttribute(LENIS_PREVENT_WHEEL);

    const section = sectionRef.current;
    const track = trackRef.current;
    /* mobile 만 보면 안 된다. 하이드레이션 첫 패스에서 useMobileLayout 은 서버 값(false)을
       돌려주므로, 모바일에서도 여기가 한 번 데스크톱으로 돈다. 그러면 트랙에 transform 이,
       .animate 요소에 opacity 0 이 인라인으로 박힌 채 남는다(곧 mobile 이 true 로 바뀌어도
       정리 함수는 리스너만 뗀다). 예전에는 BreakpointGuard 가 방문 직후 페이지를 통째로 다시
       만들어 이 흔적을 지웠는데, 그 리마운트를 없애면서 드러났다. layout effect 는 브라우저에서
       돌므로 실제 창 너비를 직접 본다. */
    if (!section || !track || mobile || checkMobileLayout()) {
      if (mobile) {
        lenisScrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
      }
      return;
    }
    if (!ready) return;

    const state = scrollStateRef.current;

    let allPanels = gsap.utils.toArray<HTMLElement>(panelSelector, track);

    if (infinite && allPanels.length < panelSetSize) return;
    if (!infinite && allPanels.length === 0) return;

    // extraWide 패널 (350vw 등) — 이 구간에서는 lookahead 제한 해제
    let extraWidePanels = allPanels.filter(
      (p) => p.offsetWidth > window.innerWidth * 2,
    );

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

    // dynamic import가 DOM 요소를 교체했을 때 allPanels를 재쿼리하는 헬퍼
    const refreshPanelsIfStale = () => {
      if (!allPanels.some((el) => !document.contains(el))) return;
      allPanels = gsap.utils.toArray<HTMLElement>(panelSelector, track);
      extraWidePanels = allPanels.filter(
        (p) => p.offsetWidth > window.innerWidth * 2,
      );
      if (infinite) {
        oneSetWidth = 0;
        for (let i = 0; i < panelSetSize && i < allPanels.length; i++) {
          oneSetWidth += allPanels[i].offsetWidth;
        }
      } else {
        totalWidth = 0;
        for (const p of allPanels) totalWidth += p.offsetWidth;
      }
    };

    // 초기 위치: infinite → 중간 세트, finite → 0
    const middleSetFirst = infinite ? allPanels[panelSetSize] : null;
    const initialX = middleSetFirst ? -middleSetFirst.offsetLeft : 0;

    // 스크롤 상태 초기화
    state.scrollX = 0;
    state.targetScrollX = 0;
    gsap.set(track, { x: initialX });

    // .animate 요소 초기화 — 1회만
    if (!initializedRef.current) {
      initializedRef.current = true;
      allPanels.forEach((panel, i) => {
        const isHero = infinite ? i % panelSetSize === 0 : i === 0;
        if (isHero) return;
        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length > 0) gsap.set(items, { opacity: 0, y: 40 });
      });
    }

    /* 가로 스크롤이 끝에 닿으면 세로 스크롤로 넘긴다.
       예전에는 wheel 을 무조건 preventDefault 해서, 이 섹션 위에서는 페이지가 아예 움직이지
       않았다. 섹션이 100vh 라 화면을 가득 채우므로 아래에 있는 다른 섹션(프로필의 GitHub
       레포지토리 등)에 닿을 방법이 없고, 어쩌다 페이지가 조금 내려간 상태가 되면
       (새로고침 시 브라우저 스크롤 복원 · 키보드 스크롤 · 해시 이동) 패널이 잘린 채로
       빠져나오지도 못했다. */
    const atHorizontalEdge = (deltaY: number) => {
      if (infinite) return false;                  // 무한 모드는 끝이 없다
      const maxScroll = Math.max(0, totalWidth - window.innerWidth);
      if (deltaY > 0) return state.targetScrollX >= maxScroll - 1;
      if (deltaY < 0) return state.targetScrollX <= 1;
      return false;
    };

    /* 섹션이 뷰포트에 딱 맞아 있을 때만 가로로 가로챈다.
       어긋나 있으면(=페이지가 조금 내려가 패널이 잘린 상태) 세로 스크롤을 그대로 흘려보내
       제자리로 되돌릴 수 있게 한다. 여기서 가로챘다가는 잘린 채로 좌우로만 움직인다. */
    const ALIGN_TOLERANCE_PX = 4;

    // wheel 이벤트 핸들러
    const handleWheel = (e: WheelEvent) => {
      const aligned = Math.abs(section.getBoundingClientRect().top) <= ALIGN_TOLERANCE_PX;
      /* 끝에 닿았고 그 방향으로 더 굴리면 막지 않는다 — 브라우저(=Lenis)가 세로로 이어받는다. */
      const take = aligned && !atHorizontalEdge(e.deltaY);

      /* 이 휠을 가로가 가져갈 때는 전역 Lenis 도 같이 물러나게 한다(#1045).
         Lenis 는 defaultPrevented 를 보지 않는다. window 에 붙인 자기 휠 리스너에서 델타를 받아
         scrollTo 로 페이지를 직접 굴리므로, 아래 preventDefault 는 브라우저의 기본 스크롤만 막고
         Lenis 는 그대로 세로로 밀어버린다. 재 보니 휠 한 번에 트랙이 가로로 51px 가는 동안
         페이지도 98px 세로로 밀렸다. 물러나게 하는 수단은 이 표시뿐이다 — Lenis 가 이벤트의
         composedPath 를 훑어 확인하고, 우리 리스너가 window 보다 먼저 돌므로 같은 이벤트에 먹는다.
         넘기기로 한 휠에는 표시를 떼서, 끝에서의 세로 이어받기와 어긋난 상태에서 제자리로
         돌아오는 길을 그대로 남긴다. */
      section.toggleAttribute(LENIS_PREVENT_WHEEL, take);
      if (!take) return;
      e.preventDefault();
      const clamped = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, e.deltaY));
      state.targetScrollX += clamped;

      // 실수로 여러 패널 건너뜀 방지: extraWide 패널 구간이 아니면 lookahead 제한
      const insideWide = extraWidePanels.some((p) => {
        const enter = initialX + p.offsetLeft - window.innerWidth;
        const exit = initialX + p.offsetLeft + p.offsetWidth;
        return state.scrollX > enter && state.scrollX < exit;
      });
      if (!insideWide) {
        const cap = window.innerWidth * 1.2;
        state.targetScrollX = gsap.utils.clamp(
          state.scrollX - cap,
          state.scrollX + cap,
          state.targetScrollX,
        );
      }
    };
    section.addEventListener("wheel", handleWheel, { passive: false });

    // RAF 애니메이션 루프
    const animate = () => {
      // dynamic import로 교체된 DOM 요소가 있으면 allPanels 재쿼리
      refreshPanelsIfStale();

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
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);
    wheelHandlerRef.current = handleWheel;

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
    resizeHandlerRef.current = handleResize;
    window.addEventListener("resize", handleResize);

    // cleanup: 실제 unmount 시에만 실행. strict mode 재실행 시에는 effect 상단에서 정리.
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      section.removeEventListener("wheel", handleWheel);
      section.removeAttribute(LENIS_PREVENT_WHEEL);
      window.removeEventListener("resize", handleResize);
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
    ready,
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
