import { useState } from "react";

/**
 * 이 렌더에서 deps 중 하나라도 지난 렌더와 달라졌는지. 첫 렌더는 false 다.
 *
 * "이 값이 바뀌면 저 상태를 맞춘다" 를 효과 없이 쓰려고 둔다. 효과로 하면 값이 바뀐 렌더를 낡은
 * 상태로 한 번 그리고 효과가 돈 뒤 다시 그리는데, 이 결과를 보고 렌더 중에 곧바로 setState 하면
 * React 가 커밋 전에 다시 그린다. 여러 값에 걸리거나 조건이 붙어 useStateFromProp 로 담기 어려운
 * 자리에 쓴다.
 *
 * ```ts
 * const changed = useDepsChanged([value, editing]);
 * if (changed && !editing) setDraft(String(value));
 * ```
 *
 * 효과와 달리 마운트 때는 돌지 않는다. 옮길 때는 상태의 처음 값이 효과가 마운트 때 넣던 값과
 * 같은지 확인해야 한다. deps 는 `Object.is` 로 하나씩 비교한다.
 */
export function useDepsChanged(deps: readonly unknown[]): boolean {
  const [prev, setPrev] = useState(deps);
  const changed = prev.length !== deps.length || prev.some((v, i) => !Object.is(v, deps[i]));
  if (changed) setPrev(deps);
  return changed;
}
