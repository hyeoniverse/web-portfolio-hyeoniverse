"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * 버튼을 누르고 있으면(long-press) action 을 가속 반복 실행.
 * - pointerDown: 즉시 1회 → 380ms 후부터 반복(130ms→28ms 로 점점 빠르게)
 * - pointerUp / capture 해제 시 정지 (버튼 밖에서 떼도 pointerCapture 로 안전하게 멈춤)
 */
function useRepeatOnHold(action: () => void) {
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; }); // 최신 action 유지 (반복 tick 이 stale 안 되게)
  const holdT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (holdT.current) { clearTimeout(holdT.current); holdT.current = null; }
    if (repT.current) { clearTimeout(repT.current); repT.current = null; }
  }, []);

  const start = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return; // 좌클릭/터치만
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    actionRef.current(); // 즉시 1회
    holdT.current = setTimeout(() => {
      let delay = 130;
      const tick = () => {
        actionRef.current();
        delay = Math.max(28, delay - 12); // 점점 빠르게
        repT.current = setTimeout(tick, delay);
      };
      repT.current = setTimeout(tick, delay);
    }, 380);
  }, []);

  useEffect(() => stop, [stop]);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
  };
}

/** 스텝퍼 버튼 — 클릭 시 1회, 누르고 있으면 가속 반복. */
export default function SpinButton({ onStep, className, children, ariaLabel }: {
  onStep: () => void;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const handlers = useRepeatOnHold(onStep);
  return (
    <button
      type="button"
      className={className}
      tabIndex={-1}
      aria-label={ariaLabel}
      onMouseDown={(e) => e.preventDefault()}
      {...handlers}
    >
      {children}
    </button>
  );
}
