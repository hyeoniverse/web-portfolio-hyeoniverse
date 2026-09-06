/**
 * 띄운 판을 화면 어디에 놓을지 정하는 계산.
 *
 * 화면 요소를 직접 만지지 않는다. 누른 것의 자리와 판의 크기, 화면 크기만 받아
 * 왼쪽 위 좌표를 돌려준다. 그래서 브라우저 없이도 가장자리 처리를 확인할 수 있다.
 */

/** 화면 가장자리에서 최소한 띄워 둘 여백. */
const MARGIN = 8;
/** 누른 것과 판 사이 간격. */
const GAP = 6;

export type Box = { top: number; bottom: number; left: number };

/**
 * 기본은 누른 것 바로 아래. 오른쪽으로 넘치면 오른쪽 끝에 맞추고, 왼쪽으로 넘치면 왼쪽 끝에 맞춘다.
 * 아래 공간이 모자라고 위가 넉넉하면 위로 뒤집는다. 위아래 모두 모자라면 화면 안에 억지로 넣는다.
 */
export function placePopover(
  anchor: Box,
  popW: number,
  popH: number,
  viewportW: number,
  viewportH: number,
): { top: number; left: number } {
  let left = anchor.left;
  if (left + popW > viewportW - MARGIN) left = viewportW - popW - MARGIN;
  if (left < MARGIN) left = MARGIN;

  let top = anchor.bottom + GAP;
  if (top + popH > viewportH - MARGIN) {
    const above = anchor.top - GAP - popH;
    top = above >= MARGIN ? above : Math.max(MARGIN, viewportH - popH - MARGIN);
  }
  return { top, left };
}
