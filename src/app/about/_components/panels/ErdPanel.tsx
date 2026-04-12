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

  // viewBox: current (rendered) + target (animated towards)
  const [vb, setVb] = useState({ ox: 0, oy: 0, w: SVG_W, h: SVG_H });
  const targetVb = useRef({ ox: 0, oy: 0, w: SVG_W, h: SVG_H });
  const animating = useRef(false);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragDist = useRef(0);

  const zoom = SVG_W / vb.w;

  const LERP = 0.06;

  const animateVb = useCallback(() => {
    setVb((prev) => {
      const t = targetVb.current;
      const dx = t.ox - prev.ox;
      const dy = t.oy - prev.oy;
      const dw = t.w - prev.w;
      const dh = t.h - prev.h;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dw) < 0.5 && Math.abs(dh) < 0.5) {
        animating.current = false;
        return t;
      }
      requestAnimationFrame(animateVb);
      return {
        ox: prev.ox + dx * LERP,
        oy: prev.oy + dy * LERP,
        w: prev.w + dw * LERP,
        h: prev.h + dh * LERP,
      };
    });
  }, []);

  const setVbAnimated = useCallback((next: { ox: number; oy: number; w: number; h: number }) => {
    targetVb.current = next;
    if (!animating.current) {
      animating.current = true;
      requestAnimationFrame(animateVb);
    }
  }, [animateVb]);


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

        const next = { ox: newOx, oy: newOy, w: newW, h: newH };
        targetVb.current = next;
        return next;
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Pan via window-level mousemove/mouseup (no pointer capture — allows SVG onClick)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isPanning.current = true;
    dragDist.current = 0;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      dragDist.current += Math.abs(e.clientX - lastMouse.current.x) + Math.abs(e.clientY - lastMouse.current.y);
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - lastMouse.current.x) / rect.width;
      const dy = (e.clientY - lastMouse.current.y) / rect.height;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setVb((prev) => {
        const next = { ...prev, ox: prev.ox - dx * prev.w, oy: prev.oy - dy * prev.h };
        targetVb.current = next;
        return next;
      });
    };
    const handleMouseUp = () => { isPanning.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleTableClick = useCallback((name: string) => {
    if (dragDist.current > 5) return;
    setActiveTable((prev) => {
      if (prev === name) {
        setVbAnimated({ ox: 0, oy: 0, w: SVG_W, h: SVG_H });
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
        setVbAnimated({ ox: cx - vw / 2, oy: cy - vh / 2, w: vw, h: vh });
      }
      return name;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setVbAnimated]);

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

  // Zoom controls (animated)
  const handleZoomIn = () => {
    const prev = targetVb.current;
    const f = 1 / 1.3;
    const nw = Math.max(SVG_W / ZOOM_MAX, prev.w * f);
    const nh = Math.max(SVG_H / ZOOM_MAX, prev.h * f);
    setVbAnimated({ ox: prev.ox + (prev.w - nw) / 2, oy: prev.oy + (prev.h - nh) / 2, w: nw, h: nh });
  };
  const handleZoomOut = () => {
    const prev = targetVb.current;
    const f = 1.3;
    const nw = Math.min(SVG_W / ZOOM_MIN, prev.w * f);
    const nh = Math.min(SVG_H / ZOOM_MIN, prev.h * f);
    setVbAnimated({ ox: prev.ox + (prev.w - nw) / 2, oy: prev.oy + (prev.h - nh) / 2, w: nw, h: nh });
  };
  const handleReset = () => { setVbAnimated({ ox: 0, oy: 0, w: SVG_W, h: SVG_H }); setActiveTable(null); };

  return (
    <div className={styles.panel}>
      <div className={styles.erdViewport}>
        <PinnedTitleRow className={isMobile ? styles.erdTitleRow : undefined} title="Database Design." />

        <div
          ref={viewportRef}
          className={styles.erdZoomViewport}
          onMouseDown={handleMouseDown}
        >
          {!activeTable && (
            <div className={styles.erdHint}>
              <span>scroll to zoom · drag to pan · click table to inspect</span>
            </div>
          )}
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
                    width={layout.w} height={h} rx="12"
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
                <foreignObject x={noteX} y={noteY} width="280" height="400" overflow="visible" style={{ pointerEvents: "none" }}>
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
