"use client";

import { useRef, useState, type PointerEvent as RPE } from "react";
import { Plus, Trash2, Link2, X } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import {
  type ArchNode, type ArchEdge, type ArchDiagramData,
  ARCH_ICONS, ARCH_GROUP_COLORS, ARCH_GROUP_LABELS, ARCH_VIEW,
  DEFAULT_ARCH_NODES, DEFAULT_ARCH_EDGES, archEdgePoints,
} from "@/app/about/_components/panels/archDiagramData";
import css from "./ArchDiagramEditor.module.css";

const ICON_OPTIONS = Object.keys(ARCH_ICONS).map((k) => ({ value: k, label: k }));

/** Architecture 다이어그램(기술 그래프) 비주얼 캔버스 에디터 — 노드 드래그·편집·엣지 연결/삭제 */
export default function ArchDiagramEditor({ value, onChange }: {
  value: ArchDiagramData;
  onChange: (v: ArchDiagramData) => void;
}) {
  const baseNodes = value.nodes.length ? value.nodes : DEFAULT_ARCH_NODES;
  const edges = value.edges.length ? value.edges : DEFAULT_ARCH_EDGES;
  const [local, setLocal] = useState<ArchNode[] | null>(null);
  const nodes = local ?? baseNodes;

  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<number | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null);

  const groupOptions = [{ value: "", label: "그룹 없음" }, ...Object.keys(ARCH_GROUP_COLORS).map((k) => ({ value: k, label: ARCH_GROUP_LABELS[k] ?? k }))];

  const commit = (n: ArchNode[], e: ArchEdge[]) => onChange({ nodes: n, edges: e });
  const setNodeField = (id: string, patch: Partial<ArchNode>) => commit(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)), edges);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const onNodeDown = (id: string, e: RPE<SVGGElement>) => {
    e.preventDefault();
    (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const p = toSvg(e.clientX, e.clientY);
    drag.current = { id, offX: p.x - node.x, offY: p.y - node.y, moved: false };
    setLocal(nodes);
  };
  const onMove = (e: RPE<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e.clientX, e.clientY);
    setLocal((prev) => (prev ?? nodes).map((n) => {
      if (n.id !== d.id) return n;
      const nx = Math.max(0, Math.min(ARCH_VIEW.w - n.w, p.x - d.offX));
      const ny = Math.max(0, Math.min(ARCH_VIEW.h - n.h, p.y - d.offY));
      if (Math.abs(nx - n.x) > 1 || Math.abs(ny - n.y) > 1) d.moved = true;
      return { ...n, x: nx, y: ny };
    }));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      commit(local ?? nodes, edges);
      setLocal(null);
    } else {
      setLocal(null);
      if (connectFrom && connectFrom !== d.id) {
        if (!edges.some((ed) => ed.from === connectFrom && ed.to === d.id)) commit(nodes, [...edges, { from: connectFrom, to: d.id }]);
        setConnectFrom(null);
      } else {
        setSelNode(d.id); setSelEdge(null);
      }
    }
  };

  const addNode = () => {
    let i = 1; while (nodes.some((n) => n.id === `node${i}`)) i++;
    const id = `node${i}`;
    commit([...nodes, { id, label: "New", x: Math.round(ARCH_VIEW.w / 2 - 55), y: Math.round(ARCH_VIEW.h / 2 - 22), w: 110, h: 44, icon: "api" }], edges);
    setSelNode(id); setSelEdge(null);
  };
  const deleteNode = (id: string) => {
    commit(nodes.filter((n) => n.id !== id), edges.filter((e) => e.from !== id && e.to !== id));
    setSelNode(null);
  };

  const sel = selNode ? nodes.find((n) => n.id === selNode) : null;

  return (
    <div className={css.editor}>
      <div className={css.toolbar}>
        <button type="button" className={css.add} onClick={addNode}><Plus size={14} /> 노드 추가</button>
        <p className={css.hint}>노드를 드래그해 배치, 클릭해 편집. 엣지는 선을 클릭해 선택.</p>
      </div>

      <div className={css.canvasWrap}>
        <svg ref={svgRef} viewBox={`0 0 ${ARCH_VIEW.w} ${ARCH_VIEW.h}`} className={css.canvas}
          onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
          onClick={(e) => { if (e.target === e.currentTarget) { setSelNode(null); setSelEdge(null); setConnectFrom(null); } }}>
          <defs>
            <marker id="aeArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-muted)" />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const from = nodes.find((n) => n.id === edge.from);
            const to = nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            const pts = archEdgePoints(from, to);
            const on = selEdge === i;
            return (
              <g key={i} className={css.edge} onClick={() => { setSelEdge(i); setSelNode(null); }}>
                <line x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2} stroke="transparent" strokeWidth={12} />
                <line x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2}
                  stroke={on ? "var(--text-accent)" : "var(--border-default-color)"} strokeWidth={on ? 2 : 1}
                  strokeDasharray={edge.dashed ? "4 3" : undefined} markerEnd="url(#aeArrow)" />
              </g>
            );
          })}

          {nodes.map((node) => {
            const ic = ARCH_ICONS[node.icon] ?? ARCH_ICONS.user;
            const on = selNode === node.id;
            const gc = node.group ? (ARCH_GROUP_COLORS[node.group] ?? "var(--border-default-color)") : "var(--border-default-color)";
            return (
              <g key={node.id} className={css.node} onPointerDown={(e) => onNodeDown(node.id, e)}>
                <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={node.h / 2}
                  fill="var(--bg-primary)" stroke={on ? "var(--text-accent)" : gc} strokeWidth={on ? 2 : 1} />
                <circle cx={node.x + node.h / 2} cy={node.y + node.h / 2} r={node.h / 2 - 4} fill={ic.color} opacity={0.9} />
                <g transform={`translate(${node.x + node.h / 2 - 8}, ${node.y + node.h / 2 - 8})`}>
                  <path d={ic.path} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" transform="scale(0.65)" />
                </g>
                <text x={node.x + node.h + 2} y={node.y + node.h / 2 + 1} dominantBaseline="central"
                  fill="var(--text-primary)" fontSize={10} fontFamily="var(--font-mono)" fontWeight={500}>{node.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {sel && (
        <div className={css.panel}>
          <div className={css.panelHead}>
            <span className={css.panelTitle}>노드 · {sel.id}</span>
            <Button variant="outline" size="2xs" onClick={() => setSelNode(null)} aria-label="close"><X size={13} /></Button>
          </div>
          <div className={css.row}>
            <div className={css.field}><span className={css.fieldLabel}>라벨</span>
              <Input value={sel.label} onChange={(v) => setNodeField(sel.id, { label: v })} /></div>
            <div className={css.field}><span className={css.fieldLabel}>아이콘</span>
              <Select value={sel.icon} onChange={(v) => setNodeField(sel.id, { icon: v })} options={ICON_OPTIONS} /></div>
          </div>
          <div className={css.field}><span className={css.fieldLabel}>그룹</span>
            <Select value={sel.group ?? ""} onChange={(v) => setNodeField(sel.id, { group: v || undefined })} options={groupOptions} /></div>
          <div className={css.panelActions}>
            <button type="button" className={`${css.add} ${connectFrom === sel.id ? css.connectOn : ""}`}
              onClick={() => setConnectFrom(connectFrom === sel.id ? null : sel.id)}>
              <Link2 size={13} /> {connectFrom === sel.id ? "연결할 노드 클릭…" : "엣지 연결"}
            </button>
            <Button variant="outline" size="sm" tone="danger" onClick={() => deleteNode(sel.id)} icon={<Trash2 size={13} />}>노드 삭제</Button>
          </div>
        </div>
      )}

      {selEdge != null && edges[selEdge] && (
        <div className={css.panel}>
          <div className={css.panelHead}>
            <span className={css.panelTitle}>엣지 · {edges[selEdge].from} → {edges[selEdge].to}</span>
            <Button variant="outline" size="2xs" onClick={() => setSelEdge(null)} aria-label="close"><X size={13} /></Button>
          </div>
          <div className={css.panelActions}>
            <Button variant="outline" size="sm" active={!!edges[selEdge].dashed}
              onClick={() => commit(nodes, edges.map((e, x) => (x === selEdge ? { ...e, dashed: !e.dashed } : e)))}>점선</Button>
            <Button variant="outline" size="sm" tone="danger" icon={<Trash2 size={13} />}
              onClick={() => { commit(nodes, edges.filter((_, x) => x !== selEdge)); setSelEdge(null); }}>엣지 삭제</Button>
          </div>
        </div>
      )}
    </div>
  );
}
