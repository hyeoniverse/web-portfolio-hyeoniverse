"use client";

import { useCallback, useEffect, useRef } from "react";
import styles from "./NightSky.module.css";

/**
 * 몽이 패널 배경의 밤하늘.
 *
 * 층을 여러 겹으로 나눠 깊이를 만든다. 뒤로 갈수록 작고 흐리고 느리게, 앞으로 올수록 크고
 * 또렷하고 빠르게 흐른다.
 *
 * 커서에는 **밀려나는 방식**으로 반응한다. 층 전체를 커서 쪽으로 미는 흔한 시차는 화면에 있는
 * 것이 전부 같은 방향으로 움직여서, 배경 한 장이 통째로 밀리는 것처럼 보인다. 여기서는 커서
 * 근처에 있는 것만 반대쪽으로 물러난다 — 밀려나는 방향이 저마다 다르고, 멀리 있는 것은 아예
 * 가만히 있는다.
 *
 * 좌표는 전부 고정값이다. Math.random 으로 흩뿌리면 서버와 클라이언트가 다른 자리를 그려
 * hydration 이 어긋난다.
 */

/** 별 — [left%, top%, 크기px, 반짝임 주기s, 시작 지연s] */
const STARS: [number, number, number, number, number][] = [
  [4, 12, 2, 3.2, 0], [11, 31, 1, 4.1, 0.7], [7, 58, 2, 2.8, 1.4], [16, 74, 1, 3.6, 0.3],
  [22, 9, 3, 4.4, 1.1], [27, 45, 1, 3.1, 2.0], [33, 22, 2, 3.8, 0.5], [38, 66, 1, 4.6, 1.7],
  [44, 15, 2, 2.9, 0.9], [49, 82, 1, 3.4, 2.3], [55, 38, 2, 4.2, 0.2], [61, 7, 1, 3.7, 1.3],
  [66, 55, 3, 3.0, 1.9], [71, 28, 1, 4.5, 0.6], [77, 71, 2, 3.3, 2.1], [82, 18, 1, 3.9, 0.4],
  [87, 48, 2, 4.0, 1.5], [91, 78, 1, 2.7, 0.8], [95, 26, 2, 3.5, 1.2], [97, 62, 1, 4.3, 2.4],
  [13, 88, 1, 3.6, 1.0], [29, 92, 2, 4.1, 0.1], [58, 90, 1, 3.2, 1.8], [74, 94, 2, 3.8, 0.5],
  [2, 40, 1, 4.4, 2.2], [19, 52, 2, 2.9, 0.3], [42, 33, 1, 3.5, 1.6], [69, 41, 1, 4.2, 0.9],
];

/** 아스키·카오모지 장식 — [left%, top%, 글자, 크기rem, 흔들림 주기s, 지연s] */
const GLYPHS: [number, number, string, number, number, number][] = [
  [6, 22, "✧", 0.9, 7, 0],
  [18, 63, "⋆｡°✩", 0.8, 9, 1.2],
  [31, 13, "˚｡⋆", 0.75, 8, 2.4],
  [46, 77, ".·:*¨༺ ༻¨*:·.", 0.7, 11, 0.6],
  [63, 19, "✦", 1.1, 6, 1.8],
  [79, 60, "✧･ﾟ: *✧", 0.75, 10, 0.9],
  [88, 33, "｡ﾟ+.ღ", 0.7, 8.5, 2.1],
  [37, 90, "· ˚ ✧", 0.8, 7.5, 1.5],
  [93, 85, "⁺˚⋆", 0.7, 9.5, 0.4],
];

/**
 * 밀어내는 범위(px)와 세기(px).
 *
 * 앞쪽 층일수록 넓고 세게 밀린다 — 손에 가까운 것이 더 크게 반응하는 게 자연스럽다.
 * 구름은 넣지 않는다. 스스로 화면을 가로질러 흐르는 중이라 "지금 어디 있는가" 가 계속
 * 달라져서, 처음 자리를 기준으로 밀면 엉뚱한 곳이 반응한다.
 */
const REPEL = {
  star: { radius: 130, strength: 22 },
  moon: { radius: 240, strength: 40 },
  glyph: { radius: 165, strength: 52 },
};

/** 밀려난 정도가 이보다 작으면 제자리로 본다 — 0.001px 씩 영원히 따라가는 걸 막는다. */
const SETTLE_EPSILON = 0.05;

interface RepelNode {
  el: HTMLElement;
  /** 컨테이너 기준 중심. 요소마다 rect 를 읽으면 매 프레임 레이아웃이 강제된다. */
  cx: number;
  cy: number;
  radius: number;
  strength: number;
  /** 지금 밀려나 있는 정도(ox·oy)와 목표치(tx·ty) */
  ox: number;
  oy: number;
  tx: number;
  ty: number;
}

export default function NightSky() {
  const rootRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<RepelNode[]>([]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const register = useCallback(
    (kind: keyof typeof REPEL) => (el: HTMLElement | null) => {
      if (!el || nodesRef.current.some((n) => n.el === el)) return;
      const { radius, strength } = REPEL[kind];
      nodesRef.current.push({ el, cx: 0, cy: 0, radius, strength, ox: 0, oy: 0, tx: 0, ty: 0 });
    },
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = nodesRef.current;

    /* 중심은 컨테이너 기준 offset 으로 한 번만 잰다. 패널이 가로로 계속 움직여도 컨테이너
       안에서의 자리는 그대로라, 매 프레임 읽어야 하는 건 컨테이너 rect 하나뿐이다. */
    const measure = () => {
      for (const n of nodes) {
        n.cx = n.el.offsetLeft + n.el.offsetWidth / 2;
        n.cy = n.el.offsetTop + n.el.offsetHeight / 2;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);

    let raf = 0;
    let running = false;

    const tick = () => {
      const rect = root.getBoundingClientRect();
      const p = pointerRef.current;
      const px = p ? p.x - rect.left : 0;
      const py = p ? p.y - rect.top : 0;
      /* 커서가 이 패널 밖이면 전부 제자리로 돌아간다. */
      const active =
        p !== null && px >= 0 && py >= 0 && px <= rect.width && py <= rect.height;

      let moving = false;
      for (const n of nodes) {
        n.tx = 0;
        n.ty = 0;
        if (active) {
          const dx = n.cx - px;
          const dy = n.cy - py;
          const dist = Math.hypot(dx, dy);
          if (dist < n.radius && dist > 0.01) {
            /* 가까울수록 세게 — 제곱으로 떨어뜨려 경계에서 툭 끊기지 않게 한다. */
            const f = (1 - dist / n.radius) ** 2;
            n.tx = (dx / dist) * f * n.strength;
            n.ty = (dy / dist) * f * n.strength;
          }
        }

        /* 목표에 즉시 붙지 않게 따라간다 — 밀려나고 돌아오는 데 탄력이 붙는다. */
        n.ox += (n.tx - n.ox) * 0.12;
        n.oy += (n.ty - n.oy) * 0.12;

        const settled =
          Math.abs(n.ox) < SETTLE_EPSILON &&
          Math.abs(n.oy) < SETTLE_EPSILON &&
          n.tx === 0 &&
          n.ty === 0;

        if (settled) {
          if (n.el.style.transform) {
            n.ox = 0;
            n.oy = 0;
            n.el.style.transform = "";
          }
          continue;
        }

        moving = true;
        n.el.style.transform = `translate3d(${n.ox.toFixed(2)}px, ${n.oy.toFixed(2)}px, 0)`;
      }

      /* 아무것도 안 움직이고 커서도 밖이면 루프를 쉰다 — 배경 장식이 계속 돌 이유가 없다. */
      if (!moving && !active) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      start();
    };
    const onLeave = () => {
      pointerRef.current = null;
      start();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.sky} aria-hidden>
      {/* 가장 뒤 — 잔별. 작고 느리게 깜빡인다. */}
      <div className={styles.starLayer}>
        {STARS.map(([left, top, size, dur, delay], i) => (
          /* 바깥이 밀려나는 이동을, 안쪽이 깜빡임을 맡는다.
             한 요소에 둘 다 걸면 CSS 애니메이션의 transform 이 서로를 덮어쓴다. */
          <span
            key={i}
            ref={register("star")}
            className={styles.slot}
            style={{ left: `${left}%`, top: `${top}%`, width: `${size}px`, height: `${size}px` }}
          >
            <span
              className={styles.star}
              style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
            />
          </span>
        ))}
      </div>

      {/* 달 — 무리(halo)까지 함께 뜬다. */}
      <div className={styles.moonLayer}>
        <span ref={register("moon")} className={styles.moonSlot}>
          <span className={styles.moonGlow} />
          <span className={styles.moon}>
            <span className={styles.crater} data-c="1" />
            <span className={styles.crater} data-c="2" />
            <span className={styles.crater} data-c="3" />
          </span>
        </span>
      </div>

      {/* 먼 구름 — 크고 흐리게, 아주 느리게 흐른다. */}
      <div className={styles.farCloudLayer}>
        <span className={styles.cloud} data-cloud="far-a" />
        <span className={styles.cloud} data-cloud="far-b" />
      </div>

      {/* 별똥별 — 가끔 한 번 지나간다. 늘 흐르면 배경이 아니라 사건이 된다. */}
      <div className={styles.streakLayer}>
        <span className={styles.streak} data-streak="a" />
        <span className={styles.streak} data-streak="b" />
      </div>

      {/* 가까운 구름 — 또렷하고 빠르다. */}
      <div className={styles.nearCloudLayer}>
        <span className={styles.cloud} data-cloud="near-a" />
        <span className={styles.cloud} data-cloud="near-b" />
      </div>

      {/* 가장 앞 — 아스키 장식. 손으로 흩뿌린 느낌을 내는 층이다. */}
      <div className={styles.glyphLayer}>
        {GLYPHS.map(([left, top, text, size, dur, delay], i) => (
          <span
            key={i}
            ref={register("glyph")}
            className={styles.slot}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span
              className={styles.glyph}
              style={{ fontSize: `${size}rem`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
            >
              {text}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
