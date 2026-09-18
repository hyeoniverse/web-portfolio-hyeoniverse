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
      twinkle: bright > 0.82,
    });
  }
  return stars;
}

export const STARS: Star[] = makeStars(220, 20260918);

export interface Constellation {
  /** 라틴 이름 — 별자리 이름은 고유명사라 화면 언어와 무관하게 둔다 */
  name: string;
  /** 이름을 붙일 자리 */
  label: { x: number; y: number };
  /** 이어 그릴 별들. 좌표는 0~1000 기준 */
  stars: { x: number; y: number }[];
  /** stars 의 번호를 짝지어 선을 잇는다 */
  lines: [number, number][];
}

/* 세 자리만 둔다 — 더 넣으면 선이 서로 엉켜 별자리로 읽히지 않는다 */
export const CONSTELLATIONS: Constellation[] = [
  {
    name: "URSA MAJOR",
    label: { x: 148, y: 236 },
    stars: [
      { x: 120, y: 300 }, { x: 178, y: 268 }, { x: 236, y: 286 }, { x: 288, y: 254 },
      { x: 338, y: 276 }, { x: 386, y: 240 }, { x: 430, y: 268 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 4]],
  },
  {
    name: "CASSIOPEIA",
    label: { x: 648, y: 130 },
    stars: [
      { x: 620, y: 196 }, { x: 686, y: 150 }, { x: 742, y: 200 }, { x: 806, y: 152 }, { x: 864, y: 206 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    name: "ORION",
    label: { x: 412, y: 612 },
    stars: [
      { x: 386, y: 664 }, { x: 476, y: 652 }, { x: 404, y: 742 }, { x: 440, y: 752 },
      { x: 476, y: 762 }, { x: 372, y: 846 }, { x: 494, y: 854 },
    ],
    lines: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
  },
];
