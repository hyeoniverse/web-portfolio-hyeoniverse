"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { checkMobileLayout } from "./mobileCheck";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * 모바일/태블릿에서 GSAP ScrollTrigger 고정 스크롤을 설정하는 공유 훅.
 *
 * 공통 보일러플레이트 처리:
 * - 모바일 레이아웃 체크, gsap.context 생성/정리
 * - ScrollTrigger.create (pin + pinSpacing)
 * - progress → index 매핑 (변경 시에만 콜백 호출)
 *
 * @param triggerRef - 고정할 요소의 ref
 * @param itemCount - 전체 항목 수
 * @param scrollPerItem - 항목당 스크롤 거리 (px)
 * @param onIndexChange - 활성 인덱스 변경 시 호출되는 콜백
 * @param deps - 추가 의존성 배열
 * @returns ScrollTrigger 인스턴스에 대한 ref (ProcessPanel의 클릭 스크롤에 필요)
 */
export function useMobilePinScroll(
  triggerRef: React.RefObject<HTMLElement | null>,
  itemCount: number,
  scrollPerItem: number,
  onIndexChange: (newIndex: number) => void,
  deps: React.DependencyList = [],
): React.RefObject<ScrollTrigger | null> {
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  useLayoutEffect(() => {
    const isMobile = checkMobileLayout();
    if (!isMobile) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const total = itemCount;
    const scrollDist = total * scrollPerItem;
    let prevIndex = 0;

    const ctx = gsap.context(() => {
      const instance = ScrollTrigger.create({
        trigger,
        start: "top top",
        end: `+=${scrollDist}`,
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          const newIndex = Math.min(
            total - 1,
            Math.floor(self.progress * total),
          );
          if (newIndex !== prevIndex) {
            prevIndex = newIndex;
            onIndexChange(newIndex);
          }
        },
      });
      scrollTriggerRef.current = instance;
    }, trigger);

    return () => {
      scrollTriggerRef.current = null;
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerRef, itemCount, scrollPerItem, onIndexChange, ...deps]);

  return scrollTriggerRef;
}
