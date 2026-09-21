"use client";

import { useEffect, type RefObject } from "react";

/** 휠 가둠·놓아줌 판정에 쓰는 여유(px) — 소수점 스크롤 위치에서 끝을 못 알아보는 것 방지 */
const EDGE_TOL = 1;

/** 안에서 더 굴릴 수 있을 때만 휠을 그 상자(글상자·세로 목록 등) 안에 가둔다.
 *  data-lenis-prevent 를 붙여 두면 전역 Lenis 가 이 위의 휠을 아예 보지 않아, 안에서 더 굴릴
 *  데가 없어도 페이지가 멈춘다. Lenis 는 휠마다 composedPath 를 훑어 이 표시를 확인하고, 우리
 *  리스너가 window 보다 먼저 도므로 같은 이벤트에서 붙였다 떼는 것으로 가둠과 놓아줌이 갈린다
 *  (가로 섹션이 쓰는 방법과 같다). 터치는 브라우저가 안쪽부터 굴리고 끝에서 페이지로 넘기므로
 *  표시를 그대로 둔다. */
export function useWheelHandoff(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const max = el.scrollHeight - el.clientHeight;
      const hold =
        max > EDGE_TOL &&
        ((e.deltaY > 0 && el.scrollTop < max - EDGE_TOL) ||
          (e.deltaY < 0 && el.scrollTop > EDGE_TOL));
      el.toggleAttribute("data-lenis-prevent-wheel", hold);
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}
