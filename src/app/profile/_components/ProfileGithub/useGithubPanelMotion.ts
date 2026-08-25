"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 패널이 화면에 들어왔는지.
 *
 * 가로 스크롤 패널은 GSAP 이 `.animate` 항목의 opacity/y 를 직접 건드린다. 그래서 막대가
 * 자라거나 숫자가 올라가는 연출은 그 위에 얹지 말고 별도 신호로 돌린다 — 같은 속성을 두
 * 곳에서 쓰면 서로 덮어쓴다. 여기서는 "보이는가" 만 알려주고 실제 연출은 CSS animation 이
 * 맡는다(전역 테마 transition 규칙이 shorthand 라 transition 은 덮어써진다).
 *
 * 한 번 보이면 계속 true 다. 가로 스크롤은 좌우로 오가므로, 매번 다시 재생하면
 * 지나갈 때마다 숫자가 0 부터 다시 올라가 산만하다.
 *
 * 문턱이 낮으면(0.25 등) 패널이 화면 오른쪽 끝에 살짝 걸치는 순간 이미 재생이 시작돼,
 * 정작 패널이 가운데로 왔을 때는 다 끝나 있다. 기본값을 0.6 으로 둬서 거의 자리를 잡은
 * 뒤에 시작하게 한다. */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.6) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}

/** 사람이 "세는" 느낌이 나게 끝에서 감속한다. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 0 에서 target 까지 올라가는 숫자.
 *
 * 지표는 숫자 하나뿐이라 그냥 놓으면 화면이 정지 사진이 된다. 보일 때 한 번 올려 주면
 * 값이 눈에 남는다. 움직임을 싫어하는 설정(prefers-reduced-motion)에서는 곧바로 결과만 낸다.
 */
export function useCountUp(target: number, run: boolean, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!run) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * easeOut(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, durationMs]);

  return value;
}
