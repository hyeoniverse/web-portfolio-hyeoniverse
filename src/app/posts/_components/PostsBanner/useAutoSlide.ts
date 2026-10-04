"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMotionPaused } from "@/stores/motionStore";

export function useAutoSlide(length: number, interval = 4000) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  /* 움직임 멈춤(3.9-4)이 기본값이고, 이 배너의 재생 단추가 그보다 앞선다 */
  const motionPaused = useMotionPaused();
  const isPaused = userPaused ?? motionPaused;
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const hovered = useRef(false);

  const go = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex(((next % length) + length) % length);
    },
    [index, length],
  );

  const prev = useCallback(() => {
    setIndex((i) => { setDirection(-1); return ((i - 1) + length) % length; });
  }, [length]);

  const next = useCallback(() => {
    setIndex((i) => { setDirection(1); return (i + 1) % length; });
  }, [length]);

  const pause = useCallback(() => { hovered.current = true; }, []);
  const resume = useCallback(() => { hovered.current = false; }, []);
  const togglePause = useCallback(() => setUserPaused(!isPaused), [isPaused]);

  useEffect(() => {
    if (length <= 1) return;
    timer.current = setInterval(() => {
      if (!hovered.current && !isPaused) {
        setIndex((i) => { setDirection(1); return (i + 1) % length; });
      }
    }, interval);
    return () => clearInterval(timer.current);
  }, [length, interval, isPaused]);

  return { index, direction, go, prev, next, pause, resume, isPaused, togglePause };
}
