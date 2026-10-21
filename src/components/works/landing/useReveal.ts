"use client";

import { useEffect, type RefObject } from "react";

/**
 * 랜딩 페이지의 나타나기 — 루트 안의 [data-reveal] 이 화면에 들어오면 data-shown 을 붙인다(CSS 가 움직임을 맡는다).
 * 한 번 나타난 것은 다시 숨기지 않는다. 움직임 줄이기 설정이면 CSS 가 처음부터 보이게 둔다.
 * MacFolio 의 useReveal 을 옮겼다 — 그쪽은 화면을 벗어나면 다시 숨기지만, 긴 글을 되짚어 읽을 때 깜빡여 한 번만 나타나게 했다.
 */
export function useReveal(root: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
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
  }, deps);
}

/** 진행 과정 선 — 루트가 화면을 지나가는 만큼(0~1)을 --read 로 넘긴다 */
export function useReadProgress(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      /* 위 끝이 화면 아래 3/4 에 닿을 때 0, 아래 끝이 같은 선을 지날 때 1 */
      const line = vh * 0.75;
      const p = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));
      el.style.setProperty("--read", p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [target]);
}
