"use client";

/* 화면(창)에 ratio 만큼 들어와 있는지 — 페이지는 Lenis 가 창 자체를 굴리므로 root 는 창이다 */
import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement>(ratio = 0.5, onChange?: (inView: boolean) => void) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  /* 들고 나는 순간에 할 일(소리 멈추기 등) — 관찰 콜백에서 부른다 */
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  });
  useEffect(() => {
    const node = ref.current;
    /* 관찰할 수 없는 곳(시험 환경 등)에서는 보이지 않는 것으로 둔다 — 소리가 저절로 나지 않는다 */
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        changeRef.current?.(entry.isIntersecting);
      },
      { threshold: ratio },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ratio]);
  return [ref, inView] as const;
}

/** 움직임 줄이기를 켰는지 */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
