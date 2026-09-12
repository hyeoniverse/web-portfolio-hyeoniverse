import { useCallback, useState } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";

/**
 * 부모가 본문 편집기가 올린 값을 그대로 돌려줄 때, 그 값을 편집기 안쪽에 다시 넘기지 않는다(#877).
 *
 * 본문 편집기는 바뀔 때마다 HTML 을 onChange 로 올리고, 부모(글·작업물 편집기)는 그 값을 폼 상태에 넣어 value 로
 * 돌려준다. 그 값을 그대로 안쪽에 넘기면 편집기 전체(도구 막대 포함)가 한 번 더 그려져 한 글자에 커밋이 두 번 일어났다.
 *
 * 여기서는 부모의 value 가 편집기가 마지막으로 올린 값과 다를 때만(되돌리기·리비전 복원·번역 적용처럼 밖에서 바꿀 때)
 * 안쪽 값을 바꾼다. 판(version)을 함께 올려, 전에 넘긴 것과 같은 문자열로 되돌리는 경우도 안쪽이 알아차리게 한다.
 * 밖의 값을 넘기면 올린 값 기록은 지운다 — 편집기 내용이 이제 그 값이라, 예전에 올린 값으로 다시 돌아오는 것도 밖의 변경이다.
 */
export function useEchoFreeValue(value: string) {
  const [emitted, setEmitted] = useState<string | null>(null);
  const [external, setExternal] = useState({ html: value, version: 0 });
  const changed = useDepsChanged([value]);
  if (changed && value !== emitted) {
    setExternal((prev) => ({ html: value, version: prev.version + 1 }));
    if (emitted !== null) setEmitted(null);
  }
  /** 편집기가 값을 올릴 때 부른다 — 부모가 이 값을 돌려주면 안쪽에 넘기지 않는다 */
  const markEmitted = useCallback((html: string) => setEmitted(html), []);
  return { external, markEmitted };
}
