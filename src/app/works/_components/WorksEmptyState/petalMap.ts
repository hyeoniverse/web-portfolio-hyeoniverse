/**
 * 밝은 테마에서 날리는 꽃잎 — 값은 고정이다(#1062).
 *
 * 어두운 테마는 별을 뿌리지만, 밝은 바탕에 별을 뿌리면 종이에 찍은 점이 되어 하늘로 보이지 않는다.
 * 밝은 쪽에서는 빈 화면을 봄날처럼 둔다. 별과 같은 이유로 좌표는 씨앗이 정해진 생성기로 한 번만
 * 만든다 — 그릴 때마다 난수로 뽑으면 서버가 보낸 HTML 과 화면이 그린 것이 어긋난다.
 */

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Petal {
  /** 시작 가로 위치(%) */
  x: number;
  /** 지름(px) — 멀리 있는 꽃잎은 작고 흐리다 */
  size: number;
  /** 한 번 떨어지는 데 걸리는 시간(초) */
  duration: number;
  /** 시작 시각을 어긋나게 — 한꺼번에 쏟아지지 않게 */
  delay: number;
  /** 떨어지는 동안 좌우로 흔들리는 폭(vw) */
  sway: number;
  /** 도는 방향·속도 */
  spin: number;
  /** 0~1 — 분홍에서 살구색 사이 어디쯤인지 */
  tone: number;
  opacity: number;
}

function makePetals(count: number, seed: number): Petal[] {
  const rnd = seeded(seed);
  return Array.from({ length: count }, () => {
    /* 작은 꽃잎이 많고 큰 것이 적어야 깊이가 생긴다 */
    const near = rnd() ** 2;
    return {
      x: Math.round(rnd() * 1000) / 10,
      size: Math.round((7 + near * 16) * 10) / 10,
      duration: Math.round((14 + (1 - near) * 16) * 10) / 10,
      delay: Math.round(rnd() * 240) / 10,
      sway: Math.round((3 + rnd() * 9) * 10) / 10,
      spin: Math.round((0.6 + rnd() * 1.8) * (rnd() > 0.5 ? 1 : -1) * 100) / 100,
      tone: Math.round(rnd() * 100) / 100,
      opacity: Math.round((0.45 + near * 0.45) * 100) / 100,
    };
  });
}

/* 서른여섯 장이면 화면 어딘가에 늘 몇 장이 떠 있고, 세어질 만큼 많지는 않다 */
export const PETALS: Petal[] = makePetals(36, 20260919);
