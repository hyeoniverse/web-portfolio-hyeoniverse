/**
 * 마우스 진입 방향을 계산하여 { x, y } 를 반환한다.
 * x/y 각각 -1, 0, 1 중 하나 (주축만 +-1, 보조축은 0).
 */
export function getHoverDirection(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = clientX - centerX;
  const deltaY = clientY - centerY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  let x = 0;
  let y = 0;
  if (absX > absY) {
    x = deltaX > 0 ? 1 : -1;
  } else {
    y = deltaY > 0 ? 1 : -1;
  }

  return { x, y };
}

/** 링크를 그냥 누른 클릭인가. 가운데 버튼이나 ⌘·Ctrl·Shift·Alt 를 누른 클릭은 새 탭·새 창·다운로드라 브라우저에 맡긴다 */
export function isPlainClick(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
