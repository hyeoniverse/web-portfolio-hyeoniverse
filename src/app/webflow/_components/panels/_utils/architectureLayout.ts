import type { StructureItem } from "@/data/webflow";

/* ── 타입 ── */

export interface TreeNode {
  item: StructureItem;
  index: number;
  parentIndex: number | null;
  childIndices: number[];
  row: number;
}

export interface Pos {
  x: number;
  y: number;
}

export interface Edge {
  from: number;
  to: number;
}

export interface TmRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SbArc {
  innerR: number;
  outerR: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  labelR: number;
  path: string;
}

/* ── 상수 ── */

export const VIEWBOX_WIDTH = 900;
export const VIEWBOX_HEIGHT = 480;
export const CENTER_X = VIEWBOX_WIDTH / 2;
export const CENTER_Y = VIEWBOX_HEIGHT / 2;

/* ── 그래프 구축 ── */

export function buildGraph(items: StructureItem[]): { nodes: TreeNode[]; edges: Edge[] } {
  const nodes: TreeNode[] = items.map((item, i) => ({
    item,
    index: i,
    parentIndex: null,
    childIndices: [],
    row: item.indent,
  }));

  const stack = [0];
  for (let i = 1; i < items.length; i++) {
    while (stack.length > 1 && nodes[stack[stack.length - 1]].item.indent >= items[i].indent) {
      stack.pop();
    }
    nodes[i].parentIndex = stack[stack.length - 1];
    nodes[stack[stack.length - 1]].childIndices.push(i);
    stack.push(i);
  }

  const edges: Edge[] = [];
  for (let i = 1; i < nodes.length; i++) {
    edges.push({ from: nodes[i].parentIndex!, to: i });
  }

  return { nodes, edges };
}

/* ── 레이아웃: 트리 (하향식, 구역 기반) ── */

export function computeTree(nodes: TreeNode[]): Pos[] {
  const pos: Pos[] = nodes.map(() => ({ x: 0, y: 0 }));
  const MARGIN = 100;
  const usable = VIEWBOX_WIDTH - MARGIN * 2;

  pos[0] = { x: CENTER_X, y: 45 };

  const row1 = nodes.filter((n) => n.row === 1);
  const parents = row1.filter((n) => n.childIndices.length > 0);
  const leaves = row1.filter((n) => n.childIndices.length === 0);

  const childSpread = 65;
  const zones = parents.map((p) => childSpread * Math.max(p.childIndices.length - 1, 0));
  const totalZoneW = zones.reduce((a, b) => a + b, 0);
  const zoneGap = parents.length > 0 ? (usable - totalZoneW) / (parents.length + 1) : 0;

  let zoneX = MARGIN + zoneGap;
  for (let i = 0; i < parents.length; i++) {
    pos[parents[i].index] = { x: zoneX + zones[i] / 2, y: 185 };
    for (let j = 0; j < parents[i].childIndices.length; j++) {
      pos[parents[i].childIndices[j]] = {
        x: zoneX + j * childSpread,
        y: j % 2 === 0 ? 380 : 420,
      };
    }
    zoneX += zones[i] + zoneGap;
  }

  for (let i = 0; i < leaves.length; i++) {
    const x = leaves.length === 1 ? CENTER_X : MARGIN + (i / (leaves.length - 1)) * usable;
    pos[leaves[i].index] = { x, y: 265 };
  }

  return pos;
}

/* ── 레이아웃: 트리맵 (이진 분할 사각형) ── */

function binarySplit(
  items: { index: number; weight: number }[],
  bounds: TmRect,
  gap: number,
): Map<number, TmRect> {
  const result = new Map<number, TmRect>();
  if (items.length === 0) return result;
  if (items.length === 1) {
    result.set(items[0].index, bounds);
    return result;
  }

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const isH = bounds.w >= bounds.h;

  let cumulativeWeight = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    cumulativeWeight += items[i].weight;
    if (cumulativeWeight >= totalWeight / 2) {
      splitIdx = i + 1;
      break;
    }
  }

  const leftGroup = items.slice(0, splitIdx);
  const rightGroup = items.slice(splitIdx);
  const leftWeight = leftGroup.reduce((s, i) => s + i.weight, 0);
  const ratio = leftWeight / totalWeight;

  let leftBounds: TmRect, rightBounds: TmRect;
  if (isH) {
    const splitWidth = bounds.w * ratio - gap / 2;
    leftBounds = { x: bounds.x, y: bounds.y, w: splitWidth, h: bounds.h };
    rightBounds = { x: bounds.x + splitWidth + gap, y: bounds.y, w: bounds.w - splitWidth - gap, h: bounds.h };
  } else {
    const splitHeight = bounds.h * ratio - gap / 2;
    leftBounds = { x: bounds.x, y: bounds.y, w: bounds.w, h: splitHeight };
    rightBounds = { x: bounds.x, y: bounds.y + splitHeight + gap, w: bounds.w, h: bounds.h - splitHeight - gap };
  }

  for (const [k, v] of binarySplit(leftGroup, leftBounds, gap)) result.set(k, v);
  for (const [k, v] of binarySplit(rightGroup, rightBounds, gap)) result.set(k, v);
  return result;
}

export function computeTreemap(nodes: TreeNode[]): TmRect[] {
  const rects: TmRect[] = nodes.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const TREEMAP_GAP = 6;
  const TREEMAP_PADDING = 5;
  const HEADER_HEIGHT = 24;

  const bounds = { x: 0, y: 30, w: VIEWBOX_WIDTH, h: VIEWBOX_HEIGHT - 30 };
  rects[0] = bounds;

  const row1 = nodes.filter((n) => n.row === 1);
  const items = row1.map((n) => ({
    index: n.index,
    weight: Math.max(n.childIndices.length, 1),
  }));

  items.sort((a, b) => b.weight - a.weight);
  const layout = binarySplit(items, bounds, TREEMAP_GAP);

  for (const [idx, rect] of layout) {
    rects[idx] = rect;
  }

  for (const node of nodes) {
    if (node.row !== 1 || node.childIndices.length === 0) continue;
    const parentRect = rects[node.index];
    const childBounds = {
      x: parentRect.x + TREEMAP_PADDING,
      y: parentRect.y + HEADER_HEIGHT,
      w: parentRect.w - TREEMAP_PADDING * 2,
      h: parentRect.h - HEADER_HEIGHT - TREEMAP_PADDING,
    };

    const childItems = node.childIndices.map((ci) => ({ index: ci, weight: 1 }));
    const childLayout = binarySplit(childItems, childBounds, TREEMAP_GAP / 2);
    for (const [idx, rect] of childLayout) {
      rects[idx] = rect;
    }
  }

  return rects;
}

/* ── 레이아웃: 선버스트 (동심원 호) ── */

function arcPathD(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startA: number,
  endA: number,
): string {
  const x1 = cx + innerR * Math.cos(startA);
  const y1 = cy + innerR * Math.sin(startA);
  const x2 = cx + outerR * Math.cos(startA);
  const y2 = cy + outerR * Math.sin(startA);
  const x3 = cx + outerR * Math.cos(endA);
  const y3 = cy + outerR * Math.sin(endA);
  const x4 = cx + innerR * Math.cos(endA);
  const y4 = cy + innerR * Math.sin(endA);
  const largeArcFlag = endA - startA > Math.PI ? 1 : 0;

  return `M${x1},${y1} L${x2},${y2} A${outerR},${outerR} 0 ${largeArcFlag} 1 ${x3},${y3} L${x4},${y4} A${innerR},${innerR} 0 ${largeArcFlag} 0 ${x1},${y1}Z`;
}

export function computeSunburst(nodes: TreeNode[]): SbArc[] {
  const arcs: SbArc[] = nodes.map(() => ({
    innerR: 0,
    outerR: 0,
    startAngle: 0,
    endAngle: 0,
    midAngle: 0,
    labelR: 0,
    path: "",
  }));

  const ROOT_RADIUS = 45;
  arcs[0] = {
    innerR: 0,
    outerR: ROOT_RADIUS,
    startAngle: 0,
    endAngle: Math.PI * 2,
    midAngle: 0,
    labelR: 0,
    path: `M${CENTER_X - ROOT_RADIUS},${CENTER_Y} A${ROOT_RADIUS},${ROOT_RADIUS} 0 1 0 ${CENTER_X + ROOT_RADIUS},${CENTER_Y} A${ROOT_RADIUS},${ROOT_RADIUS} 0 1 0 ${CENTER_X - ROOT_RADIUS},${CENTER_Y}Z`,
  };

  const RING1_INNER = ROOT_RADIUS + 10;
  const RING1_OUTER = RING1_INNER + 75;
  const ARC_GAP = 0.02;

  const row1 = nodes.filter((n) => n.row === 1);
  const weights = row1.map((n) => Math.max(n.childIndices.length, 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const availAngle = Math.PI * 2 - ARC_GAP * row1.length;

  let angle = -Math.PI / 2;

  for (let i = 0; i < row1.length; i++) {
    const sweep = (weights[i] / totalWeight) * availAngle;
    const startAngle = angle;
    const endAngle = angle + sweep;
    const midAngle = (startAngle + endAngle) / 2;

    arcs[row1[i].index] = {
      innerR: RING1_INNER,
      outerR: RING1_OUTER,
      startAngle,
      endAngle,
      midAngle,
      labelR: (RING1_INNER + RING1_OUTER) / 2,
      path: arcPathD(CENTER_X, CENTER_Y, RING1_INNER, RING1_OUTER, startAngle, endAngle),
    };

    if (row1[i].childIndices.length > 0) {
      const RING2_INNER = RING1_OUTER + 6;
      const RING2_OUTER = RING2_INNER + 55;
      const childCount = row1[i].childIndices.length;
      const childGap = ARC_GAP * 0.6;
      const childAvailAngle = sweep - childGap * childCount;
      const childSweep = childAvailAngle / childCount;
      let childAngle = startAngle;

      for (const ci of row1[i].childIndices) {
        const childStart = childAngle;
        const childEnd = childAngle + childSweep;
        const childMid = (childStart + childEnd) / 2;
        arcs[ci] = {
          innerR: RING2_INNER,
          outerR: RING2_OUTER,
          startAngle: childStart,
          endAngle: childEnd,
          midAngle: childMid,
          labelR: (RING2_INNER + RING2_OUTER) / 2,
          path: arcPathD(CENTER_X, CENTER_Y, RING2_INNER, RING2_OUTER, childStart, childEnd),
        };
        childAngle += childSweep + childGap;
      }
    }

    angle += sweep + ARC_GAP;
  }

  return arcs;
}
