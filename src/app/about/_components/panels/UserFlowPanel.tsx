"use client";

import { useState, useCallback } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { UserFlow } from "@/data/about";
import styles from "../AboutSection.module.css";

interface UserFlowPanelProps {
  language: Language;
  userFlows: UserFlow[];
}

const FLOW_COLORS = [
  "var(--color-accent)",
  "var(--color-success)",
  "var(--text-accent)",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
];

/* ── SVG 좌표 상수 ── */
const NODE_W = 200;
const NODE_H = 56;
const GAP_X = 80;
const GAP_Y = 44;
const PAD = 28;

interface NodePos {
  x: number;
  y: number;
  row: number;
  col: number;
}

/**
 * 2-column vertical flowchart layout
 * Left column: first ceil(n/2) steps (top→bottom)
 * Right column: remaining steps, starting at same row as last left item
 * Connector: last-left → first-right (horizontal), rest vertical
 */
function layoutNodes(count: number): NodePos[] {
  const leftN = Math.ceil(count / 2);
  const out: NodePos[] = [];

  for (let i = 0; i < count; i++) {
    const isLeft = i < leftN;
    const col = isLeft ? 0 : 1;
    const row = isLeft ? i : leftN - 1 + (i - leftN);

    out.push({
      x: PAD + col * (NODE_W + GAP_X),
      y: PAD + row * (NODE_H + GAP_Y),
      row,
      col,
    });
  }
  return out;
}

function connectorPath(a: NodePos, b: NodePos): string {
  if (a.col === b.col) {
    // Vertical: bottom-center → top-center
    const x = a.x + NODE_W / 2;
    return `M${x},${a.y + NODE_H} L${x},${b.y}`;
  }
  // Horizontal: right-center → left-center
  const y = a.y + NODE_H / 2;
  return `M${a.x + NODE_W},${y} L${b.x},${y}`;
}

export default function UserFlowPanel({
  language,
  userFlows,
}: UserFlowPanelProps) {
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const flow = userFlows[activeFlowIndex];
  const nodes = layoutNodes(flow.steps.length);
  const color = FLOW_COLORS[activeFlowIndex % FLOW_COLORS.length];

  const maxRow = Math.max(...nodes.map((n) => n.row));
  const svgW = PAD * 2 + 2 * NODE_W + GAP_X;
  const svgH = PAD * 2 + (maxRow + 1) * NODE_H + maxRow * GAP_Y;

  const handleTab = useCallback((i: number) => {
    setActiveFlowIndex(i);
    setHoveredStep(null);
  }, []);

  const mid = `uf-arrow-${activeFlowIndex}`;
  const pid = `uf-dots-${activeFlowIndex}`;

  return (
    <div
      className={`${styles.panel} ${styles.panelWide}`}
      style={{ "--_uf-color": color } as React.CSSProperties}
    >
      <span className={`${styles.panelNumber} ${styles.animate}`}>02</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>User Flow.</h3>

      {/* ── Tabs ── */}
      <div className={`${styles.ufTabs} ${styles.animate}`}>
        {userFlows.map((f, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.ufTab} ${i === activeFlowIndex ? styles.ufTabActive : ""}`}
            style={
              {
                "--_tab-color": FLOW_COLORS[i % FLOW_COLORS.length],
              } as React.CSSProperties
            }
            onClick={() => handleTab(i)}
          >
            <span className={styles.ufTabDot} />
            {f.title}
          </button>
        ))}
      </div>

      <p className={`${styles.ufFlowDesc} ${styles.animate}`}>
        {flow.description[language]}
      </p>

      {/* ── SVG Flowchart (desktop) ── */}
      <div className={styles.ufDiagramWrap}>
        <svg
          className={styles.ufSvg}
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern
              id={pid}
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="10" cy="10" r="0.6" className={styles.ufGridDot} />
            </pattern>
            <marker
              id={mid}
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
            >
              <path
                d="M1,1 L9,4 L1,7"
                fill="none"
                stroke="var(--_uf-color)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </marker>
          </defs>

          {/* Dot grid */}
          <rect width={svgW} height={svgH} fill={`url(#${pid})`} rx="12" />

          {/* Connectors */}
          {nodes.map((n, i) => {
            if (i >= nodes.length - 1) return null;
            const d = connectorPath(n, nodes[i + 1]);
            const lit =
              hoveredStep === i ||
              hoveredStep === i + 1;
            return (
              <path
                key={`c${i}`}
                d={d}
                className={`${styles.ufEdge} ${lit ? styles.ufEdgeLit : ""}`}
                markerEnd={`url(#${mid})`}
              />
            );
          })}

          {/* Nodes */}
          {flow.steps.map((step, i) => {
            const p = nodes[i];
            const isFirst = i === 0;
            const isLast = i === flow.steps.length - 1;
            const isTerminal = isFirst || isLast;
            const hov = hoveredStep === i;

            return (
              <g
                key={`n${activeFlowIndex}-${i}`}
                className={`${styles.ufGNode} ${hov ? styles.ufGNodeHov : ""}`}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <rect
                  x={p.x}
                  y={p.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={isTerminal ? NODE_H / 2 : 10}
                  className={
                    isTerminal ? styles.ufNRectTerminal : styles.ufNRect
                  }
                />
                <text
                  x={p.x + NODE_W / 2}
                  y={p.y + 18}
                  textAnchor="middle"
                  className={
                    isTerminal ? styles.ufNNumTerminal : styles.ufNNum
                  }
                >
                  {isFirst ? "START" : isLast ? "END" : String(i).padStart(2, "0")}
                </text>
                <text
                  x={p.x + NODE_W / 2}
                  y={p.y + 40}
                  textAnchor="middle"
                  className={
                    isTerminal ? styles.ufNLabelTerminal : styles.ufNLabel
                  }
                >
                  {step.label[language]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Mobile list ── */}
      <div className={styles.ufMobileList}>
        {flow.steps.map((step, i) => (
          <div key={i} className={styles.ufMobileStep}>
            <span className={styles.ufMobileNum}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <strong className={styles.ufMobileLabel}>
                {step.label[language]}
              </strong>
              {step.description && (
                <p className={styles.ufMobileDesc}>
                  {step.description[language]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
