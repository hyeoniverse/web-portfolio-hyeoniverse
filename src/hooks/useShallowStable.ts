import { useState } from "react";
import { shallow } from "zustand/shallow";

/**
 * 지난 렌더에 돌려준 객체와 얕게 같으면 그 객체를 그대로 돌려준다.
 *
 * 렌더마다 새로 만드는 객체(예: 폼에서 본문만 뺀 값)를 메모한 섹션의 의존성으로 쓸 때, 내용이 같으면
 * 참조도 같게 해서 섹션이 다시 그려지지 않게 한다. 비교는 키마다 `Object.is` 다(zustand shallow).
 * 달라진 렌더에서는 useDepsChanged 처럼 렌더 중에 상태를 맞추고 새 객체를 돌려준다.
 *
 * ```ts
 * const meta = useShallowStable(omitContent(form)); // 본문만 바뀌면 meta 는 그대로
 * ```
 */
export function useShallowStable<T extends object>(value: T): T {
  const [kept, setKept] = useState(value);
  if (kept === value || shallow(kept, value)) return kept;
  setKept(value);
  return value;
}
