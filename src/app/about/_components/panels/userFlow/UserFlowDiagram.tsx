"use client";

import { memo, useMemo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { FlowNode } from "@/data/about";
import { userFlows } from "@/data/about/architecture";
import {
  ACTION_W,
  ACTION_H,
  TERMINAL_W,
  TERMINAL_H,
  DIAMOND_W,
  DIAMOND_H,
  nodeX,
  nodeY,
  svgDimensions,
} from "../../_utils/flowLayout";
import { FLOW_ICONS } from "../flowIcons";
import UserFlowEdges from "./UserFlowEdges";
import shared from "../../AboutPanel.module.css";
import local from "../UserFlowPanel.module.css";
const styles = { ...shared, ...local };

type Flow = (typeof userFlows)[number];

/* 사용자 플로우 다이어그램 (데스크탑) — 노드 좌표는 flowLayout 이 계산하고 여기서는 그리기만 한다.
   등장 순서는 start 에서 BFS 로 매겨 엣지와 노드가 흐름대로 하나씩 나타나게 한다. */
function UserFlowDiagram({ flow, language, seqKey }: { flow: Flow; language: Language; seqKey: number }) {

  /* ── Node map for edge lookups ── */
  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>();
    flow.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [flow]);

  /* ── BFS ordering: start → end sequential animation ── */
  const seqOrder = useMemo(() => {
    const adj = new Map<string, { to: string; edgeKey: string }[]>();
    flow.edges.forEach((ed) => {
      if (!adj.has(ed.from)) adj.set(ed.from, []);
      adj.get(ed.from)!.push({ to: ed.to, edgeKey: `${ed.from}-${ed.to}` });
    });

    const nodeSeq = new Map<string, number>();
    const edgeSeq = new Map<string, number>();
    const queue = ["start"];
    let seq = 0;
    nodeSeq.set("start", seq++);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const neighbors = adj.get(cur) || [];
      for (const { to, edgeKey } of neighbors) {
        edgeSeq.set(edgeKey, seq++);
        if (!nodeSeq.has(to)) {
          nodeSeq.set(to, seq++);
          queue.push(to);
        }
      }
    }
    return { nodeSeq, edgeSeq };
  }, [flow]);

  /* ── SVG dimensions (horizontal) ── */
  const { svgW, svgH } = svgDimensions(flow.nodes);

  return (
        <div className={styles.ufFlowLayout}>
          {/* Flow Info — top row */}
          <div className={styles.ufFlowInfo} key={`info-${seqKey}`}>
            <div className={styles.ufFlowProfile}>
              <span className={styles.ufFlowAvatar}>
                {FLOW_ICONS[flow.title]}
              </span>
              <div className={styles.ufFlowProfileText}>
                <span className={styles.ufFlowTitle}>{flow.title}</span>
                <span className={styles.ufFlowPersona}>
                  {flow.persona[language]}
                </span>
              </div>
            </div>
            <p className={styles.ufFlowDesc}>
              {flow.description[language]}
            </p>
          </div>

          {/* SVG Flowchart */}
          <div className={styles.ufFlowDiagram} key={seqKey}>
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className={styles.ufFlowSvg}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <marker
                  id="uf-arrow"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path
                    d="M0,0 L7,3 L0,6 Z"
                    fill="var(--text-primary)"
                    stroke="none"
                  />
                </marker>
              </defs>

              {/* ── Edges ── */}
              <UserFlowEdges flow={flow} nodeMap={nodeMap} seqOrder={seqOrder} />
              {/* ── Nodes ── */}
              {flow.nodes.map((node) => {
                const cx = nodeX(node.row);
                const cy = nodeY(node.col, node.row, node.y);
                const seq = seqOrder.nodeSeq.get(node.id) ?? 0;
                const delay = seq * 0.12;

                return (
                  <g
                    key={node.id}
                    className={styles.ufNodeGroup}
                    style={{ animationDelay: `${delay}s` }}
                  >
                    {/* ── Start / End ── */}
                    {(node.type === "start" || node.type === "end") && (() => {
                      const lines = node.label[language].split("\n");
                      const lineH = 13;
                      const startY = cy - ((lines.length - 1) * lineH) / 2;
                      return (
                        <>
                          <rect
                            x={cx - TERMINAL_W / 2}
                            y={cy - TERMINAL_H / 2}
                            width={TERMINAL_W}
                            height={TERMINAL_H}
                            rx={TERMINAL_H / 2}
                            className={styles.ufTerminalRect}
                          />
                          <text
                            x={cx}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className={styles.ufTerminalText}
                          >
                            {lines.length === 1 ? (
                              <tspan x={cx} y={cy}>{lines[0]}</tspan>
                            ) : (
                              lines.map((line, li) => (
                                <tspan key={li} x={cx} y={startY + li * lineH}>
                                  {line}
                                </tspan>
                              ))
                            )}
                          </text>
                        </>
                      );
                    })()}

                    {/* ── Action ── */}
                    {node.type === "action" &&
                      (() => {
                        const lines = node.label[language].split("\n");
                        const lineH = 13;
                        const startY =
                          cy - ((lines.length - 1) * lineH) / 2;
                        const renderLine = (line: string) => {
                          if (!line.includes("♥")) return line;
                          return line.split(/(♥)/).map((part, i) =>
                            part === "♥" ? (
                              <tspan key={i} fill="var(--color-accent)">
                                ♥
                              </tspan>
                            ) : (
                              part
                            ),
                          );
                        };
                        return (
                          <>
                            <rect
                              x={cx - ACTION_W / 2}
                              y={cy - ACTION_H / 2}
                              width={ACTION_W}
                              height={ACTION_H}
                              rx={8}
                              className={styles.ufActionRect}
                            />
                            <text
                              x={cx}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className={styles.ufActionText}
                            >
                              {lines.length === 1 ? (
                                <tspan x={cx} y={cy}>
                                  {renderLine(lines[0])}
                                </tspan>
                              ) : (
                                lines.map((line, li) => (
                                  <tspan
                                    key={li}
                                    x={cx}
                                    y={startY + li * lineH}
                                  >
                                    {renderLine(line)}
                                  </tspan>
                                ))
                              )}
                            </text>
                          </>
                        );
                      })()}

                    {/* ── Decision (diamond) ── */}
                    {node.type === "decision" && (() => {
                      const lines = node.label[language].split("\n");
                      const lineH = 13;
                      const startY = cy - ((lines.length - 1) * lineH) / 2;
                      return (
                        <>
                          <polygon
                            points={`${cx},${cy - DIAMOND_H / 2} ${cx + DIAMOND_W / 2},${cy} ${cx},${cy + DIAMOND_H / 2} ${cx - DIAMOND_W / 2},${cy}`}
                            className={styles.ufDiamondShape}
                          />
                          <text
                            x={cx}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className={styles.ufDiamondText}
                          >
                            {lines.map((line, li) => (
                              <tspan key={li} x={cx} y={startY + li * lineH}>
                                {line}
                              </tspan>
                            ))}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                );
              })}
            </svg>
          </div>

        </div>
  );
}

export default memo(UserFlowDiagram);
