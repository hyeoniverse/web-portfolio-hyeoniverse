/* 장 별자리 지도 — 첫 화면의 목차가 별자리가 되고, 장으로 들어갈 때 카메라가 그 별로 날아 들어간다.
   별 자리는 지도 판(1000 × 640) 위 좌표. 차례대로 선이 이어진다(목차 순서). 이름은 목차(showcase.ts 의 toc)에서 */
export const MAP_W = 1000;
export const MAP_H = 640;

/** 목차 href → 별 자리 · 크기(밝기) */
export const MAP_STARS: Record<string, { x: number; y: number; r: number }> = {
  "#facts": { x: 170, y: 420, r: 14 },
  "#features": { x: 320, y: 250, r: 22 },
  "#ai": { x: 450, y: 340, r: 18 },
  "#architecture": { x: 560, y: 220, r: 20 },
  "#decisions": { x: 665, y: 340, r: 16 },
  "#design": { x: 765, y: 235, r: 15 },
  "#code": { x: 865, y: 330, r: 14 },
  "#making": { x: 900, y: 465, r: 15 },
  "#trust": { x: 770, y: 545, r: 11 },
  "#faq": { x: 630, y: 525, r: 10 },
};

export interface MapGeo {
  w: number;
  h: number;
  /** 두 열 배치 — 이름을 별 오른쪽에 붙인다 */
  tall?: boolean;
  stars: Record<string, { x: number; y: number; r: number }>;
}

/** 넓은 화면 — 가로로 긴 별자리 */
export const MAP_WIDE: MapGeo = { w: MAP_W, h: MAP_H, stars: MAP_STARS };

/** 좁은 세로 화면 — 두 열. 가로 배치를 그대로 줄이면 별 사이가 이름보다 좁아져 이름끼리 겹친다.
    왼쪽 열은 01→05 로 내려가고 오른쪽 열은 06→10 으로 올라온다(U 자). 이름은 별 오른쪽에 붙는다.
    폭은 늘 화면 폭을 다 쓰고, 세로만 남은 높이(aspect = 높이 / 폭)에 맞춰 늘이거나 줄인다 — 낮은 화면에서 지도째 작아지면 이름이 좁아져 줄이 꺾인다 */
const TALL_STARS: MapGeo["stars"] = {
  "#facts": { x: 40, y: 40, r: 14 },
  "#features": { x: 85, y: 140, r: 20 },
  "#ai": { x: 45, y: 240, r: 16 },
  "#architecture": { x: 90, y: 340, r: 18 },
  "#decisions": { x: 50, y: 440, r: 15 },
  "#design": { x: 350, y: 470, r: 14 },
  "#code": { x: 325, y: 360, r: 13 },
  "#making": { x: 355, y: 260, r: 15 },
  "#trust": { x: 330, y: 160, r: 11 },
  "#faq": { x: 350, y: 60, r: 10 },
};

export function mapTall(aspect: number): MapGeo {
  const h = Math.round(600 * Math.min(1.2, Math.max(0.5, aspect)));
  const k = h / 500;
  const stars = Object.fromEntries(Object.entries(TALL_STARS).map(([href, st]) => [href, { ...st, y: st.y * k }]));
  return { w: 600, h, stars, tall: true };
}
