"use client";

import { useEffect, useRef } from "react";
import { CONSTELLATIONS, STARS, constellationBox } from "./starMap";
import styles from "./StarrySky.module.css";

/**
 * 은하수와 별자리 — 작업물이 없을 때의 배경(#1062).
 *
 * SVG 하나로 그린다. 캔버스로 그리면 화면이 붙은 뒤에야 나타나고, 그림 파일로 두면 테마에 따라
 * 색을 바꿀 수 없다. 좌표는 고정된 값(starMap)이라 서버가 보낸 것과 화면이 그린 것이 같다.
 *
 * 반짝임과 흐름은 CSS 로 한다. 포인터를 따라 층마다 다르게 밀리는 것만 자바스크립트가 맡는데,
 * 상태를 바꾸지 않고 CSS 변수만 고쳐 쓴다 — 마우스가 움직일 때마다 React 가 다시 그리면
 * 별 이백여 개를 매 프레임 새로 만든다. 움직임을 줄여 달라는 설정이면 전부 멈춘다.
 */
export default function StarrySky() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    /* 값은 하늘 그림이 아니라 그 부모에 쓴다 — 별자리는 형제라 부모가 갖고 있어야 둘이 같이 본다 */
    const el = ref.current?.parentElement;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      /* 한 프레임에 한 번만 쓴다 — pointermove 는 초당 수십 번 온다 */
      frame = requestAnimationFrame(() => {
        frame = 0;
        /* 화면 가운데를 0 으로 두고 -1~1 로 환산한다. 층마다 이 값에 다른 배수를 곱해
           가까운 것이 더 많이 밀리게 한다(시차) */
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty("--pointer-x", x.toFixed(3));
        el.style.setProperty("--pointer-y", y.toFixed(3));
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className={styles.sky}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        {/* 은하수 띠 — 가운데가 밝고 바깥으로 사라지는 타원을 비스듬히 눕힌다 */}
        <radialGradient id="milkyway" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--sky-band-core)" />
          <stop offset="55%" stopColor="var(--sky-band-mid)" />
          <stop offset="100%" stopColor="var(--sky-band-edge)" />
        </radialGradient>
        <radialGradient id="milkyway-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--sky-core)" />
          <stop offset="100%" stopColor="var(--sky-band-edge)" />
        </radialGradient>
        <filter id="milkyway-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>

      {/* 띠 두 겹 — 넓게 퍼진 것 위에 좁고 밝은 심을 얹으면 흐르는 느낌이 난다.
          가장 먼 층이라 포인터에 가장 덜 밀리고, 아주 천천히 숨을 쉰다 */}
      <g className={styles.band} filter="url(#milkyway-blur)">
        <ellipse cx="500" cy="500" rx="660" ry="168" fill="url(#milkyway)" transform="rotate(-35 500 500)" />
        <ellipse cx="520" cy="470" rx="560" ry="74" fill="url(#milkyway-core)" transform="rotate(-35 500 500)" />
      </g>

      <g className={styles.stars}>
        {STARS.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.r}
            opacity={star.o}
            className={star.twinkle ? styles.twinkle : undefined}
            /* 번호로 만든 지연이라 별마다 다르게, 그러나 늘 같게 반짝인다 */
            style={star.twinkle ? { animationDelay: `${(i % 11) * 0.42}s` } : undefined}
          />
        ))}
      </g>

      {/* 이따금 지나가는 별똥별 — 둘이면 화면 어딘가에서 계속 무언가 지나간다. 서로 다른 길·시각 */}
      <g className={styles.meteorA} aria-hidden>
        <line x1="0" y1="0" x2="86" y2="34" />
      </g>
      <g className={styles.meteorB} aria-hidden>
        <line x1="0" y1="0" x2="64" y2="-26" />
      </g>

    </svg>
  );
}

/**
 * 별자리 한 자리 — 제 별만 담은 작은 그림으로, 화면에 백분율로 앉는다.
 *
 * 별 배경과 한 그림에 두면 정사각 viewBox 를 잘라 채우는 과정에서(slice) 위아래나 좌우가 잘려
 * 나가 통째로 사라진다. 흩어진 별은 잘려도 모르지만 별자리는 모양이 전부다.
 */
function ConstellationMark({ mark }: { mark: (typeof CONSTELLATIONS)[number] }) {
  const box = constellationBox(mark);
  return (
    <svg
      className={styles.constellation}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      style={{
        left: mark.place.left === "auto" ? undefined : mark.place.left,
        right: mark.place.left === "auto" ? "6%" : undefined,
        top: mark.place.top === "auto" ? undefined : mark.place.top,
        bottom: mark.place.top === "auto" ? "16%" : undefined,
        width: mark.place.width,
      }}
      aria-hidden
      focusable="false"
    >
      {mark.lines.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={mark.stars[a].x} y1={mark.stars[a].y}
          x2={mark.stars[b].x} y2={mark.stars[b].y}
          className={styles.line}
        />
      ))}
      {mark.stars.map((star, i) => (
        <circle key={i} cx={star.x} cy={star.y} r={3} className={styles.node} />
      ))}
      {/* 이름은 가장 높은 별 위에 — 성도처럼 보이려고 두는 것이라 아주 옅다 */}
      <text x={box.x + 4} y={box.y + 16} className={styles.name}>{mark.name}</text>
    </svg>
  );
}

/** 별자리 층 — 하늘 그림과 따로 앉는다 */
export function Constellations() {
  return (
    <>
      {CONSTELLATIONS.map((mark) => (
        <ConstellationMark key={mark.name} mark={mark} />
      ))}
    </>
  );
}
