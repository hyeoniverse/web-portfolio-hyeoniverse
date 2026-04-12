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

  // viewBox state: origin (top-left of visible area in SVG coords) + size (visible area)
  const [vb, setVb] = useState({ ox: 0, oy: 0, w: SVG_W, h: SVG_H });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const zoom = SVG_W / vb.w;

  // Active table (click to select, click again to deselect)
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  // Active note
  const activeNote = erdDesignNotes.find((n) => n.relatedTable === activeTable);

  // Wheel zoom — centered on cursor
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;

      setVb((prev) => {
        const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
        const newW = Math.min(SVG_W / ZOOM_MIN, Math.max(SVG_W / ZOOM_MAX, prev.w * factor));
        const newH = Math.min(SVG_H / ZOOM_MIN, Math.max(SVG_H / ZOOM_MAX, prev.h * factor));

        const newOx = prev.ox + (prev.w - newW) * mx;
        const newOy = prev.oy + (prev.h - newH) * my;

        return { ox: newOx, oy: newOy, w: newW, h: newH };
      });
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
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - lastMouse.current.x) / rect.width;
    const dy = (e.clientY - lastMouse.current.y) / rect.height;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setVb((prev) => ({ ...prev, ox: prev.ox - dx * prev.w, oy: prev.oy - dy * prev.h }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleTableClick = useCallback((name: string) => {
    setActiveTable((prev) => {
      if (prev === name) {
        setVb({ ox: 0, oy: 0, w: SVG_W, h: SVG_H });
        return null;
      }
      const layout = TABLE_LAYOUT[name];
      if (layout) {
        const cols = tableColCount[name] ?? 4;
        const h = tableHeight(cols);
        const pad = 80;
        const focusW = layout.w + 320 + pad * 2;
        const focusH = h + pad * 2;
        const aspect = SVG_W / SVG_H;
        let vw = focusW;
        let vh = focusH;
        if (vw / vh > aspect) {
          vh = vw / aspect;
        } else {
          vw = vh * aspect;
        }
        const cx = layout.x + layout.w / 2;
        const cy = layout.y + h / 2;
        setVb({ ox: cx - vw / 2, oy: cy - vh / 2, w: vw, h: vh });
      }
      return name;
    });
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
  const handleZoomIn = () => setVb((prev) => {
    const f = 1 / 1.2;
    const nw = Math.max(SVG_W / ZOOM_MAX, prev.w * f);
    const nh = Math.max(SVG_H / ZOOM_MAX, prev.h * f);
    return { ox: prev.ox + (prev.w - nw) / 2, oy: prev.oy + (prev.h - nh) / 2, w: nw, h: nh };
  });
  const handleZoomOut = () => setVb((prev) => {
    const f = 1.2;
    const nw = Math.min(SVG_W / ZOOM_MIN, prev.w * f);
    const nh = Math.min(SVG_H / ZOOM_MIN, prev.h * f);
    return { ox: prev.ox + (prev.w - nw) / 2, oy: prev.oy + (prev.h - nh) / 2, w: nw, h: nh };
  });
  const handleReset = () => { setVb({ ox: 0, oy: 0, w: SVG_W, h: SVG_H }); setActiveTable(null); };

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
            viewBox={`${vb.ox} ${vb.oy} ${vb.w} ${vb.h}`}
            preserveAspectRatio="xMidYMid meet"
            className={styles.erdSvg}
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
            {/* Note inside SVG — foreignObject for HTML content */}
            {activeTable && activeNote && (() => {
              const layout = TABLE_LAYOUT[activeTable];
              if (!layout) return null;
              const noteX = layout.x + layout.w + 16;
              const noteY = layout.y;
              const noteIdx = erdDesignNotes.indexOf(activeNote);
              return (
                <foreignObject x={noteX} y={noteY} width="280" height="400" overflow="visible">
                  <div className={styles.erdNoteOverlay}>
                    <span className={styles.erdNoteNum}>{String(noteIdx + 1).padStart(2, "0")}</span>
                    <div>
                      <strong className={styles.erdNoteTitle}>{activeNote.title[language]}</strong>
                      <code className={styles.erdNoteTag}>{activeNote.tag}</code>
                      <p className={styles.erdNoteDesc}>{activeNote.description[language]}</p>
                    </div>
                  </div>
                </foreignObject>
              );
            })()}
          </svg>

          {/* Zoom controls */}
          <div className={styles.erdZoomControls}>
            <button data-clickable="true" onClick={handleZoomIn} className={styles.erdZoomBtn}>+</button>
            <span className={styles.erdZoomLevel}>{Math.round(zoom * 100)}%</span>
            <button data-clickable="true" onClick={handleZoomOut} className={styles.erdZoomBtn}>−</button>
            <button data-clickable="true" onClick={handleReset} className={styles.erdZoomBtn}>⟲</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ErdPanel);
