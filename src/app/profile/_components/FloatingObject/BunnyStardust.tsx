"use client";

import { useEffect, useRef } from "react";
import styles from "./BunnyStardust.module.css";

/** 동시에 떠 있을 수 있는 별가루 수. 다 쓰면 가장 오래된 것부터 자리를 내준다. */
const POOL = 26;
/** 이만큼 움직여야 하나 떨어뜨린다(px). 작을수록 촘촘하고 무거워진다.
    몽이는 커서를 크게 늦춰 따라오므로 실제 이동이 느리다 — 18px 로 뒀더니 한두 알만 남았다. */
const DROP_STEP = 8;
/** 한 알이 사라지는 데 걸리는 시간(ms). */
const LIFE_MS = 1400;

/** 4각 별 — 사이트 로고와 같은 결. 중심 기준 반지름 1. */
const SPARK_PATH =
  "M0 -1 C0 -0.42 0.42 0 1 0 C0.42 0 0 0.42 0 1 C0 0.42 -0.42 0 -1 0 C-0.42 0 0 -0.42 0 -1 Z";

/**
 * 몽이가 지나간 자리에 남는 별가루.
 *
 * 화면 아래 띠의 흔적(ScrollDrawScene)과 같은 어법인데 주인이 다르다 — 저쪽은 스크롤이,
 * 이쪽은 몽이가 움직인 자리다. 마스코트를 하나로 두면서도 "지나간 길에 흔적이 남는다" 는
 * 연출을 캐릭터 본인에게 돌려주는 셈이다.
 *
 * 몽이의 화면 좌표는 3D 장면이 매 프레임 ref 에 찍어 준다. 여기서는 그 값만 읽는다 —
 * React 상태로 올리면 프레임마다 다시 그려야 하는데, 실제로 움직이는 건 별 몇 개뿐이다.
 *
 * 별은 미리 만들어 두고 돌려 쓴다(고정 풀). 매번 만들고 지우면 빠르게 지나갈 때 DOM 이
 * 계속 들썩인다.
 */
export default function BunnyStardust({
  screenPosRef,
}: {
  /** 몽이의 화면 좌표 — FloatingScene 이 매 프레임 갱신한다. */
  screenPosRef: React.RefObject<{ x: number; y: number }>;
}) {
  const groupRefs = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    /* 떨어뜨린 별들 — 자리와 태어난 시각, 그리고 저마다의 크기·기울기. */
    const dust = Array.from({ length: POOL }, () => ({
      x: 0, y: 0, born: -Infinity, size: 0, tilt: 0,
    }));
    let next = 0;
    let last = { x: NaN, y: NaN };
    let raf = 0;

    const tick = (now: number) => {
      const pos = screenPosRef.current;
      if (pos) {
        const moved = Number.isNaN(last.x)
          ? Infinity
          : Math.hypot(pos.x - last.x, pos.y - last.y);
        /* 화면 밖(아직 자리를 못 잡은 상태)에서는 떨어뜨리지 않는다. */
        const onScreen = pos.x > 0 && pos.y > 0 && pos.x < window.innerWidth && pos.y < window.innerHeight;
        if (onScreen && moved > DROP_STEP) {
          /* 몸 한가운데가 아니라 아래쪽에 남긴다 — 발치에서 떨어지는 것처럼 보이게. */
          dust[next] = {
            x: pos.x + (next % 3 - 1) * 7,
            y: pos.y + 26 + (next % 2) * 6,
            born: now,
            size: 3 + (next % 4) * 1.3,
            tilt: (next * 53) % 360,
          };
          next = (next + 1) % POOL;
          last = { x: pos.x, y: pos.y };
        }
      }

      for (let i = 0; i < POOL; i++) {
        const el = groupRefs.current[i];
        if (!el) continue;
        const d = dust[i];
        const age = (now - d.born) / LIFE_MS;
        if (age >= 1 || !Number.isFinite(age)) { el.style.opacity = "0"; continue; }
        /* 태어날 때 톡 커졌다가 천천히 작아지며 위로 떠오른다. */
        const pop = Math.min(1, age * 6);
        const scale = d.size * pop * (1 - age * 0.45);
        el.setAttribute(
          "transform",
          `translate(${d.x} ${d.y - age * 18}) rotate(${d.tilt}) scale(${scale})`,
        );
        el.style.opacity = String((1 - age) * 0.85);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screenPosRef]);

  return (
    <svg className={styles.dust} aria-hidden focusable="false">
      {Array.from({ length: POOL }, (_, i) => (
        <g key={i} ref={(el) => { groupRefs.current[i] = el; }} className={styles.grain}>
          <path d={SPARK_PATH} />
        </g>
      ))}
    </svg>
  );
}
