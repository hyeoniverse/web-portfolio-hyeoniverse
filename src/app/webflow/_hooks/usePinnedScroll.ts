"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { checkMobileLayout } from "./mobileCheck";

/**
 * 데스크톱 수평 스크롤 고정이 필요한 "초광폭" 패널용 공유 훅.
 *
 * 처리 사항:
 * 1. RAF 카운터 트랜슬레이션 (panelRef → contentRef) — 콘텐츠가 고정된 것처럼 보이게 함
 * 2. 스크롤 진행도 → activeIndex 매핑
 * 3. 클릭 → 스크롤 위치 네비게이션 (scrollToItem)
 *
 * 데스크톱에서만 활성화 (checkMobileLayout()이 true이면 건너뜀).
 */
export function usePinnedScroll(
  itemCount: number,
  onIndexChange?: (index: number) => void,
  scrollBy?: (deltaX: number) => void,
): {
  panelRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  activeIndex: number;
  scrollToItem: (index: number) => void;
} {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // 데스크톱: RAF 루프 — 콘텐츠 카운터 트랜슬레이션 + 활성 인덱스 추적
  useEffect(() => {
    if (checkMobileLayout()) return;

    let rafId: number;
    let prevIndex = 0;

    const update = () => {
      if (panelRef.current && contentRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const extraWidth = rect.width - viewportWidth;

        if (extraWidth > 0) {
          const offset = Math.max(0, Math.min(-rect.left, extraWidth));
          contentRef.current.style.transform = `translateX(${offset}px)`;

          const progress = Math.max(0, Math.min(1, -rect.left / extraWidth));
          const newIndex = Math.min(
            itemCount - 1,
            Math.floor(progress * itemCount),
          );
          if (newIndex !== prevIndex) {
            prevIndex = newIndex;
            setActiveIndex(newIndex);
            onIndexChange?.(newIndex);
          }
        }
      }
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [itemCount, onIndexChange]);

  // 점/항목 클릭 → 해당 수평 위치로 스크롤
  const scrollToItem = useCallback(
    (index: number) => {
      if (!panelRef.current || checkMobileLayout()) return;

      const rect = panelRef.current.getBoundingClientRect();
      const extraWidth = rect.width - window.innerWidth;
      if (extraWidth <= 0) return;

      const targetProgress = (index + 0.5) / itemCount;
      const targetLeft = -(targetProgress * extraWidth);
      const delta = rect.left - targetLeft;

      if (scrollBy) {
        scrollBy(delta);
      } else {
        window.scrollTo({ top: window.scrollY + delta });
      }
    },
    [itemCount, scrollBy],
  );

  return { panelRef, contentRef, activeIndex, scrollToItem };
}
