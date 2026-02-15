"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Language } from "@/providers/LanguageProvider";
import type { StructureItem } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

/* ── 타입 ── */

type ViewMode = "tree" | "treemap" | "sunburst";

interface TreeNode {
  item: StructureItem;
  index: number;
  parentIndex: number | null;
  childIndices: number[];
  row: number;
}

interface Pos {
  x: number;
  y: number;
}

interface Edge {
  from: number;
  to: number;
}

interface TmRect {
  x: number;
  y: number;
  w: number;  // width
  h: number;  // height
}

interface SbArc {
  innerR: number;
  outerR: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  labelR: number;
  path: string;
}

interface ArchitecturePanelProps {
  language: Language;
  structure: StructureItem[];
}

/* ── 상수 ── */

const VIEWBOX_WIDTH = 900;
const VIEWBOX_HEIGHT = 480;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2;

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "tree", label: "Tree" },
  { key: "treemap", label: "Treemap" },
  { key: "sunburst", label: "Sunburst" },
];

/* ── 그래프 구축 ── */

function buildGraph(items: StructureItem[]): { nodes: TreeNode[]; edges: Edge[] } {
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

function computeTree(nodes: TreeNode[]): Pos[] {
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

function computeTreemap(nodes: TreeNode[]): TmRect[] {
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

  // 가중치 내림차순 정렬 — 정사각형에 가까운 배치를 위해
  items.sort((a, b) => b.weight - a.weight);
  const layout = binarySplit(items, bounds, TREEMAP_GAP);

  for (const [idx, rect] of layout) {
    rects[idx] = rect;
  }

  // indent-2 자식 노드를 부모 영역 내부에 배치
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

function computeSunburst(nodes: TreeNode[]): SbArc[] {
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

/* ── 컴포넌트 ── */

export default function ArchitecturePanel({ language, structure }: ArchitecturePanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const { nodes, edges } = useMemo(() => buildGraph(structure), [structure]);
  const treePos = useMemo(() => computeTree(nodes), [nodes]);
  const tmRects = useMemo(() => computeTreemap(nodes), [nodes]);
  const sbArcs = useMemo(() => computeSunburst(nodes), [nodes]);

  const activeEdges = useMemo(() => {
    if (selectedIndex === null) return new Set<number>();
    const set = new Set<number>();
    edges.forEach((e, i) => {
      if (e.from === selectedIndex || e.to === selectedIndex) set.add(i);
    });
    return set;
  }, [selectedIndex, edges]);

  const connectedNodes = useMemo(() => {
    if (selectedIndex === null) return new Set<number>();
    const set = new Set<number>([selectedIndex]);
    for (const e of edges) {
      if (e.from === selectedIndex) set.add(e.to);
      if (e.to === selectedIndex) set.add(e.from);
    }
    return set;
  }, [selectedIndex, edges]);

  // 트리맵/선버스트용 관련 노드 (부모 + 형제 + 자식)
  const relatedNodes = useMemo(() => {
    if (selectedIndex === null) return new Set<number>();
    const n = nodes[selectedIndex];
    const set = new Set<number>([selectedIndex]);
    if (n.parentIndex !== null) {
      set.add(n.parentIndex);
      for (const ci of nodes[n.parentIndex].childIndices) set.add(ci);
    }
    for (const ci of n.childIndices) set.add(ci);
    return set;
  }, [selectedIndex, nodes]);

  const handleClick = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleModeChange = useCallback((mode: ViewMode) => {
    setSelectedIndex(null);
    setViewMode(mode);
  }, []);

  // 툴팁 위치 (퍼센트 기반)
  const tooltipInfo = useMemo(() => {
    if (selectedIndex === null) return null;
    switch (viewMode) {
      case "tree": {
        const position = treePos[selectedIndex];
        return {
          left: `${(position.x / VIEWBOX_WIDTH) * 100}%`,
          top: position.y < CENTER_Y
            ? `calc(${(position.y / VIEWBOX_HEIGHT) * 100}% + 28px)`
            : `calc(${(position.y / VIEWBOX_HEIGHT) * 100}% - 28px)`,
          translate: position.y < CENTER_Y ? "-50% 0" : "-50% -100%",
        };
      }
      case "treemap": {
        const r = tmRects[selectedIndex];
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        return {
          left: `${(cx / VIEWBOX_WIDTH) * 100}%`,
          top: cy < CENTER_Y
            ? `calc(${(cy / VIEWBOX_HEIGHT) * 100}% + 20px)`
            : `calc(${(cy / VIEWBOX_HEIGHT) * 100}% - 20px)`,
          translate: cy < CENTER_Y ? "-50% 0" : "-50% -100%",
        };
      }
      case "sunburst": {
        const arc = sbArcs[selectedIndex];
        const r = arc.labelR || 60;
        const px = CENTER_X + Math.cos(arc.midAngle) * r;
        const py = CENTER_Y + Math.sin(arc.midAngle) * r;
        return {
          left: `${(px / VIEWBOX_WIDTH) * 100}%`,
          top: py < CENTER_Y
            ? `calc(${(py / VIEWBOX_HEIGHT) * 100}% + 20px)`
            : `calc(${(py / VIEWBOX_HEIGHT) * 100}% - 20px)`,
          translate: py < CENTER_Y ? "-50% 0" : "-50% -100%",
        };
      }
    }
  }, [viewMode, selectedIndex, treePos, tmRects, sbArcs]);

  const selectedNode = selectedIndex !== null ? nodes[selectedIndex] : null;

  return (
    <div className={styles.panel}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>02</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Architecture.</h3>

      {/* ── 데스크톱: 인터랙티브 맵 ── */}
      <div className={styles.archMap}>
        {/* 모드 선택기 */}
        <div className={styles.archModeBar}>
          {VIEW_MODES.map((m) => (
            <button
              key={m.key}
              className={`${styles.archModeBtn} ${viewMode === m.key ? styles.archModeBtnActive : ""}`}
              onClick={() => handleModeChange(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── 트리 모드 ── */}
        {viewMode === "tree" && (
          <>
            <svg
              className={styles.archSvg}
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              preserveAspectRatio="none"
            >
              {edges.map((edge, i) => {
                const isActive = activeEdges.has(i);
                const isDimmed = selectedIndex !== null && !isActive;
                return (
                  <line
                    key={i}
                    className={`${styles.archEdge} ${isActive ? styles.archEdgeActive : ""} ${isDimmed ? styles.archEdgeDimmed : ""}`}
                    x1={treePos[edge.from].x}
                    y1={treePos[edge.from].y}
                    x2={treePos[edge.to].x}
                    y2={treePos[edge.to].y}
                  />
                );
              })}
            </svg>
            {nodes.map((node) => {
              const pos = treePos[node.index];
              const isRoot = node.row === 0;
              const isActive = selectedIndex === node.index;
              const isDimmed = selectedIndex !== null && !connectedNodes.has(node.index);
              return (
                <div
                  key={node.index}
                  className={`${styles.archNodeBox} ${isRoot ? styles.archNodeRoot : ""} ${isActive ? styles.archNodeActive : ""} ${isDimmed ? styles.archNodeDimmed : ""}`}
                  style={{
                    left: `${(pos.x / VIEWBOX_WIDTH) * 100}%`,
                    top: `${(pos.y / VIEWBOX_HEIGHT) * 100}%`,
                  }}
                  onClick={() => handleClick(node.index)}
                >
                  <span className={styles.archNodePath}>{node.item.path}</span>
                </div>
              );
            })}
          </>
        )}

        {/* ── 트리맵 모드 ── */}
        {viewMode === "treemap" && (
          <>
            {nodes.map((node) => {
              if (node.row === 0) return null; // 루트는 컨테이너
              const r = tmRects[node.index];
              const isParent = node.row === 1 && node.childIndices.length > 0;
              const isChild = node.row === 2;
              const isLeaf = node.row === 1 && node.childIndices.length === 0;
              const isActive = selectedIndex === node.index;
              const isDimmed = selectedIndex !== null && !relatedNodes.has(node.index);
              return (
                <div
                  key={node.index}
                  className={`${styles.archTmCell} ${isParent ? styles.archTmParent : ""} ${isChild ? styles.archTmChild : ""} ${isLeaf ? styles.archTmLeaf : ""} ${isActive ? styles.archTmCellActive : ""} ${isDimmed ? styles.archTmCellDimmed : ""}`}
                  style={{
                    left: `${(r.x / VIEWBOX_WIDTH) * 100}%`,
                    top: `${(r.y / VIEWBOX_HEIGHT) * 100}%`,
                    width: `${(r.w / VIEWBOX_WIDTH) * 100}%`,
                    height: `${(r.h / VIEWBOX_HEIGHT) * 100}%`,
                  }}
                  onClick={() => handleClick(node.index)}
                >
                  <span className={styles.archTmLabel}>{node.item.path}</span>
                </div>
              );
            })}
          </>
        )}

        {/* ── 선버스트 모드 ── */}
        {viewMode === "sunburst" && (
          <svg
            className={styles.archSunburst}
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* 루트 원 */}
            <path
              className={`${styles.archSbRoot} ${selectedIndex === 0 ? styles.archSbArcActive : ""}`}
              d={sbArcs[0].path}
              onClick={() => handleClick(0)}
            />
            <text className={`${styles.archSbLabel} ${styles.archSbLabelLg}`} x={CENTER_X} y={CENTER_Y}>
              {nodes[0].item.path}
            </text>

            {/* indent-1, indent-2 호 */}
            {nodes.map((node) => {
              if (node.row === 0) return null;
              const arc = sbArcs[node.index];
              if (!arc.path) return null;
              const isActive = selectedIndex === node.index;
              const isDimmed = selectedIndex !== null && !relatedNodes.has(node.index);

              const lx = CENTER_X + Math.cos(arc.midAngle) * arc.labelR;
              const ly = CENTER_Y + Math.sin(arc.midAngle) * arc.labelR;
              const sweepDeg = ((arc.endAngle - arc.startAngle) * 180) / Math.PI;

              return (
                <g key={node.index}>
                  <path
                    className={`${styles.archSbArc} ${isActive ? styles.archSbArcActive : ""} ${isDimmed ? styles.archSbArcDimmed : ""}`}
                    d={arc.path}
                    onClick={() => handleClick(node.index)}
                  />
                  {sweepDeg > 12 && (
                    <text
                      className={`${styles.archSbLabel} ${node.row === 1 ? styles.archSbLabelLg : ""}`}
                      x={lx}
                      y={ly}
                      transform={`rotate(${(arc.midAngle * 180) / Math.PI + (Math.abs(arc.midAngle) > Math.PI / 2 ? 180 : 0)}, ${lx}, ${ly})`}
                    >
                      {node.item.path}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* ── 툴팁 (Framer Motion의 AnimatePresence만 사용) ── */}
        <AnimatePresence>
          {selectedNode && tooltipInfo && (
            <motion.div
              key={`tooltip-${selectedIndex}`}
              className={styles.archTooltip}
              style={{
                left: tooltipInfo.left,
                top: tooltipInfo.top,
                translate: tooltipInfo.translate,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {selectedNode.item.description[language]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 모바일: 텍스트 그리드 ── */}
      <div className={styles.archGrid}>
        {structure.map((item, i) => (
          <div
            key={i}
            className={`${styles.archItem} ${styles.animate} ${
              item.indent === 1
                ? styles.archIndent1
                : item.indent === 2
                  ? styles.archIndent2
                  : ""
            }`}
          >
            <span className={styles.archPath}>{item.path}</span>
            <span className={styles.archDesc}>
              {item.description[language]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
