"use client";

import { useEffect, useState, type RefObject } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * 랜딩 페이지의 나타나기 — 루트 안의 [data-reveal] 이 화면에 들어오면 data-shown 을 붙인다(CSS 가 움직임을 맡는다).
 * 한 번 나타난 것은 다시 숨기지 않는다. 움직임 줄이기 설정이면 CSS 가 처음부터 보이게 둔다.
 * MacFolio 의 useReveal 을 옮겼다 — 그쪽은 화면을 벗어나면 다시 숨기지만, 긴 글을 되짚어 읽을 때 깜빡여 한 번만 나타나게 했다.
 */
export function useReveal(root: RefObject<HTMLElement | null>, deps: unknown[] = [], enabled = true) {
  useEffect(() => {
    const el = root.current;
    /* 판 전환이 덮고 있는 동안은 기다린다 — 걷힌 뒤 화면에 있는 것부터 나타나게 */
    if (!el || !enabled) return;
    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])");
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((t) => t.setAttribute("data-shown", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);
}


/** 숫자 세어 올리기 — "97점" · "1,351+" 처럼 앞의 숫자만 0 에서 올린다. 숫자가 없으면 그대로 */
function splitNumber(value: string): { prefix: string; num: number | null; decimals: number; suffix: string } {
  const m = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value);
  if (!m) return { prefix: "", num: null, decimals: 0, suffix: value };
  const raw = m[2].replace(/,/g, "");
  return { prefix: m[1], num: Number(raw), decimals: raw.includes(".") ? raw.split(".")[1].length : 0, suffix: m[3] };
}

export function useCountUp(target: RefObject<HTMLElement | null>, value: string, durationMs = 1400): string {
  const parts = splitNumber(value);
  const [shown, setShown] = useState<number | null>(parts.num === null ? null : 0);
  useEffect(() => {
    const el = target.current;
    if (!el || parts.num === null) return;
    const end = parts.num;
    let raf = 0;
    /* 움직임 줄이기 · 관찰 불가 — 다음 프레임에 끝 값으로(효과 안에서 바로 상태를 바꾸지 않는다) */
    if (reducedMotion() || typeof IntersectionObserver === "undefined") {
      raf = requestAnimationFrame(() => setShown(end));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        setShown(end * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target, parts.num, durationMs]);
  if (parts.num === null || shown === null) return value;
  const n = shown.toLocaleString("en-US", { minimumFractionDigits: parts.decimals, maximumFractionDigits: parts.decimals });
  return `${parts.prefix}${n}${parts.suffix}`;
}
