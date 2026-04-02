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
