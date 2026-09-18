"use client";

import { PETALS } from "./petalMap";
import styles from "./PetalDrift.module.css";

/**
 * 밝은 테마의 빈 화면 배경 — 꽃잎이 천천히 내려온다(#1062).
 *
 * 어두운 쪽은 플라네타리움 돔에 별을 뿌리지만, 밝은 바탕에서는 별이 종이에 찍은 점으로 보인다.
 * 여기서는 봄날처럼 둔다. 떨어지고 흔들리고 도는 일은 모두 CSS 가 하고, 값(자리·크기·시간)은
 * 고정된 표에서 온다 — 그릴 때마다 난수로 뽑으면 서버와 화면이 어긋난다.
 */
export default function PetalDrift() {
  return (
    <div className={styles.field} aria-hidden>
      {PETALS.map((petal, i) => (
        <span
          key={i}
          className={styles.petal}
          style={{
            left: `${petal.x}%`,
            width: `${petal.size}px`,
            height: `${petal.size * 0.72}px`,
            opacity: petal.opacity,
            /* 개별 값은 인라인 변수로 — 서른여섯 장에 각자 다른 시간·흔들림을 주려면 이 길밖에 없다 */
            ["--fall-duration" as string]: `${petal.duration}s`,
            ["--fall-delay" as string]: `${-petal.delay}s`,
            ["--sway" as string]: `${petal.sway}vw`,
            ["--spin" as string]: `${petal.spin * 360}deg`,
            ["--tone" as string]: String(petal.tone),
            /* 움직임을 멈춘 화면에서 쉴 자리 — 시작 시각을 세로 위치로 바꿔 쓴다 */
            ["--rest-top" as string]: `${Math.round((petal.delay / 24) * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}
