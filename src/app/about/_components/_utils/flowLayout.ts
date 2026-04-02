import type { FlowNode } from "@/data/about";

/* ── SVG Layout Constants (Horizontal Zigzag) ── */
export const STEP_GAP = 138;
export const PAD_X = 68;
export const LANE_TOP = 26;
export const LANE_MAIN: [number, number] = [80, 142];
export const LANE_BRANCH = 245;
export const LANE_MULTI = [40, 112, 184, 256];
export const SVG_H = 305;
export const SVG_H_MULTI = 330;

export const ACTION_W = 132;
export const ACTION_H = 38;
export const TERMINAL_W = 112;
export const TERMINAL_H = 34;
export const DIAMOND_W = 96;
export const DIAMOND_H = 62;

/* ── Position helpers ── */

export function nodeX(step: number) {
  return PAD_X + step * STEP_GAP;
}

export function nodeY(lane: number, step: number, override?: number) {
  if (override != null) return override;
  if (lane === 2) return LANE_TOP;
  if (lane === 1) return LANE_BRANCH;
  if (lane >= 3) return LANE_MULTI[lane - 3] ?? LANE_BRANCH;
  return LANE_MAIN[step % 2];
}

/** Half-width per node type */
export function halfW(type: FlowNode["type"]) {
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
export function halfH(type: FlowNode["type"]) {
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

/* ── SVG dimensions ── */

export function svgDimensions(nodes: FlowNode[]) {
  const maxStep = Math.max(...nodes.map((n) => n.row));
  const maxCol = Math.max(...nodes.map((n) => n.col));
  const svgW = PAD_X + maxStep * STEP_GAP + PAD_X;
  const svgH = maxCol >= 3 ? SVG_H_MULTI : SVG_H;
  return { svgW, svgH };
}

/* ── Edge path builder (orthogonal elbow) ── */

export function buildEdgePath(
  from: FlowNode,
  to: FlowNode,
  mergeX?: number,
  entryDir?: "top" | "left",
): string {
  const fx = nodeX(from.row);
  const fy = nodeY(from.col, from.row, from.y);
  const tx = nodeX(to.row);
  const ty = nodeY(to.col, to.row, to.y);
  const r = 8;

  // 역방향 루프백
  if (to.row < from.row || (to.row === from.row && to.col < from.col)) {
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
        return [
          `M${fx},${exitY}`,
          `L${fx},${ty - r}`,
          `Q${fx},${ty} ${fx - r},${ty}`,
          `L${entryX},${ty}`,
        ].join(" ");
      }
      // 하단 러너 (아래 → 좌 → 위로 돌아감)
      const loopGap = 28;
      const bottomLane =
        from.row !== to.row ? LANE_MULTI[LANE_MULTI.length - 1] + 31 : 0;
      const runnerY =
        Math.max(bottomLane, fy + halfH(from.type), ty + halfH(to.type)) +
        loopGap;
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
      const loopX = Math.max(
        8,
        Math.min(fx, tx) - Math.max(halfW(from.type), halfW(to.type)) - loopGap,
      );
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

    // non-LANE_MULTI 역방향: ㄴ자 (아래 → 좌)
    if (ty > fy) {
      const exitY = fy + halfH(from.type);
      const entryX = tx + halfW(to.type);
      return [
        `M${fx},${exitY}`,
        `L${fx},${ty - r}`,
        `Q${fx},${ty} ${fx - r},${ty}`,
        `L${entryX},${ty}`,
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
      const exitY = fy - DIAMOND_H / 2;
      const entryY = ty + halfH(to.type);
      return `M${fx},${exitY} L${fx},${entryY}`;
    }
    const exitY = fy + DIAMOND_H / 2;
    const entryY = ty - halfH(to.type);
    return `M${fx},${exitY} L${fx},${entryY}`;
  }

  if (
    from.type === "decision" &&
    from.col !== to.col &&
    ty > fy &&
    to.row <= from.row
  ) {
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

  // Decision → 위쪽 대상, 위에서 진입
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
    return `M${exitX},${fy} L${entryX},${ty}`;
  }

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

/* ── Edge label position ── */

export function edgeLabelPos(
  from: FlowNode,
  to: FlowNode,
): { x: number; y: number; anchor: string } {
  const fx = nodeX(from.row);
  const fy = nodeY(from.col, from.row, from.y);
  const ty = nodeY(to.col, to.row, to.y);

  // 역방향 루프백
  if (to.row < from.row || (to.row === from.row && to.col < from.col)) {
    if (from.col >= 3) {
      const tx = nodeX(to.row);
      const runnerY = Math.max(fy + halfH(from.type), ty + halfH(to.type)) + 28;
      return { x: (fx + tx) / 2, y: runnerY - 6, anchor: "middle" };
    }
    if (ty > fy) {
      return { x: fx + 10, y: fy + halfH(from.type) + 14, anchor: "start" };
    }
    const loopX = PAD_X / 2;
    return { x: loopX - 6, y: (fy + ty) / 2, anchor: "end" };
  }

  if (from.type === "decision" && from.col !== to.col) {
    if (from.row === to.row) {
      if (ty < fy)
        return { x: fx + 10, y: fy - DIAMOND_H / 2 - 6, anchor: "start" };
      if (to.col - from.col >= 3)
        return { x: fx + 10, y: ty - halfH(to.type) - 10, anchor: "start" };
      return { x: fx + 10, y: fy + DIAMOND_H / 2 + 14, anchor: "start" };
    }
    if (ty > fy && to.row <= from.row)
      return { x: fx + 10, y: fy + DIAMOND_H / 2 + 14, anchor: "start" };
  }
  if (from.type === "decision" && ty < fy) {
    return { x: fx + 10, y: fy - DIAMOND_H / 2 - 6, anchor: "start" };
  }
  return { x: fx + halfW(from.type) + 6, y: fy - 6, anchor: "start" };
}
