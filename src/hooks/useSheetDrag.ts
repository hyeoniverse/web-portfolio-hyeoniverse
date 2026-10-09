"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** 이만큼 끌어 내리면 닫는다(px) */
export const SHEET_DISMISS_DISTANCE = 80;
/** 손을 뗄 때 이 속도(px/ms) 넘게 내려가고 있으면 짧게 끌었어도 닫는다 — 휙 쓸어내리기 */
export const SHEET_DISMISS_VELOCITY = 0.4;

/** 바텀 시트를 놓을 때 닫을지 — 거리 또는 속도. Modal 의 시트도 같은 판정을 쓴다 */
export function shouldDismissSheet(dy: number, velocity: number): boolean {
  return dy > SHEET_DISMISS_DISTANCE || (dy > 10 && velocity > SHEET_DISMISS_VELOCITY);
}

/** 끄는 동안 마지막 움직임의 속도(px/ms) — 아래가 양수 */
export function createVelocityTracker() {
  let lastY = 0;
  let lastT = 0;
  let v = 0;
  return {
    start(y: number) { lastY = y; lastT = performance.now(); v = 0; },
    move(y: number) {
      const t = performance.now();
      const dt = t - lastT;
      if (dt > 0) v = (y - lastY) / dt;
      lastY = y;
      lastT = t;
    },
    /** 마지막 움직임이 오래전이면(멈췄다 뗌) 속도는 0 이다 */
    velocity() { return performance.now() - lastT > 100 ? 0 : v; },
  };
}

/**
 * 공용 바텀 시트(`.ui-sheet`)를 아래로 쓸어 닫는다. 손잡이 · 제목 줄에 핸들러를 붙인다
 * (본문은 색 판 · 슬라이더처럼 끄는 조작이 따로 있어 붙이지 않는다).
 *
 * 끄는 동안 시트는 CSS `translate` 로 따라 내려온다 — framer-motion 이 쓰는 `transform` 과 따로라 겹치지 않는다.
 */
export function useSheetDrag(onDismiss: () => void) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const startYRef = useRef(0);
  const trackerRef = useRef(createVelocityTracker());

  const reset = (el: HTMLElement) => {
    el.style.transition = "translate var(--duration-base) var(--ease-standard)";
    el.style.translate = "";
  };

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget.closest<HTMLElement>(".ui-sheet");
    if (!el) return;
    sheetRef.current = el;
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    trackerRef.current.start(e.clientY);
    el.style.transition = "none";
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    trackerRef.current.move(e.clientY);
    /* 위로는 따라가지 않는다 — 공용 시트는 펼치는 단계가 없다 */
    const dy = Math.max(0, e.clientY - startYRef.current);
    el.style.translate = `0 ${dy}px`;
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    sheetRef.current = null;
    const dy = e.clientY - startYRef.current;
    if (shouldDismissSheet(dy, trackerRef.current.velocity())) {
      /* 끈 자리에서 그대로 닫힘 애니메이션(아래로)이 이어진다 */
      el.style.transition = "";
      onDismiss();
    } else {
      reset(el);
    }
  }, [onDismiss]);

  /* 끌기가 다른 동작에 빼앗기면(브라우저 스크롤 등) 제자리로 — 걸린 채 남지 않게 */
  const onPointerCancel = useCallback(() => {
    const el = sheetRef.current;
    if (!el) return;
    sheetRef.current = null;
    reset(el);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
