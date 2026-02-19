"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Language } from "@/providers/LanguageProvider";
import type { StructureItem } from "@/data/about";
import {
  buildGraph,
  computeTree,
  computeTreemap,
  computeSunburst,
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
  CENTER_X,
  CENTER_Y,
} from "./_utils/architectureLayout";
import styles from "../AboutSection.module.css";

type ViewMode = "tree" | "treemap" | "sunburst";

interface ArchitecturePanelProps {
  language: Language;
  structure: StructureItem[];
}

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "tree", label: "Tree" },
  { key: "treemap", label: "Treemap" },
  { key: "sunburst", label: "Sunburst" },
];

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

        {viewMode === "treemap" && (
          <>
            {nodes.map((node) => {
              if (node.row === 0) return null;
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

        {viewMode === "sunburst" && (
          <svg
            className={styles.archSunburst}
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              className={`${styles.archSbRoot} ${selectedIndex === 0 ? styles.archSbArcActive : ""}`}
              d={sbArcs[0].path}
              onClick={() => handleClick(0)}
            />
            <text className={`${styles.archSbLabel} ${styles.archSbLabelLg}`} x={CENTER_X} y={CENTER_Y}>
              {nodes[0].item.path}
            </text>

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
