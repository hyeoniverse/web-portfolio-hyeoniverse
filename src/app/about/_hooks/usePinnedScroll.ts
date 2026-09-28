"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { checkMobileLayout, useMobileLayout } from "@/hooks/useMobileLayout";
import type { MobilePinScrollHandle } from "./useMobilePinScroll";
import { HSCROLL_FRAME_EVENT } from "@/hooks/useHorizontalScroll";

/**
 * 데스크톱 수평 스크롤 고정이 필요한 "초광폭" 패널용 공유 훅.
 *
 * 처리 사항:
 * 1. RAF 카운터 트랜슬레이션 (panelRef → contentRef) — 콘텐츠가 고정된 것처럼 보이게 함
 * 2. 스크롤 진행도 → activeIndex 매핑
 * 3. 클릭 → 스크롤 위치 네비게이션 (scrollToItem)
 *
 * 데스크톱에서만 활성화 (checkMobileLayout()이 true이면 건너뜀).
 * 모바일에서는 setActiveIndex로 외부에서 활성 인덱스를 업데이트하고,
 * scrollToItem에 mobileStRef를 전달하면 모바일에서도 점 클릭 네비게이션 동작.
 */
export function usePinnedScroll(
  itemCount: number,
  onIndexChange?: (index: number) => void,
  scrollBy?: (deltaX: number) => void,
): {
  panelRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  scrollToItem: (index: number, mobileStRef?: React.RefObject<MobilePinScrollHandle>) => void;
} {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isMobile = useMobileLayout();

  // 데스크톱: 콘텐츠 카운터 트랜슬레이션 + 활성 인덱스 추적.
  // 가로 스크롤 엔진이 트랙을 옮긴 직후 보내는 이벤트에 맞춰 같은 프레임에 계산한다. 스스로 rAF 를 돌리면
  // 엔진보다 먼저 도는 프레임에 한 프레임 전 위치로 맞춰, 스크롤이 빠를수록 안쪽 내용이 튕겼다
  useEffect(() => {
    if (isMobile) return;

    let prevIndex = 0;
    let prevFlow = "";

    const update = () => {
      if (!panelRef.current || !contentRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const extraWidth = rect.width - viewportWidth;
      if (extraWidth <= 0) return;

      const offset = Math.max(0, Math.min(-rect.left, extraWidth));
      contentRef.current.style.transform = `translateX(${offset}px)`;

      const progress = Math.max(0, Math.min(1, -rect.left / extraWidth));
      const newIndex = Math.min(itemCount - 1, Math.floor(progress * itemCount));

      /* 항목 흐름 값 — 지금 항목 구간 안에서 어디쯤인지(--item-p). --item-in 은 구간 앞 35% 동안 0 → 1(들어옴),
         --item-out 은 끝 20% 동안 0 → 1(나감). 패널 CSS 가 여기에 묶어 항목 내용이 굴리는 만큼만 나타나고 사라진다.
         첫 항목은 패널 전환이 들여오고, 마지막 항목은 다음 패널 전환이 내보내므로 각각 1·0 으로 둔다 */
      const f = progress * itemCount - newIndex;
      const itemIn = newIndex === 0 ? 1 : Math.min(1, f / 0.35);
      const itemOut = newIndex === itemCount - 1 ? 0 : Math.max(0, (f - 0.8) / 0.2);
      const flowKey = `${f.toFixed(3)} ${itemIn.toFixed(3)} ${itemOut.toFixed(3)}`;
      if (flowKey !== prevFlow) {
        prevFlow = flowKey;
        // --item-p — 구간 전체(0 → 1). 진행 막대·코드가 써져 내려가는 정도처럼 구간 내내 이어지는 움직임에 쓴다
        contentRef.current.style.setProperty("--item-p", Math.min(1, f).toFixed(3));
        contentRef.current.style.setProperty("--item-in", itemIn.toFixed(3));
        contentRef.current.style.setProperty("--item-out", itemOut.toFixed(3));
      }
      if (newIndex !== prevIndex) {
        prevIndex = newIndex;
        setActiveIndex(newIndex);
        onIndexChange?.(newIndex);
      }
    };

    update();
    window.addEventListener(HSCROLL_FRAME_EVENT, update);
    return () => window.removeEventListener(HSCROLL_FRAME_EVENT, update);
  }, [itemCount, onIndexChange, isMobile]);

  // 점/항목 클릭 → 해당 위치로 스크롤
  const scrollToItem = useCallback(
    (index: number, mobileStRef?: React.RefObject<MobilePinScrollHandle>) => {
      if (checkMobileLayout()) {
        // 모바일: ScrollTrigger 기반 스크롤 + cascade 우회 sync
        const handle = mobileStRef?.current;
        const st = handle?.scrollTrigger;
        if (!st) return;
        const targetProgress = (index + 0.5) / itemCount;
        const targetScroll = st.start + targetProgress * (st.end - st.start);
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
        handle?.syncIndex(index);
        return;
      }

      // 데스크톱: 수평 스크롤
      if (!panelRef.current) return;
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

  return { panelRef, contentRef, activeIndex, setActiveIndex, scrollToItem };
}
