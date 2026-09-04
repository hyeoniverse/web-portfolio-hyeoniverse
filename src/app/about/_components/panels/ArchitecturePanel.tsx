"use client";

import { useState, useMemo, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Language } from "@/providers/LanguageProvider";
import { projectStructure } from "@/data/about/architecture";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePanelTitle } from "../../_hooks/usePanelTitle";
import type { StructureItem } from "@/data/about/types";
import {
  buildGraph,
  computeTree,
  computeTreemap,
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
  CENTER_Y,
} from "./_utils/architectureLayout";
import { useForceGraph } from "./_utils/useForceGraph";
import ArchDiagram from "./ArchDiagram";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./ArchitecturePanel.module.css";
import Pressable from "@/components/ui/Pressable";
const shared = { ...frame, ...shell };
const styles = { ...shared, ...local };

type ViewMode = "diagram" | "tree" | "treemap" | "force";

interface ArchitecturePanelProps {
  language: Language;
}

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "diagram", label: "Diagram" },
  { key: "tree", label: "Tree" },
  { key: "treemap", label: "Treemap" },
  { key: "force", label: "Force" },
];

function ArchitecturePanel({ language }: ArchitecturePanelProps) {
  /* admin 에서 architectureItems 수정 가능 — 비어있으면 정적 fallback 사용 */
  const cfg = useSiteConfig();
  const panelTitle = usePanelTitle("architecture");
  const cfgItems = cfg.about.architectureItems;
  const structure: StructureItem[] = useMemo(() => {
    if (!cfgItems || cfgItems.length === 0) return projectStructure;
    return cfgItems.map((it) => ({
      path: it.path,
      description: { ko: it.description_ko, en: it.description_en },
      indent: it.indent,
    }));
  }, [cfgItems]);
  const [viewMode, setViewMode] = useState<ViewMode>("diagram");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const { nodes, edges } = useMemo(() => buildGraph(structure), [structure]);
  const treePos = useMemo(() => computeTree(nodes), [nodes]);
  const tmRects = useMemo(() => computeTreemap(nodes), [nodes]);

  const {
    positions: forcePos,
    onDragStart,
    onDrag,
    onDragEnd,
  } = useForceGraph(nodes, edges, viewMode === "force");

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

  /* ── Force 전용: 호버/선택 시 전체 경로 하이라이팅 ── */
  const forceHighlightIndex = viewMode === "force" ? (hoveredIndex ?? selectedIndex) : null;

  const forcePath = useMemo(() => {
    if (forceHighlightIndex === null) return new Set<number>();
    const set = new Set<number>();
    // 조상 경로 (root까지)
    let idx: number | null = forceHighlightIndex;
    while (idx !== null) {
      set.add(idx);
      idx = nodes[idx].parentIndex;
    }
    // 하위 트리
    const addDesc = (i: number) => {
      set.add(i);
      for (const ci of nodes[i].childIndices) addDesc(ci);
    };
    addDesc(forceHighlightIndex);
    return set;
  }, [forceHighlightIndex, nodes]);

  const forcePathEdges = useMemo(() => {
    if (forceHighlightIndex === null) return new Set<number>();
    const set = new Set<number>();
    edges.forEach((e, i) => {
      if (forcePath.has(e.from) && forcePath.has(e.to)) set.add(i);
    });
    return set;
  }, [forceHighlightIndex, edges, forcePath]);

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
    <div className={`${styles.panel} ${styles.panelFlush}`}>
      <div className={styles.titleRowCompact}>
        <h3 className={`${styles.panelTitle} ${styles.archTitle} ${styles.animate}`}>{panelTitle}</h3>
      </div>

      {/* ── 데스크톱: 인터랙티브 맵 ── */}
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
                  onMouseEnter={() => handleMouseEnter(node.index)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className={styles.archNodePath}>{node.item.path}</span>
                </div>
              );
            })}
          </>
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

export default memo(ArchitecturePanel);
