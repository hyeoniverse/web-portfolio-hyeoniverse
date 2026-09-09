"use client";

import { useEffect, useRef } from "react";
import styles from "./BunnyHearts.module.css";

/** 동시에 떠 있을 수 있는 하트 수. 다 쓰면 가장 오래된 것부터 자리를 내준다. */
const POOL = 14;
/** 하나 띄우는 간격(ms). 짧으면 화면이 하트로 뒤덮인다. */
const SPAWN_MS = 190;
/** 한 알이 사라지는 데 걸리는 시간(ms). */
const LIFE_MS = 1100;
/** 몽이 중심에서 얼마나 위에서 태어날지(px). 한가운데서 나오면 몸에 파묻혀 보인다. */
const RISE_FROM_Y = -90;
/** 사라질 때까지 올라가는 높이(px). */
const RISE_PX = 84;

/**
 * 몽이를 쓰다듬을 때 머리 위로 떠오르는 하트.
 *
 * 별가루(BunnyStardust)와 같은 얼개다 — 미리 만들어 둔 몇 개를 돌려 쓰고, 자리는 3D 장면이
 * 매 프레임 찍어 주는 화면 좌표에서 읽는다. React 상태로 올리면 프레임마다 다시 그려야 하는데
 * 실제로 움직이는 건 하트 몇 개뿐이다.
 *
 * 모양은 좋아요 하트와 같은 path 를 마스크로 쓴다. 사이트 안에서 하트가 두 가지로 보이면
 * 같은 뜻이 아닌 것처럼 읽힌다.
 */
export default function BunnyHearts({
  screenPosRef,
  pettingRef,
}: {
  /** 몽이의 화면 좌표 — FloatingScene 이 매 프레임 갱신한다. */
  screenPosRef: React.RefObject<{ x: number; y: number }>;
  /** 지금 쓰다듬고 있는지 — FloatingScene 이 매 프레임 갱신한다. */
  pettingRef: React.RefObject<boolean>;
}) {
  const nodes = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    /* 떠 있는 하트들 — 자리와 태어난 시각, 그리고 저마다의 크기·기울기·흔들림. */
    const hearts = Array.from({ length: POOL }, () => ({
      x: 0, y: 0, born: -Infinity, size: 0, drift: 0, tilt: 0,
    }));
    let next = 0;
    let lastSpawn = 0;
    let raf = 0;
    /* 마지막 하트가 사라지는 시각. 이 시각이 지나고 쓰다듬지도 않으면 할 일이 없다. */
    let idleAfter = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);

      /* 쓰다듬지 않고 떠 있는 하트도 없으면 아무것도 만지지 않는다. profile 은 하트를
         쓰지 않는 시간이 대부분이라, 여기서 빠져나가는 것이 곧 기본 비용이 된다. */
      if (!pettingRef.current && now > idleAfter) return;

      if (pettingRef.current && now - lastSpawn >= SPAWN_MS) {
        lastSpawn = now;
        const h = hearts[next];
        next = (next + 1) % POOL;
        h.x = screenPosRef.current.x + (Math.random() - 0.5) * 46;
        h.y = screenPosRef.current.y + RISE_FROM_Y;
        h.born = now;
        idleAfter = now + LIFE_MS;
        h.size = 11 + Math.random() * 9;
        h.drift = (Math.random() - 0.5) * 40;
        h.tilt = (Math.random() - 0.5) * 34;
      }

      for (let i = 0; i < POOL; i++) {
        const el = nodes.current[i];
        if (!el) continue;
        const h = hearts[i];
        const age = now - h.born;
        if (age > LIFE_MS || h.born === -Infinity) {
          if (el.style.opacity !== "0") el.style.opacity = "0";
          continue;
        }
        const t = age / LIFE_MS;
        /* 위로 갈수록 느려지고, 끝에서 사라진다. 커졌다 작아지는 맥박을 살짝 준다. */
        const ease = 1 - (1 - t) * (1 - t);
        const scale = t < 0.18 ? t / 0.18 : 1 - (t - 0.18) * 0.35;
        el.style.setProperty("--size", `${h.size}px`);
        el.style.opacity = String(t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
        el.style.transform =
          `translate(${h.x + h.drift * ease}px, ${h.y - RISE_PX * ease}px)` +
          ` rotate(${h.tilt}deg) scale(${scale})`;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screenPosRef, pettingRef]);

  return (
    <div className={styles.layer} aria-hidden>
      {Array.from({ length: POOL }, (_, i) => (
        <span
          key={i}
          ref={(el) => { nodes.current[i] = el; }}
          className={styles.heart}
        />
      ))}
    </div>
  );
}
