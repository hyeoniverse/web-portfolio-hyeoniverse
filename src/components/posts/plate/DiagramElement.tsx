"use client";

// ── 비주얼 다이어그램 블록 (void) ──
// 위치 보존 자체 포맷(DiagramData)을 React Flow 캔버스로 편집. Slate 노드의 el.data 에 저장.
// 도형(사각/둥근/스타디움/마름모/원) + 색상 지원. mermaid 로 내보내기(구조만 한 방향).
import "@xyflow/react/dist/style.css";

import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import { useEditorRef, useSelected, PlateElement, type PlateElementProps } from "platejs/react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  NodeResizer,
  Position,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  type Node as RFNode,
  type Edge as RFEdge,
  type EdgeMarker,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
} from "@xyflow/react";
import { Plus, FileCode2, Trash2, Maximize2, Minimize2, ArrowRight, ChevronRight, Minus, ArrowLeftRight, Type, Spline, Waypoints } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import TBtn from "./TBtn";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { diagramToMermaid, normalizeDiagram, type DiagramData, type DiagramNode, type DiagramEdge, type DiagramNodeShape, type DiagramArrow, type DiagramLine, type DiagramCurve } from "./diagram/model";
import styles from "./DiagramElement.module.css";

function genId(): string {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return "n" + crypto.randomUUID().slice(0, 8); } catch { /* noop */ }
  return "n" + Math.random().toString(36).slice(2, 10);
}

/** anchor 위치에서 가장 가까운 노드 id (없으면 null) */
function nearestId(anchor: { x: number; y: number } | null, list: RFNode[]): string | null {
  if (!anchor || !list.length) return null;
  let best = Infinity;
  let id: string | null = null;
  list.forEach((n) => { const dx = n.position.x - anchor.x, dy = n.position.y - anchor.y, d = dx * dx + dy * dy; if (d < best) { best = d; id = n.id; } });
  return id;
}

// ── 도형 geometry (viewBox 0 0 100 60) — 노드 배경 SVG + 팔레트 아이콘 공용 ──
function shapeGeom(shape: DiagramNodeShape): React.ReactNode {
  switch (shape) {
    case "rect": return <rect x="1" y="1" width="98" height="58" rx="8" />;
    case "round": return <rect x="1" y="1" width="98" height="58" rx="16" />;
    case "stadium": return <rect x="1" y="1" width="98" height="58" rx="30" />;
    case "circle": return <ellipse cx="50" cy="30" rx="29" ry="29" />;
    case "ellipse": return <ellipse cx="50" cy="30" rx="49" ry="29" />;
    case "diamond": return <polygon points="50,1 99,30 50,59 1,30" />;
    case "hexagon": return <polygon points="22,1 78,1 99,30 78,59 22,59 1,30" />;
    case "parallelogram": return <polygon points="22,1 99,1 78,59 1,59" />;
    case "trapezoid": return <polygon points="24,1 76,1 99,59 1,59" />;
    case "subroutine": return <><rect x="1" y="1" width="98" height="58" /><line x1="11" y1="1" x2="11" y2="59" /><line x1="89" y1="1" x2="89" y2="59" /></>;
    case "cylinder": return <><path d="M1,8 V52 a49,7 0 0 0 98,0 V8 Z" /><ellipse cx="50" cy="8" rx="49" ry="7" /></>;
    default: return null; // text
  }
}
// 둥근 계열은 CSS 로(코너 왜곡 방지), 나머지 도형은 SVG 로 그림
const CSS_SHAPES = new Set<DiagramNodeShape>(["rect", "round", "stadium", "circle"]);
function shapeSvgNode(shape: DiagramNodeShape): React.ReactNode {
  if (CSS_SHAPES.has(shape) || shape === "text") return null;
  return <svg className={styles.dnodeShape} viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>{shapeGeom(shape)}</svg>;
}
function shapeIcon(shape: DiagramNodeShape): React.ReactNode {
  if (shape === "text") return <Type size={14} />;
  return <svg width="17" height="12" viewBox="0 0 100 60" preserveAspectRatio="none" className={styles.shapeIcon} aria-hidden>{shapeGeom(shape)}</svg>;
}

// 노드 라벨 인라인 편집 커밋 콜백 (ShapeNode → DiagramElement)
const DiagramNodeCtx = React.createContext<(id: string, label: string) => void>(() => {});

// ── 커스텀 노드 (도형 + 색 + 4방향 핸들) ──
type ShapeNodeData = { label: string; shape?: DiagramNodeShape; color?: string; fontSize?: number; textColor?: string };
function ShapeNode({ id, data, selected, isConnectable }: NodeProps) {
  const d = data as ShapeNodeData;
  const shape = d.shape || "rect";
  const commitLabel = useContext(DiagramNodeCtx);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const commit = () => { setEditing(false); const v = inputRef.current?.value ?? ""; if (v !== (d.label || "")) commitLabel(id, v); };
  const rootStyle = { ...(d.color ? { ["--dnode-bg"]: d.color } : {}) } as React.CSSProperties;
  const textStyle: React.CSSProperties = { fontSize: d.fontSize ? `${d.fontSize}px` : undefined, color: d.textColor || undefined };
  // 변마다 source + target 핸들 한 쌍씩(같은 위치).
  //  - Strict 모드라 드롭은 target 핸들에서만 완료 → 겹쳐 있어도 감지가 헷갈리지 않음
  //  - 엣지 렌더는 target 끝점을 노드의 target 핸들 목록에서 찾으므로 target 핸들이 반드시 있어야 그려짐
  return (
    <div className={`${styles.dnode} ${styles[`dnode_${shape}`] ?? ""}`} data-selected={selected ? "" : undefined}
      style={rootStyle}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {/* 크기/비율 조절 — 선택 시만 핸들 표시 */}
      <NodeResizer isVisible={selected} minWidth={44} minHeight={28} lineClassName={styles.dresizeLine} handleClassName={styles.dresizeHandle} />
      {shapeSvgNode(shape)}
      {editing ? (
        // 캔버스 내부 인라인 편집 — uncontrolled input(타이핑 중 persist 안 함 → 포커스 유지). nodrag 로 드래그 차단
        <input ref={inputRef} className={`${styles.dnodeInput} nodrag`} defaultValue={d.label || ""} autoFocus style={textStyle}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); commit(); } else if (e.key === "Escape") { e.preventDefault(); setEditing(false); } }}
          onMouseDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
      ) : (
        <span className={styles.dnodeLabel} style={textStyle}>{d.label || ""}</span>
      )}
      {/* target 핸들 먼저(아래) — 엣지 렌더 끝점 + 드롭 수신 */}
      <Handle id="t-top" type="target" position={Position.Top} isConnectable={isConnectable} className={styles.dhandle} />
      <Handle id="t-right" type="target" position={Position.Right} isConnectable={isConnectable} className={styles.dhandle} />
      <Handle id="t-bottom" type="target" position={Position.Bottom} isConnectable={isConnectable} className={styles.dhandle} />
      <Handle id="t-left" type="target" position={Position.Left} isConnectable={isConnectable} className={styles.dhandle} />
      {/* source 핸들 나중(위) — 여기서 드래그 시작 */}
      <Handle id="s-top" type="source" position={Position.Top} isConnectable={isConnectable} className={styles.dhandle} />
      <Handle id="s-right" type="source" position={Position.Right} isConnectable={isConnectable} className={styles.dhandle} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} isConnectable={isConnectable} className={styles.dhandle} />
      <Handle id="s-left" type="source" position={Position.Left} isConnectable={isConnectable} className={styles.dhandle} />
    </div>
  );
}
const NODE_TYPES = { shape: ShapeNode };

const SHAPES: { v: DiagramNodeShape; label: string; en: string }[] = [
  { v: "rect", label: "사각", en: "Rectangle" },
  { v: "round", label: "둥근", en: "Rounded" },
  { v: "stadium", label: "알약", en: "Stadium" },
  { v: "circle", label: "원", en: "Circle" },
  { v: "ellipse", label: "타원", en: "Ellipse" },
  { v: "diamond", label: "마름모", en: "Diamond" },
  { v: "hexagon", label: "육각형", en: "Hexagon" },
  { v: "parallelogram", label: "평행사변형", en: "Parallelogram" },
  { v: "trapezoid", label: "사다리꼴", en: "Trapezoid" },
  { v: "subroutine", label: "서브루틴", en: "Subroutine" },
  { v: "cylinder", label: "원통(DB)", en: "Cylinder" },
  { v: "text", label: "텍스트", en: "Text" },
];
const COLORS = ["", "#e0556a", "#5b8def", "#22c39a", "#f4a43b", "#9b6dd6", "#7a8aa0"];

type EdgeDir = "end" | "both" | "none";
const DIRS: { v: EdgeDir; label: string; en: string; icon: React.ReactNode }[] = [
  { v: "end", label: "끝", en: "End", icon: <ArrowRight size={14} strokeWidth={2.4} /> },
  { v: "both", label: "양방향", en: "Both", icon: <ArrowLeftRight size={14} strokeWidth={2.4} /> },
  { v: "none", label: "화살표 없음", en: "No arrow", icon: <Minus size={14} /> },
];
// 화살촉 모양 (화살표가 있을 때 적용)
const HEADS: { v: DiagramArrow; label: string; en: string; icon: React.ReactNode }[] = [
  { v: "arrowclosed", label: "채운", en: "Filled", icon: <ArrowRight size={14} strokeWidth={2.8} /> },
  { v: "arrow", label: "열린", en: "Open", icon: <ChevronRight size={14} /> },
];
const LINES: { v: DiagramLine; label: string; en: string; dash?: string }[] = [
  { v: "solid", label: "실선", en: "Solid" },
  { v: "dashed", label: "파선", en: "Dashed", dash: "6 4" },
  { v: "dotted", label: "점선", en: "Dotted", dash: "1.5 4" },
];
// 선 모양 (직선/꺾은선/곡선) — RF edge type 매핑
const CURVES: { v: DiagramCurve; label: string; en: string; icon: React.ReactNode }[] = [
  { v: "bezier", label: "곡선", en: "Curved", icon: <Spline size={14} /> },
  { v: "smoothstep", label: "꺾은선", en: "Step", icon: <Waypoints size={14} /> },
  { v: "straight", label: "직선", en: "Straight", icon: <Minus size={14} /> },
];
function curveToType(c?: DiagramCurve): string { return c === "straight" ? "straight" : c === "smoothstep" ? "smoothstep" : "default"; }
function curveFromEdge(e: RFEdge): DiagramCurve { return e.type === "straight" ? "straight" : e.type === "smoothstep" ? "smoothstep" : "bezier"; }
// 텍스트 글자 크기 프리셋
const FONT_SIZES: { v: number; label: string }[] = [
  { v: 12, label: "S" }, { v: 14, label: "M" }, { v: 18, label: "L" }, { v: 24, label: "XL" },
];
// 도형별 기본 크기(리사이즈 전) — .dnode 가 100% 채우도록 노드에 항상 크기 부여
function defaultSize(shape?: DiagramNodeShape): { w: number; h: number } {
  switch (shape) {
    case "text": return { w: 100, h: 40 };
    case "circle": return { w: 84, h: 84 };
    case "ellipse": return { w: 140, h: 78 };
    case "diamond": return { w: 128, h: 88 };
    case "cylinder": return { w: 124, h: 74 };
    case "hexagon": return { w: 140, h: 60 };
    default: return { w: 132, h: 56 };
  }
}
function markerForArrow(arrow?: DiagramArrow): EdgeMarker | undefined {
  if (!arrow || arrow === "none") return undefined;
  return { type: arrow === "arrow" ? MarkerType.Arrow : MarkerType.ArrowClosed };
}
function arrowFromMarker(m: unknown): DiagramArrow {
  const me = m as { type?: string } | undefined;
  if (!me) return "none";
  return me.type === MarkerType.Arrow ? "arrow" : "arrowclosed";
}
/** 엣지의 끝(target) 화살표 종류 */
function endArrow(e: RFEdge): DiagramArrow { return arrowFromMarker(e.markerEnd); }
/** 엣지의 시작(source) 화살표 종류 */
function startArrow(e: RFEdge): DiagramArrow { return arrowFromMarker(e.markerStart); }
/** 엣지 방향 — 양방향 / 끝만 / 없음 */
function dirOf(e: RFEdge): EdgeDir {
  const s = startArrow(e) !== "none", en = endArrow(e) !== "none";
  return s && en ? "both" : (s || en) ? "end" : "none";
}
/** 엣지에 방향 patch 생성 (현재 화살촉 모양 유지) */
function dirPatch(e: RFEdge, dir: EdgeDir): Partial<RFEdge> {
  const head: DiagramArrow = endArrow(e) !== "none" ? endArrow(e) : (startArrow(e) !== "none" ? startArrow(e) : "arrowclosed");
  const m = markerForArrow(head);
  if (dir === "none") return { markerStart: undefined, markerEnd: undefined };
  if (dir === "both") return { markerStart: m, markerEnd: m };
  return { markerStart: undefined, markerEnd: m };
}
function dashForLine(line?: DiagramLine): string | undefined { return LINES.find((l) => l.v === line)?.dash; }
function lineFromEdge(e: RFEdge): DiagramLine {
  const dash = (e.style as { strokeDasharray?: string } | undefined)?.strokeDasharray;
  if (!dash) return "solid";
  return dash.startsWith("1") ? "dotted" : "dashed";
}
function edgeStyleFor(line?: DiagramLine): React.CSSProperties | undefined {
  const dash = dashForLine(line);
  return dash ? { strokeDasharray: dash } : undefined;
}

// DiagramData ↔ React Flow 매핑
function toRF(d: DiagramData): { nodes: RFNode[]; edges: RFEdge[] } {
  return {
    nodes: d.nodes.map((n) => {
      const def = defaultSize(n.shape);
      return {
        id: n.id,
        position: { x: n.x, y: n.y },
        // 노드에 항상 크기 부여 → .dnode 가 100% 채우고 NodeResizer 로 조절 가능
        width: n.width ?? def.w,
        height: n.height ?? def.h,
        data: { label: n.label, shape: n.shape, color: n.color, fontSize: n.fontSize, textColor: n.textColor } as ShapeNodeData,
        type: "shape",
      } as RFNode;
    }),
    edges: d.edges.map((e) => ({
      id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, label: e.label,
      type: curveToType(e.curve),
      markerEnd: markerForArrow(e.arrowEnd ?? e.arrow ?? "arrowclosed"),
      markerStart: markerForArrow(e.arrowStart ?? "none"),
      style: edgeStyleFor(e.line),
    })),
  };
}
function fromRF(nodes: RFNode[], edges: RFEdge[]): DiagramData {
  return {
    nodes: nodes.map((n): DiagramNode => {
      const dd = n.data as ShapeNodeData;
      const w = typeof n.width === "number" ? Math.round(n.width) : undefined;
      const h = typeof n.height === "number" ? Math.round(n.height) : undefined;
      return { id: n.id, label: typeof dd?.label === "string" ? dd.label : "", x: Math.round(n.position.x), y: Math.round(n.position.y), width: w, height: h, shape: dd?.shape, color: dd?.color || undefined, fontSize: dd?.fontSize, textColor: dd?.textColor || undefined };
    }),
    edges: edges.map((e): DiagramEdge => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined, label: typeof e.label === "string" ? e.label : undefined, arrowEnd: endArrow(e), arrowStart: startArrow(e), line: lineFromEdge(e), curve: curveFromEdge(e) })),
  };
}

export function DiagramElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { language } = useLanguage();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const el = props.element as Record<string, unknown>;
  const initial = useMemo(() => normalizeDiagram(el.data), [el.data]);

  const [nodes, setNodes] = useState<RFNode[]>(() => toRF(initial).nodes);
  const [edges, setEdges] = useState<RFEdge[]>(() => toRF(initial).edges);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [view, setView] = useState<"canvas" | "form">("canvas");
  const [fullscreen, setFullscreen] = useState(false);
  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setFullscreen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const elementRef = useRef(props.element);
  elementRef.current = props.element;
  const nodesRef = useRef(nodes); nodesRef.current = nodes;
  const edgesRef = useRef(edges); edgesRef.current = edges;

  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  const persist = useCallback((nextNodes: RFNode[], nextEdges: RFEdge[]) => {
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { if (!editor.api.node(p)) return; } catch { return; }
    try { editor.tf.setNodes({ data: fromRF(nextNodes, nextEdges) } as Record<string, unknown>, { at: p }); } catch { /* noop */ }
  }, [editor]);

  // ── 모든 변경은 persist 를 "동기"로 호출 → el.data 를 즉시 갱신.
  //    (블록이 매 변경마다 remount 돼도, remount 는 el.data 에서 state 를 재초기화하므로 데이터가 유지됨.
  //     setTimeout 이면 remount(언마운트) 후 실행돼 findPath 가 실패 → 저장 누락 → 변경 소실됐음) ──
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const removedIds = (changes.filter((c) => c.type === "remove") as Array<{ id: string }>).map((c) => c.id);
    if (removedIds.length) {
      const anchor = nodesRef.current.find((n) => removedIds.includes(n.id))?.position ?? null;
      const next = applyNodeChanges(changes, nodesRef.current);
      const near = nearestId(anchor, next);
      const withSel = near ? next.map((n) => ({ ...n, selected: n.id === near })) : next;
      setNodes(withSel);
      setSelectedIds(near ? [near] : []);
      persist(withSel, edgesRef.current);
    } else if (changes.some((c) => c.type === "dimensions" && (c as { resizing?: boolean }).resizing === false)) {
      // 리사이즈 종료 → 크기 저장
      const next = applyNodeChanges(changes, nodesRef.current);
      setNodes(next);
      persist(next, edgesRef.current);
    } else {
      // 드래그·리사이즈 중·선택 등 — 로컬 state 만(잦음, persist 안 함 → remount 안 함)
      setNodes((nds) => applyNodeChanges(changes, nds));
    }
  }, [persist]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (changes.some((c) => c.type === "remove")) {
      const next = applyEdgeChanges(changes, edgesRef.current);
      setEdges(next);
      persist(nodesRef.current, next);
    } else {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    }
  }, [persist]);
  const onNodeDragStop = useCallback(() => { persist(nodesRef.current, edgesRef.current); }, [persist]);
  const onConnect = useCallback((conn: Connection) => {
    const next = addEdge({ ...conn, id: genId(), markerEnd: { type: MarkerType.ArrowClosed } }, edgesRef.current);
    setEdges(next);
    persist(nodesRef.current, next);
  }, [persist]);
  const onSelectionChange = useCallback(({ nodes: sel, edges: eSel }: { nodes: RFNode[]; edges: RFEdge[] }) => {
    setSelectedIds(sel.map((n) => n.id));
    setSelectedEdgeIds(eSel.map((e) => e.id));
  }, []);

  // 선택 엣지 변형 공통
  const mutateSelectedEdges = useCallback((fn: (e: RFEdge) => RFEdge) => {
    const ids = new Set(selectedEdgeIds);
    if (!ids.size) return;
    const next = edgesRef.current.map((e) => (ids.has(e.id) ? fn(e) : e));
    setEdges(next);
    persist(nodesRef.current, next);
  }, [persist, selectedEdgeIds]);
  // 방향 — 끝만 / 양방향 / 없음 (현재 화살촉 모양 유지)
  const setEdgeDir = useCallback((dir: EdgeDir) => {
    mutateSelectedEdges((e) => ({ ...e, ...dirPatch(e, dir) }));
  }, [mutateSelectedEdges]);
  // 화살촉 모양 — 있는 화살표에 적용(없으면 끝에 생성)
  const setEdgeHead = useCallback((shape: DiagramArrow) => {
    mutateSelectedEdges((e) => {
      const hasStart = !!e.markerStart, hasEnd = !!e.markerEnd;
      if (!hasStart && !hasEnd) return { ...e, markerEnd: markerForArrow(shape) };
      return { ...e, markerStart: hasStart ? markerForArrow(shape) : undefined, markerEnd: hasEnd ? markerForArrow(shape) : undefined };
    });
  }, [mutateSelectedEdges]);
  // 선 스타일 — 실선/파선/점선
  const setEdgeLine = useCallback((line: DiagramLine) => {
    mutateSelectedEdges((e) => ({ ...e, style: edgeStyleFor(line) }));
  }, [mutateSelectedEdges]);
  // 선 모양 — 곡선/꺾은선/직선
  const setEdgeCurve = useCallback((curve: DiagramCurve) => {
    mutateSelectedEdges((e) => ({ ...e, type: curveToType(curve) }));
  }, [mutateSelectedEdges]);
  const deleteSelectedEdges = useCallback(() => {
    const ids = new Set(selectedEdgeIds);
    if (!ids.size) return;
    const next = edgesRef.current.filter((e) => !ids.has(e.id));
    setEdges(next);
    setSelectedEdgeIds([]);
    persist(nodesRef.current, next);
  }, [persist, selectedEdgeIds]);

  const addNode = useCallback((shape?: DiagramNodeShape) => {
    const id = genId();
    const c = nodesRef.current.length;
    const isText = shape === "text";
    const label = isText ? t("텍스트", "Text") : t("노드", "Node");
    const n: RFNode = { id, position: { x: 60 + (c % 4) * 50, y: 60 + Math.floor(c / 4) * 80 }, data: { label, shape } as ShapeNodeData, type: "shape", selected: true };
    const next = [...nodesRef.current.map((x) => ({ ...x, selected: false })), n];
    setNodes(next);
    setSelectedIds([id]);
    persist(next, edgesRef.current);
  }, [persist, t]);

  const patchSelected = useCallback((patch: Partial<ShapeNodeData>) => {
    const ids = new Set(selectedIds);
    if (!ids.size) return;
    const next = nodesRef.current.map((n) => (ids.has(n.id) ? { ...n, data: { ...(n.data as ShapeNodeData), ...patch } } : n));
    setNodes(next);
    persist(next, edgesRef.current);
  }, [persist, selectedIds]);

  const deleteSelected = useCallback(() => {
    const ids = new Set(selectedIds);
    if (!ids.size) return;
    const anchor = nodesRef.current.find((n) => ids.has(n.id))?.position ?? null;
    const nextNodes = nodesRef.current.filter((n) => !ids.has(n.id));
    const nextEdges = edgesRef.current.filter((e) => !ids.has(e.source) && !ids.has(e.target));
    const near = nearestId(anchor, nextNodes);
    const withSel = near ? nextNodes.map((n) => ({ ...n, selected: n.id === near })) : nextNodes;
    setNodes(withSel);
    setEdges(nextEdges);
    setSelectedIds(near ? [near] : []);
    persist(withSel, nextEdges);
  }, [persist, selectedIds]);

  // ── 폼 에디터 조작 (특정 노드/엣지) — 동기 persist ──
  const patchNode = useCallback((id: string, patch: Partial<ShapeNodeData>) => {
    const next = nodesRef.current.map((n) => (n.id === id ? { ...n, data: { ...(n.data as ShapeNodeData), ...patch } } : n));
    setNodes(next);
    persist(next, edgesRef.current);
  }, [persist]);
  // 캔버스 인라인 편집 커밋 (ShapeNode → context)
  const commitNodeLabel = useCallback((id: string, label: string) => { patchNode(id, { label }); }, [patchNode]);
  const removeNode = useCallback((id: string) => {
    const nn = nodesRef.current.filter((n) => n.id !== id);
    const ne = edgesRef.current.filter((e) => e.source !== id && e.target !== id);
    setNodes(nn); setEdges(ne);
    persist(nn, ne);
  }, [persist]);
  const addFormEdge = useCallback(() => {
    if (nodesRef.current.length < 2) { showToast(t("노드를 2개 이상 먼저 추가해 주세요.", "Add at least 2 nodes first."), "info"); return; }
    const [a, b] = nodesRef.current;
    const next = [...edgesRef.current, { id: genId(), source: a.id, target: b.id, markerEnd: { type: MarkerType.ArrowClosed } } as RFEdge];
    setEdges(next);
    persist(nodesRef.current, next);
  }, [persist, t]);
  const patchEdge = useCallback((id: string, patch: Partial<RFEdge>) => {
    const next = edgesRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setEdges(next);
    persist(nodesRef.current, next);
  }, [persist]);
  const removeEdge = useCallback((id: string) => {
    const next = edgesRef.current.filter((e) => e.id !== id);
    setEdges(next);
    persist(nodesRef.current, next);
  }, [persist]);

  const exportMermaid = useCallback(() => {
    const code = diagramToMermaid(fromRF(nodesRef.current, edgesRef.current));
    try { navigator.clipboard?.writeText(code); showToast(t("mermaid 코드 복사됨", "Mermaid code copied"), "success"); }
    catch { showToast(t("복사 실패", "Copy failed"), "error"); }
  }, [t]);

  const hasSelection = selectedIds.length > 0;
  const selNodeData = hasSelection ? (nodes.find((n) => n.id === selectedIds[0])?.data as ShapeNodeData | undefined) : undefined;
  const curShape = selNodeData ? (selNodeData.shape || "rect") : null;
  const curFontSize = selNodeData?.fontSize ?? 14;
  const curTextColor = selNodeData?.textColor ?? "";
  const curFillColor = selNodeData?.color ?? "";
  const hasEdgeSelection = selectedEdgeIds.length > 0;
  const selEdge = hasEdgeSelection ? edges.find((e) => e.id === selectedEdgeIds[0]) : undefined;
  const curDir: EdgeDir | null = selEdge ? dirOf(selEdge) : null;
  const curHead: DiagramArrow | null = selEdge ? (endArrow(selEdge) !== "none" ? endArrow(selEdge) : startArrow(selEdge)) : null;
  const curLine: DiagramLine | null = selEdge ? lineFromEdge(selEdge) : null;
  const curCurve: DiagramCurve | null = selEdge ? curveFromEdge(selEdge) : null;

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps}>
        <PlateElement {...props} className={styles.diagramBlock}>
          <div contentEditable={false} className={`${styles.diagramInner}${fullscreen ? ` ${styles.diagramFullscreen}` : ""}`} data-selected={selected ? "" : undefined}>
            <div className={styles.diagramToolbar}>
              <TBtn onMouseDown={(e) => { e.preventDefault(); addNode(); }} tooltip={t("노드 추가", "Add node")} style={{ gap: "var(--spacing-3xs)" }}>
                <Plus size={14} />{t("노드", "Node")}
              </TBtn>
              <TBtn onMouseDown={(e) => { e.preventDefault(); addNode("text"); }} tooltip={t("텍스트 추가", "Add text")} style={{ gap: "var(--spacing-3xs)" }}>
                <Type size={14} />{t("텍스트", "Text")}
              </TBtn>
              {/* 선택 노드 도형/색/삭제 (캔버스에서만) */}
              {hasSelection && view === "canvas" && (
                <>
                  <span className={styles.diagramToolbarDiv} />
                  <div className={styles.diagramShapes}>
                    {SHAPES.map((s) => (
                      <button key={s.v} type="button" className={styles.diagramShapeBtn} data-on={curShape === s.v ? "" : undefined}
                        title={t(s.label, s.en)} onMouseDown={(e) => { e.preventDefault(); patchSelected({ shape: s.v }); }}>
                        {shapeIcon(s.v)}
                      </button>
                    ))}
                  </div>
                  {/* 채우기 색 (텍스트 노드는 배경 없어 생략) */}
                  {curShape !== "text" && (
                    <div className={styles.diagramColors}>
                      {COLORS.map((c) => (
                        <button key={c || "none"} type="button" className={styles.diagramColorBtn} data-none={c ? undefined : ""} data-on={curFillColor === c ? "" : undefined}
                          title={c || t("색 없음", "No color")} style={c ? { background: c } : undefined}
                          onMouseDown={(e) => { e.preventDefault(); patchSelected({ color: c }); }} />
                      ))}
                    </div>
                  )}
                  {/* 텍스트: 크기 + 색 */}
                  <span className={styles.diagramToolbarDiv} />
                  <span className={styles.diagramTextCue} title={t("텍스트", "Text")}><Type size={13} /></span>
                  <div className={styles.diagramShapes}>
                    {FONT_SIZES.map((f, i) => (
                      <button key={f.v} type="button" className={styles.diagramShapeBtn} data-on={curFontSize === f.v ? "" : undefined}
                        title={`${f.label} · ${f.v}px`} onMouseDown={(e) => { e.preventDefault(); patchSelected({ fontSize: f.v }); }}>
                        <span style={{ fontSize: `${10 + i * 2}px`, fontWeight: 600, lineHeight: 1 }}>A</span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.diagramColors}>
                    {COLORS.map((c) => (
                      <button key={c || "none"} type="button" className={styles.diagramColorBtn} data-none={c ? undefined : ""} data-on={curTextColor === c ? "" : undefined}
                        title={c ? t("글자색", "Text color") : t("기본색", "Default")} style={c ? { background: c } : undefined}
                        onMouseDown={(e) => { e.preventDefault(); patchSelected({ textColor: c }); }} />
                    ))}
                  </div>
                  <TBtn onMouseDown={(e) => { e.preventDefault(); deleteSelected(); }} tooltip={t("삭제", "Delete")} square>
                    <Trash2 size={14} />
                  </TBtn>
                </>
              )}
              {/* 선택 엣지: 방향 / 화살촉 / 선 스타일 / 삭제 (캔버스에서만) */}
              {hasEdgeSelection && view === "canvas" && (
                <>
                  <span className={styles.diagramToolbarDiv} />
                  {/* 방향 */}
                  <div className={styles.diagramShapes}>
                    {DIRS.map((d) => (
                      <button key={d.v} type="button" className={styles.diagramShapeBtn} data-on={curDir === d.v ? "" : undefined}
                        title={t(d.label, d.en)} onMouseDown={(e) => { e.preventDefault(); setEdgeDir(d.v); }}>
                        {d.icon}
                      </button>
                    ))}
                  </div>
                  {/* 화살촉 모양 (화살표 있을 때만) */}
                  {curDir !== "none" && (
                    <div className={styles.diagramShapes}>
                      {HEADS.map((h) => (
                        <button key={h.v} type="button" className={styles.diagramShapeBtn} data-on={curHead === h.v ? "" : undefined}
                          title={t(h.label, h.en)} onMouseDown={(e) => { e.preventDefault(); setEdgeHead(h.v); }}>
                          {h.icon}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* 선 스타일 */}
                  <div className={styles.diagramShapes}>
                    {LINES.map((l) => (
                      <button key={l.v} type="button" className={styles.diagramShapeBtn} data-on={curLine === l.v ? "" : undefined}
                        title={t(l.label, l.en)} onMouseDown={(e) => { e.preventDefault(); setEdgeLine(l.v); }}>
                        <span className={styles.diagramLinePreview} style={{ borderTopStyle: l.v === "solid" ? "solid" : l.v }} />
                      </button>
                    ))}
                  </div>
                  {/* 선 모양 — 곡선/꺾은선/직선 */}
                  <div className={styles.diagramShapes}>
                    {CURVES.map((c) => (
                      <button key={c.v} type="button" className={styles.diagramShapeBtn} data-on={curCurve === c.v ? "" : undefined}
                        title={t(c.label, c.en)} onMouseDown={(e) => { e.preventDefault(); setEdgeCurve(c.v); }}>
                        {c.icon}
                      </button>
                    ))}
                  </div>
                  <TBtn onMouseDown={(e) => { e.preventDefault(); deleteSelectedEdges(); }} tooltip={t("연결 삭제", "Delete edge")} square>
                    <Trash2 size={14} />
                  </TBtn>
                </>
              )}
              <span className={styles.diagramToolbarSpacer} />
              <span onMouseDown={(e) => e.stopPropagation()} style={{ display: "inline-flex" }}>
                <SegmentedControl<"canvas" | "form">
                  items={[{ value: "canvas", label: t("캔버스", "Canvas") }, { value: "form", label: t("폼", "Form") }]}
                  value={view} onChange={setView} size="sm"
                />
              </span>
              <span className={styles.diagramToolbarDiv} />
              <TBtn onMouseDown={(e) => { e.preventDefault(); exportMermaid(); }} tooltip={t("mermaid 코드로 복사", "Copy as mermaid")} style={{ gap: "var(--spacing-3xs)" }}>
                <FileCode2 size={14} />Mermaid
              </TBtn>
              <TBtn active={fullscreen} onMouseDown={(e) => { e.preventDefault(); setFullscreen((v) => !v); }} tooltip={fullscreen ? t("전체화면 종료", "Exit fullscreen") : t("전체화면", "Fullscreen")} square>
                {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </TBtn>
            </div>
            {view === "canvas" ? (
              // Slate void 의 mousedown 이 preventDefault 로 RF 드래그를 막지 않게 격리(pointerdown 은 RF 연결과 충돌 → 제외)
              <div className={styles.diagramCanvas}
                onMouseDown={(e) => e.stopPropagation()}>
                <DiagramNodeCtx.Provider value={commitNodeLabel}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={NODE_TYPES}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeDragStop={onNodeDragStop}
                  onSelectionChange={onSelectionChange}
                  connectionMode={ConnectionMode.Strict}
                  defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
                  fitView
                  proOptions={{ hideAttribution: true }}
                  deleteKeyCode={["Backspace", "Delete"]}
                >
                  <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                  <Controls showInteractive={false} position="bottom-right" orientation="vertical" />
                </ReactFlow>
                </DiagramNodeCtx.Provider>
                {nodes.length === 0 && (
                  <div className={styles.diagramEmpty}>{t("‘노드’ 버튼으로 도형을 추가하고, 도형을 드래그해 연결하세요", "Add a node, then drag between nodes to connect")}</div>
                )}
              </div>
            ) : (
              <div className={styles.diagramForm} onMouseDown={(e) => e.stopPropagation()}>
                {/* ── 노드 ── */}
                <div className={styles.diagramFormSectionHead}>
                  <span className={styles.diagramFormLabel}>{t("노드", "Nodes")}</span>
                  <div style={{ display: "inline-flex", gap: "var(--spacing-3xs)" }}>
                    <Button variant="outline" size="xs" icon={<Plus size={13} />} onClick={() => addNode()}>{t("노드", "Node")}</Button>
                    <Button variant="outline" size="xs" icon={<Type size={13} />} onClick={() => addNode("text")}>{t("텍스트", "Text")}</Button>
                  </div>
                </div>
                {nodes.map((n) => {
                  const dd = n.data as ShapeNodeData;
                  return (
                    <div key={n.id} className={styles.diagramFormRow}>
                      <Input className={styles.diagramFormGrow} value={dd.label || ""} placeholder={t("라벨", "Label")} variant="capsule" size="sm" clearable={false}
                        onChange={(v) => patchNode(n.id, { label: v })} />
                      <Select value={dd.shape || "rect"} width="s" onChange={(v) => patchNode(n.id, { shape: v as DiagramNodeShape })}
                        options={SHAPES.map((s) => ({ value: s.v, label: t(s.label, s.en) }))} />
                      <div className={styles.diagramFormColors}>
                        {COLORS.map((c) => (
                          <button key={c || "none"} type="button" className={styles.diagramColorBtn} data-none={c ? undefined : ""} data-on={(dd.color || "") === c ? "" : undefined}
                            title={c || t("색 없음", "No color")} style={c ? { background: c } : undefined} onClick={() => patchNode(n.id, { color: c })} />
                        ))}
                      </div>
                      <Button variant="ghost" tone="danger" size="sm" shape="square" icon={<Trash2 size={14} />} onClick={() => removeNode(n.id)} aria-label={t("삭제", "Delete")} />
                    </div>
                  );
                })}
                {/* ── 연결 ── */}
                <div className={styles.diagramFormSectionHead}>
                  <span className={styles.diagramFormLabel}>{t("연결", "Connections")}</span>
                  <Button variant="outline" size="xs" icon={<Plus size={13} />} onClick={addFormEdge}>{t("추가", "Add")}</Button>
                </div>
                {edges.map((e) => {
                  const nodeOpts = nodes.map((n) => ({ value: n.id, label: (n.data as ShapeNodeData).label || n.id }));
                  return (
                    <div key={e.id} className={styles.diagramFormEdge}>
                      <div className={styles.diagramFormRow}>
                        <div className={styles.diagramFormGrow}><Select width="full" value={e.source} onChange={(v) => patchEdge(e.id, { source: v })} options={nodeOpts} /></div>
                        <span className={styles.diagramFormArrow}>→</span>
                        <div className={styles.diagramFormGrow}><Select width="full" value={e.target} onChange={(v) => patchEdge(e.id, { target: v })} options={nodeOpts} /></div>
                        <Button variant="ghost" tone="danger" size="sm" shape="square" icon={<Trash2 size={14} />} onClick={() => removeEdge(e.id)} aria-label={t("삭제", "Delete")} />
                      </div>
                      <div className={styles.diagramFormRow}>
                        <Input className={styles.diagramFormGrow} value={typeof e.label === "string" ? e.label : ""} placeholder={t("라벨(선택)", "Label (opt)")} variant="capsule" size="sm" clearable={false}
                          onChange={(v) => patchEdge(e.id, { label: v })} />
                        <Select width="s" value={dirOf(e)} onChange={(v) => patchEdge(e.id, dirPatch(e, v as EdgeDir))} options={DIRS.map((d) => ({ value: d.v, label: t(d.label, d.en) }))} />
                        <Select width="s" value={lineFromEdge(e)} onChange={(v) => patchEdge(e.id, { style: edgeStyleFor(v as DiagramLine) })} options={LINES.map((l) => ({ value: l.v, label: t(l.label, l.en) }))} />
                        <Select width="s" value={curveFromEdge(e)} onChange={(v) => patchEdge(e.id, { type: curveToType(v as DiagramCurve) })} options={CURVES.map((c) => ({ value: c.v, label: t(c.label, c.en) }))} />
                      </div>
                    </div>
                  );
                })}
                {nodes.length === 0 && <div className={styles.diagramFormEmpty}>{t("노드를 추가해 시작하세요", "Add a node to start")}</div>}
              </div>
            )}
          </div>
          {props.children}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}

export default DiagramElement;
