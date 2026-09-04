"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Pressable from "@/components/ui/Pressable";
import type { Language } from "@/providers/LanguageProvider";
import type { StructureItem } from "@/data/about/types";
import {
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
  CENTER_Y,
} from "../_utils/architectureLayout";
import { useForceGraph } from "../_utils/useForceGraph";
import { useArchitectureGraph } from "./useArchitectureGraph";
import ArchitectureTreeView from "./ArchitectureTreeView";
import ArchDiagram from "../ArchDiagram";
import frame from "../../AboutPanel.module.css";
import shell from "../../AboutSection.module.css";
import local from "../ArchitecturePanel.module.css";
const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };

type ViewMode = "diagram" | "tree" | "treemap" | "force";

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "diagram", label: "Diagram" },
  { key: "tree", label: "Tree" },
  { key: "treemap", label: "Treemap" },
  { key: "force", label: "Force" },
];

/* 프로젝트 구조 인터랙티브 맵 (데스크탑) — 같은 그래프를 네 가지로 본다.
   다이어그램 · 트리 · 트리맵은 좌표를 미리 계산하고, force 는 시뮬레이션이 매 프레임 옮긴다.
   보기 모드와 선택/hover 는 맵 안에서만 쓰므로 여기서 들고 있다. */
function ArchitectureMap({ structure, language }: { structure: StructureItem[]; language: Language }) {
  const [viewMode, setViewMode] = useState<ViewMode>("diagram");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const graph = useArchitectureGraph({ structure, viewMode, selectedIndex, hoveredIndex });
  const {
    nodes, edges, treePos, tmRects, relatedNodes,
    forceHighlightIndex, forcePath, forcePathEdges,
  } = graph;

  const {
    positions: forcePos,
    onDragStart,
    onDrag,
    onDragEnd,
  } = useForceGraph(nodes, edges, viewMode === "force");

  /* ── Force 전용: 호버/선택 시 전체 경로 하이라이팅 ── */

  const handleClick = useCallback((index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleModeChange = useCallback((mode: ViewMode) => {
    setSelectedIndex(null);
    setHoveredIndex(null);
    setViewMode(mode);
  }, []);

  /* ── Force 드래그 ── */
  const toViewbox = useCallback((clientX: number, clientY: number) => {
    const el = mapRef.current;
    if (!el) return { vx: 0, vy: 0 };
    const rect = el.getBoundingClientRect();
    return {
      vx: ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH,
      vy: ((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT,
    };
  }, []);

  const handleForcePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault();
      isDraggingRef.current = false;

      const { vx, vy } = toViewbox(e.clientX, e.clientY);
      onDragStart(index, vx, vy);

      const onMove = (pe: PointerEvent) => {
        isDraggingRef.current = true;
        const pos = toViewbox(pe.clientX, pe.clientY);
        onDrag(pos.vx, pos.vy);
      };

      const onUp = () => {
        onDragEnd();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        // 드래그 없이 클릭만 → 선택 토글
        if (!isDraggingRef.current) {
          handleClick(index);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [toViewbox, onDragStart, onDrag, onDragEnd, handleClick],
  );

  const handleMouseEnter = useCallback((index: number) => {
    if (isDraggingRef.current) return;
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const tooltipInfo = useMemo(() => {
    if (hoveredIndex === null) return null;
    switch (viewMode) {
      case "tree": {
        const position = treePos[hoveredIndex];
        return {
          left: `${(position.x / VIEWBOX_WIDTH) * 100}%`,
          top: position.y < CENTER_Y
            ? `calc(${(position.y / VIEWBOX_HEIGHT) * 100}% + 28px)`
            : `calc(${(position.y / VIEWBOX_HEIGHT) * 100}% - 28px)`,
          translate: position.y < CENTER_Y ? "-50% 0" : "-50% -100%",
        };
      }
      case "treemap": {
        const r = tmRects[hoveredIndex];
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
      case "force": {
        const pos = forcePos[hoveredIndex];
        if (!pos) return null;
        return {
          left: `${(pos.x / VIEWBOX_WIDTH) * 100}%`,
          top: pos.y < CENTER_Y
            ? `calc(${(pos.y / VIEWBOX_HEIGHT) * 100}% + 28px)`
            : `calc(${(pos.y / VIEWBOX_HEIGHT) * 100}% - 28px)`,
          translate: pos.y < CENTER_Y ? "-50% 0" : "-50% -100%",
        };
      }
    }
  }, [viewMode, hoveredIndex, treePos, tmRects, forcePos]);

  const hoveredNode = hoveredIndex !== null ? nodes[hoveredIndex] : null;

  return (
      <div ref={mapRef} className={styles.archMap}>
        <div className={styles.archModeBar}>
          {VIEW_MODES.map((m) => (
            <Pressable
              key={m.key}
              className={`${styles.archModeBtn} ${viewMode === m.key ? styles.archModeBtnActive : ""}`}
              onClick={() => handleModeChange(m.key)}
            >
              {m.label}
            </Pressable>
          ))}
        </div>

        {viewMode === "diagram" && <ArchDiagram />}

        {viewMode === "tree" && (
          <ArchitectureTreeView
            graph={graph}
            selectedIndex={selectedIndex}
            onSelect={handleClick}
            onHover={setHoveredIndex}
          />
        )}

        {viewMode === "treemap" && (
          <div className={styles.archTmWrap}>
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
                  onMouseEnter={() => handleMouseEnter(node.index)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className={styles.archTmLabel}>{node.item.path}</span>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "force" && (
          <>
            <svg
              className={styles.archSvg}
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              preserveAspectRatio="none"
            >
              {edges.map((edge, i) => {
                const from = forcePos[edge.from];
                const to = forcePos[edge.to];
                if (!from || !to) return null;
                const isOnPath = forcePathEdges.has(i);
                const isDimmed = forceHighlightIndex !== null && !isOnPath;
                return (
                  <line
                    key={i}
                    className={`${styles.archEdge} ${styles.archEdgeForce} ${isOnPath ? styles.archEdgePathActive : ""} ${isDimmed ? styles.archEdgeDimmed : ""}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                  />
                );
              })}
            </svg>
            {nodes.map((node) => {
              const pos = forcePos[node.index];
              if (!pos) return null;
              const isRoot = node.row === 0;
              const isActive = selectedIndex === node.index;
              const isOnPath = forcePath.has(node.index);
              const isDimmed = forceHighlightIndex !== null && !isOnPath;
              return (
                <div
                  key={node.index}
                  className={`${styles.archNodeBox} ${styles.archNodeDraggable} ${isRoot ? styles.archNodeRoot : ""} ${isActive ? styles.archNodeActive : ""} ${isOnPath && !isActive ? styles.archNodeOnPath : ""} ${isDimmed ? styles.archNodeDimmed : ""}`}
                  style={{
                    left: `${(pos.x / VIEWBOX_WIDTH) * 100}%`,
                    top: `${(pos.y / VIEWBOX_HEIGHT) * 100}%`,
                  }}
                  onPointerDown={(e) => handleForcePointerDown(e, node.index)}
                  onMouseEnter={() => handleMouseEnter(node.index)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className={styles.archNodePath}>{node.item.path}</span>
                </div>
              );
            })}
          </>
        )}

        <AnimatePresence>
          {hoveredNode && tooltipInfo && (
            <motion.div
              key={`tooltip-${hoveredIndex}`}
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
              {hoveredNode.item.description[language]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}

export default memo(ArchitectureMap);
