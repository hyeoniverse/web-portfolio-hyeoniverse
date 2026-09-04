"use client";

import { useMemo } from "react";
import type { StructureItem } from "@/data/about/types";
import {
  buildGraph,
  computeTree,
  computeTreemap,
} from "../_utils/architectureLayout";

type ViewMode = "diagram" | "tree" | "treemap" | "force";

/* 구조 맵이 쓰는 그래프와 파생값 — 같은 노드/엣지를 보기 모드마다 다른 좌표계로 옮긴다.
   선택한 노드에서 뻗어 나가는 엣지·이웃·조상 경로도 여기서 미리 계산해 두고,
   렌더는 그 결과만 읽는다. */
export function useArchitectureGraph({
  structure,
  viewMode,
  selectedIndex,
  hoveredIndex,
}: {
  structure: StructureItem[];
  viewMode: ViewMode;
  selectedIndex: number | null;
  hoveredIndex: number | null;
}) {
  const { nodes, edges } = useMemo(() => buildGraph(structure), [structure]);
  const treePos = useMemo(() => computeTree(nodes), [nodes]);
  const tmRects = useMemo(() => computeTreemap(nodes), [nodes]);

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

  return { nodes, edges, treePos, tmRects, activeEdges, connectedNodes, relatedNodes, forceHighlightIndex, forcePath, forcePathEdges };
}
