"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import { erdTables, erdRelations, erdDesignNotes } from "@/data/about/erd";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import PinnedTitleRow from "../PinnedTitleRow";
import {
  TABLE_LAYOUT,
  SVG_W,
  SVG_H,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  PADDING_Y,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_STEP,
} from "./erdConfig";
import shared from "../AboutSection.module.css";
import local from "./ErdPanel.module.css";
const styles = { ...shared, ...local };

interface ErdPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

function tableHeight(cols: number) {
  return HEADER_HEIGHT + cols * ROW_HEIGHT + PADDING_Y;
}

function getTableCenter(name: string, cols: number) {
  const layout = TABLE_LAYOUT[name];
  if (!layout) return { x: 0, y: 0 };
  return {
    x: layout.x + layout.w / 2,
    y: layout.y + tableHeight(cols) / 2,
  };
}

function getTableEdge(name: string, cols: number, side: "top" | "bottom" | "left" | "right") {
  const layout = TABLE_LAYOUT[name];
  if (!layout) return { x: 0, y: 0 };
  const h = tableHeight(cols);
  switch (side) {
    case "top": return { x: layout.x + layout.w / 2, y: layout.y };
    case "bottom": return { x: layout.x + layout.w / 2, y: layout.y + h };
    case "left": return { x: layout.x, y: layout.y + h / 2 };
    case "right": return { x: layout.x + layout.w, y: layout.y + h / 2 };
  }
}

const tableColCount: Record<string, number> = {};
erdTables.forEach((t) => { tableColCount[t.name] = t.columns.length; });

function ErdPanel({ language }: ErdPanelProps) {
  const isMobile = useMobileLayout();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Active table (click to select, click again to deselect)
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  // Active note
  const activeNote = erdDesignNotes.find((n) => n.relatedTable === activeTable);

  // Wheel zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z - Math.sign(e.deltaY) * ZOOM_STEP)));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-clickable]")) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleTableClick = useCallback((name: string) => {
    setActiveTable((prev) => (prev === name ? null : name));
  }, []);

  // Highlight relations
  const highlightTarget = activeTable || hoveredTable;
  const relatedTables = new Set<string>();
  if (highlightTarget) {
    relatedTables.add(highlightTarget);
    erdRelations.forEach((r) => {
      if (r.from === highlightTarget) relatedTables.add(r.to);
      if (r.to === highlightTarget) relatedTables.add(r.from);
    });
  }

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  const handleZoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  const handleReset = () => { setZoom(0.55); setPan({ x: 0, y: 0 }); setActiveTable(null); };

  return (
    <div className={`${styles.panel} ${styles.panelExtraWide}`}>
      <div className={`${styles.pinnedContent} ${styles.erdViewport}`}>
        <PinnedTitleRow className={isMobile ? styles.erdTitleRow : undefined} title="Database Design." />

        <div
          ref={viewportRef}
          className={styles.erdZoomViewport}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.erdSvg}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <defs>
              <marker id="erdArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className={styles.erdArrowFill} />
              </marker>
              <marker id="erdArrowHighlight" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className={styles.erdArrowHighlight} />
              </marker>
            </defs>

            {/* Relation lines */}
            {erdRelations.map((rel, i) => {
              const fromLayout = TABLE_LAYOUT[rel.from];
              const toLayout = TABLE_LAYOUT[rel.to];
              if (!fromLayout || !toLayout) return null;

              const isHighlighted = highlightTarget && (rel.from === highlightTarget || rel.to === highlightTarget);
              const fromC = getTableCenter(rel.from, tableColCount[rel.from] ?? 4);
              const toC = getTableCenter(rel.to, tableColCount[rel.to] ?? 4);

              // Determine best edges
              const dx = toC.x - fromC.x;
              const dy = toC.y - fromC.y;
              let fromSide: "top" | "bottom" | "left" | "right";
              let toSide: "top" | "bottom" | "left" | "right";

              if (Math.abs(dy) > Math.abs(dx)) {
                fromSide = dy > 0 ? "bottom" : "top";
                toSide = dy > 0 ? "top" : "bottom";
              } else {
                fromSide = dx > 0 ? "right" : "left";
                toSide = dx > 0 ? "left" : "right";
              }

              const from = getTableEdge(rel.from, tableColCount[rel.from] ?? 4, fromSide);
              const to = getTableEdge(rel.to, tableColCount[rel.to] ?? 4, toSide);

              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;

              return (
                <g key={i}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    markerEnd={isHighlighted ? "url(#erdArrowHighlight)" : "url(#erdArrow)"}
                    className={isHighlighted ? styles.erdRelLineHighlight : styles.erdRelLine}
                  />
                  <text x={mx} y={my - 6} textAnchor="middle" className={isHighlighted ? styles.erdRelLabelHighlight : styles.erdRelLabel}>
                    {rel.label}
                  </text>
                </g>
              );
            })}

            {/* Table cards */}
            {erdTables.map((table) => {
              const layout = TABLE_LAYOUT[table.name];
              if (!layout) return null;
              const h = tableHeight(table.columns.length);
              const isActive = table.name === activeTable;
              const isRelated = highlightTarget ? relatedTables.has(table.name) : false;
              const dimmed = highlightTarget && !isRelated;

              return (
                <g
                  key={table.name}
                  transform={`translate(${layout.x}, ${layout.y})`}
                  className={`${styles.erdTableGroup} ${dimmed ? styles.erdTableDimmed : ""}`}
                  onClick={() => handleTableClick(table.name)}
                  onMouseEnter={() => setHoveredTable(table.name)}
                  onMouseLeave={() => setHoveredTable(null)}
                  data-clickable="true"
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    width={layout.w} height={h} rx="6"
                    className={`${styles.erdTableBg} ${isActive ? styles.erdTableBgActive : ""}`}
                  />
                  <line x1={0} y1={HEADER_HEIGHT} x2={layout.w} y2={HEADER_HEIGHT} className={styles.erdHeaderLine} />
                  <text x={layout.w / 2} y={HEADER_HEIGHT / 2 + 1} dominantBaseline="central" textAnchor="middle" className={styles.erdTableName}>
                    {table.name}
                  </text>
                  {table.columns.map((col, ci) => {
                    const cy = HEADER_HEIGHT + ci * ROW_HEIGHT + ROW_HEIGHT / 2 + 1;
                    return (
                      <g key={ci}>
                        {col.pk && <text x={8} y={cy} dominantBaseline="central" className={styles.erdColPk}>PK</text>}
                        {col.fk && <text x={8} y={cy} dominantBaseline="central" className={styles.erdColFk}>FK</text>}
                        <text x={32} y={cy} dominantBaseline="central" className={styles.erdColName}>{col.name}</text>
                        <text x={layout.w - 8} y={cy} dominantBaseline="central" textAnchor="end" className={styles.erdColType}>{col.type}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Zoom controls */}
          <div className={styles.erdZoomControls}>
            <button data-clickable="true" onClick={handleZoomIn} className={styles.erdZoomBtn}>+</button>
            <span className={styles.erdZoomLevel}>{Math.round(zoom * 100)}%</span>
            <button data-clickable="true" onClick={handleZoomOut} className={styles.erdZoomBtn}>−</button>
            <button data-clickable="true" onClick={handleReset} className={styles.erdZoomBtn}>⟲</button>
          </div>
        </div>

        {/* Note panel — shown when a table is selected */}
        {activeNote && (
          <div className={styles.erdNotePanel}>
            <span className={styles.erdNoteNum}>
              {String(erdDesignNotes.indexOf(activeNote) + 1).padStart(2, "0")}
            </span>
            <div>
              <strong className={styles.erdNoteTitle}>{activeNote.title[language]}</strong>
              <code className={styles.erdNoteTag}>{activeNote.tag}</code>
              <p className={styles.erdNoteDesc}>{activeNote.description[language]}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ErdPanel);
