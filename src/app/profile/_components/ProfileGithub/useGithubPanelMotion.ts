"use client";

import { useEffect, useRef } from "react";

/**
 * GitHub 패널의 등장 연출 — 언제 시작할지와 숫자 카운트업.
 *
 * 연출은 React 상태로 돌리지 않는다. 막대·잔디는 CSS animation 이 맡고(전역 테마 transition
 * 규칙이 shorthand 라 transition 은 덮어써진다), 이 훅은 "시작해라" 는 신호를 DOM 속성으로
 * 찍고 숫자는 textContent 로 직접 쓴다. 프레임마다 setState 하면 그 사이 컴포넌트 전체가
 * 매번 다시 렌더된다 — 눈에 보이는 건 숫자 한 칸뿐인데.
 */

/** 사람이 "세는" 느낌이 나게 끝에서 감속한다. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const COUNT_DURATION_MS = 900;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** 카운트업 대상 한 칸 — 숫자를 쓸 요소와 목표값. */
export interface CountTarget {
  el: HTMLElement;
  target: number;
}

/**
 * 패널이 자리를 잡으면 한 번만 연출을 시작한다.
 *
 * 신호는 두 갈래다 — 데스크톱 가로 스크롤은 부모가 주는 `active`, 모바일 세로 스크롤은
 * 화면에 들어왔는지(IntersectionObserver). 둘 중 먼저 오는 쪽으로 시작하고 되돌리지 않는다.
 * 가로 스크롤은 좌우로 오가므로 매번 다시 재생하면 지나갈 때마다 숫자가 0 부터 올라가 산만하다.
 *
 * 문턱이 낮으면(0.25 등) 패널이 화면 오른쪽 끝에 살짝 걸치는 순간 이미 시작돼, 정작 가운데로
 * 왔을 때는 다 끝나 있다. 0.6 으로 둬서 거의 자리를 잡은 뒤에 시작한다.
 */
export function useGithubPanelMotion<T extends HTMLElement>(active: boolean, threshold = 0.6) {
  const rootRef = useRef<T>(null);
  /** 카운트업할 숫자 칸들. 렌더 중에 등록되고 시작 신호가 올 때 한 번 읽는다. */
  const countsRef = useRef<CountTarget[]>([]);
  const startedRef = useRef(false);

  /** 숫자 칸 등록 — 같은 요소가 두 번 들어오지 않게 걸러낸다. */
  const registerCount = (target: number) => (el: HTMLElement | null) => {
    if (!el) return;
    const found = countsRef.current.find((c) => c.el === el);
    if (found) found.target = target;
    else countsRef.current.push({ el, target });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let raf = 0;
    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      /* 막대·잔디는 이 속성이 붙는 순간 CSS 가 알아서 돈다. */
      root.dataset.in = "true";

      const reduced = prefersReducedMotion();
      const items = countsRef.current;
      if (reduced) {
        for (const c of items) c.el.textContent = c.target.toLocaleString();
        return;
      }
      const begin = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - begin) / COUNT_DURATION_MS);
        const k = easeOut(p);
        for (const c of items) {
          c.el.textContent = Math.round(c.target * k).toLocaleString();
        }
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (active) {
      start();
      return () => cancelAnimationFrame(raf);
    }

    /* 모바일 세로 스크롤용 보조 신호. 부모가 active 를 주지 못하는 경우에만 쓰인다. */
    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) start();
      },
      { threshold },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [active, threshold]);

  return { rootRef, registerCount };
}
