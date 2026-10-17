/* 프레지 세계의 배치 — 가운데 허브(화면 크기, 배율 1)에 큰 별자리 지도가 있고, 지도의 별 자리마다 그 장의 무리가
   아주 작게 들어 있다. 무리 안에서는 장면 프레임을 격자로 놓고, 장 머리가 있으면 무리 전체를 덮는 큰 프레임을 둔다.
   단위는 px(허브 = 화면 크기). 무리는 먼저 자기 좌표로 짠 뒤 별 자리로 줄여 옮긴다 */
import type { ClusterDef } from "./frames";
import { MAP_WIDE, mapTall, type MapGeo } from "../../_data/map";

export interface FrameBox {
  /** 프레임 번호(배치 안) */
  i: number;
  id: string;
  cluster: string;
  kind: "hub" | "head" | "scene";
  x: number;
  y: number;
  /** 화면 크기 대비 배율 */
  s: number;
  /** 머리 프레임 — 글이 차지하는 위쪽 몫(0~1) */
  headBand?: number;
}

export interface MapBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 어느 별 배치를 쓰나 — 좁은 세로 화면이면 두 줄 지그재그 */
  geo: MapGeo;
}

export interface Layout {
  frames: FrameBox[];
  /** 지도가 허브 안에서 차지하는 자리(허브 = 화면 좌표) */
  map: MapBox;
  /** 휠 · 키로 지나는 차례 — 프레임 번호. 허브에서 출발해 장들을 쭉 지난다(장 사이에 허브로 돌아오지 않는다) */
  order: number[];
}

/** 좁은 세로 화면(휴대폰 세로) — 가로 별자리를 줄이면 이름끼리 겹쳐서 두 줄 배치를 쓴다 */
const isTall = (vw: number, vh: number) => vw <= 640 && vh > vw;

/** 허브 안 지도 자리 — 위는 네비게이션 · 소개 글, 아래는 독 자리를 비운다.
    좁은 세로 화면은 소개 글이 화면 절반 가까이 차지해서, 잰 소개 글 아래 끝(introBottom)부터 쓴다 */
export function mapBoxFor(vw: number, vh: number, introBottom = 0): MapBox {
  const tall = isTall(vw, vh);
  /* 키 낮은 가로 화면 — 소개 글이 화면 높이를 거의 다 써서 지도와 겹쳤다. 글은 왼쪽 절반(Prezi.module.css .hubIntro),
     지도는 오른쪽 절반에 두 열 배치로(가로 배치를 절반 폭에 줄이면 이름끼리 겹친다). 위는 네비게이션 아래 끝부터 */
  const side = !tall && vw > 480 && vh <= 500;
  const top = tall && introBottom ? introBottom + 16 : side ? 104 : Math.min(vh * 0.2, 180);
  /* 아래는 독 자리. 좁은 화면 첫 지도에서는 하늘 캡션(진짜 하늘 · 별 수)이 거기 뜨므로 더 비운다 */
  const bottom = tall || side ? 130 : 90;
  const left = side ? vw * 0.5 : vw * 0.03;
  const availW = side ? vw * 0.47 : vw * 0.94, availH = vh - top - bottom;
  const geo = tall ? mapTall(availH / availW) : side ? mapTall(availH / availW, 0.3) : MAP_WIDE;
  const scale = Math.max(0, Math.min(availW / geo.w, availH / geo.h));
  const w = geo.w * scale, h = geo.h * scale;
  return { x: left + (availW - w) / 2, y: top + (availH - h) / 2, w, h, geo };
}

/** 좁은 화면에서 장 머리 제목 띠가 화면에 차지할 최소 높이(px) — 내비게이션 자리 + 네 줄 제목 + 안내 한두 줄 */
const HEAD_MIN_PX = 340;

export function layoutWorld(clusters: ClusterDef[], vw: number, vh: number, introBottom = 0): Layout {
  const map = mapBoxFor(vw, vh, introBottom);
  const { w: MAP_W, h: MAP_H, stars: MAP_STARS } = map.geo;
  const frames: FrameBox[] = [{ i: 0, id: "hub", cluster: "hub", kind: "hub", x: 0, y: 0, s: 1 }];
  const gap = vw * 0.14;
  clusters.forEach((c) => {
    /* 자기 좌표로 무리를 짠다 */
    const local: Omit<FrameBox, "i">[] = [];
    const n = c.scenes.length;
    const cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const gridW = cols * vw + (cols - 1) * gap;
    const gridH = rows * vh + (rows - 1) * gap;
    let gx = 0, gy = 0, cw = gridW, ch = gridH;
    if (c.head) {
      const pad = gap;
      /* 좁은 화면 — 제목 띠가 화면에서 최소 HEAD_MIN_PX(화면 높이의 절반까지)는 되게 띠를 늘린다. 세로로 긴 화면은 판이 폭에
         맞춰 정해져 띠 몫이 30% 남짓이었고, 네 줄짜리 장 제목이 넘쳐 내비게이션 위로 올라갔다 */
      /* 높이 500px 이하(가로로 든 휴대폰)도 좁은 화면으로 친다. 이때는 화면 절반으로 제목이 안 들어가 띠가 넘치고,
         넘친 제목이 장면 위로 내려와 장면 안에서 거대한 글자로 보였다 — 띠를 화면의 85% 까지 늘린다 */
      const want = vw < 768 || vh <= 500 ? Math.min(vh <= 500 ? 0.85 : 0.5, HEAD_MIN_PX / vh) : 0;
      let band = gridH * 0.55, s = 1, hh = vh, needH = 0;
      for (let k = 0; k < 40; k++) {
        const needW = gridW + pad * 2;
        needH = band + gridH + pad * 2;
        s = Math.max(needW / vw, needH / vh);
        hh = vh * s;
        if ((hh - pad - gridH - (hh - needH) / 2) / hh >= want) break;
        band *= 1.1;
      }
      const hw = vw * s;
      gx = (hw - gridW) / 2;
      gy = hh - pad - gridH - (hh - needH) / 2;
      local.push({ id: `${c.id}-head`, cluster: c.id, kind: "head", x: 0, y: 0, s, headBand: gy / hh });
      cw = hw;
      ch = hh;
    }
    c.scenes.forEach((sc, si) => {
      const col = si % cols, row = Math.floor(si / cols);
      local.push({ id: sc.id, cluster: c.id, kind: "scene", x: gx + col * (vw + gap), y: gy + row * (vh + gap), s: 1 });
    });
    /* 별 자리로 줄여 옮긴다 — 별 크기만 한 작은 무리 */
    const star = c.anchor ? MAP_STARS[c.anchor] : undefined;
    const sx = star ? map.x + (star.x / MAP_W) * map.w : vw / 2;
    const sy = star ? map.y + (star.y / MAP_H) * map.h : vh / 2;
    const target = ((star?.r ?? 14) / MAP_W) * map.w * 2.4;
    const k = target / Math.max(cw, ch * (vw / vh));
    local.forEach((f) => {
      frames.push({ ...f, i: frames.length, x: sx + (f.x - cw / 2) * k, y: sy + (f.y - ch / 2) * k, s: f.s * k });
    });
  });
  /* 차례 — 허브 → 장(머리 → 장면들) → 다음 장 … */
  const order: number[] = [0];
  clusters.forEach((c) => {
    frames.filter((f) => f.cluster === c.id).forEach((f) => order.push(f.i));
  });
  return { frames, map, order };
}

export interface Camera {
  /** 화면 가운데에 오는 세계 좌표 · 배율 */
  cx: number;
  cy: number;
  s: number;
}

export const cameraFor = (f: FrameBox, vw: number, vh: number): Camera => ({
  cx: f.x + (vw * f.s) / 2,
  cy: f.y + (vh * f.s) / 2,
  s: 1 / f.s,
});
