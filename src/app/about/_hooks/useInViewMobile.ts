"use client";

import { useEffect } from "react";
import { useMobileLayout } from "./mobileCheck";

/**
 * 컨테이너 내부의 `.animate` 요소를 관찰하고
 * 뷰포트 진입/이탈 시 가시성 클래스를 토글.
 * 모바일/낮은 뷰포트 레이아웃(세로 스크롤)에서만 활성화.
 * 브레이크포인트 변경 시 리마운트는 BreakpointGuard가 처리.
 *
 * MutationObserver로 동적 import 패널이 늦게 마운트되어도
 * 새로 추가된 `.animate` 요소를 자동으로 IntersectionObserver에 등록.
 */
export function useInViewMobile(
  containerRef: React.RefObject<HTMLElement | null>,
  animateClass: string,
  visibleClass: string,
) {
  const mobile = useMobileLayout();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !mobile) return;

    const selector = `.${animateClass}`;
    const observed = new Set<Element>();

    const io = new IntersectionObserver(
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

    // 초기 + 신규 요소 등록 헬퍼
    const observeNew = (root: Element | Document) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    };

    // 초기 등록
    observeNew(container);

    // dynamic import 패널이 나중에 마운트될 때 감지
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          // 추가된 노드 자체 또는 하위의 .animate 요소 등록
          if (node.matches(selector) && !observed.has(node)) {
            observed.add(node);
            io.observe(node);
          }
          observeNew(node);
        }
      }
    });
    mo.observe(container, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      observed.forEach((el) => el.classList.remove(visibleClass));
    };
  }, [containerRef, animateClass, visibleClass, mobile]);
}
