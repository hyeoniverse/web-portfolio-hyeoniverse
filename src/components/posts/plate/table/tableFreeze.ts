import React from "react";

/**
 * 표 고정(freeze) 상태 — 스크롤해도 제자리에 남는 행과 열.
 *
 * 열은 CSS sticky 로, 행은 스크롤에 맞춰 옮겨 그리는 방식으로 고정한다.
 * 그 상태를 표 본체·칸·손잡이가 모두 읽으므로 여기 한 곳에 둔다.
 */

// 표 고정(freeze) 상태 — 열=CSS sticky-left, 행=JS transform pin(스크롤에 맞춰 translateY).
//  colLefts[colIndex] = 그 열의 sticky left(px, 음수면 negative sticky). COL_NOT_FROZEN 이면 비고정.
//  행 pin·stuck 구분선은 스크롤 중 DOM 직접 처리.
export type FreezeState = { rows: number; cols: number; colLefts: number[] };

export const TableFreezeCtx = React.createContext<FreezeState>({ rows: 0, cols: 0, colLefts: [] });

export const TBL_STICKY_LINE = "var(--color-accent-alpha-50)"; // stuck 구분선 색 — 옅은 accent
// 열 고정 최대 비율 — 고정 열 합이 표시 너비의 이 비율을 넘으면 왼쪽 고정 열부터 sticky 해제(스크롤 영역 확보)
export const FREEZE_MAX_RATIO = 0.6;
// colLefts 비고정 sentinel — 실제 offset(음수 negative sticky 포함)과 구분하려고 큰 값 사용
export const COL_NOT_FROZEN = 1e9;

/** 스크롤 부모 찾기 — overflow-y auto/scroll 인 첫 조상(없으면 null=window). 행 단독 고정(페이지 sticky) stuck 판정용. */
export function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement || null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}
