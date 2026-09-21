"use client";

import { useMemo, useSyncExternalStore, type RefObject } from "react";

/* 갤러리 작업대의 슬라이드 | 대본 폭 비율(슬라이드 쪽 %) — 가운데 핸들로 조절한다 */
const SPLIT_KEY = "editor.galleryBenchSplit";
const SPLIT_MIN = 25;
const SPLIT_MAX = 75;
const SPLIT_DEFAULT = 50;
/* 키보드로 한 번에 옮기는 양 */
const SPLIT_STEP = 2;

/* 고른 비율은 이 브라우저에 기억한다(쓰는 사람 편의). 저장소를 못 쓰는 창에서도 이번 방문 동안은 가도록 메모리에도 둔다 */
let splitMemory: number | null = null;
const listeners = new Set<() => void>();

const clamp = (v: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, v));

function readSplit(): number {
  if (splitMemory !== null) return splitMemory;
  try {
    const v = Number(localStorage.getItem(SPLIT_KEY));
    return v >= SPLIT_MIN && v <= SPLIT_MAX ? v : SPLIT_DEFAULT;
  } catch {
    return SPLIT_DEFAULT;
  }
}

function commitSplit(v: number) {
  splitMemory = clamp(v);
  try { localStorage.setItem(SPLIT_KEY, String(Math.round(splitMemory * 10) / 10)); } catch { /* 메모리 값으로 버틴다 */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/* 끄는 동안에는 작업대의 변수만 바꾼다 — 한 번 움직일 때마다 편집 화면을 다시 그리면 갤러리 전체가 따라 그려진다.
   손을 떼면 그 값을 저장하고 상태로 올린다 */
function previewSplit(bench: HTMLElement, v: number) {
  bench.style.setProperty("--split", `${clamp(v)}%`);
}

/**
 * 갤러리 작업대의 슬라이드 | 대본 사이 핸들 — 끌어서, 또는 초점을 두고 ← → 로 폭을 나눈다. 두 번 누르면 반반.
 * 작업대(benchRef)에 style.["--split"] 을, 핸들에 handleProps 를 준다.
 */
export function useBenchSplit(benchRef: RefObject<HTMLElement | null>) {
  const split = useSyncExternalStore(subscribe, readSplit, () => SPLIT_DEFAULT);

  /* 한 번 만든 묶음을 돌려 쓴다 — 편집 화면의 갤러리 섹션은 useMemo 로 묶여 있어, 그릴 때마다 새 묶음이 오면
     제목 한 글자를 칠 때마다 갤러리 전체를 다시 그린다 */
  return useMemo(() => {
    const onPointerDown = (e: React.PointerEvent) => {
      const bench = benchRef.current;
      if (e.button !== 0 || !bench) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = bench.getBoundingClientRect();
      let last = split;
      const onMove = (ev: PointerEvent) => {
        last = clamp(((ev.clientX - rect.left) / rect.width) * 100);
        previewSplit(bench, last);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        commitSplit(last);
      };
      document.body.style.cursor = "col-resize";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
      const next = e.key === "ArrowLeft" ? split - SPLIT_STEP
        : e.key === "ArrowRight" ? split + SPLIT_STEP
          : e.key === "Home" ? SPLIT_MIN
            : e.key === "End" ? SPLIT_MAX
              : null;
      if (next === null) return;
      e.preventDefault();
      /* 갤러리의 ← →(장 옮기기)로 올라가지 않게 */
      e.stopPropagation();
      commitSplit(next);
    };

    return {
      split,
      benchStyle: { "--split": `${split}%` } as React.CSSProperties,
      handleProps: {
        role: "separator",
        "aria-orientation": "vertical" as const,
        "aria-valuenow": Math.round(split),
        "aria-valuemin": SPLIT_MIN,
        "aria-valuemax": SPLIT_MAX,
        tabIndex: 0,
        "data-cursor": "resizeH",
        onPointerDown,
        onKeyDown,
        onDoubleClick: () => commitSplit(SPLIT_DEFAULT),
      },
    };
  }, [split, benchRef]);
}
