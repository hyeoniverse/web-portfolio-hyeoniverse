"use client";

import { useEffect, type RefObject } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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

/**
 * 스크롤 진행 — 루트 안의 [data-progress] 마다, 요소가 화면을 지나가는 정도(0~1)를 --p 로 넘긴다.
 * data-progress="enter": 위 끝이 화면 아래에 닿을 때 0 → 화면 가운데에 올 때 1(들어오며 커지는 미디어)
 * data-progress="through": 위 끝이 화면 아래에 닿을 때 0 → 아래 끝이 화면 위를 지날 때 1(화면 폭 컷의 안쪽 그림 움직임)
 * 움직임 줄이기면 1 로 둔다. 스크롤마다 한 프레임에 한 번만 잰다.
 */
export function useScrollProgress(root: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const targets = Array.from(el.querySelectorAll<HTMLElement>("[data-progress]"));
    if (reducedMotion()) {
      targets.forEach((t) => t.style.setProperty("--p", "1"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      for (const t of targets) {
        const r = t.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        let p: number;
        if (t.dataset.progress === "through") {
          p = (vh - r.top) / Math.max(1, vh + r.height);
        } else {
          p = (vh - r.top) / (vh * 0.5 + Math.min(r.height, vh) * 0.5);
        }
        t.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
