"use client";

import { useEffect, useCallback, type DependencyList, type RefObject } from "react";

/* ── Bento masonry row-span 계산 ──
   CSS grid-auto-rows: 1px 위에서 각 카드의 natural height 를 측정해
   grid-row: span N 을 inline style 로 부여 → 너비 변주(span 2) + 세로 packing 동시 지원.
   enabled=false(시리즈 timeline 모드는 flex 레이아웃, magazine 외 레이아웃)면 아무것도 안 한다.
   deps = 그리드 자식이 바뀌는 신호(posts · loading) — 바뀔 때마다 img load 리스너와 ResizeObserver 를 다시 건다. */
export function useMasonryRowSpans(
  gridRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  deps: DependencyList,
) {
  const recomputeRowSpans = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!enabled) return;
    const cs = window.getComputedStyle(grid);
    const rowGap = parseFloat(cs.rowGap) || 0;
    const baseUnit = 1; // grid-auto-rows: 1px
    // gridRef 의 모든 자식 (real post + skeleton) 에 대해 span 적용 — 로딩 중에도 height 매칭
    Array.from(grid.children).forEach((node) => {
      const el = node as HTMLElement;
      const inner = el.firstElementChild as HTMLElement | null;
      const h = inner?.scrollHeight ?? el.scrollHeight;
      if (!h) return;
      const span = Math.ceil((h + rowGap) / (baseUnit + rowGap));
      el.style.gridRow = `span ${span}`;
    });
  }, [gridRef, enabled]);

  useEffect(() => {
    if (!enabled) return;
    recomputeRowSpans();
    const grid = gridRef.current;
    if (!grid) return;
    const imgs = grid.querySelectorAll("img");
    const onLoad = () => recomputeRowSpans();
    imgs.forEach((img) => img.addEventListener("load", onLoad));

    // 모든 자식 (real post + skeleton) 의 size 변화 감지
    const ro = new ResizeObserver(recomputeRowSpans);
    Array.from(grid.children).forEach((el) => ro.observe(el as Element));

    return () => {
      imgs.forEach((img) => img.removeEventListener("load", onLoad));
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef, enabled, recomputeRowSpans, ...deps]);

  // window resize 시에도 재측정 (column 폭 변하면 카드 height 도 변함)
  useEffect(() => {
    if (!enabled) return;
    const onResize = () => recomputeRowSpans();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, recomputeRowSpans]);
}
