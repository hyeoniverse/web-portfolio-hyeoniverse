"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** 이만큼 끌어 내리면 닫는다(px) */
const SHEET_DISMISS_DISTANCE = 80;
/** 손을 뗄 때 이 속도(px/ms) 넘게 내려가고 있으면 짧게 끌었어도 닫는다 — 휙 쓸어내리기 */
const SHEET_DISMISS_VELOCITY = 0.4;
/** 펼치기 · 접기로 정하는 거리(px) — 이만큼 못 끌었으면 원래 높이로 돌아간다 */
const SHEET_RESIZE_DISTANCE = 30;
/** 펼치기 · 접기도 이 속도(px/ms) 넘게 휙 쓸면 짧게 끌었어도 넘어간다 */
const SHEET_RESIZE_VELOCITY = 0.4;
/** 끌어 줄일 수 있는 가장 낮은 높이(화면 높이 비율) */
const SHEET_MIN_RATIO = 0.3;

/** 바텀 시트를 놓을 때 닫을지 — 거리 또는 속도 */
export function shouldDismissSheet(dy: number, velocity: number): boolean {
  return dy > SHEET_DISMISS_DISTANCE || (dy > 10 && velocity > SHEET_DISMISS_VELOCITY);
}

/** 손을 뗄 때 펼친 높이 · 원래 높이 중 어디로 갈지 — 위로가 음수 */
function resizeTarget(dy: number, velocity: number, expanded: boolean): boolean {
  if (dy < -SHEET_RESIZE_DISTANCE || velocity < -SHEET_RESIZE_VELOCITY) return true;
  if (dy > SHEET_RESIZE_DISTANCE || velocity > SHEET_RESIZE_VELOCITY) return false;
  return expanded;
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

/* 손을 뗀 뒤 제자리 · 펼친 높이로 옮겨 가는 움직임. 끄는 동안에는 손가락을 바로 따라가게 끈다 */
const SNAP_TRANSITION = ["translate", "min-height", "max-height", "border-radius", "border-top-color"]
  .map((p) => `${p} var(--duration-base) var(--ease-enter)`)
  .join(", ");

const INTERACTIVE = "button, a, input, textarea, select, [role='button'], [contenteditable='true']";

function setExpandedStyle(el: HTMLElement, expanded: boolean) {
  el.toggleAttribute("data-sheet-expanded", expanded);
  el.style.minHeight = expanded ? "100dvh" : "";
  el.style.maxHeight = expanded ? "100dvh" : "";
  el.style.borderRadius = expanded ? "0" : "";
  el.style.borderTopColor = expanded ? "transparent" : "";
}

/**
 * 아래에서 올라오는 시트(`[data-sheet]`)를 끌어 펼치고 접고 닫는다. 손잡이 · 제목 줄에 핸들러를 붙인다
 * (본문은 스크롤 · 색 판 · 슬라이더처럼 끄는 조작이 따로 있어 붙이지 않는다). 붙인 곳에는 `touch-action: none` 을 줘야
 * 브라우저가 그 손짓을 스크롤로 가져가지 않는다.
 *
 * - 위로 끌면 화면 높이까지 따라 늘고, 놓으면 펼친 높이(100dvh)로 붙는다.
 * - 펼친 시트를 아래로 끌면 줄어들고, 놓으면 원래 높이로 돌아간다.
 * - 원래 높이에서 아래로 끌면 따라 내려오고, 멀리 · 빠르게 내렸으면 닫는다(`onDismiss`).
 *
 * 크기 · 위치는 인라인 스타일로만 바꾸고 원래 높이로 돌아가면 지운다 — 시트마다 다른 원래 높이(85vh · 90vh 등)는
 * 그 시트의 CSS 가 그대로 정한다. 끄는 동안의 위치는 CSS `translate` 라 framer-motion 이 쓰는 `transform` 과 겹치지 않는다.
 */
export function useSheetDrag(onDismiss: () => void) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const startYRef = useRef(0);
  const baseHeightRef = useRef(0);
  const expandedRef = useRef(false);
  const trackerRef = useRef(createVelocityTracker());

  const finish = useCallback((el: HTMLElement, dy: number, velocity: number) => {
    sheetRef.current = null;
    el.style.transition = SNAP_TRANSITION;
    el.style.translate = "";
    const expanded = expandedRef.current;
    if (!expanded && dy > 0) {
      if (shouldDismissSheet(dy, velocity)) {
        /* 끈 자리에서 그대로 닫힘 애니메이션(아래로)이 이어진다 */
        el.style.transition = "";
        el.style.translate = `0 ${dy}px`;
        onDismiss();
      }
      return;
    }
    setExpandedStyle(el, resizeTarget(dy, velocity, expanded));
  }, [onDismiss]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    /* 제목 줄 안의 단추 · 링크는 그대로 눌려야 한다 — 끌기로 잡으면 pointer capture 때문에 click 이 사라진다 */
    if ((e.target as Element).closest(INTERACTIVE)) return;
    const el = e.currentTarget.closest<HTMLElement>("[data-sheet]");
    if (!el) return;
    sheetRef.current = el;
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    baseHeightRef.current = el.getBoundingClientRect().height;
    expandedRef.current = el.hasAttribute("data-sheet-expanded");
    trackerRef.current.start(e.clientY);
    el.style.transition = "none";
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    trackerRef.current.move(e.clientY);
    const dy = e.clientY - startYRef.current;
    if (!expandedRef.current && dy > 0) {
      /* 원래 높이에서 아래로 — 시트가 손가락을 따라 내려온다 */
      el.style.translate = `0 ${dy}px`;
      setExpandedStyle(el, false);
      return;
    }
    /* 위로(펼치기) · 펼친 상태에서 아래로(접기) — 높이가 손가락을 따라간다 */
    el.style.translate = "";
    const vh = window.innerHeight;
    const h = Math.min(vh, Math.max(vh * SHEET_MIN_RATIO, baseHeightRef.current - dy));
    el.style.minHeight = `${h}px`;
    el.style.maxHeight = `${h}px`;
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    finish(el, e.clientY - startYRef.current, trackerRef.current.velocity());
  }, [finish]);

  /* 끌기가 다른 동작에 빼앗기면(브라우저 스크롤 등) 끈 거리 0 으로 마쳐 제자리로 — 걸린 채 남지 않게 */
  const onPointerCancel = useCallback(() => {
    const el = sheetRef.current;
    if (!el) return;
    finish(el, 0, 0);
  }, [finish]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
