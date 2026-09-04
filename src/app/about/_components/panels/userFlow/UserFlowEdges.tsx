"use client";

import { memo } from "react";
import type { FlowNode } from "@/data/about";
import { userFlows } from "@/data/about/architecture";
import {
  nodeX,
  nodeY,
  halfW,
  buildEdgePath,
  edgeLabelPos,
} from "../../_utils/flowLayout";
import local from "../UserFlowPanel.module.css";
const styles = local;

type Flow = (typeof userFlows)[number];

/* 플로우 엣지 — 같은 노드로 들어오는 라벨 없는 엣지가 셋 이상이면 한 지점에서 합류시킨다.
   합류선을 안 쓰면 화살표가 각자 대각선으로 들어와 도형 위를 지나간다. */
function UserFlowEdges({
  flow,
  nodeMap,
  seqOrder,
}: {
  flow: Flow;
  nodeMap: Map<string, FlowNode>;
  seqOrder: { nodeSeq: Map<string, number>; edgeSeq: Map<string, number> };
}) {
  return (
    <>
              {(() => {
                // 같은 target을 공유하는 엣지 (라벨 없는 것만) 3개 이상 → 합류선 mergeX 계산
                const mergeXMap = new Map<string, number>();
                const edgesByTarget = new Map<string, typeof flow.edges>();
                for (const e of flow.edges) {
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
                return flow.edges.map((edge) => {
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

    </>
  );
}

export default memo(UserFlowEdges);
