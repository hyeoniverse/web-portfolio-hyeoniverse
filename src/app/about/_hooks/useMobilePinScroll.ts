"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMobileLayout } from "@/hooks/useMobileLayout";


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
interface MobilePinOptions {
  deps?: React.DependencyList;
  pinSpacing?: boolean;
  anticipatePin?: number;
  start?: string;
}

export function useMobilePinScroll(
  triggerRef: React.RefObject<HTMLElement | null>,
  itemCount: number,
  scrollPerItem: number,
  onIndexChange: (newIndex: number) => void,
  depsOrOptions?: React.DependencyList | MobilePinOptions,
): React.RefObject<ScrollTrigger | null> {
  // 하위 호환: 5번째 인자가 배열이면 deps, 객체면 options
  const isLegacy = Array.isArray(depsOrOptions);
  const deps: React.DependencyList = isLegacy
    ? depsOrOptions
    : (depsOrOptions as MobilePinOptions | undefined)?.deps ?? [];
  const usePinSpacing = isLegacy
    ? true
    : (depsOrOptions as MobilePinOptions | undefined)?.pinSpacing ?? true;
  const useAnticipatePin = isLegacy
    ? 0
    : (depsOrOptions as MobilePinOptions | undefined)?.anticipatePin ?? 0;
  const useStart = isLegacy
    ? "top top"
    : (depsOrOptions as MobilePinOptions | undefined)?.start ?? "top top";
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const isMobile = useMobileLayout();

  useEffect(() => {
    if (!isMobile) return;
    gsap.registerPlugin(ScrollTrigger);

    const trigger = triggerRef.current;
    if (!trigger) return;

    const total = itemCount;
    const scrollDist = total * scrollPerItem;
    let ctx: gsap.Context | null = null;

    const setup = () => {
      // 이전 인스턴스 정리
      if (ctx) ctx.revert();

      let prevIndex = 0;
      let lastFireTime = 0;
      // 시간 throttle — 너무 빠른 cascade 만 부드럽게 차단. 패널 통과는 허용.
      const THROTTLE_MS = 200;

      try {
        ctx = gsap.context(() => {
          const instance = ScrollTrigger.create({
            trigger,
            start: useStart,
            end: `+=${scrollDist}`,
            pin: true,
            pinSpacing: usePinSpacing,
            anticipatePin: useAnticipatePin,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const target = Math.min(
                total - 1,
                Math.floor(self.progress * total),
              );
              if (target === prevIndex) return;

              const now = performance.now();
              if (now - lastFireTime < THROTTLE_MS) return;

              const step = target > prevIndex ? 1 : -1;
              prevIndex += step;
              lastFireTime = now;
              onIndexChange(prevIndex);
            },
          });
          scrollTriggerRef.current = instance;
        }, trigger);

        ScrollTrigger.refresh();
      } catch (e) {
        // cross-origin iframe 접근 시 SecurityError 무시 (FeaturesPanel과 동일 패턴)
        if (!(e instanceof DOMException && e.name === "SecurityError")) throw e;
      }
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
