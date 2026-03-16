"use client";

import { useMemo, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { FlowNode, FlowEdge } from "@/data/about";
import styles from "./FlowDiagram.module.css";

/* ── Layout Constants (same as UserFlowPanel) ── */
const STEP_GAP = 138;
const PAD_X = 68;
const LANE_TOP = 26;
const LANE_MAIN = [80, 142];
const LANE_BRANCH = 245;
const LANE_MULTI = [40, 112, 184, 256];
const SVG_H = 305;
const SVG_H_MULTI = 330;

const ACTION_W = 132;
const ACTION_H = 38;
const TERMINAL_W = 112;
const TERMINAL_H = 34;
const DIAMOND_W = 96;
const DIAMOND_H = 62;

function nX(step: number) { return PAD_X + step * STEP_GAP; }
function nY(lane: number, step: number, override?: number) {
  if (override != null) return override;
  if (lane === 2) return LANE_TOP;
  if (lane === 1) return LANE_BRANCH;
  if (lane >= 3) return LANE_MULTI[lane - 3] ?? LANE_BRANCH;
  return LANE_MAIN[step % 2];
}
function hW(type: FlowNode["type"]) {
  switch (type) {
    case "start": case "end": return TERMINAL_W / 2;
    case "action": return ACTION_W / 2;
    case "decision": return DIAMOND_W / 2;
  }
}
function hH(type: FlowNode["type"]) {
  switch (type) {
    case "start": case "end": return TERMINAL_H / 2;
    case "action": return ACTION_H / 2;
    case "decision": return DIAMOND_H / 2;
  }
}

function buildPath(from: FlowNode, to: FlowNode, mergeX?: number, entryDir?: "top" | "left"): string {
  const fx = nX(from.row), fy = nY(from.col, from.row, from.y);
  const tx = nX(to.row),   ty = nY(to.col, to.row, to.y);
  const r = 8;

  if (to.row < from.row || (to.row === from.row && to.col < from.col)) {
    if (from.col >= 3) {
      if (fy === ty) return `M${fx - hW(from.type)},${fy} L${tx + hW(to.type)},${ty}`;
      if (ty > fy) {
        const exitY = fy + hH(from.type);
        return [`M${fx},${exitY}`, `L${fx},${ty - r}`, `Q${fx},${ty} ${fx - r},${ty}`, `L${tx + hW(to.type)},${ty}`].join(" ");
      }
      const loopGap = 28;
      const bottomLane = from.row !== to.row ? LANE_MULTI[LANE_MULTI.length - 1] + 31 : 0;
      const runnerY = Math.max(bottomLane, fy + hH(from.type), ty + hH(to.type)) + loopGap;
      const exitY = fy + hH(from.type);
      if (from.row !== to.row) {
        const entryY = ty + hH(to.type);
        return [`M${fx},${exitY}`, `L${fx},${runnerY - r}`, `Q${fx},${runnerY} ${fx - r},${runnerY}`, `L${tx + r},${runnerY}`, `Q${tx},${runnerY} ${tx},${runnerY - r}`, `L${tx},${entryY}`].join(" ");
      }
      const entryY = ty, entryX = tx - hW(to.type);
      const loopX = Math.max(8, Math.min(fx, tx) - Math.max(hW(from.type), hW(to.type)) - loopGap);
      return [`M${fx},${exitY}`, `L${fx},${runnerY - r}`, `Q${fx},${runnerY} ${fx - r},${runnerY}`, `L${loopX + r},${runnerY}`, `Q${loopX},${runnerY} ${loopX},${runnerY - r}`, `L${loopX},${entryY + r}`, `Q${loopX},${entryY} ${loopX + r},${entryY}`, `L${entryX},${entryY}`].join(" ");
    }
    const loopX = PAD_X / 2;
    return [`M${fx - hW(from.type)},${fy}`, `L${loopX + r},${fy}`, `Q${loopX},${fy} ${loopX},${fy - r}`, `L${loopX},${ty + r}`, `Q${loopX},${ty} ${loopX + r},${ty}`, `L${tx - hW(to.type)},${ty}`].join(" ");
  }

  if (from.type === "decision" && from.row === to.row && from.col !== to.col) {
    if (ty < fy) return `M${fx},${fy - DIAMOND_H / 2} L${fx},${ty + hH(to.type)}`;
    return `M${fx},${fy + DIAMOND_H / 2} L${fx},${ty - hH(to.type)}`;
  }

  if (from.type === "decision" && from.col !== to.col && ty > fy && to.row <= from.row) {
    const exitY = fy + DIAMOND_H / 2, entryY = ty - hH(to.type), midY = (exitY + entryY) / 2;
    return [`M${fx},${exitY}`, `L${fx},${midY - r}`, `Q${fx},${midY} ${fx + r},${midY}`, `L${tx - r},${midY}`, `Q${tx},${midY} ${tx},${midY + r}`, `L${tx},${entryY}`].join(" ");
  }

  if (entryDir === "top" && from.type === "decision" && ty < fy) {
    const exitY = fy - DIAMOND_H / 2, entryY = ty - hH(to.type), runY = entryY - 12;
    return [`M${fx},${exitY}`, `L${fx},${runY + r}`, `Q${fx},${runY} ${fx + r},${runY}`, `L${tx - r},${runY}`, `Q${tx},${runY} ${tx},${runY + r}`, `L${tx},${entryY}`].join(" ");
  }

  if (from.row === to.row && from.col !== to.col) {
    return `M${fx},${fy + hH(from.type)} L${fx},${ty - hH(to.type)}`;
  }

  const exitX = fx + hW(from.type), entryX = tx - hW(to.type);
  const midX = mergeX ?? (exitX + entryX) / 2;
  if (fy === ty) return `M${exitX},${fy} L${entryX},${ty}`;
  const dy = ty > fy ? 1 : -1;
  return [`M${exitX},${fy}`, `L${midX - r},${fy}`, `Q${midX},${fy} ${midX},${fy + r * dy}`, `L${midX},${ty - r * dy}`, `Q${midX},${ty} ${midX + r},${ty}`, `L${entryX},${ty}`].join(" ");
}

function labelPos(from: FlowNode, to: FlowNode): { x: number; y: number; anchor: string } {
  const fx = nX(from.row), fy = nY(from.col, from.row, from.y);
  const ty = nY(to.col, to.row, to.y);
  if (to.row < from.row || (to.row === from.row && to.col < from.col)) {
    if (from.col >= 3) {
      const runnerY = Math.max(fy + hH(from.type), ty + hH(to.type)) + 28;
      return { x: (fx + nX(to.row)) / 2, y: runnerY - 6, anchor: "middle" };
    }
    return { x: PAD_X / 2 - 6, y: (fy + ty) / 2, anchor: "end" };
  }
  if (from.type === "decision" && from.col !== to.col) {
    if (from.row === to.row) {
      if (ty < fy) return { x: fx + 10, y: fy - DIAMOND_H / 2 - 6, anchor: "start" };
      if (to.col - from.col >= 3) return { x: fx + 10, y: ty - hH(to.type) - 10, anchor: "start" };
      return { x: fx + 10, y: fy + DIAMOND_H / 2 + 14, anchor: "start" };
    }
    if (ty > fy && to.row <= from.row) return { x: fx + 10, y: fy + DIAMOND_H / 2 + 14, anchor: "start" };
  }
  if (from.type === "decision" && ty < fy) return { x: fx + 10, y: fy - DIAMOND_H / 2 - 6, anchor: "start" };
  return { x: fx + hW(from.type) + 6, y: fy - 6, anchor: "start" };
}

interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  language: Language;
}

function FlowDiagram({ nodes, edges, language }: FlowDiagramProps) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, FlowNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const seqOrder = useMemo(() => {
    const adj = new Map<string, { to: string; key: string }[]>();
    edges.forEach((e) => {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push({ to: e.to, key: `${e.from}-${e.to}` });
    });
    const nodeSeq = new Map<string, number>();
    const edgeSeq = new Map<string, number>();
    const queue = ["start"];
    let seq = 0;
    nodeSeq.set("start", seq++);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const { to, key } of (adj.get(cur) ?? [])) {
        edgeSeq.set(key, seq++);
        if (!nodeSeq.has(to)) { nodeSeq.set(to, seq++); queue.push(to); }
      }
    }
    return { nodeSeq, edgeSeq };
  }, [edges]);

  const maxStep = Math.max(...nodes.map((n) => n.row));
  const maxCol = Math.max(...nodes.map((n) => n.col));
  const svgW = PAD_X + maxStep * STEP_GAP + PAD_X;
  const svgH = maxCol >= 3 ? SVG_H_MULTI : SVG_H;

  return (
    <div className={styles.diagram}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className={styles.svg}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="fd-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="var(--text-primary)" stroke="none" />
          </marker>
        </defs>

        {/* Edges */}
        {(() => {
          const mergeXMap = new Map<string, number>();
          const byTarget = new Map<string, typeof edges>();
          for (const e of edges) {
            if (e.label) continue;
            const arr = byTarget.get(e.to) ?? [];
            arr.push(e);
            byTarget.set(e.to, arr);
          }
          for (const [target, group] of byTarget) {
            if (group.length < 3) continue;
            let maxExitX = 0;
            for (const e of group) {
              const f = nodeMap.get(e.from);
              if (f) maxExitX = Math.max(maxExitX, nX(f.row) + hW(f.type));
            }
            const tNode = nodeMap.get(target);
            const entryX = tNode ? nX(tNode.row) - hW(tNode.type) : maxExitX;
            mergeXMap.set(target, (maxExitX + entryX) / 2);
          }
          return edges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const fy = nY(from.col, from.row, from.y);
            const ty = nY(to.col, to.row, to.y);
            const entryDir = (edge.label === "No" && from.type === "decision" && ty < fy && to.row > from.row) ? "top" as const : undefined;
            const d = buildPath(from, to, entryDir ? undefined : mergeXMap.get(edge.to), entryDir);
            const eKey = `${edge.from}-${edge.to}`;
            const delay = (seqOrder.edgeSeq.get(eKey) ?? 0) * 0.1;
            const isCascade = from.type === "decision" && to.type === "decision" && from.row === to.row;
            return (
              <g key={`e-${eKey}`}>
                <path d={d} fill="none" markerEnd={isCascade || edge.noArrow ? undefined : "url(#fd-arrow)"} className={styles.edge} style={{ animationDelay: `${delay}s` }} />
                {edge.label && (() => {
                  const pos = labelPos(from, to);
                  return <text x={pos.x} y={pos.y} textAnchor={pos.anchor} className={styles.edgeLabel} style={{ animationDelay: `${delay}s` }}>{edge.label}</text>;
                })()}
              </g>
            );
          });
        })()}

        {/* Nodes */}
        {nodes.map((node) => {
          const cx = nX(node.row);
          const cy = nY(node.col, node.row, node.y);
          const delay = (seqOrder.nodeSeq.get(node.id) ?? 0) * 0.1;
          const lines = node.label[language].split("\n");
          const lineH = 13;
          const startY = cy - ((lines.length - 1) * lineH) / 2;

          return (
            <g key={node.id} className={styles.nodeGroup} style={{ animationDelay: `${delay}s` }}>
              {(node.type === "start" || node.type === "end") && (
                <>
                  <rect x={cx - TERMINAL_W / 2} y={cy - TERMINAL_H / 2} width={TERMINAL_W} height={TERMINAL_H} rx={TERMINAL_H / 2} className={styles.terminal} />
                  <text x={cx} textAnchor="middle" dominantBaseline="central" className={styles.terminalText}>
                    {lines.length === 1
                      ? <tspan x={cx} y={cy}>{lines[0]}</tspan>
                      : lines.map((l, i) => <tspan key={i} x={cx} y={startY + i * lineH}>{l}</tspan>)}
                  </text>
                </>
              )}
              {node.type === "action" && (
                <>
                  <rect x={cx - ACTION_W / 2} y={cy - ACTION_H / 2} width={ACTION_W} height={ACTION_H} rx={8} className={styles.action} />
                  <text x={cx} textAnchor="middle" dominantBaseline="central" className={styles.actionText}>
                    {lines.length === 1
                      ? <tspan x={cx} y={cy}>{lines[0]}</tspan>
                      : lines.map((l, i) => <tspan key={i} x={cx} y={startY + i * lineH}>{l}</tspan>)}
                  </text>
                </>
              )}
              {node.type === "decision" && (
                <>
                  <polygon points={`${cx},${cy - DIAMOND_H / 2} ${cx + DIAMOND_W / 2},${cy} ${cx},${cy + DIAMOND_H / 2} ${cx - DIAMOND_W / 2},${cy}`} className={styles.diamond} />
                  <text x={cx} textAnchor="middle" dominantBaseline="central" className={styles.diamondText}>
                    {lines.map((l, i) => <tspan key={i} x={cx} y={startY + i * lineH}>{l}</tspan>)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default memo(FlowDiagram);
