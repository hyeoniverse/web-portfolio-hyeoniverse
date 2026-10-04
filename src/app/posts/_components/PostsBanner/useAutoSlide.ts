"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useAutoSlide(length: number, interval = 4000) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
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
  const togglePause = useCallback(() => setIsPaused((v) => !v), []);

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
