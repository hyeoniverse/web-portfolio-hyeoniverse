"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import Button from "@/components/ui/Button";
import styles from "./HorizontalCarousel.module.css";

interface HorizontalCarouselProps {
  children: ReactNode;
  className?: string;
  showArrows?: boolean;
  showMask?: boolean;
}

/**
 * 가로 캐러셀 — scroll-snap + scrollbar hidden.
 * - `data-scrollable` attribute 노출 → 사용처 CSS 분기 가능
 * - scroll 가능 + 끝까지 안 갔을 때만 좌우 arrow / mask 표시
 * - 데스크탑 마우스 drag scroll (touch 는 native overflow scroll)
 * - wheel 수직 → 가로 redirect (양 끝 도달 시 페이지 native scroll 패스스루)
 * - arrow 꾹 누르면 long press scroll (시간 지날수록 빨라짐)
 */
export default function HorizontalCarousel({
  children,
  className,
  showArrows = true,
  showMask = true,
}: HorizontalCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setScrollable(hasOverflow);
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateState();
    const ro = new ResizeObserver(updateState);
    ro.observe(el);
    el.addEventListener("scroll", updateState, { passive: true });

    // wheel 수직 → 가로 redirect. 양 끝 도달 시 페이지 native scroll 패스스루
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const delta = e.deltaY;
      if (delta === 0) return;
      const atStart = el.scrollLeft <= 0 && delta < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && delta > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateState);
      el.removeEventListener("wheel", onWheel);
    };
  }, [updateState]);

  /* ── Mouse drag scroll ── */
  const dragState = useRef<{ active: boolean; startX: number; startLeft: number; moved: boolean }>({
    active: false,
    startX: 0,
    startLeft: 0,
    moved: false,
  });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    // 포인터 캡처는 실제 드래그가 시작될 때(onPointerMove)만 — pointerdown 에서 바로 캡처하면
    // 자식(카드)의 click/hover 이벤트가 carousel 로 리다이렉트돼 클릭이 안 먹는 경우가 있음.
    dragState.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state.active) return;
    const el = ref.current;
    if (!el) return;
    const dx = e.clientX - state.startX;
    if (Math.abs(dx) > 4 && !state.moved) {
      state.moved = true;
      el.setAttribute("data-cursor", "grab");
      el.setPointerCapture(e.pointerId);
    }
    el.scrollLeft = state.startLeft - dx;
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state.active) return;
    state.active = false;
    const el = ref.current;
    if (state.moved && el?.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    el?.removeAttribute("data-cursor");
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.moved = false;
    }
  };

  /* ── Arrow long-press scroll (꾹 누르면 점점 빨라짐) ── */
  const longPress = useRef<{ rafId: number | null; startTimeout: ReturnType<typeof setTimeout> | null }>({
    rafId: null,
    startTimeout: null,
  });

  const stopLongPress = () => {
    if (longPress.current.startTimeout) {
      clearTimeout(longPress.current.startTimeout);
      longPress.current.startTimeout = null;
    }
    if (longPress.current.rafId !== null) {
      cancelAnimationFrame(longPress.current.rafId);
      longPress.current.rafId = null;
    }
  };

  const startArrowPress = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    stopLongPress();
    // 즉시 한 번 step scroll (짧은 클릭만으로도 충분한 이동)
    el.scrollBy({ left: dir * el.clientWidth * 0.3, behavior: "smooth" });
    // 220ms 후 long-press 가속 시작 (짧은 클릭은 trigger 안 됨)
    longPress.current.startTimeout = setTimeout(() => {
      const startTime = performance.now();
      const tick = () => {
        const target = ref.current;
        if (!target) return;
        const elapsed = performance.now() - startTime;
        // 가속 — 2 ~ 24 px/frame 사이로 ramp up. ~1.5초 후 최대
        const speed = 2 + Math.min(elapsed / 70, 22);
        target.scrollLeft += dir * speed;
        longPress.current.rafId = requestAnimationFrame(tick);
      };
      longPress.current.rafId = requestAnimationFrame(tick);
    }, 220);
  };

  useEffect(() => stopLongPress, []);

  return (
    <div className={styles.wrapper}>
      <div
        ref={ref}
        className={`${styles.carousel}${className ? ` ${className}` : ""}`}
        data-scrollable={scrollable}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
      {scrollable && showMask && (
        <>
          <div className={`${styles.mask} ${styles.maskLeft} ${canScrollLeft ? "" : styles.hidden}`} />
          <div className={`${styles.mask} ${styles.maskRight} ${canScrollRight ? "" : styles.hidden}`} />
        </>
      )}
      {scrollable && showArrows && (
        <>
          <div
            className={`${styles.arrow} ${styles.arrowLeft} ${canScrollLeft ? "" : styles.hidden}`}
            onPointerDown={() => startArrowPress(-1)}
            onPointerUp={stopLongPress}
            onPointerLeave={stopLongPress}
            onPointerCancel={stopLongPress}
            data-cursor="prev"
            role="button"
            aria-label="Previous"
          >
            <Button variant="difference" shape="circle" size="sm" tabIndex={-1} aria-hidden="true">
              <ChevronLeft size={16} />
            </Button>
          </div>
          <div
            className={`${styles.arrow} ${styles.arrowRight} ${canScrollRight ? "" : styles.hidden}`}
            onPointerDown={() => startArrowPress(1)}
            onPointerUp={stopLongPress}
            onPointerLeave={stopLongPress}
            onPointerCancel={stopLongPress}
            data-cursor="next"
            role="button"
            aria-label="Next"
          >
            <Button variant="difference" shape="circle" size="sm" tabIndex={-1} aria-hidden="true">
              <ChevronRight size={16} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
