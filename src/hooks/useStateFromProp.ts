import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * 렌더 때 받은 값(주로 props)을 따라가는 상태. 원본이 바뀌면 그 값으로 맞추고, 그 사이에는
 * 자유롭게 고칠 수 있다. 입력 칸의 초안이나 보고 있는 달처럼 "기본은 원본, 사용자가 잠깐
 * 바꿀 수 있음" 인 값에 쓴다.
 *
 * `useEffect(() => setX(value), [value])` 로 맞추면 원본이 바뀐 렌더에서 낡은 값을 한 번
 * 그리고, 효과가 돈 뒤에 다시 그린다. 여기서는 렌더 중에 이전 원본과 비교해 곧바로 맞추므로
 * React 가 커밋 전에 다시 그려 낡은 값이 화면에 나가지 않는다.
 * (React 문서 "Adjusting some state when a prop changes" 와 같은 방식)
 *
 * 원본은 `Object.is` 로 비교한다. 매번 새로 만든 객체·배열을 넘기면 매 렌더 원본에 맞춰진다 —
 * 효과로 맞추던 때와 같은 동작이다.
 *
 * @param source 따라갈 원본
 * @param toState 원본에서 상태를 만드는 함수. 생략하면 원본 그대로 쓴다
 */
export function useStateFromProp<S, T = S>(
  source: S,
  toState?: (source: S) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const derive = (s: S): T => (toState ? toState(s) : (s as unknown as T));
  const [state, setState] = useState<T>(() => derive(source));
  const [prevSource, setPrevSource] = useState(source);
  if (!Object.is(prevSource, source)) {
    setPrevSource(source);
    setState(derive(source));
  }
  return [state, setState];
}
