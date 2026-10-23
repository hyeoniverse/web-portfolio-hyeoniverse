"use client";

import { useEffect, useState, ViewTransition, type ReactNode } from "react";
import { useRoutePathname } from "@/hooks/useRoutePathname";
import { usePageTransition } from "@/providers/PageTransitionProvider";

/* 판 전환의 방향(transitionTypes) → 나가는 · 들어오는 장면의 view-transition-class(_base.css) */
const ENTER = { "slide-right": "slide-enter-right", "slide-bottom": "slide-enter-bottom", default: "none" };
const EXIT = { "slide-right": "slide-leave-left", "slide-bottom": "slide-leave-up", default: "none" };

/**
 * 페이지 내용(<main> 안)을 감싸는 View Transition — 판 전환(navigateWithSlide)으로 넘어간 커밋에서만 키를 바꿔
 * 떠나는 내용은 나가고(exit) 새 내용은 들어오게(enter) 한다. 그 밖의 이동은 키가 그대로라 아무 연출도 없다.
 * React 가 새 페이지가 커밋되는 순간 두 장면을 찍으므로, 받아오는 동안 화면이 멈추지 않는다.
 */
export default function RouteViewTransition({ children }: { children: ReactNode }) {
  const pathname = useRoutePathname();
  const { isSlideTarget, clearSlideTarget } = usePageTransition();
  /* 키는 같은 렌더에서 바꾼다(렌더 중 상태 갱신) — 효과에서 바꾸면 새 페이지가 한 번 그려진 뒤라 장면이 갈리지 않는다 */
  const [seen, setSeen] = useState({ path: pathname, key: 0 });
  if (seen.path !== pathname) {
    setSeen({ path: pathname, key: isSlideTarget(pathname) ? seen.key + 1 : seen.key });
  }
  useEffect(() => {
    if (seen.key > 0) clearSlideTarget();
  }, [seen.key, clearSlideTarget]);
  return (
    <ViewTransition key={seen.key} enter={ENTER} exit={EXIT} default="none">
      {children}
    </ViewTransition>
  );
}
