"use client";

import { useState, useCallback, useMemo, memo, type ReactNode } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { UserFlow, FlowNode } from "@/data/about";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import PinnedTitleRow from "../PinnedTitleRow";
import T from "@/components/ui/T";
import shared from "../AboutSection.module.css";
import local from "./UserFlowPanel.module.css";
const styles = { ...shared, ...local };

interface UserFlowPanelProps {
  language: Language;
  userFlows: UserFlow[];
  scrollBy?: (deltaX: number) => void;
}

/* ── Flow Icons ── */
const FLOW_ICONS: Record<string, ReactNode> = {
  Visitor: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  Posts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" /><path d="M8 11h8" />
    </svg>
  ),
  Works: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  ),
  Profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Admin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  "Admin/Settings": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  "Admin/Posts · Works": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  "Admin/Settings/Appearance": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  Contact: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Comment: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h8" /><path d="M8 14h4" />
    </svg>
  ),
};

/* ── SVG Layout Constants (Horizontal Zigzag) ── */
const STEP_GAP = 138;
const PAD_X = 68;
const LANE_TOP = 26; // top lane (col=2) — above main
const LANE_MAIN = [80, 142]; // zigzag top / bottom for main path (col=0)
const LANE_BRANCH = 245; // branch path (col=1)
const LANE_MULTI = [40, 112, 184, 256]; // cols 3–6: multi-choice vertical fan
const SVG_H = 305;
const SVG_H_MULTI = 330; // LANE_MULTI 사용 시

const ACTION_W = 132;
const ACTION_H = 38;
const TERMINAL_W = 112;
const TERMINAL_H = 34;
const DIAMOND_W = 96;
const DIAMOND_H = 62;

function nodeX(step: number) {
  return PAD_X + step * STEP_GAP;
}
function nodeY(lane: number, step: number, override?: number) {
  if (override != null) return override;
  if (lane === 2) return LANE_TOP;
  if (lane === 1) return LANE_BRANCH;
  if (lane >= 3) return LANE_MULTI[lane - 3] ?? LANE_BRANCH;
  return LANE_MAIN[step % 2]; // even=top, odd=bottom
}

/** Half-width per node type */
function halfW(type: FlowNode["type"]) {
  switch (type) {
    case "start":
    case "end":
      return TERMINAL_W / 2;
    case "action":
      return ACTION_W / 2;
    case "decision":
      return DIAMOND_W / 2;
  }
}

/** Half-height per node type */
function halfH(type: FlowNode["type"]) {
  switch (type) {
    case "start":
    case "end":
      return TERMINAL_H / 2;
    case "action":
      return ACTION_H / 2;
    case "decision":
      return DIAMOND_H / 2;
  }
}

/** Build edge SVG path — 꺾은선 (orthogonal elbow) */
function buildEdgePath(from: FlowNode, to: FlowNode, mergeX?: number, entryDir?: "top" | "left"): string {
  const fx = nodeX(from.row);
  const fy = nodeY(from.col, from.row, from.y);
  const tx = nodeX(to.row);
  const ty = nodeY(to.col, to.row, to.y);
  const r = 8; // corner radius

  // 역방향 루프백
  if (to.row < from.row || (to.row === from.row && to.col < from.col)) {
    // LANE_MULTI 역방향
    if (from.col >= 3) {
      // 같은 Y 역방향: 직선 (좌로)
      if (fy === ty) {
        const exitX = fx - halfW(from.type);
        const entryX = tx + halfW(to.type);
        return `M${exitX},${fy} L${entryX},${ty}`;
      }
      // ㄴ자: 타겟이 시각적으로 아래에 있으면 (아래 → 좌)
      if (ty > fy) {
        const exitY = fy + halfH(from.type);
        const entryX = tx + halfW(to.type);
        const entryY = ty;
        return [
          `M${fx},${exitY}`,
          `L${fx},${entryY - r}`,
          `Q${fx},${entryY} ${fx - r},${entryY}`,
          `L${entryX},${entryY}`,
        ].join(" ");
      }
      // 하단 러너 (아래 → 좌 → 위로 돌아감)
      const loopGap = 28;
      // 다른 row 간 루프백: bottomLane으로 통일 / 같은 row: 최소한으로
      const bottomLane = from.row !== to.row
        ? LANE_MULTI[LANE_MULTI.length - 1] + 31
        : 0;
      const runnerY = Math.max(bottomLane, fy + halfH(from.type), ty + halfH(to.type)) + loopGap;
      const exitY = fy + halfH(from.type);

      // 다른 row 루프백: 하단 러너 → target X → 위로 올라가서 아래쪽 진입
      if (from.row !== to.row) {
        const entryY = ty + halfH(to.type);
        return [
          `M${fx},${exitY}`,
          `L${fx},${runnerY - r}`,
          `Q${fx},${runnerY} ${fx - r},${runnerY}`,
          `L${tx + r},${runnerY}`,
          `Q${tx},${runnerY} ${tx},${runnerY - r}`,
          `L${tx},${entryY}`,
        ].join(" ");
      }

      // 같은 row 루프백: 왼쪽으로 돌아서 좌측 진입
      const entryY = ty;
      const entryX = tx - halfW(to.type);
      const loopX = Math.max(8, Math.min(fx, tx) - Math.max(halfW(from.type), halfW(to.type)) - loopGap);
      return [
        `M${fx},${exitY}`,
        `L${fx},${runnerY - r}`,
        `Q${fx},${runnerY} ${fx - r},${runnerY}`,
        `L${loopX + r},${runnerY}`,
        `Q${loopX},${runnerY} ${loopX},${runnerY - r}`,
        `L${loopX},${entryY + r}`,
        `Q${loopX},${entryY} ${loopX + r},${entryY}`,
        `L${entryX},${entryY}`,
      ].join(" ");
    }

    // 기본: 왼쪽을 돌아서 되돌아가는 경로
    const loopX = PAD_X / 2;
    const exitX = fx - halfW(from.type);
    const exitY = fy;
    const entryX = tx - halfW(to.type);
    const entryY = ty;
    return [
      `M${exitX},${exitY}`,
      `L${loopX + r},${exitY}`,
      `Q${loopX},${exitY} ${loopX},${exitY - r}`,
      `L${loopX},${entryY + r}`,
      `Q${loopX},${entryY} ${loopX + r},${entryY}`,
      `L${entryX},${entryY}`,
    ].join(" ");
  }

  // Decision → 같은 row 수직 분기: 위 또는 아래
  if (from.type === "decision" && from.row === to.row && from.col !== to.col) {
    if (ty < fy) {
      // 위쪽: diamond top → 노드 bottom
      const exitY = fy - DIAMOND_H / 2;
      const entryY = ty + halfH(to.type);
      return `M${fx},${exitY} L${fx},${entryY}`;
    }
    // 아래쪽: diamond bottom → 노드 top
    const exitY = fy + DIAMOND_H / 2;
    const entryY = ty - halfH(to.type);
    return `M${fx},${exitY} L${fx},${entryY}`;
  }

  if (from.type === "decision" && from.col !== to.col && ty > fy && to.row <= from.row) {
    // "No" branch: diamond bottom → Z자형 (아래 → 오른쪽 → 아래)
    const exitX = fx;
    const exitY = fy + DIAMOND_H / 2;
    const entryY = ty - halfH(to.type);
    const midY = (exitY + entryY) / 2;
    return [
      `M${exitX},${exitY}`,
      `L${exitX},${midY - r}`,
      `Q${exitX},${midY} ${exitX + r},${midY}`,
      `L${tx - r},${midY}`,
      `Q${tx},${midY} ${tx},${midY + r}`,
      `L${tx},${entryY}`,
    ].join(" ");
  }

  // Decision → 위쪽 대상, 위에서 진입: 다이아몬드 위 → 타겟 위쪽 러너 → 아래로 진입
  if (entryDir === "top" && from.type === "decision" && ty < fy) {
    const exitY = fy - DIAMOND_H / 2;
    const entryY = ty - halfH(to.type);
    const runY = entryY - 12;
    return [
      `M${fx},${exitY}`,
      `L${fx},${runY + r}`,
      `Q${fx},${runY} ${fx + r},${runY}`,
      `L${tx - r},${runY}`,
      `Q${tx},${runY} ${tx},${runY + r}`,
      `L${tx},${entryY}`,
    ].join(" ");
  }

  // 같은 row, 다른 col: 수직 연결
  if (from.row === to.row && from.col !== to.col) {
    const exitY = fy + halfH(from.type);
    const entryY = ty - halfH(to.type);
    return `M${fx},${exitY} L${fx},${entryY}`;
  }

  // 꺾은선: 오른쪽으로 → 중간에서 수직 꺾임 → 다시 오른쪽으로
  const exitX = fx + halfW(from.type);
  const entryX = tx - halfW(to.type);
  const midX = mergeX ?? (exitX + entryX) / 2;

  if (fy === ty) {
    // 같은 높이면 직선
    return `M${exitX},${fy} L${entryX},${ty}`;
  }

  // 수직 방향
  const dy = ty > fy ? 1 : -1;

  return [
    `M${exitX},${fy}`,
    `L${midX - r},${fy}`,
    `Q${midX},${fy} ${midX},${fy + r * dy}`,
    `L${midX},${ty - r * dy}`,
    `Q${midX},${ty} ${midX + r},${ty}`,
    `L${entryX},${ty}`,
  ].join(" ");
}

/** Edge label position */
function edgeLabelPos(
  from: FlowNode,
  to: FlowNode,
  _label: string,
): { x: number; y: number; anchor: string } {
  const fx = nodeX(from.row);
  const fy = nodeY(from.col, from.row, from.y);
  const ty = nodeY(to.col, to.row, to.y);

  // 역방향 루프백
  if (to.row < from.row || (to.row === from.row && to.col < from.col)) {
    if (from.col >= 3) {
      // 하단 러너: 수평 구간 중앙에 라벨
      const tx = nodeX(to.row);
      const runnerY = Math.max(fy + halfH(from.type), ty + halfH(to.type)) + 28;
      return { x: (fx + tx) / 2, y: runnerY - 6, anchor: "middle" };
    }
    const loopX = PAD_X / 2;
    return { x: loopX - 6, y: (fy + ty) / 2, anchor: "end" };
  }

  if (from.type === "decision" && from.col !== to.col) {
    // 같은 row: 수직 분기 라벨 (위/아래)
    if (from.row === to.row) {
      if (ty < fy) return { x: fx + 10, y: fy - DIAMOND_H / 2 - 6, anchor: "start" };
      // 긴 수직 드롭(3+ col): 타겟 노드 위에 라벨
      if (to.col - from.col >= 3) return { x: fx + 10, y: ty - halfH(to.type) - 10, anchor: "start" };
      return { x: fx + 10, y: fy + DIAMOND_H / 2 + 14, anchor: "start" };
    }
    // Z자형 (아래쪽, 같은/역방향 대상): 다이아몬드 아래 라벨
    if (ty > fy && to.row <= from.row) return { x: fx + 10, y: fy + DIAMOND_H / 2 + 14, anchor: "start" };
    // 그 외: 기본 (오른쪽) 라벨로 폴스루
  }
  // 같은 col, y override로 위쪽 대상: 다이아몬드 위 라벨
  if (from.type === "decision" && ty < fy) {
    return { x: fx + 10, y: fy - DIAMOND_H / 2 - 6, anchor: "start" };
  }
  // 수평 분기: 오른쪽 위
  return { x: fx + halfW(from.type) + 6, y: fy - 6, anchor: "start" };
}

function UserFlowPanel({
  language,
  userFlows,
  scrollBy,
}: UserFlowPanelProps) {
  const flowCount = userFlows.length;
  const isMobile = useMobileLayout();

  /* ── Pinned Scroll ── */
  const { panelRef, contentRef, activeIndex } = usePinnedScroll(
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
  // suppress unused — mobileStRef is used internally by the hook
  void mobileStRef;

  const currentIdx = isMobile ? mobileActiveIdx : activeIndex;
  const activeFlow = userFlows[currentIdx] ?? userFlows[0];

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
  const maxStep = Math.max(...activeFlow.nodes.map((n) => n.row));
  const maxCol = Math.max(...activeFlow.nodes.map((n) => n.col));
  const svgW = PAD_X + maxStep * STEP_GAP + PAD_X;
  const svgH = maxCol >= 3 ? SVG_H_MULTI : SVG_H;

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${styles.panelExtraWide}`}
    >
      <div
        ref={contentRef}
        className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}
      >
        <PinnedTitleRow
         
          title={<T k="aboutPage.panels.userFlow" />}
          rightContent={
            <>
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
              <span className={styles.ufFlowCounter} key={`cnt-${currentIdx}`}>
                <span className={styles.ufFlowCounterCurrent}>{currentIdx + 1}</span>
                <span className={styles.ufFlowCounterSep}>/</span>
                <span className={styles.ufFlowCounterTotal}>{flowCount}</span>
              </span>
            </>
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
                      const pos = edgeLabelPos(from, to, edge.label);
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
          {userFlows.map((flow, fi) => {
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
