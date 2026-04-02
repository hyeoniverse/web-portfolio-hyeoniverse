"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useAutoSlide(length: number, interval = 4000) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const paused = useRef(false);

  const go = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex(((next % length) + length) % length);
    },
    [index, length],
  );

  const pause = useCallback(() => { paused.current = true; }, []);
  const resume = useCallback(() => { paused.current = false; }, []);

  useEffect(() => {
    if (length <= 1) return;
    timer.current = setInterval(() => {
      if (!paused.current) setIndex((i) => { setDirection(1); return (i + 1) % length; });
    }, interval);
    return () => clearInterval(timer.current);
  }, [length, interval]);

  return { index, direction, go, pause, resume };
}
