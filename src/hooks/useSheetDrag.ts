"use client";

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** 이만큼 끌어 내리면 닫는다(px) */
const SHEET_DISMISS_DISTANCE = 80;
/** 손을 뗄 때 이 속도(px/ms) 넘게 내려가고 있으면 짧게 끌었어도 닫는다 — 휙 쓸어내리기 */
const SHEET_DISMISS_VELOCITY = 0.4;
/** 이 속도(px/ms) 넘게 휙 쓸면 가까운 단계가 아니라 그 방향의 다음 단계로 간다 */
const SHEET_FLICK_VELOCITY = 0.4;
/** 처음 높이와 가장 높은 단계 사이에 두는 중간 단계(화면 높이 비율) */
const SHEET_MID_STOPS = [0.5, 0.75];
/** 이웃 단계와 이만큼(px)도 차이 나지 않는 중간 단계는 두지 않는다 — 거의 같은 높이로 두 번 멈추지 않게 */
const SHEET_STOP_MIN_GAP = 48;
/** 가장 높은 단계를 넘어 끌면 이 비율만큼만 따라간다(고무줄) */
const SHEET_OVERDRAG = 0.25;

/** 바텀 시트를 놓을 때 닫을지 — 거리 또는 속도 */
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
 * 시트가 멈출 높이들(낮은 것부터). 첫 단계는 처음 열린 높이(시트 CSS 가 정한 높이), 마지막 단계는 내용 전체 높이와
 * 화면 높이 − 위 틈 중 낮은 쪽이다 — 내용이 짧으면 빈 자리까지 펼치지 않는다. 그 사이에 화면 높이의 50% · 75% 를
 * 들어갈 때만 둔다.
 */
export function sheetStops(base: number, content: number, viewport: number, topGap: number): number[] {
  const top = Math.max(base, Math.min(content, viewport - topGap));
  const mids = SHEET_MID_STOPS.map((r) => viewport * r)
    .filter((h) => h > base + SHEET_STOP_MIN_GAP && h < top - SHEET_STOP_MIN_GAP);
  return top - base < SHEET_STOP_MIN_GAP / 2 ? [base] : [base, ...mids, top];
}

/** 손을 뗀 높이 · 속도로 멈출 단계 — 휙 쓸었으면 그 방향의 다음 단계, 아니면 가장 가까운 단계 */
export function pickSheetStop(stops: number[], height: number, velocity: number): number {
  if (velocity < -SHEET_FLICK_VELOCITY) return stops.find((h) => h > height + 1) ?? stops[stops.length - 1];
  if (velocity > SHEET_FLICK_VELOCITY) return [...stops].reverse().find((h) => h < height - 1) ?? stops[0];
  return stops.reduce((a, b) => (Math.abs(b - height) < Math.abs(a - height) ? b : a));
}

const INTERACTIVE = "button, a, input, textarea, select, [role='button'], [contenteditable='true']";

/* 손을 뗀 뒤 다음 단계 · 제자리로 옮겨 가는 움직임. 끄는 동안에는 손가락을 바로 따라가게 끈다 */
const SNAP_TRANSITION = ["translate", "min-height", "max-height"]
  .map((p) => `${p} var(--duration-base) var(--ease-enter)`)
  .join(", ");
/** 처음 높이로 돌아간 뒤 인라인 높이를 지우는 때 — --duration-base 보다 조금 길게 */
const SNAP_CLEAR_MS = 400;

/** 처음 열린 높이 — 시트 CSS 가 정한 높이라 펼치기 전에 한 번 재 둔다 */
const baseHeights = new WeakMap<HTMLElement, number>();

/** 내용을 다 보이려면 필요한 높이 — 시트(또는 안의 스크롤 상자)에 넘친 만큼을 더한다 */
function contentHeight(el: HTMLElement): number {
  let overflow = el.scrollHeight - el.clientHeight;
  for (const box of el.querySelectorAll<HTMLElement>("*")) {
    if (box.scrollHeight - box.clientHeight <= 1) continue;
    const { overflowY } = getComputedStyle(box);
    if (overflowY === "auto" || overflowY === "scroll") overflow = Math.max(overflow, box.scrollHeight - box.clientHeight);
  }
  return el.getBoundingClientRect().height + Math.max(0, overflow);
}

/** --sheet-top-gap(안전 영역 + 여백)을 px 로 — env() 는 스크립트에서 읽을 수 없어 한 번 그려서 잰다 */
function sheetTopGap(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;height:var(--sheet-top-gap)";
  document.body.appendChild(probe);
  const gap = probe.getBoundingClientRect().height;
  probe.remove();
  return gap;
}

function setHeight(el: HTMLElement, height: number | null) {
  el.style.minHeight = height == null ? "" : `${height}px`;
  el.style.maxHeight = height == null ? "" : `${height}px`;
}

/**
 * 아래에서 올라오는 시트(`[data-sheet]`)를 끌어 단계별로 펼치고 접고 닫는다. 손잡이 · 제목 줄에 핸들러를 붙인다
 * (본문은 스크롤 · 색 판 · 슬라이더처럼 끄는 조작이 따로 있어 붙이지 않는다). 붙인 곳에는 `touch-action: none` 을 줘야
 * 브라우저가 그 손짓을 스크롤로 가져가지 않는다.
 *
 * - 위로 끌면 높이가 따라 늘고, 놓으면 가장 가까운 단계(sheetStops)에 멈춘다. 휙 쓸면 다음 단계로 간다.
 *   가장 높은 단계는 내용 높이와 화면 높이 − --sheet-top-gap 중 낮은 쪽이라 위에 틈이 남는다.
 * - 펼친 시트를 아래로 끌면 줄어들고, 처음 높이 아래로는 내려가지 않는다.
 * - 처음 높이에서 아래로 끌면 시트가 따라 내려오고, 멀리 · 빠르게 내렸으면 닫는다(`onDismiss`).
 *
 * 크기 · 위치는 인라인 스타일로만 바꾸고 처음 높이로 돌아가면 지운다 — 시트마다 다른 처음 높이(85vh · 90vh 등)는
 * 그 시트의 CSS 가 그대로 정한다. 처음 높이보다 높은 단계에 있는 동안 시트에 `data-sheet-expanded` 가 붙는다.
 * 끄는 동안의 위치는 CSS `translate` 라 framer-motion 이 쓰는 `transform` 과 겹치지 않는다.
 */
export function useSheetDrag(onDismiss: () => void) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const stopsRef = useRef<number[]>([]);
  const trackerRef = useRef(createVelocityTracker());

  /** 끈 거리로 높이 · 위치를 정한다 — 처음 높이에서 아래로면 위치(translate), 그 밖에는 높이 */
  const layout = useCallback((el: HTMLElement, dy: number) => {
    const stops = stopsRef.current;
    const base = stops[0];
    const top = stops[stops.length - 1];
    const fromBase = startHeightRef.current <= base + 1;
    if (fromBase && dy > 0) return { height: base, translate: dy };
    let h = startHeightRef.current - dy;
    if (h > top) h = top + (h - top) * SHEET_OVERDRAG;
    return { height: Math.max(base, h), translate: 0 };
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    /* 제목 줄 안의 단추 · 링크는 그대로 눌려야 한다 — 끌기로 잡으면 pointer capture 때문에 click 이 사라진다 */
    if ((e.target as Element).closest(INTERACTIVE)) return;
    const el = e.currentTarget.closest<HTMLElement>("[data-sheet]");
    if (!el) return;
    sheetRef.current = el;
    e.currentTarget.setPointerCapture(e.pointerId);
    const height = el.getBoundingClientRect().height;
    if (!el.hasAttribute("data-sheet-expanded")) baseHeights.set(el, height);
    const base = baseHeights.get(el) ?? height;
    stopsRef.current = sheetStops(base, contentHeight(el), window.innerHeight, sheetTopGap());
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    trackerRef.current.start(e.clientY);
    el.style.transition = "none";
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    trackerRef.current.move(e.clientY);
    const { height, translate } = layout(el, e.clientY - startYRef.current);
    el.style.translate = translate ? `0 ${translate}px` : "";
    setHeight(el, height <= stopsRef.current[0] + 1 && !el.hasAttribute("data-sheet-expanded") ? null : height);
  }, [layout]);

  const finish = useCallback((el: HTMLElement, dy: number, velocity: number) => {
    sheetRef.current = null;
    el.style.transition = SNAP_TRANSITION;
    const { height, translate } = layout(el, dy);
    if (translate && shouldDismissSheet(translate, velocity)) {
      /* 끈 자리에서 그대로 닫힘 애니메이션(아래로)이 이어진다 */
      el.style.transition = "";
      onDismiss();
      return;
    }
    el.style.translate = "";
    const stops = stopsRef.current;
    const stop = translate ? stops[0] : pickSheetStop(stops, height, velocity);
    const expanded = stop > stops[0] + 1;
    el.toggleAttribute("data-sheet-expanded", expanded);
    if (expanded) setHeight(el, stop);
    else if (el.style.maxHeight) {
      /* 처음 높이로 — 그 높이로 옮겨 간 뒤(움직임 시간) 인라인 값을 지워 시트 CSS 에 넘긴다.
         transitionend 는 옮겨 갈 거리가 없으면 오지 않아 시간으로 지운다 */
      setHeight(el, stops[0]);
      setTimeout(() => { if (!el.hasAttribute("data-sheet-expanded")) setHeight(el, null); }, SNAP_CLEAR_MS);
    }
  }, [layout, onDismiss]);

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
