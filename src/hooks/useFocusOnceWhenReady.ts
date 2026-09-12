import { useEffect, useRef, type RefObject } from "react";

/**
 * 준비가 끝나면 이 입력칸에 한 번만 포커스를 준다 — 새 글·새 작업물을 열면 제목부터 칠 수 있게(#897).
 *
 * 편집 화면은 자동저장 초안을 확인하는 동안 편집을 막으므로 그 뒤(ready)에 준다. 휴대폰에서 화면을 열자마자 키보드가
 * 올라오지 않게 마우스를 쓰는 환경에서만 주고, 사용자가 이미 다른 칸을 눌렀으면 빼앗지 않는다.
 */
export function useFocusOnceWhenReady(ref: RefObject<HTMLElement | null>, ready: boolean) {
  const doneRef = useRef(false);
  useEffect(() => {
    if (!ready || doneRef.current) return;
    doneRef.current = true;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    ref.current?.focus({ preventScroll: true });
  }, [ready, ref]);
}
