/* ERD 자동 배치.
 *
 * 예전에는 좌표를 erdConfig.TABLE_LAYOUT 에 손으로 적어뒀는데,
 * 그 맵에 없는 테이블은 ErdPanel 이 아예 렌더하지 않았다 (`if (!layout) return null`).
 * 결과적으로 admin 스튜디오에서 테이블을 추가해도 공개 ERD 에는 절대 나타나지 않았고,
 * 이미 데이터에 있던 9개 테이블도 조용히 빠져 있었다.
 *
 * 좌표를 없애고 관계 그래프에서 매번 계산한다.
 * admin 미리보기와 공개 패널이 같은 함수를 쓰므로 둘은 항상 일치하고,
 * 새 테이블도 저장하는 순간 제자리를 갖는다.
 *
 * 배치 방식은 "연결 순서 기반 정렬 격자"다 — BFS 로 그래프를 훑어 이웃이
 * 순서상 붙게 만든 뒤 행 우선으로 격자에 채운다. force-directed 처럼
 * 선 교차를 최소화하지는 못하지만, 결정적(deterministic)이고 겹침이 없으며
 * 이웃이 대체로 가까이 놓인다. ERD 규모(수십 개)에서는 이 정도가 적당하다. */

import type { ErdTable, ErdRelation } from "./types";

/* 카드 치수 — ErdPanel 의 SVG 렌더와 같은 값을 써야 박스와 선이 맞는다 */
export const ERD_COL_W = 260;
export const ERD_ROW_HEIGHT = 26;
export const ERD_HEADER_HEIGHT = 34;
export const ERD_PADDING_Y = 8;

const H_GAP = 100;
const V_GAP = 70;
const MARGIN = 100;

/* layoutErd 내부 전용 — 카드 높이 */
function erdTableHeight(colCount: number) {
  return ERD_HEADER_HEIGHT + colCount * ERD_ROW_HEIGHT + ERD_PADDING_Y;
}

interface ErdBox { x: number; y: number; w: number; h: number }
interface ErdLayout {
  boxes: Record<string, ErdBox>;
  width: number;
  height: number;
}

const H_GAP2 = H_GAP;

/**
 * 계층 배치 + 교차 최소화.
 *
 * 예전에는 BFS 순서대로 4열 격자에 채웠는데, 관계가 하나도 없는 테이블(23개 중 12개)이
 * 격자 한가운데를 차지해 연결된 테이블끼리 멀어지고 선이 길어졌다.
 * (교차 9개 · 관계선 평균 788px · 캔버스 1540×2434 세로형)
 *
 * 이제 두 덩어리로 나눈다.
 *  1) 관계가 있는 테이블 — 참조되는 쪽이 위로 가는 계층으로 쌓고,
 *     각 층 안 순서는 barycenter(이웃 평균 위치)로 정렬해 교차를 줄인다.
 *  2) 고립 테이블 — 선이 없으므로 아래에 촘촘한 격자로 모은다.
 */
export function layoutErd(tables: ErdTable[], relations: ErdRelation[]): ErdLayout {
  const known = new Set(tables.map((t) => t.name));
  const heightOf = new Map(tables.map((t) => [t.name, erdTableHeight(t.columns.length)]));
  const rels = relations.filter(
    (r) => known.has(r.from) && known.has(r.to) && r.from !== r.to,
  );

  const linked = new Set<string>();
  rels.forEach((r) => { linked.add(r.from); linked.add(r.to); });
  const connected = tables.filter((t) => linked.has(t.name)).map((t) => t.name);
  const isolated = tables.filter((t) => !linked.has(t.name)).map((t) => t.name);

  /* ── 1. 계층 — 참조되는 쪽(to)이 항상 위 ── */
  const layer = new Map<string, number>(connected.map((n) => [n, 0]));
  for (let pass = 0; pass < connected.length; pass++) {
    let moved = false;
    for (const r of rels) {
      const want = (layer.get(r.from) ?? 0) + 1;
      if (want > (layer.get(r.to) ?? 0)) { layer.set(r.to, want); moved = true; }
    }
    if (!moved) break;   // 순환이 있어도 pass 수에서 멈춘다
  }
  const maxLayer = connected.length ? Math.max(...connected.map((n) => layer.get(n) ?? 0)) : 0;
  const rows: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  connected.forEach((n) => rows[layer.get(n) ?? 0].push(n));
  rows.forEach((row) => row.sort());   // 결정적 시작 순서

  /* ── 2. barycenter 정렬 — 이웃의 평균 위치로 층 안 순서를 다시 매긴다 ── */
  const neighborsOf = new Map<string, string[]>();
  connected.forEach((n) => neighborsOf.set(n, []));
  rels.forEach((r) => {
    neighborsOf.get(r.from)!.push(r.to);
    neighborsOf.get(r.to)!.push(r.from);
  });

  /* 층 안 위치를 0~1 로 정규화해서 비교한다 — 층마다 폭이 달라 인덱스끼리는 못 견준다.
     인접 층만 보면 두 층을 건너뛰는 간선(likes→posts 등)이 정렬에서 통째로 빠져
     오히려 교차가 늘어난다. 거리로 가중치를 낮춰 모든 이웃을 반영한다. */
  const posIn = (row: string[]) =>
    new Map(row.map((n, i) => [n, row.length === 1 ? 0.5 : i / (row.length - 1)]));
  for (let sweep = 0; sweep < 12; sweep++) {
    const order = sweep % 2 === 0
      ? rows.map((_, i) => i)
      : rows.map((_, i) => rows.length - 1 - i);
    for (const li of order) {
      const pos = rows.map(posIn);
      const self = pos[li];
      rows[li] = [...rows[li]]
        .map((n, i) => {
          let sum = 0, wsum = 0;
          for (const m of neighborsOf.get(n)!) {
            const ml = layer.get(m);
            if (ml == null || ml === li) continue;
            const w = 1 / Math.abs(ml - li);
            sum += (pos[ml].get(m) ?? 0.5) * w;
            wsum += w;
          }
          const bary = wsum > 0 ? sum / wsum : (self.get(n) ?? 0.5);
          return { n, bary, tie: i };
        })
        .sort((a, b) => a.bary - b.bary || a.tie - b.tie)
        .map((v) => v.n);
    }
  }

  /* ── 2-b. 지역 탐색 — barycenter 만으로는 두 층을 건너뛰는 간선이 남는다.
     연결 노드가 10여 개뿐이라 실제 좌표로 점수를 매겨 층 안 자리바꿈을 직접 시도한다.
     점수 = 교차 × 큰 가중치 + 총 관계선 길이. 개선될 때만 채택하므로 결정적이다. ── */
  const rowHeights = rows.map((row) =>
    row.length ? Math.max(...row.map((n) => heightOf.get(n) ?? 0)) : 0);
  const widestNow = Math.max(1, ...rows.map((r) => r.length));
  const pitch = ERD_COL_W + H_GAP;

  const centers = (rs: string[][]) => {
    const m = new Map<string, { x: number; y: number }>();
    let yy = 0;
    for (let li = rs.length - 1; li >= 0; li--) {
      const row = rs[li];
      const rowW = row.length * ERD_COL_W + (row.length - 1) * H_GAP;
      const startX = (widestNow * ERD_COL_W + (widestNow - 1) * H_GAP - rowW) / 2;
      row.forEach((n, c) => {
        m.set(n, { x: startX + c * pitch + ERD_COL_W / 2, y: yy + rowHeights[li] / 2 });
      });
      yy += rowHeights[li] + V_GAP;
    }
    return m;
  };

  const segCross = (a: {x:number;y:number}, b: {x:number;y:number},
                    c: {x:number;y:number}, d: {x:number;y:number}) => {
    const s = (p: {x:number;y:number}, q: {x:number;y:number}, r: {x:number;y:number}) =>
      (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const d1 = s(c, d, a), d2 = s(c, d, b), d3 = s(a, b, c), d4 = s(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  };

  const score = (rs: string[][]) => {
    const cs = centers(rs);
    const segs = rels.map((r) => ({ a: cs.get(r.from)!, b: cs.get(r.to)!, r }))
      .filter((v) => v.a && v.b);
    let cross = 0, len = 0;
    for (let i = 0; i < segs.length; i++) {
      len += Math.hypot(segs[i].a.x - segs[i].b.x, segs[i].a.y - segs[i].b.y);
      for (let j = i + 1; j < segs.length; j++) {
        const p = segs[i], q = segs[j];
        if (new Set([p.r.from, p.r.to, q.r.from, q.r.to]).size < 4) continue;
        if (segCross(p.a, p.b, q.a, q.b)) cross++;
      }
    }
    return cross * 4000 + len;
  };

  let best = score(rows);
  for (let round = 0; round < 40; round++) {
    let improved = false;
    for (let li = 0; li < rows.length; li++) {
      for (let i = 0; i < rows[li].length; i++) {
        for (let j = i + 1; j < rows[li].length; j++) {
          const trial = rows.map((r) => [...r]);
          [trial[li][i], trial[li][j]] = [trial[li][j], trial[li][i]];
          const sc = score(trial);
          if (sc < best - 0.5) {
            best = sc;
            rows.splice(0, rows.length, ...trial);
            improved = true;
          }
        }
      }
    }
    if (!improved) break;
  }

  /* ── 3. 좌표 ── */
  const coreCols = Math.max(1, ...rows.map((r) => r.length));
  /* 고립 테이블은 아래가 아니라 옆에 세운다 —
     아래로 붙이면 캔버스가 세로로 길어져(종횡비 1.0) 전체 보기 배율이 0.25 까지 떨어진다.
     옆에 두면 가로로 넓어져 컨테이너 비율에 가까워지고 같은 화면에서 더 크게 보인다. */
  const isoCols = isolated.length > 0 ? Math.min(2, isolated.length) : 0;
  const isoRows = isoCols ? Math.ceil(isolated.length / isoCols) : 0;

  const coreW = coreCols * ERD_COL_W + (coreCols - 1) * H_GAP2;
  const isoW = isoCols ? isoCols * ERD_COL_W + (isoCols - 1) * H_GAP2 : 0;
  const width = MARGIN * 2 + coreW + (isoW ? H_GAP2 * 2 + isoW : 0);
  const boxes: Record<string, ErdBox> = {};

  let y = MARGIN;
  for (let li = rows.length - 1; li >= 0; li--) {   // 위 = 참조되는 쪽
    const row = rows[li];
    if (row.length === 0) continue;
    const rowH = Math.max(...row.map((n) => heightOf.get(n) ?? 0));
    const rowW = row.length * ERD_COL_W + (row.length - 1) * H_GAP2;
    const startX = MARGIN + (coreW - rowW) / 2;
    row.forEach((name, c) => {
      const h = heightOf.get(name) ?? erdTableHeight(0);
      boxes[name] = {
        x: startX + c * (ERD_COL_W + H_GAP2),
        y: y + (rowH - h) / 2,   // 행 안에서 세로 가운데
        w: ERD_COL_W,
        h,
      };
    });
    y += rowH + V_GAP;
  }
  const coreH = y - V_GAP - MARGIN;

  /* 고립 테이블 — 관계선이 없으니 오른쪽에 촘촘히 세운다 */
  let isoH = 0;
  if (isoCols > 0) {
    const isoX = MARGIN + coreW + H_GAP2 * 2;
    let iy = MARGIN;
    for (let r = 0; r < isoRows; r++) {
      const chunk = isolated.slice(r * isoCols, (r + 1) * isoCols);
      const rowH = Math.max(...chunk.map((n) => heightOf.get(n) ?? 0));
      chunk.forEach((name, c) => {
        const h = heightOf.get(name) ?? erdTableHeight(0);
        boxes[name] = { x: isoX + c * (ERD_COL_W + H_GAP2), y: iy, w: ERD_COL_W, h };
      });
      iy += rowH + V_GAP;
    }
    isoH = iy - V_GAP - MARGIN;
  }

  return { boxes, width, height: MARGIN * 2 + Math.max(coreH, isoH) };
}
