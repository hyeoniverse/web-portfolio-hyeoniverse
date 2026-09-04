"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { BREAKPOINT } from "@/constants";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "@/providers/LanguageProvider";
import shared from "../../AboutPanel.module.css";
import local from "../FeaturesPanel.module.css";
const styles = { ...shared, ...local };

/* 모바일/태블릿 폴더 카드 스크롤 — 좁은 화면에서는 카드를 겹쳐 쌓고 순서대로 밀어 올린다.
   폴더 크기와 탭 너비를 먼저 균일하게 맞춘 뒤(레이아웃), 카드 n 만 위로 올려
   그 아래 n+1 이 드러나게 한다. 컨테이너는 고정이고 개별 카드 transform 만 움직인다.
   데스크탑은 CSS 그리드 그대로라 아무것도 하지 않는다. */
export function useFeatureFolderScroll({
  isMobile,
  language,
  gridRef,
}: {
  isMobile: boolean;
  language: Language;
  gridRef: RefObject<HTMLDivElement | null>;
}) {
  const collapseRef = useRef({ firstCollapsedIdx: 0, collapseCount: 0, spacing: 0 });


  /* 모바일/태블릿: 폴더 크기·탭 너비 균일화, 음수 마진으로 겹침 배치.
     뷰포트에 안 들어가는 하단 카드만 추가로 겹침. */
  useLayoutEffect(() => {
    if (!isMobile || !gridRef.current) return;

    const grid = gridRef.current;
    const wraps = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderWrap}`),
    );
    const tabs = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderTab}`),
    );

    const pinnedEl = grid.querySelector(
      `.${styles.featureGridPinned}`,
    ) as HTMLElement | null;

    const measure = () => {
      // 측정을 위해 자연 크기로 초기화
      wraps.forEach((wrap) => {
        wrap.style.height = "auto";
        wrap.style.marginTop = "";
      });
      tabs.forEach((tab) => { tab.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";

      // 가장 높은 카드, 가장 넓은 탭, 탭 요소 높이 계산
      let maxCardHeight = 0;
      let maxTabWidth = 0;
      wraps.forEach((wrap) => { maxCardHeight = Math.max(maxCardHeight, wrap.offsetHeight); });
      tabs.forEach((tab) => { maxTabWidth = Math.max(maxTabWidth, tab.offsetWidth); });
      const tabH = tabs[0] ? tabs[0].offsetHeight : 40;

      // 마지막 카드: description 영역만 가려지도록 bodyPeek 계산
      // card의 paddingTop 영역까지만 보이고 desc 텍스트는 뷰포트 아래
      const lastCardEl = wraps[wraps.length - 1]?.querySelector(
        `.${styles.featureFolderCard}`,
      ) as HTMLElement | null;
      const bodyPeek = lastCardEl
        ? parseFloat(window.getComputedStyle(lastCardEl).paddingTop)
        : (maxCardHeight - tabH) * 0.3;

      // 균일한 크기 적용
      wraps.forEach((wrap) => { wrap.style.height = `${maxCardHeight}px`; });
      tabs.forEach((tab) => { tab.style.minWidth = `${maxTabWidth}px`; });

      const count = wraps.length;
      const slots = count - 1;
      const isTabletLayout = window.innerWidth >= BREAKPOINT.mobile;
      const spacing = tabH + (isTabletLayout ? 48 : 32); // 탭 + 여백 (태블릿은 더 넓게)
      const vh = window.innerHeight - 120; // padding-top 120px 반영

      // 스택 전체 높이: (카드 수-1) × 탭 간격 + 마지막 카드 탭 + bodyPeek
      const stackTotal = slots * spacing + tabH + bodyPeek;
      const desiredTopPadding = (tabH + 48) * 2;

      let topPadding: number;
      let collapseCount = 0;

      if (vh >= stackTotal + desiredTopPadding) {
        topPadding = vh - stackTotal;
      } else {
        // 공간 부족 → 하단 카드들을 완전히 겹쳐서 공간 확보
        const available = vh - desiredTopPadding - tabH - bodyPeek;
        const maxSlots = Math.max(0, Math.floor(available / spacing));
        collapseCount = Math.max(0, Math.min(slots - maxSlots, count - 2));

        const collapsedTotal =
          (slots - collapseCount) * spacing + tabH + bodyPeek;
        topPadding = Math.max(0, vh - collapsedTotal);
      }

      const uniformMargin = -(maxCardHeight - spacing);
      const fullyOverlappedMargin = -maxCardHeight;
      const lastIdx = count - 1;
      const firstCollapsedIdx = lastIdx - collapseCount;

      wraps.forEach((wrap, i) => {
        if (i === 0) return;
        wrap.style.marginTop = `${i > firstCollapsedIdx ? fullyOverlappedMargin : uniformMargin}px`;
      });

      collapseRef.current = { firstCollapsedIdx, collapseCount, spacing };

      if (pinnedEl) {
        pinnedEl.style.paddingTop = `${topPadding}px`;
      }

      // 레이아웃 변경 후 ScrollTrigger 재계산 (리사이즈·HMR 대응)
      ScrollTrigger.refresh();
    };

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wraps.forEach((wrap) => { wrap.style.height = ""; wrap.style.marginTop = ""; });
      tabs.forEach((tab) => { tab.style.minWidth = ""; });
      if (pinnedEl) pinnedEl.style.paddingTop = "";
    };
    // gridRef 는 ref 객체라 참조가 고정 — 재구독이 늘지 않는다
  }, [isMobile, language, gridRef]);

  /* 모바일/태블릿: 순차 카드 스크롤 애니메이션.
     카드 n만 translateY로 위로 올라감 → body가 다음 카드 위로 드러남.
     n의 description이 다 보이면(= body가 n+1 위로 완전히 분리) n+1이 올라가기 시작.
     n+1, n+2, ... 카드는 자기 차례 전까지 완전 고정.
     컨테이너(pinnedEl)는 이동하지 않음 — 개별 카드 transform만 사용. */
  useEffect(() => {
    if (!isMobile || !gridRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const grid = gridRef.current;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.featureFolderWrap}`),
    );

    let ctx: gsap.Context | null = null;

    const setup = () => {
      cards.forEach((c) => { c.style.transform = ""; });
      if (ctx) ctx.revert();

      const { spacing, firstCollapsedIdx } = collapseRef.current;
      const isTablet = window.innerWidth >= BREAKPOINT.mobile;
      const scrollPerCard = isTablet ? 450 : 350;

      const count = cards.length;

      const pinnedEl = grid.querySelector(
        `.${styles.featureGridPinned}`,
      ) as HTMLElement | null;
      const padTop = pinnedEl
        ? parseFloat(window.getComputedStyle(pinnedEl).paddingTop)
        : 0;
      const cardHeight = cards[0] ? cards[0].offsetHeight : 0;

      // 카드 간 여백
      const revealGap = isTablet ? 32 : 24;

      // 카드별 reveal 거리: 다음 카드와의 겹침량 + 여백
      // - 일반 카드: cardHeight - spacing (다음 카드가 spacing 아래)
      // - collapsed 카드: cardHeight (다음 카드가 같은 위치)
      const getRevealDist = (i: number) => {
        if (i >= count - 1) return cardHeight + revealGap; // 마지막 카드
        const isNextCollapsed = i >= firstCollapsedIdx;
        return (isNextCollapsed ? cardHeight : cardHeight - spacing) + revealGap;
      };

      // 카드별 누적 스크롤 시작 지점 — reveal 거리에 비례하는 스크롤 배분
      // (일반 카드는 scrollPerCard, collapsed 카드는 더 긴 스크롤)
      const baseReveal = cardHeight - spacing + revealGap; // 일반 카드 기준
      const getScrollForCard = (i: number) => {
        const rd = getRevealDist(i);
        return scrollPerCard * (rd / baseReveal);
      };

      const cardStarts: number[] = [];
      let cumScroll = 0;
      for (let i = 0; i < count; i++) {
        cardStarts.push(cumScroll);
        if (i < count - 1) cumScroll += getScrollForCard(i);
      }

      // 카드별 속도: reveal 거리 / 해당 스크롤 구간 = 일정 (baseReveal / scrollPerCard)
      const speed = baseReveal / scrollPerCard;

      // 카드 i의 뷰포트 위치 (collapsed면 firstCollapsedIdx 위치 사용)
      const getExitY = (i: number) => {
        const pos = i <= firstCollapsedIdx
          ? padTop + i * spacing
          : padTop + firstCollapsedIdx * spacing;
        return pos + cardHeight;
      };

      // 마지막 카드까지 완전히 올라온 뒤 pin 해제
      const scrollDist = cardStarts[count - 1] + getScrollForCard(count - 1);

      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: grid,
          start: "top top",
          end: `+=${scrollDist}`,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const scrollPx = self.progress * scrollDist;

            for (let i = 0; i < count; i++) {
              const exitY = getExitY(i);
              const elapsed = scrollPx - cardStarts[i];

              if (elapsed <= 0) {
                cards[i].style.transform = "";
              } else {
                const travel = Math.min(exitY, speed * elapsed);
                cards[i].style.transform = `translateY(${-travel}px)`;
              }
            }
          },
        });

      }, grid);

      ScrollTrigger.refresh();
    };

    // 초기 설정: 1프레임 대기 — BreakpointGuard 리마운트 후 DOM 안정화 보장
    const safeSetup = () => {
      try { setup(); } catch (e) {
        // DevTools 반응형 모드에서 cross-origin iframe 접근 시 SecurityError 무시
        if (!(e instanceof DOMException && e.name === "SecurityError")) throw e;
      }
    };
    const rafId = requestAnimationFrame(safeSetup);
    window.addEventListener("resize", safeSetup);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", safeSetup);
      cards.forEach((c) => { c.style.transform = ""; });
      if (ctx) ctx.revert();
    };
    // gridRef 는 ref 객체라 참조가 고정 — 재구독이 늘지 않는다
  }, [isMobile, language, gridRef]);
}
