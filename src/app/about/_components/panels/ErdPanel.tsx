"use client";

import type { Language } from "@/providers/LanguageProvider";
import type { ErdTable, ErdDesignNote } from "@/data/about";
import styles from "../AboutSection.module.css";

interface ErdPanelProps {
  language: Language;
  tables: ErdTable[];
  designNotes: ErdDesignNote[];
}

/*
 * SVG positions — viewBox: 0 0 1100 600
 *
 * Layout:
 *                [series]
 *                   |
 *   [works]  ——  [posts]  ——  [comments]
 *                   |
 *   [site_settings] [likes]
 */

const TABLE_LAYOUT: Record<string, { x: number; y: number; w: number }> = {
  series: { x: 380, y: 30, w: 280 },
  works: { x: 30, y: 195, w: 280 },
  posts: { x: 380, y: 195, w: 280 },
  comments: { x: 730, y: 195, w: 280 },
  site_settings: { x: 30, y: 430, w: 280 },
  likes: { x: 380, y: 430, w: 280 },
};

const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 32;
const PADDING_Y = 8;

function tableHeight(cols: number) {
  return HEADER_HEIGHT + cols * ROW_HEIGHT + PADDING_Y;
}

export default function ErdPanel({
  language,
  tables,
  designNotes,
}: ErdPanelProps) {
  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>09</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        Database Design.
      </h3>

      <div className={`${styles.erdLayout} ${styles.animate}`}>
        {/* ERD Diagram */}
        <div className={styles.erdDiagram}>
          <svg
            viewBox="0 0 1100 620"
            className={styles.erdSvg}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker
                id="erdArrow"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  className={styles.erdArrowFill}
                />
              </marker>
            </defs>

            {/* Relationship lines */}
            {renderRelations()}

            {/* Table cards */}
            {tables.map((table) => {
              const layout = TABLE_LAYOUT[table.name];
              if (!layout) return null;
              const h = tableHeight(table.columns.length);

              return (
                <g key={table.name} transform={`translate(${layout.x}, ${layout.y})`}>
                  {/* Card background */}
                  <rect
                    width={layout.w}
                    height={h}
                    rx="6"
                    className={styles.erdTableBg}
                  />

                  {/* Header divider line */}
                  <line
                    x1={0}
                    y1={HEADER_HEIGHT}
                    x2={layout.w}
                    y2={HEADER_HEIGHT}
                    className={styles.erdHeaderLine}
                  />
                  <text
                    x={layout.w / 2}
                    y={HEADER_HEIGHT / 2 + 1}
                    dominantBaseline="central"
                    textAnchor="middle"
                    className={styles.erdTableName}
                  >
                    {table.name}
                  </text>

                  {/* Columns */}
                  {table.columns.map((col, ci) => {
                    const cy = HEADER_HEIGHT + ci * ROW_HEIGHT + ROW_HEIGHT / 2 + 2;
                    return (
                      <g key={ci}>
                        {/* PK/FK indicator */}
                        {col.pk && (
                          <text
                            x={10}
                            y={cy}
                            dominantBaseline="central"
                            className={styles.erdColPk}
                          >
                            PK
                          </text>
                        )}
                        {col.fk && (
                          <text
                            x={10}
                            y={cy}
                            dominantBaseline="central"
                            className={styles.erdColFk}
                          >
                            FK
                          </text>
                        )}

                        {/* Column name */}
                        <text
                          x={36}
                          y={cy}
                          dominantBaseline="central"
                          className={styles.erdColName}
                        >
                          {col.name}
                        </text>

                        {/* Column type */}
                        <text
                          x={layout.w - 10}
                          y={cy}
                          dominantBaseline="central"
                          textAnchor="end"
                          className={styles.erdColType}
                        >
                          {col.type}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Design Decision Notes */}
        <div className={styles.erdNotes}>
          <h4 className={styles.erdNotesTitle}>
            {language === "ko" ? "설계 결정" : "Design Decisions"}
          </h4>
          {designNotes.map((note, i) => (
            <div key={i} className={styles.erdNote}>
              <span className={styles.erdNoteNum}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <strong className={styles.erdNoteTitle}>
                  {note.title[language]}
                </strong>
                <p className={styles.erdNoteDesc}>
                  {note.description[language]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Hardcoded relationship lines matching TABLE_LAYOUT positions */
function renderRelations() {
  const postsCenter = { x: 380 + 140, y: 195 };
  const postsBottom = { x: 380 + 140, y: 195 + tableHeight(7) };
  const seriesBottom = { x: 380 + 140, y: 8 + tableHeight(4) };
  const commentsLeft = { x: 730, y: 195 + tableHeight(6) / 2 };
  const postsRight = { x: 380 + 280, y: 195 + tableHeight(7) / 2 };
  const likesTop = { x: 380 + 140, y: 430 };
  const worksRight = { x: 30 + 280, y: 195 + tableHeight(5) / 2 };
  const postsLeft = { x: 380, y: 195 + tableHeight(7) / 2 };
  const likesLeft = { x: 380, y: 430 + tableHeight(4) / 2 };
  const worksBottom = { x: 30 + 140, y: 195 + tableHeight(5) };

  return (
    <g className={styles.erdRelGroup}>
      {/* posts → series (N:1) */}
      <line
        x1={postsCenter.x}
        y1={postsCenter.y}
        x2={seriesBottom.x}
        y2={seriesBottom.y}
        markerEnd="url(#erdArrow)"
        className={styles.erdRelLine}
      />
      <text
        x={postsCenter.x + 8}
        y={(postsCenter.y + seriesBottom.y) / 2}
        dominantBaseline="central"
        className={styles.erdRelLabel}
      >
        N:1
      </text>

      {/* comments → posts (N:1) */}
      <line
        x1={commentsLeft.x}
        y1={commentsLeft.y}
        x2={postsRight.x}
        y2={postsRight.y}
        markerEnd="url(#erdArrow)"
        className={styles.erdRelLine}
      />
      <text
        x={(commentsLeft.x + postsRight.x) / 2}
        y={commentsLeft.y - 10}
        textAnchor="middle"
        className={styles.erdRelLabel}
      >
        N:1
      </text>

      {/* likes → posts (N:1) */}
      <line
        x1={likesTop.x}
        y1={likesTop.y}
        x2={postsBottom.x}
        y2={postsBottom.y}
        markerEnd="url(#erdArrow)"
        className={styles.erdRelLine}
      />
      <text
        x={likesTop.x + 8}
        y={(likesTop.y + postsBottom.y) / 2}
        dominantBaseline="central"
        className={styles.erdRelLabel}
      >
        N:1
      </text>

      {/* likes → works (N:1) — diagonal */}
      <path
        d={`M${likesLeft.x},${likesLeft.y} C${likesLeft.x - 40},${likesLeft.y} ${worksBottom.x + 40},${worksBottom.y} ${worksBottom.x},${worksBottom.y}`}
        fill="none"
        markerEnd="url(#erdArrow)"
        className={styles.erdRelLine}
      />
      <text
        x={(likesLeft.x + worksBottom.x) / 2 - 20}
        y={(likesLeft.y + worksBottom.y) / 2 + 10}
        textAnchor="middle"
        className={styles.erdRelLabel}
      >
        N:1
      </text>

      {/* posts — works (dashed, polymorphic via likes) */}
      <line
        x1={postsLeft.x}
        y1={postsLeft.y}
        x2={worksRight.x}
        y2={worksRight.y}
        className={styles.erdRelLineDashed}
      />
      <text
        x={(postsLeft.x + worksRight.x) / 2}
        y={postsLeft.y - 10}
        textAnchor="middle"
        className={styles.erdRelLabelSub}
      >
        polymorphic
      </text>
    </g>
  );
}
