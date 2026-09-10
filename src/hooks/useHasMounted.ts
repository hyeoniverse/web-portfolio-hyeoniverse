import { useSyncExternalStore } from "react";

/* 바뀔 일이 없는 값이라 구독할 것도 없다. */
const subscribe = () => () => {};

/**
 * 클라이언트에서 그리는 중인지. 서버와 하이드레이션 첫 렌더에서는 false 이고, 그 뒤에는 true 다.
 * 하이드레이션이 끝난 뒤 클라이언트에서 새로 마운트되는 컴포넌트는 첫 렌더부터 true 다.
 *
 * 예전에는 효과 안에서 setState(true) 했다. 그러면 클라이언트에서 새로 마운트될 때도 첫 렌더를
 * false 로 한 번 그리고 효과가 돈 뒤 한 번 더 그려, 포털이 한 프레임 늦게 떴다. 같은 코드를
 * 여러 컴포넌트가 따로 들고 있기도 했다.
 *
 * "첫 렌더가 지났는지"와는 다르다. 첫 렌더에서만 등장 애니메이션을 막으려는 용도라면 이 훅을
 * 쓰면 안 된다 — 클라이언트에서 새로 마운트되면 첫 렌더부터 true 라서 애니메이션이 돈다.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
