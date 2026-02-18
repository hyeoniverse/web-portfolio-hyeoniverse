"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMobileLayout } from "./mobileCheck";

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
 * - 리사이즈 시 ScrollTrigger 재생성 (위치 재계산)
 *
 * useEffect를 사용하여 LenisProvider의 scrollerProxy 설정 이후에
 * ScrollTrigger를 생성합니다 (pinType: "transform"이 올바르게 적용됨).
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
  const isMobile = useMobileLayout();

  useEffect(() => {
    if (!isMobile) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const total = itemCount;
    const scrollDist = total * scrollPerItem;
    let ctx: gsap.Context | null = null;

    const setup = () => {
      // 이전 인스턴스 정리
      if (ctx) ctx.revert();

      let prevIndex = 0;

      ctx = gsap.context(() => {
        const instance = ScrollTrigger.create({
          trigger,
          start: "top top",
          end: `+=${scrollDist}`,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
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

      ScrollTrigger.refresh();
    };

    // 초기 설정: 1프레임 대기 후 실행 — BreakpointGuard 리마운트 후
    // Lenis 스크롤 위치 동기화 및 DOM 안정화 보장
    const rafId = requestAnimationFrame(setup);
    window.addEventListener("resize", setup);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setup);
      scrollTriggerRef.current = null;
      if (ctx) ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerRef, itemCount, scrollPerItem, onIndexChange, isMobile, ...deps]);

  return scrollTriggerRef;
}
