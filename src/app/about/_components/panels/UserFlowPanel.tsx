"use client";

import { useState, useCallback, useMemo, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { FlowNode } from "@/data/about";
import { userFlows } from "@/data/about/architecture";
import type { UserFlow } from "@/data/about/types";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import PinnedTitleRow from "../PinnedTitleRow";
import T from "@/components/ui/T";
import {
  ACTION_W,
  ACTION_H,
  TERMINAL_W,
  TERMINAL_H,
  DIAMOND_W,
  DIAMOND_H,
  nodeX,
  nodeY,
  halfW,
  svgDimensions,
  buildEdgePath,
  edgeLabelPos,
} from "../_utils/flowLayout";
import { FLOW_ICONS } from "./flowIcons";
import shared from "../AboutSection.module.css";
import local from "./UserFlowPanel.module.css";
const styles = { ...shared, ...local };

interface UserFlowPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

function UserFlowPanel({
  language,
  scrollBy,
}: UserFlowPanelProps) {
  /* admin(about.userFlows) override — 비어있으면 정적 데이터 */
  const cfg = useSiteConfig();
  const cfgFlows = (cfg.about as { userFlows?: UserFlow[] }).userFlows;
  const flows = cfgFlows && cfgFlows.length > 0 ? cfgFlows : userFlows;
  const flowCount = flows.length;
  const isMobile = useMobileLayout();

  /* ── Pinned Scroll ── */
  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    flowCount,
    undefined,
    scrollBy,
  );

  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const mobileStRef = useMobilePinScroll(
    contentRef,
    flowCount,
    500,
    useCallback((idx: number) => setMobileActiveIdx(idx), []),
    [],
  );

  const currentIdx = isMobile ? mobileActiveIdx : activeIndex;
  const activeFlow = flows[currentIdx] ?? flows[0];

  /* ── Node map for edge lookups ── */
  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>();
    activeFlow.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [activeFlow]);

  /* ── BFS ordering: start → end sequential animation ── */
  const seqOrder = useMemo(() => {
    const adj = new Map<string, { to: string; edgeKey: string }[]>();
    activeFlow.edges.forEach((ed) => {
      if (!adj.has(ed.from)) adj.set(ed.from, []);
      adj.get(ed.from)!.push({ to: ed.to, edgeKey: `${ed.from}-${ed.to}` });
    });

    const nodeSeq = new Map<string, number>();
    const edgeSeq = new Map<string, number>();
    const queue = ["start"];
    let seq = 0;
    nodeSeq.set("start", seq++);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const neighbors = adj.get(cur) || [];
      for (const { to, edgeKey } of neighbors) {
        edgeSeq.set(edgeKey, seq++);
        if (!nodeSeq.has(to)) {
          nodeSeq.set(to, seq++);
          queue.push(to);
        }
      }
    }
    return { nodeSeq, edgeSeq };
  }, [activeFlow]);

  /* ── SVG dimensions (horizontal) ── */
  const { svgW, svgH } = svgDimensions(activeFlow.nodes);

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${styles.panelExtraWide} ${styles.panelFlush}`}
    >
      <div
        ref={contentRef}
        className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}
      >
        <PinnedTitleRow
          panelKey="userflow"
          className={isMobile ? styles.ufTitleRow : undefined}
          title={<T k="aboutPage.panels.userFlow" />}
          dotNav={{
            count: flowCount,
            activeIndex: currentIdx,
            onDotClick: (i) => scrollToItem(i, mobileStRef),
            labels: flows.map((f) => f.title),
          }}
          rightContent={
            <div className={styles.ufFlowLegend}>
              <div className={styles.ufLegendItem}>
                <svg width="28" height="16" viewBox="0 0 28 16">
                  <rect x="1" y="1" width="26" height="14" rx="7" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                </svg>
                <span><T k="aboutPage.userFlow.startEnd" /></span>
              </div>
              <div className={styles.ufLegendItem}>
                <svg width="28" height="16" viewBox="0 0 28 16">
                  <rect x="1" y="1" width="26" height="14" rx="3" fill="none" stroke="var(--text-secondary)" strokeWidth="1" />
                </svg>
                <span><T k="aboutPage.userFlow.screenAction" /></span>
              </div>
              <div className={styles.ufLegendItem}>
                <svg width="22" height="16" viewBox="0 0 22 16">
                  <polygon points="11,0 22,8 11,16 0,8" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                </svg>
                <span><T k="aboutPage.userFlow.decision" /></span>
              </div>
            </div>
          }
        />

        {/* ── Desktop: Info (top) + Diagram (bottom) ── */}
        <div className={styles.ufFlowLayout}>
          {/* Flow Info — top row */}
          <div className={styles.ufFlowInfo} key={`info-${currentIdx}`}>
            <div className={styles.ufFlowProfile}>
              <span className={styles.ufFlowAvatar}>
                {FLOW_ICONS[activeFlow.title]}
              </span>
              <div className={styles.ufFlowProfileText}>
                <span className={styles.ufFlowTitle}>{activeFlow.title}</span>
                <span className={styles.ufFlowPersona}>
                  {activeFlow.persona[language]}
                </span>
              </div>
            </div>
            <p className={styles.ufFlowDesc}>
              {activeFlow.description[language]}
            </p>
          </div>

          {/* SVG Flowchart */}
          <div className={styles.ufFlowDiagram} key={currentIdx}>
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className={styles.ufFlowSvg}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <marker
                  id="uf-arrow"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path
                    d="M0,0 L7,3 L0,6 Z"
                    fill="var(--text-primary)"
                    stroke="none"
                  />
                </marker>
              </defs>

              {/* ── Edges ── */}
              {(() => {
                // 같은 target을 공유하는 엣지 (라벨 없는 것만) 3개 이상 → 합류선 mergeX 계산
                const mergeXMap = new Map<string, number>();
                const edgesByTarget = new Map<string, typeof activeFlow.edges>();
                for (const e of activeFlow.edges) {
                  if (e.label) continue; // 라벨 엣지는 별도 경로 → mergeX 그룹 제외
                  const arr = edgesByTarget.get(e.to) ?? [];
                  arr.push(e);
                  edgesByTarget.set(e.to, arr);
                }
                for (const [target, group] of edgesByTarget) {
                  if (group.length < 3) continue;
                  let maxExitX = 0;
                  for (const e of group) {
                    const f = nodeMap.get(e.from);
                    if (f) maxExitX = Math.max(maxExitX, nodeX(f.row) + halfW(f.type));
                  }
                  const tNode = nodeMap.get(target);
                  const entryX = tNode ? nodeX(tNode.row) - halfW(tNode.type) : maxExitX;
                  mergeXMap.set(target, (maxExitX + entryX) / 2);
                }
                return activeFlow.edges.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                // 라벨 있는 decision → 위쪽 대상: top 진입
                const fy = nodeY(from.col, from.row, from.y);
                const ty = nodeY(to.col, to.row, to.y);
                const entryDir = (edge.label === "No" && from.type === "decision" && ty < fy && to.row > from.row) ? "top" as const : undefined;
                const d = buildEdgePath(from, to, entryDir ? undefined : mergeXMap.get(edge.to), entryDir);
                const eKey = `${edge.from}-${edge.to}`;
                const seq = seqOrder.edgeSeq.get(eKey) ?? 0;
                const delay = seq * 0.12;
                // decision 수직 체인: 화살표 머리 생략
                const isCascade = from.type === "decision" && to.type === "decision" && from.row === to.row;

                return (
                  <g key={`e-${eKey}`}>
                    <path
                      d={d}
                      fill="none"
                      markerEnd={isCascade || edge.noArrow ? undefined : "url(#uf-arrow)"}
                      className={styles.ufEdgePath}
                      style={{ animationDelay: `${delay}s` }}
                    />
                    {edge.label && (() => {
                      const pos = edgeLabelPos(from, to);
                      return (
                        <text
                          x={pos.x}
                          y={pos.y}
                          textAnchor={pos.anchor}
                          className={styles.ufEdgeLabel}
                          style={{ animationDelay: `${delay}s` }}
                        >
                          {edge.label}
                        </text>
                      );
                    })()}
                  </g>
                );
              });
              })()}

              {/* ── Nodes ── */}
              {activeFlow.nodes.map((node) => {
                const cx = nodeX(node.row);
                const cy = nodeY(node.col, node.row, node.y);
                const seq = seqOrder.nodeSeq.get(node.id) ?? 0;
                const delay = seq * 0.12;

                return (
                  <g
                    key={node.id}
                    className={styles.ufNodeGroup}
                    style={{ animationDelay: `${delay}s` }}
                  >
                    {/* ── Start / End ── */}
                    {(node.type === "start" || node.type === "end") && (() => {
                      const lines = node.label[language].split("\n");
                      const lineH = 13;
                      const startY = cy - ((lines.length - 1) * lineH) / 2;
                      return (
                        <>
                          <rect
                            x={cx - TERMINAL_W / 2}
                            y={cy - TERMINAL_H / 2}
                            width={TERMINAL_W}
                            height={TERMINAL_H}
                            rx={TERMINAL_H / 2}
                            className={styles.ufTerminalRect}
                          />
                          <text
                            x={cx}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className={styles.ufTerminalText}
                          >
                            {lines.length === 1 ? (
                              <tspan x={cx} y={cy}>{lines[0]}</tspan>
                            ) : (
                              lines.map((line, li) => (
                                <tspan key={li} x={cx} y={startY + li * lineH}>
                                  {line}
                                </tspan>
                              ))
                            )}
                          </text>
                        </>
                      );
                    })()}

                    {/* ── Action ── */}
                    {node.type === "action" &&
                      (() => {
                        const lines = node.label[language].split("\n");
                        const lineH = 13;
                        const startY =
                          cy - ((lines.length - 1) * lineH) / 2;
                        const renderLine = (line: string) => {
                          if (!line.includes("♥")) return line;
                          return line.split(/(♥)/).map((part, i) =>
                            part === "♥" ? (
                              <tspan key={i} fill="var(--color-accent)">
                                ♥
                              </tspan>
                            ) : (
                              part
                            ),
                          );
                        };
                        return (
                          <>
                            <rect
                              x={cx - ACTION_W / 2}
                              y={cy - ACTION_H / 2}
                              width={ACTION_W}
                              height={ACTION_H}
                              rx={8}
                              className={styles.ufActionRect}
                            />
                            <text
                              x={cx}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className={styles.ufActionText}
                            >
                              {lines.length === 1 ? (
                                <tspan x={cx} y={cy}>
                                  {renderLine(lines[0])}
                                </tspan>
                              ) : (
                                lines.map((line, li) => (
                                  <tspan
                                    key={li}
                                    x={cx}
                                    y={startY + li * lineH}
                                  >
                                    {renderLine(line)}
                                  </tspan>
                                ))
                              )}
                            </text>
                          </>
                        );
                      })()}

                    {/* ── Decision (diamond) ── */}
                    {node.type === "decision" && (() => {
                      const lines = node.label[language].split("\n");
                      const lineH = 13;
                      const startY = cy - ((lines.length - 1) * lineH) / 2;
                      return (
                        <>
                          <polygon
                            points={`${cx},${cy - DIAMOND_H / 2} ${cx + DIAMOND_W / 2},${cy} ${cx},${cy + DIAMOND_H / 2} ${cx - DIAMOND_W / 2},${cy}`}
                            className={styles.ufDiamondShape}
                          />
                          <text
                            x={cx}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className={styles.ufDiamondText}
                          >
                            {lines.map((line, li) => (
                              <tspan key={li} x={cx} y={startY + li * lineH}>
                                {line}
                              </tspan>
                            ))}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                );
              })}
            </svg>
          </div>

        </div>

        {/* ── Mobile: simplified flow list ── */}
        <div className={styles.ufMobileList}>
          {flows.map((flow, fi) => {
            const isActive = fi === currentIdx;
            return (
              <div
                key={fi}
                className={`${styles.ufMobileFlowGroup} ${isActive ? styles.ufMobileFlowActive : ""}`}
              >
                <div className={styles.ufMobileFlowHeader}>
                  <span className={styles.ufMobileFlowIcon}>
                    {FLOW_ICONS[flow.title]}
                  </span>
                  <span className={styles.ufMobileFlowTitle}>
                    {flow.title}
                  </span>
                  <span className={styles.ufMobileFlowCount}>
                    {flow.nodes.filter((n) => n.type !== "end").length}{" "}
                    <T k="aboutPage.userFlow.steps" />
                  </span>
                </div>
                {isActive && (
                  <div className={styles.ufMobileNodes}>
                    {flow.nodes
                      .filter((n) => n.col === 0)
                      .map((node, ni) => (
                        <div
                          key={node.id}
                          className={`${styles.ufMobileNode} ${node.type === "decision" ? styles.ufMobileDecision : ""} ${node.type === "start" || node.type === "end" ? styles.ufMobileTerminal : ""}`}
                        >
                          <span className={styles.ufMobileDot} />
                          {ni <
                            flow.nodes.filter((n) => n.col === 0).length -
                              1 && (
                            <span className={styles.ufMobileLine} />
                          )}
                          <span className={styles.ufMobileNodeLabel}>
                            {node.type === "decision"
                              ? `${node.label[language]}`
                              : node.label[language]}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                {isActive && (
                  <p className={styles.ufMobileFlowDesc}>
                    {flow.description[language]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(UserFlowPanel);
