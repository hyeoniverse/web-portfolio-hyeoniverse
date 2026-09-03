"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "./SeriesSection.module.css";

/* 시리즈 row 가로 스크롤 — native overflow-x 위에 Windows 휠 → 가로 변환, 데스크톱 드래그 swipe(모바일 터치는 native),
   끝 근처에서 loadMore, 좌/우 끝 클래스(atStart/atEnd/noScroll) 토글, 화살표 long-press 가속 스크롤.
   seriesCount 가 변하면 scrollWidth 도 변하므로 리스너를 다시 건다. */
export function useSeriesRowScroll(
  rowRef: RefObject<HTMLDivElement | null>,
  loadMore: () => void,
  seriesCount: number,
) {
  // 시리즈 좌/우 화살표 long-press 스크롤 — 누르고 있을수록 가속
  const scrollRafRef = useRef<number | null>(null);
  const scrollStartRef = useRef<number>(0);
  const startScroll = (direction: 1 | -1) => {
    scrollStartRef.current = performance.now();
    const tick = () => {
      const el = rowRef.current;
      if (!el) return;
      const elapsed = performance.now() - scrollStartRef.current;
      // base 4px / frame, 누른 시간만큼 가속 (max 30px / frame, ≈1.8s 후 도달)
      const speed = Math.min(4 + elapsed / 50, 30);
      el.scrollLeft += speed * direction;
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  };
  const stopScroll = () => {
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  };

  /* 시리즈 row 는 모두 가로로 펼쳐서 native overflow-x 스크롤
     + Windows 마우스 휠을 가로로 변환 + 데스크톱 드래그 swipe (모바일 터치는 native 사용)
     + 끝 근처에 도달하면 다음 페이지 로드 (infinite horizontal scroll) */
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const NEAR_END_PX = 200; // 끝까지 200px 이내면 다음 페이지 prefetch
    const EDGE_TOL = 2; // scroll 좌/우 끝 판정 허용 오차
    const SCROLL_IDLE_MS = 150; // 마지막 스크롤 후 idle 판정 시간

    // 스크롤/드래그 중에는 deck hover 비활성 — data-scrolling 속성으로 CSS 가 :hover 효과 차단
    let scrollingTimer: ReturnType<typeof setTimeout> | null = null;
    const setScrolling = (on: boolean) => {
      if (on) el.setAttribute("data-scrolling", "true");
      else el.removeAttribute("data-scrolling");
    };
    const markScrolling = () => {
      setScrolling(true);
      if (scrollingTimer) clearTimeout(scrollingTimer);
      scrollingTimer = setTimeout(() => setScrolling(false), SCROLL_IDLE_MS);
    };

    // 좌/우 mask + 스크롤 화살표 표시 여부 — 스크롤 위치에 따라 클래스 토글
    const updateEdges = () => {
      const atStart = el.scrollLeft <= EDGE_TOL;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_TOL;
      const noScroll = el.scrollWidth <= el.clientWidth + EDGE_TOL; // 넘치지 않으면 화살표 둘 다 숨김
      el.classList.toggle(styles.atStart, atStart);
      el.classList.toggle(styles.atEnd, atEnd);
      // 화살표 버튼은 wrap 기준으로 숨김 (왼쪽 버튼은 seriesRow 앞 형제라 CSS ~ 로 못 잡음)
      const wrap = el.parentElement;
      if (wrap) {
        wrap.classList.toggle(styles.atStart, atStart);
        wrap.classList.toggle(styles.atEnd, atEnd);
        wrap.classList.toggle(styles.noScroll, noScroll);
      }
    };

    const maybeLoadMore = () => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - NEAR_END_PX) {
        loadMore();
      }
      updateEdges();
      markScrolling();
    };

    const handleWheel = (e: WheelEvent) => {
      // 시리즈 영역 hover 시 vertical wheel 은 페이지로 새지 않게 항상 차단
      e.preventDefault();
      // 가로 overflow 있으면 vertical+horizontal delta 모두 합쳐서 가로 스크롤로 변환
      if (el.scrollWidth > el.clientWidth) {
        el.scrollLeft += e.deltaY + e.deltaX;
      }
    };

    // pointer capture 를 쓰면 자식 button 의 click 이 부모로 가로채져서 시리즈 클릭이 안 먹힘.
    // 대신 document 레벨로 move/up 을 듣고, 4px 넘게 움직였을 때만 스크롤 + click 차단.
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return; // 좌클릭만
      const startX = e.clientX;
      const startScroll = el.scrollLeft;
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        if (!moved && Math.abs(dx) > 4) moved = true;
        if (moved) {
          el.scrollLeft = startScroll - dx;
          ev.preventDefault();
          markScrolling();
        }
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        if (moved) {
          // 드래그 직후 click 1회 차단 (children 의 onClick 막기)
          const blockClick = (cev: MouseEvent) => {
            cev.stopPropagation();
            cev.preventDefault();
            document.removeEventListener("click", blockClick, true);
          };
          document.addEventListener("click", blockClick, true);
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    };

    el.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("scroll", maybeLoadMore, { passive: true });

    // 마운트 직후 — 첫 페이지가 화면을 가득 채우지 못해 스크롤 자체가 불가능하면 즉시 다음 페이지
    maybeLoadMore();
    updateEdges();
    // seriesList 가 변하면 scrollWidth 도 변하므로 ResizeObserver 로 재계산
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", handleWheel, {
        capture: true,
      } as EventListenerOptions);
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("scroll", maybeLoadMore);
    };
  }, [rowRef, seriesCount, loadMore]);

  return { startScroll, stopScroll };
}
