"use client";

import { useEffect, useCallback, type DependencyList, type RefObject } from "react";

/* ── Bento masonry row-span 계산 ──
   CSS grid-auto-rows: 1px 위에서 각 카드의 natural height 를 측정해
   grid-row: span N 을 inline style 로 부여 → 너비 변주(span 2) + 세로 packing 동시 지원.
   enabled=false(시리즈 timeline 모드는 flex 레이아웃, magazine 외 레이아웃)면 아무것도 안 한다.
   deps = 그리드 자식이 바뀌는 신호(posts · loading) — 바뀔 때마다 img load 리스너와 ResizeObserver 를 다시 건다.
   미리 그린 HTML 에서는 하이드레이션 전까지 ROW_SPANS_SCRIPT 가 같은 계산으로 줄 수를 넣고, 이 훅이 이어받는다. */

/** 카드마다 차지할 줄 수(grid-auto-rows: 1px 위의 span). 0 은 높이를 못 잰 칸.
    인라인 스크립트로도 문자열화해 쓰므로 인자 밖의 값을 참조하지 않는다 */
export function measureRowSpans(grid: HTMLElement): number[] {
  const rowGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  // 그리드의 모든 자식 (real post + skeleton) — 로딩 중에도 height 매칭
  return Array.from(grid.children, (node) => {
    const el = node as HTMLElement;
    const h = (el.firstElementChild as HTMLElement | null)?.scrollHeight ?? el.scrollHeight;
    return h ? Math.ceil((h + rowGap) / (1 + rowGap)) : 0; // 1 = grid-auto-rows: 1px
  });
}

/** 하이드레이션 전 스크립트가 줄 수 규칙을 넣는 <style> 의 id */
const ROW_SPANS_STYLE_ID = "posts-row-spans";

/** 미리 그린 HTML 에서 그리드 바로 뒤에 도는 스크립트(그리드에 data-row-spans). 줄 수가 없으면 카드가 1px 줄에 겹쳐 보인다.
    React 가 그린 요소에 속성을 넣으면 하이드레이션과 어긋나므로 <head> 의 <style> 에 nth-child 규칙으로 넣는다.
    웹폰트가 늦게 오면 글줄이 바뀌므로 fonts.ready 뒤에 한 번 더 잰다 */
export const ROW_SPANS_SCRIPT =
  `(function(){var grid=document.currentScript.parentElement.previousElementSibling,style=document.createElement("style");` +
  `style.id=${JSON.stringify(ROW_SPANS_STYLE_ID)};document.head.appendChild(style);` +
  `function apply(){style.textContent=(${measureRowSpans.toString()})(grid).map(function(n,i){` +
  `return n?"[data-row-spans]>:nth-child("+(i+1)+"){grid-row:span "+n+"}":""}).join("")}` +
  `apply();if(document.fonts)document.fonts.ready.then(apply)})()`;

export function useMasonryRowSpans(
  gridRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  deps: DependencyList,
) {
  const recomputeRowSpans = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!enabled) return;
    const spans = measureRowSpans(grid);
    Array.from(grid.children).forEach((node, i) => {
      if (spans[i]) (node as HTMLElement).style.gridRow = `span ${spans[i]}`;
    });
    // 이제 줄 수는 요소에 있다 — 하이드레이션 전 스크립트의 규칙은 치운다
    document.getElementById(ROW_SPANS_STYLE_ID)?.remove();
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
