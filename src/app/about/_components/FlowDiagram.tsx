"use client";

import { useMemo, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { FlowNode, FlowEdge } from "@/data/about";
import {
  ACTION_W,
  ACTION_H,
  TERMINAL_W,
  TERMINAL_H,
  DIAMOND_W,
  DIAMOND_H,
  getNodeX,
  getNodeY,
  halfW,
  svgDimensions,
  buildEdgePath,
  edgeLabelPos,
  type NodePositions,
} from "./_utils/flowLayout";
import styles from "./FlowDiagram.module.css";

interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  language: Language;
  /** node id → 절대 좌표. 풀스크린 viewer 에서 노드 드래그로 위치를 override 할 때 사용. */
  nodePositions?: NodePositions;
}

function FlowDiagram({ nodes, edges, language, nodePositions }: FlowDiagramProps) {
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

  const { svgW, svgH } = svgDimensions(nodes);

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
              if (f) maxExitX = Math.max(maxExitX, getNodeX(f, nodePositions) + halfW(f.type));
            }
            const tNode = nodeMap.get(target);
            const entryX = tNode ? getNodeX(tNode, nodePositions) - halfW(tNode.type) : maxExitX;
            mergeXMap.set(target, (maxExitX + entryX) / 2);
          }
          return edges.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const fy = getNodeY(from, nodePositions);
            const ty = getNodeY(to, nodePositions);
            const entryDir = (edge.label === "No" && from.type === "decision" && ty < fy && to.row > from.row) ? "top" as const : undefined;
            const d = buildEdgePath(from, to, entryDir ? undefined : mergeXMap.get(edge.to), entryDir, nodePositions);
            const eKey = `${edge.from}-${edge.to}`;
            const delay = (seqOrder.edgeSeq.get(eKey) ?? 0) * 0.1;
            const isCascade = from.type === "decision" && to.type === "decision" && from.row === to.row;
            return (
              <g key={`e-${eKey}`}>
                <path d={d} fill="none" markerEnd={isCascade || edge.noArrow ? undefined : "url(#fd-arrow)"} className={styles.edge} style={{ animationDelay: `${delay}s` }} />
                {edge.label && (() => {
                  const pos = edgeLabelPos(from, to, nodePositions);
                  return <text x={pos.x} y={pos.y} textAnchor={pos.anchor} className={styles.edgeLabel} style={{ animationDelay: `${delay}s` }}>{edge.label}</text>;
                })()}
              </g>
            );
          });
        })()}

        {/* Nodes */}
        {nodes.map((node) => {
          const cx = getNodeX(node, nodePositions);
          const cy = getNodeY(node, nodePositions);
          const delay = (seqOrder.nodeSeq.get(node.id) ?? 0) * 0.1;
          const lines = node.label[language].split("\n");
          const lineH = 13;
          const startY = cy - ((lines.length - 1) * lineH) / 2;

          return (
            <g key={node.id} data-node-id={node.id} className={styles.nodeGroup} style={{ animationDelay: `${delay}s` }}>
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
