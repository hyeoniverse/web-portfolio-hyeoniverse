/**
 * 은하수 배경에 뿌릴 별과 별자리 — 값은 고정이다(#1062).
 *
 * 그릴 때마다 난수로 뽑으면 서버가 보낸 HTML 과 화면이 그린 것이 어긋나 React 가 트리를 다시
 * 그린다. 그래서 씨앗이 정해진 생성기로 모듈이 불릴 때 한 번만 만들고, 그 뒤로는 같은 값을 쓴다.
 *
 * 좌표는 0~1000 의 정사각 기준이다. 화면 비율이 어떻든 SVG 가 잘라 맞춘다(preserveAspectRatio slice).
 */

/** 씨앗 하나로 같은 수열을 내는 생성기(mulberry32) — 짧고 분포가 고르다 */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Star {
  x: number;
  y: number;
  r: number;
  /** 0~1 — 밝기. 흐린 별이 많고 밝은 별이 적어야 하늘처럼 보인다 */
  o: number;
  /** 반짝이는 별만 켠다. 전부 반짝이면 눈이 어지럽다 */
  twinkle: boolean;
}

/** 은하수 띠는 왼쪽 아래에서 오른쪽 위로 흐른다 — 그 선 위에 별이 몰린다 */
const BAND_ANGLE = -0.62; // 라디안
const BAND_SPREAD = 105;

function bandDistance(x: number, y: number): number {
  /* 가운데를 지나는 직선까지의 거리 — 띠에서 멀면 별을 드물게 둔다 */
  const cx = x - 500;
  const cy = y - 500;
  return Math.abs(cy - Math.tan(BAND_ANGLE) * cx) / Math.sqrt(1 + Math.tan(BAND_ANGLE) ** 2);
}

function makeStars(count: number, seed: number): Star[] {
  const rnd = seeded(seed);
  const stars: Star[] = [];
  /* 후보를 뽑고 띠에서 먼 것은 확률로 떨어뜨린다 — 띠 쪽이 촘촘하고 바깥이 성기게 된다 */
  while (stars.length < count) {
    const x = rnd() * 1000;
    const y = rnd() * 1000;
    const near = Math.exp(-((bandDistance(x, y) / BAND_SPREAD) ** 2));
    if (rnd() > 0.15 + near * 0.85) continue;
    const bright = rnd();
    stars.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      r: Math.round((0.6 + bright ** 3 * 1.7) * 100) / 100,
      o: Math.round((0.25 + bright * 0.6) * 100) / 100,
      /* 셋에 하나쯤 반짝인다 — 전부 깜박이면 소란스럽고, 몇 개만 하면 멈춰 보인다 */
      twinkle: bright > 0.62,
    });
  }
  return stars;
}

export const STARS: Star[] = makeStars(220, 20260918);

export interface Constellation {
  /** 라틴 이름 — 별자리 이름은 고유명사라 화면 언어와 무관하게 둔다 */
  name: string;
  /** 이어 그릴 별들. 좌표는 제 그림 안에서만 뜻이 있다 */
  stars: { x: number; y: number }[];
  /** stars 의 번호를 짝지어 선을 잇는다 */
  lines: [number, number][];
  /**
   * 화면에서 앉을 자리·크기 — 백분율이라 창이 커지든 작아지든 그 자리에 남는다.
   *
   * 별 배경처럼 정사각 그림 하나를 잘라 채우면(preserveAspectRatio slice) 넓은 화면에서는 위아래가,
   * 좁은 화면에서는 좌우가 잘려 나간다. 흩어진 별은 잘려도 모르지만 별자리는 통째로 사라진다.
   * left·top 이 "auto" 면 반대쪽(right·bottom)에 붙인다.
   */
  place: { left: string; top: string; width: string };
}

/* 세 자리만 둔다 — 더 넣으면 선이 서로 엉켜 별자리로 읽히지 않는다.
   자리는 가운데(인트로 패널)를 비켜 모서리 쪽으로 보낸다 */
export const CONSTELLATIONS: Constellation[] = [
  {
    name: "URSA MAJOR",
    stars: [
      { x: 0, y: 60 }, { x: 58, y: 28 }, { x: 116, y: 46 }, { x: 168, y: 14 },
      { x: 218, y: 36 }, { x: 266, y: 0 }, { x: 310, y: 28 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 4]],
    place: { left: "5%", top: "13%", width: "min(21rem, 32vw)" },
  },
  {
    name: "CASSIOPEIA",
    stars: [
      { x: 0, y: 46 }, { x: 66, y: 0 }, { x: 122, y: 50 }, { x: 186, y: 2 }, { x: 244, y: 56 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
    place: { left: "auto", top: "9%", width: "min(16rem, 26vw)" },
  },
  {
    name: "ORION",
    stars: [
      { x: 14, y: 12 }, { x: 104, y: 0 }, { x: 32, y: 90 }, { x: 68, y: 100 },
      { x: 104, y: 110 }, { x: 0, y: 194 }, { x: 122, y: 202 },
    ],
    lines: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
    place: { left: "8%", top: "auto", width: "min(10rem, 18vw)" },
  },
];

/** 별자리 그림의 테두리 — 제 별들을 다 담되 이름과 별 크기만큼 여유를 둔다 */
export function constellationBox(c: Constellation): { x: number; y: number; w: number; h: number } {
  const pad = 14;
  /* 위쪽은 이름이 앉을 자리까지 더 비운다 — 이름은 가장 높은 별 위에 놓인다 */
  const top = 22;
  const xs = c.stars.map((s) => s.x);
  const ys = c.stars.map((s) => s.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad - top;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}
