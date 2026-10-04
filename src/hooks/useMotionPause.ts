"use client";

import { useEffect } from "react";
import { useMotionStore, MOTION_PAUSED_KEY } from "@/stores/motionStore";

/**
 * 움직임 멈춤(3.9-4)을 문서에 적용한다 — 루트 레이아웃에 늘 있는 Navigation 이 한 번 부른다.
 *
 * - 저장값이 없으면 `prefers-reduced-motion: reduce` 를 초기값으로 삼는다.
 * - `<html data-motion="paused|running">` 를 쓴다. CSS 는 이 속성으로 `--motion-play` 를 바꾸고,
 *   장식 반복 애니메이션은 `animation-play-state: var(--motion-play)` 로 그 값을 따른다(`tokens/_motion.css`).
 *   hydration 전에는 속성이 없어 CSS 의 prefers-reduced-motion 분기가 대신 든다.
 * - 다른 탭의 토글은 storage 이벤트로 받는다.
 */
export function useMotionPause() {
  useEffect(() => {
    const { syncPaused } = useMotionStore.getState();
    try {
      const saved = localStorage.getItem(MOTION_PAUSED_KEY);
      if (saved === "1" || saved === "0") syncPaused(saved === "1");
      else syncPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      /* 무시 */
    }

    const apply = (paused: boolean) => {
      document.documentElement.dataset.motion = paused ? "paused" : "running";
    };
    apply(useMotionStore.getState().isPaused);
    const unsub = useMotionStore.subscribe((s) => apply(s.isPaused));

    const onStorage = (e: StorageEvent) => {
      if (e.key !== MOTION_PAUSED_KEY || e.newValue == null) return;
      useMotionStore.getState().syncPaused(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
      delete document.documentElement.dataset.motion;
    };
  }, []);
}
