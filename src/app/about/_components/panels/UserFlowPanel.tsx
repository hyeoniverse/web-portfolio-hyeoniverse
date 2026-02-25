"use client";

import { useState, useCallback, useRef } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { UserFlow } from "@/data/about";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import PinnedTitleRow from "../PinnedTitleRow";
import styles from "../AboutSection.module.css";

interface UserFlowPanelProps {
  language: Language;
  userFlows: UserFlow[];
  scrollBy?: (deltaX: number) => void;
}

/* ── SVG 좌표 상수 (세로 1-column) ── */
const NODE_W = 220;
const NODE_H = 48;
const GAP_Y = 32;
const PAD_X = 40;
const PAD_Y = 24;

export default function UserFlowPanel({
  language,
  userFlows,
  scrollBy,
}: UserFlowPanelProps) {
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const isMobile = useMobileLayout();

  const flow = userFlows[activeFlowIndex];
  const stepCount = flow.steps.length;

  /* ── Pinned Scroll (desktop) ── */
  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    stepCount,
    undefined,
    scrollBy,
  );

  /* ── Mobile Pin Scroll ── */
  const mobileStRef = useMobilePinScroll(
    contentRef,
    stepCount,
    500,
    useCallback((idx: number) => setMobileActiveIdx(idx), []),
    [activeFlowIndex],
  );

  const currentStep = isMobile ? mobileActiveIdx : activeIndex;

  /* ── Tab 전환 ── */
  const handleTab = useCallback(
    (i: number) => {
      setActiveFlowIndex(i);
      setMobileActiveIdx(0);
    },
    [],
  );

  /* ── DotNav 클릭 ── */
  const handleDotClick = useCallback(
    (i: number) => {
      scrollToItem(i, mobileStRef);
    },
    [scrollToItem, mobileStRef],
  );

  /* ── SVG 계산 ── */
  const svgW = PAD_X * 2 + NODE_W;
  const svgH = PAD_Y * 2 + stepCount * NODE_H + (stepCount - 1) * GAP_Y;

  const nodeY = (i: number) => PAD_Y + i * (NODE_H + GAP_Y);

  /* ── Detail pane content ── */
  const detailRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${styles.panelExtraWide}`}
      style={{ "--_uf-color": "var(--color-accent)" } as React.CSSProperties}
    >
      <div
        ref={contentRef}
        className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}
      >
        {/* ── Title + DotNav ── */}
        <PinnedTitleRow
          number="02"
          title="User Flow."
          dotNav={{
            count: stepCount,
            activeIndex: currentStep,
            onDotClick: handleDotClick,
            labels: flow.steps.map((s) => s.label[language]),
          }}
        />

        {/* ── Tabs ── */}
        <div className={`${styles.ufTabs} ${styles.animate}`}>
          {userFlows.map((f, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.ufTab} ${i === activeFlowIndex ? styles.ufTabActive : ""}`}
              onClick={() => handleTab(i)}
            >
              <span className={styles.ufTabDot} />
              {f.title}
            </button>
          ))}
        </div>

        {/* ── Flow Description ── */}
        <p className={styles.ufFlowDesc}>{flow.description[language]}</p>

        {/* ── Desktop: Chart + Detail 2-column ── */}
        <div className={styles.ufBody}>
          {/* Left: SVG Flowchart */}
          <div className={styles.ufChartCol}>
            <svg
              className={styles.ufSvg}
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern
                  id={`uf-dots-${activeFlowIndex}`}
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="10" cy="10" r="0.6" className={styles.ufGridDot} />
                </pattern>
                <marker
                  id={`uf-arrow-${activeFlowIndex}`}
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
              <rect
                width={svgW}
                height={svgH}
                fill={`url(#uf-dots-${activeFlowIndex})`}
                rx="12"
              />

              {/* Connectors — vertical 1-column */}
              {flow.steps.map((_, i) => {
                if (i >= stepCount - 1) return null;
                const x = PAD_X + NODE_W / 2;
                const y1 = nodeY(i) + NODE_H;
                const y2 = nodeY(i + 1);
                const reached = i < currentStep;
                return (
                  <path
                    key={`c${i}`}
                    d={`M${x},${y1} L${x},${y2}`}
                    className={`${styles.ufEdge} ${reached ? styles.ufEdgeReached : ""}`}
                    markerEnd={reached ? `url(#uf-arrow-${activeFlowIndex})` : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {flow.steps.map((step, i) => {
                const y = nodeY(i);
                const isFirst = i === 0;
                const isLast = i === stepCount - 1;
                const isTerminal = isFirst || isLast;
                const isDone = i < currentStep;
                const isActive = i === currentStep;
                const isFuture = i > currentStep;

                let nodeClass = styles.ufNode;
                if (isDone) nodeClass += ` ${styles.ufNodeDone}`;
                if (isActive) nodeClass += ` ${styles.ufNodeActive}`;
                if (isFuture) nodeClass += ` ${styles.ufNodeFuture}`;

                return (
                  <g
                    key={`n${activeFlowIndex}-${i}`}
                    className={nodeClass}
                    onClick={() => handleDotClick(i)}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={PAD_X}
                      y={y}
                      width={NODE_W}
                      height={NODE_H}
                      rx={isTerminal ? NODE_H / 2 : 10}
                      className={
                        isTerminal ? styles.ufNRectTerminal : styles.ufNRect
                      }
                    />
                    <text
                      x={PAD_X + NODE_W / 2}
                      y={y + 16}
                      textAnchor="middle"
                      className={
                        isTerminal ? styles.ufNNumTerminal : styles.ufNNum
                      }
                    >
                      {isFirst
                        ? "START"
                        : isLast
                          ? "END"
                          : String(i).padStart(2, "0")}
                    </text>
                    <text
                      x={PAD_X + NODE_W / 2}
                      y={y + 36}
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

          {/* Right: Detail pane — slides content */}
          <div ref={detailRef} className={styles.ufDetailCol}>
            {flow.steps.map((step, i) => {
              const isActive = i === currentStep;
              const isPast = i < currentStep;
              return (
                <div
                  key={`d${activeFlowIndex}-${i}`}
                  className={`${styles.ufDetailPane} ${isActive ? styles.ufDetailPaneActive : ""} ${isPast ? styles.ufDetailPanePast : ""}`}
                >
                  <span className={styles.ufDetailNum}>
                    {i === 0
                      ? "START"
                      : i === stepCount - 1
                        ? "END"
                        : `STEP ${String(i).padStart(2, "0")}`}
                  </span>
                  <h4 className={styles.ufDetailTitle}>
                    {step.label[language]}
                  </h4>
                  {step.description && (
                    <p className={styles.ufDetailDesc}>
                      {step.description[language]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile: step list (accordion) ── */}
        <div className={styles.ufMobileList}>
          {flow.steps.map((step, i) => {
            const isActive = i === mobileActiveIdx;
            const isDone = i < mobileActiveIdx;
            return (
              <div
                key={i}
                className={`${styles.ufMobileStep} ${isActive ? styles.ufMobileStepActive : ""} ${isDone ? styles.ufMobileStepDone : ""}`}
              >
                <div className={styles.ufMobileConnector}>
                  <span
                    className={`${styles.ufMobileDot} ${isDone || isActive ? styles.ufMobileDotFilled : ""}`}
                  />
                  {i < stepCount - 1 && (
                    <span
                      className={`${styles.ufMobileLine} ${isDone ? styles.ufMobileLineFilled : ""}`}
                    />
                  )}
                </div>
                <div className={styles.ufMobileContent}>
                  <strong className={styles.ufMobileLabel}>
                    {step.label[language]}
                  </strong>
                  {isActive && step.description && (
                    <p className={styles.ufMobileDesc}>
                      {step.description[language]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
