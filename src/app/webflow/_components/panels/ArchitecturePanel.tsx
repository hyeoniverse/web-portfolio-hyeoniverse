"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Language } from "@/providers/LanguageProvider";
import type { StructureItem } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

/* ── Types ── */

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
  w: number;
  h: number;
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

/* ── Constants ── */

const VB_W = 900;
const VB_H = 480;
const CX = VB_W / 2;
const CY = VB_H / 2;

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "tree", label: "Tree" },
  { key: "treemap", label: "Treemap" },
  { key: "sunburst", label: "Sunburst" },
];

/* ── Build graph ── */

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

/* ── Layout: Tree (top-down, zone-based) ── */

function computeTree(nodes: TreeNode[]): Pos[] {
  const pos: Pos[] = nodes.map(() => ({ x: 0, y: 0 }));
  const M = 100;
  const usable = VB_W - M * 2;

  pos[0] = { x: CX, y: 45 };

  const row1 = nodes.filter((n) => n.row === 1);
  const parents = row1.filter((n) => n.childIndices.length > 0);
  const leaves = row1.filter((n) => n.childIndices.length === 0);

  const childSpread = 65;
  const zones = parents.map((p) => childSpread * Math.max(p.childIndices.length - 1, 0));
  const totalZoneW = zones.reduce((a, b) => a + b, 0);
  const zoneGap = parents.length > 0 ? (usable - totalZoneW) / (parents.length + 1) : 0;

  let zoneX = M + zoneGap;
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
    const x = leaves.length === 1 ? CX : M + (i / (leaves.length - 1)) * usable;
    pos[leaves[i].index] = { x, y: 265 };
  }

  return pos;
}

/* ── Layout: Treemap (binary-split rectangles) ── */

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

  let cum = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    cum += items[i].weight;
    if (cum >= totalWeight / 2) {
      splitIdx = i + 1;
      break;
    }
  }

  const g1 = items.slice(0, splitIdx);
  const g2 = items.slice(splitIdx);
  const w1 = g1.reduce((s, i) => s + i.weight, 0);
  const ratio = w1 / totalWeight;

  let b1: TmRect, b2: TmRect;
  if (isH) {
    const sw = bounds.w * ratio - gap / 2;
    b1 = { x: bounds.x, y: bounds.y, w: sw, h: bounds.h };
    b2 = { x: bounds.x + sw + gap, y: bounds.y, w: bounds.w - sw - gap, h: bounds.h };
  } else {
    const sh = bounds.h * ratio - gap / 2;
    b1 = { x: bounds.x, y: bounds.y, w: bounds.w, h: sh };
    b2 = { x: bounds.x, y: bounds.y + sh + gap, w: bounds.w, h: bounds.h - sh - gap };
  }

  for (const [k, v] of binarySplit(g1, b1, gap)) result.set(k, v);
  for (const [k, v] of binarySplit(g2, b2, gap)) result.set(k, v);
  return result;
}

function computeTreemap(nodes: TreeNode[]): TmRect[] {
  const rects: TmRect[] = nodes.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const GAP = 6;
  const PAD = 5;
  const HDR = 24;

  const bounds = { x: 0, y: 30, w: VB_W, h: VB_H - 30 };
  rects[0] = bounds;

  const row1 = nodes.filter((n) => n.row === 1);
  const items = row1.map((n) => ({
    index: n.index,
    weight: Math.max(n.childIndices.length, 1),
  }));

  // Sort by weight descending for better squarification
  items.sort((a, b) => b.weight - a.weight);
  const layout = binarySplit(items, bounds, GAP);

  for (const [idx, rect] of layout) {
    rects[idx] = rect;
  }

  // Lay out indent-2 children inside their parents
  for (const node of nodes) {
    if (node.row !== 1 || node.childIndices.length === 0) continue;
    const pr = rects[node.index];
    const cb = {
      x: pr.x + PAD,
      y: pr.y + HDR,
      w: pr.w - PAD * 2,
      h: pr.h - HDR - PAD,
    };

    const childItems = node.childIndices.map((ci) => ({ index: ci, weight: 1 }));
    const childLayout = binarySplit(childItems, cb, GAP / 2);
    for (const [idx, rect] of childLayout) {
      rects[idx] = rect;
    }
  }

  return rects;
}

/* ── Layout: Sunburst (concentric arcs) ── */

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
  const lg = endA - startA > Math.PI ? 1 : 0;

  return `M${x1},${y1} L${x2},${y2} A${outerR},${outerR} 0 ${lg} 1 ${x3},${y3} L${x4},${y4} A${innerR},${innerR} 0 ${lg} 0 ${x1},${y1}Z`;
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

  const ROOT_R = 45;
  arcs[0] = {
    innerR: 0,
    outerR: ROOT_R,
    startAngle: 0,
    endAngle: Math.PI * 2,
    midAngle: 0,
    labelR: 0,
    path: `M${CX - ROOT_R},${CY} A${ROOT_R},${ROOT_R} 0 1 0 ${CX + ROOT_R},${CY} A${ROOT_R},${ROOT_R} 0 1 0 ${CX - ROOT_R},${CY}Z`,
  };

  const R1_IN = ROOT_R + 10;
  const R1_OUT = R1_IN + 75;
  const ARC_GAP = 0.02;

  const row1 = nodes.filter((n) => n.row === 1);
  const weights = row1.map((n) => Math.max(n.childIndices.length, 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const availAngle = Math.PI * 2 - ARC_GAP * row1.length;

  let angle = -Math.PI / 2;

  for (let i = 0; i < row1.length; i++) {
    const sweep = (weights[i] / totalWeight) * availAngle;
    const sa = angle;
    const ea = angle + sweep;
    const ma = (sa + ea) / 2;

    arcs[row1[i].index] = {
      innerR: R1_IN,
      outerR: R1_OUT,
      startAngle: sa,
      endAngle: ea,
      midAngle: ma,
      labelR: (R1_IN + R1_OUT) / 2,
      path: arcPathD(CX, CY, R1_IN, R1_OUT, sa, ea),
    };

    if (row1[i].childIndices.length > 0) {
      const R2_IN = R1_OUT + 6;
      const R2_OUT = R2_IN + 55;
      const cc = row1[i].childIndices.length;
      const cGap = ARC_GAP * 0.6;
      const cAvail = sweep - cGap * cc;
      const cSweep = cAvail / cc;
      let ca = sa;

      for (const ci of row1[i].childIndices) {
        const csa = ca;
        const cea = ca + cSweep;
        const cma = (csa + cea) / 2;
        arcs[ci] = {
          innerR: R2_IN,
          outerR: R2_OUT,
          startAngle: csa,
          endAngle: cea,
          midAngle: cma,
          labelR: (R2_IN + R2_OUT) / 2,
          path: arcPathD(CX, CY, R2_IN, R2_OUT, csa, cea),
        };
        ca += cSweep + cGap;
      }
    }

    angle += sweep + ARC_GAP;
  }

  return arcs;
}

/* ── Component ── */

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

  // Related nodes for treemap/sunburst (parent + siblings + children)
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

  // Tooltip position (percentage-based)
  const tooltipInfo = useMemo(() => {
    if (selectedIndex === null) return null;
    switch (viewMode) {
      case "tree": {
        const p = treePos[selectedIndex];
        return {
          left: `${(p.x / VB_W) * 100}%`,
          top: p.y < CY
            ? `calc(${(p.y / VB_H) * 100}% + 28px)`
            : `calc(${(p.y / VB_H) * 100}% - 28px)`,
          translate: p.y < CY ? "-50% 0" : "-50% -100%",
        };
      }
      case "treemap": {
        const r = tmRects[selectedIndex];
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        return {
          left: `${(cx / VB_W) * 100}%`,
          top: cy < CY
            ? `calc(${(cy / VB_H) * 100}% + 20px)`
            : `calc(${(cy / VB_H) * 100}% - 20px)`,
          translate: cy < CY ? "-50% 0" : "-50% -100%",
        };
      }
      case "sunburst": {
        const arc = sbArcs[selectedIndex];
        const r = arc.labelR || 60;
        const px = CX + Math.cos(arc.midAngle) * r;
        const py = CY + Math.sin(arc.midAngle) * r;
        return {
          left: `${(px / VB_W) * 100}%`,
          top: py < CY
            ? `calc(${(py / VB_H) * 100}% + 20px)`
            : `calc(${(py / VB_H) * 100}% - 20px)`,
          translate: py < CY ? "-50% 0" : "-50% -100%",
        };
      }
    }
  }, [viewMode, selectedIndex, treePos, tmRects, sbArcs]);

  const selectedNode = selectedIndex !== null ? nodes[selectedIndex] : null;

  return (
    <div className={styles.panel}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>02</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>Architecture.</h3>

      {/* ── Desktop: Interactive Map ── */}
      <div className={styles.archMap}>
        {/* Mode selector */}
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

        {/* ── Tree Mode ── */}
        {viewMode === "tree" && (
          <>
            <svg
              className={styles.archSvg}
              viewBox={`0 0 ${VB_W} ${VB_H}`}
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
                    left: `${(pos.x / VB_W) * 100}%`,
                    top: `${(pos.y / VB_H) * 100}%`,
                  }}
                  onClick={() => handleClick(node.index)}
                >
                  <span className={styles.archNodePath}>{node.item.path}</span>
                </div>
              );
            })}
          </>
        )}

        {/* ── Treemap Mode ── */}
        {viewMode === "treemap" && (
          <>
            {nodes.map((node) => {
              if (node.row === 0) return null; // root is the container
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
                    left: `${(r.x / VB_W) * 100}%`,
                    top: `${(r.y / VB_H) * 100}%`,
                    width: `${(r.w / VB_W) * 100}%`,
                    height: `${(r.h / VB_H) * 100}%`,
                  }}
                  onClick={() => handleClick(node.index)}
                >
                  <span className={styles.archTmLabel}>{node.item.path}</span>
                </div>
              );
            })}
          </>
        )}

        {/* ── Sunburst Mode ── */}
        {viewMode === "sunburst" && (
          <svg
            className={styles.archSunburst}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Root circle */}
            <path
              className={`${styles.archSbRoot} ${selectedIndex === 0 ? styles.archSbArcActive : ""}`}
              d={sbArcs[0].path}
              onClick={() => handleClick(0)}
            />
            <text className={`${styles.archSbLabel} ${styles.archSbLabelLg}`} x={CX} y={CY}>
              {nodes[0].item.path}
            </text>

            {/* Arcs for indent-1 and indent-2 */}
            {nodes.map((node) => {
              if (node.row === 0) return null;
              const arc = sbArcs[node.index];
              if (!arc.path) return null;
              const isActive = selectedIndex === node.index;
              const isDimmed = selectedIndex !== null && !relatedNodes.has(node.index);

              const lx = CX + Math.cos(arc.midAngle) * arc.labelR;
              const ly = CY + Math.sin(arc.midAngle) * arc.labelR;
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

        {/* ── Tooltip (only AnimatePresence uses Framer Motion) ── */}
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

      {/* ── Mobile: Text Grid ── */}
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
