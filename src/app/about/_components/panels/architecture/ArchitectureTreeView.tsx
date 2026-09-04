"use client";

import { memo } from "react";
import { VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "../_utils/architectureLayout";
import type { useArchitectureGraph } from "./useArchitectureGraph";
import frame from "../../AboutPanel.module.css";
import local from "../ArchitecturePanel.module.css";
const styles = { ...frame, ...local };

type Graph = ReturnType<typeof useArchitectureGraph>;

/* 구조 맵의 트리 보기 — 계층을 위에서 아래로 편다.
   좌표는 computeTree 가 미리 잡아 두고 여기서는 그리기만 한다. */
function ArchitectureTreeView({
  graph,
  selectedIndex,
  onSelect,
  onHover,
}: {
  graph: Graph;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}) {
  const { nodes, edges, treePos, activeEdges, connectedNodes } = graph;
  return (
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
                  onClick={() => onSelect(node.index)}
                  onMouseEnter={() => onHover(node.index)}
                  onMouseLeave={() => onHover(null)}
                >
                  <span className={styles.archNodePath}>{node.item.path}</span>
                </div>
              );
            })}
          </>
  );
}

export default memo(ArchitectureTreeView);
