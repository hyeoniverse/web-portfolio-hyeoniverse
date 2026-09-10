import { useInsertionEffect, type RefObject } from "react";

/**
 * ref 에 렌더 때 받은 최신 값을 담는다. 렌더가 확정된 뒤에 담는다.
 *
 * 콜백이나 값을 효과의 deps 에 넣으면 바뀔 때마다 구독을 다시 한다. 그래서 최신 값을 ref 에
 * 담아 두고 효과·이벤트 처리·타이머 안에서 읽는 곳이 많다. 예전에는 렌더 중에
 * `xRef.current = x` 로 담았는데, 그러면 확정되지 않고 버려지는 렌더(중간에 끊긴 동시성 렌더 등)의
 * 값도 ref 에 남는다. react-hooks/refs 가 이것을 경고한다.
 *
 * ```ts
 * const onChangeRef = useRef(onChange);
 * useSyncRef(onChangeRef, onChange);
 * ```
 *
 * useInsertionEffect 는 확정 단계에서 모든 layout 효과보다 먼저 돈다. 그래서 자식의 layout 효과가
 * 이 컴포넌트의 콜백을 불러도 새 값을 읽는다. useLayoutEffect 로 담으면 자식의 layout 효과가 먼저
 * 돌아 옛 값을 읽을 수 있다.
 *
 * ref 는 부르는 쪽에서 useRef 로 만든다. 이 훅이 ref 를 만들어 돌려주면 react-hooks/exhaustive-deps 가
 * 그 ref 를 안정된 값으로 알아보지 못해, 그 ref 를 쓰는 효과와 콜백마다 deps 에 넣으라고 한다.
 *
 * 렌더 중에는 `.current` 를 읽지 않는다. 렌더 중에 읽으면 지난 렌더의 값이다.
 */
export function useSyncRef<T>(ref: RefObject<T>, value: T): void {
  useInsertionEffect(() => {
    ref.current = value;
  });
}
