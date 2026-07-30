"use client";

/* User Flow 비주얼 편집기.
 *
 * 목록으로 row/col 숫자를 치는 방식은 결과를 머릿속으로 조립해야 해서 버렸다.
 * 실제 패널과 같은 도형(터미널/액션/판단)을 그대로 그리고 그 위에서 드래그·선택·연결한다.
 *
 * 좌표는 실제 렌더와 같은 flowLayout 규칙을 쓴다 —
 * 드래그하면 픽셀을 저장하는 게 아니라 가장 가까운 row/col(격자)로 스냅해 저장한다.
 * 그래야 공개 페이지에서 다른 플로우들과 배치 규칙이 어긋나지 않는다. */

import { useRef, useState } from "react";
import type { Language } from "@/types";
import { Plus, X, Link2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import type { FlowNode, UserFlow } from "@/data/about/types";
import {
  ACTION_W, ACTION_H, TERMINAL_W, TERMINAL_H, DIAMOND_W, DIAMOND_H,
  nodeX, nodeY,
} from "@/app/about/_components/_utils/flowLayout";
import css from "./FlowDiagramEditor.module.css";

const NODE_TYPES = ["start", "action", "decision", "end"] as const;
/* 타입별 테두리 색 — 모양만으로는 start/end 구분이 안 된다 */
const TYPE_TONE: Record<FlowNode["type"], string> = {
  start: "var(--text-success)",
  action: "var(--border-default-color)",
  decision: "var(--text-warning)",
  end: "var(--text-accent)",
};

/* 격자 — nodeX/nodeY 와 같은 규칙으로 역산해 스냅 */
const MAX_ROW = 24;
const MAX_COL = 4;

function snap(x: number, y: number): { row: number; col: number } {
  let best = { row: 0, col: 0 };
  let bestD = Infinity;
  for (let row = 0; row <= MAX_ROW; row++) {
    for (let col = 0; col <= MAX_COL; col++) {
      const d = (nodeX(row) - x) ** 2 + (nodeY(col, row) - y) ** 2;
      if (d < bestD) { bestD = d; best = { row, col }; }
    }
  }
  return best;
}

function nodeSize(type: FlowNode["type"]) {
  if (type === "decision") return { w: DIAMOND_W, h: DIAMOND_H };
  if (type === "action") return { w: ACTION_W, h: ACTION_H };
  return { w: TERMINAL_W, h: TERMINAL_H };
}

/* 선을 도형 경계에서 끊는다 — 중심끼리 이으면 선이 도형을 관통해 지저분하다 */
function trimToBox(
  ax: number, ay: number, bx: number, by: number,
  aw: number, ah: number, bw: number, bh: number,
) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  /* 두 노드가 같은 칸에 겹치면 방향이 없다 → 그리지 않는다.
     예전엔 0 * Infinity = NaN 이 되어 좌표가 NaN 으로 새어나갔다. */
  if (len < 1) return null;
  const ux = dx / len, uy = dy / len;
  /* 사각형 경계까지의 거리 = 진행 방향으로 반폭/반높이 중 먼저 닿는 쪽 */
  const reach = (w: number, h: number) => {
    const tx = ux !== 0 ? (w / 2) / Math.abs(ux) : Infinity;
    const ty = uy !== 0 ? (h / 2) / Math.abs(uy) : Infinity;
    const r = Math.min(tx, ty);
    return Number.isFinite(r) ? r : 0;
  };
  /* 트림 길이가 선 길이보다 길면 선이 뒤집힌다 → 전체 길이 안으로 제한 */
  const ra = Math.min(reach(aw, ah) + 2, len * 0.45);
  const rb = Math.min(reach(bw, bh) + 6, len * 0.45);
  return {
    x1: ax + ux * ra, y1: ay + uy * ra,
    x2: bx - ux * rb, y2: by - uy * rb,
  };
}

/* 도형 폭에 맞춰 라벨을 자른다 — 고정 글자수로 자르면 좁은 다이아몬드에서 넘친다 */
function fitLabel(text: string, boxW: number, fontSize: number) {
  const max = Math.max(4, Math.floor(boxW / (fontSize * 0.62)));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function FlowDiagramEditor({ flow, onChange, lang }: {
  flow: UserFlow;
  onChange: (v: Partial<UserFlow>) => void;
  lang: Language;
}) {
  const { nodes, edges } = flow;
  const [sel, setSel] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<number | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);

  const setNodes = (v: FlowNode[]) => onChange({ nodes: v });
  const setEdges = (v: UserFlow["edges"]) => onChange({ edges: v });
  const patch = (id: string, p: Partial<FlowNode>) =>
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...p } : n)));

  /* viewBox 는 노드가 늘어나도 다 들어오게 실제 좌표 범위에서 계산 */
  const maxRow = nodes.reduce((m, n) => Math.max(m, n.row), 4);
  const maxCol = nodes.reduce((m, n) => Math.max(m, n.col), 1);
  const viewW = nodeX(maxRow) + ACTION_W;
  const viewH = nodeY(maxCol, maxRow) + ACTION_H * 3;

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  const onNodeDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (connectFrom && connectFrom !== id) {
      setEdges([...edges, { from: connectFrom, to: id }]);
      setConnectFrom(null);
      return;
    }
    drag.current = { id, moved: false };
    setSel(id);
    setSelEdge(null);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e.clientX, e.clientY);
    const { row, col } = snap(p.x, p.y);
    const n = nodes.find((x) => x.id === d.id);
    if (!n || (n.row === row && n.col === col)) return;
    d.moved = true;
    patch(d.id, { row, col });
  };

  const onUp = () => { drag.current = null; };

  const addNode = () => {
    const id = `n${nodes.length + 1}`;
    setNodes([...nodes, { id, type: "action", label: { ko: "", en: "" }, row: maxRow + 1, col: 0 }]);
    setSel(id);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setEdges(edges.filter((e) => e.from !== id && e.to !== id));
    setSel(null);
  };

  const selNode = sel ? nodes.find((n) => n.id === sel) : null;

  return (
    <div className={css.editor}>
      <div className={css.toolbar}>
        <Button variant="subtle" size="xs" icon={<Plus size={13} />} onClick={addNode}>
          {lang === "ko" ? "노드 추가" : "Add node"}
        </Button>
        <Button variant={connectFrom ? "primary" : "subtle"} size="xs" icon={<Link2 size={13} />}
          disabled={!sel && !connectFrom}
          onClick={() => setConnectFrom(connectFrom ? null : sel)}>
          {connectFrom
            ? (lang === "ko" ? "연결할 노드 선택" : "Pick target")
            : (lang === "ko" ? "연결" : "Connect")}
        </Button>
        <span className={css.legend}>
          {NODE_TYPES.map((tp) => (
            <span key={tp} className={css.legendItem}>
              <i className={css.legendDot} style={{ background: TYPE_TONE[tp] }} />
              {tp}
            </span>
          ))}
        </span>
      </div>
      <p className={css.hint}>
        {lang === "ko"
          ? "노드를 드래그해 배치하고 클릭해 편집합니다. 연결선을 클릭하면 조건(Yes/No)을 붙일 수 있습니다."
          : "Drag to place, click to edit. Click an edge to label it."}
      </p>

      <div className={css.canvasWrap}>
        <svg ref={svgRef} viewBox={`0 0 ${viewW} ${viewH}`} className={css.canvas}
          onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
          onClick={(e) => {
            if (e.target === e.currentTarget) { setSel(null); setSelEdge(null); setConnectFrom(null); }
          }}>
          <defs>
            <marker id="fdArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-muted)" />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const a = nodes.find((n) => n.id === edge.from);
            const b = nodes.find((n) => n.id === edge.to);
            if (!a || !b) return null;
            const ax = nodeX(a.row), ay = nodeY(a.col, a.row, a.y);
            const bx = nodeX(b.row), by = nodeY(b.col, b.row, b.y);
            const sa = nodeSize(a.type), sb = nodeSize(b.type);
            const seg = trimToBox(ax, ay, bx, by, sa.w, sa.h, sb.w, sb.h);
            if (!seg) return null;
            const on = selEdge === i;
            const mx = (seg.x1 + seg.x2) / 2, my = (seg.y1 + seg.y2) / 2;
            const labelW = (edge.label?.length ?? 0) * 7 + 10;
            return (
              <g key={i} className={css.edge} onClick={(e) => { e.stopPropagation(); setSelEdge(i); setSel(null); }}>
                <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="transparent" strokeWidth={16} />
                <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                  stroke={on ? "var(--text-accent)" : "var(--border-default-color)"}
                  strokeWidth={on ? 2 : 1} markerEnd="url(#fdArrow)" />
                {edge.label && (
                  <g>
                    {/* 라벨 뒤 배경 — 선 위에 얹혀도 읽히게 */}
                    <rect x={mx - labelW / 2} y={my - 9} width={labelW} height={16} rx={8}
                      fill="var(--bg-primary)" stroke={on ? "var(--text-accent)" : "var(--border-light-color)"} />
                    <text x={mx} y={my} textAnchor="middle" dominantBaseline="central"
                      fontSize={10} fill={on ? "var(--text-accent)" : "var(--text-tertiary)"}
                      fontFamily="var(--font-mono)">{edge.label}</text>
                  </g>
                )}
              </g>
            );
          })}

          {nodes.map((n) => {
            const x = nodeX(n.row), y = nodeY(n.col, n.row, n.y);
            const { w, h } = nodeSize(n.type);
            const on = sel === n.id;
            const tone = TYPE_TONE[n.type];
            const stroke = on ? "var(--text-accent)" : tone;
            const label = n.label[lang] || n.id;
            /* 다이아몬드는 안쪽 폭이 좁아 글자가 넘친다 → 라벨을 도형 아래에 둔다 */
            const below = n.type === "decision";
            return (
              <g key={n.id} className={css.node} onPointerDown={(e) => onNodeDown(n.id, e)}>
                {n.type === "decision" ? (
                  <polygon points={`${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}`}
                    fill="var(--bg-primary)" stroke={stroke} strokeWidth={on ? 2 : 1} />
                ) : (
                  <rect x={x - w / 2} y={y - h / 2} width={w} height={h}
                    rx={n.type === "action" ? 6 : h / 2}
                    fill="var(--bg-primary)" stroke={stroke} strokeWidth={on ? 2 : 1} />
                )}
                {below ? (
                  <>
                    <rect x={x - (label.length * 6 + 10) / 2} y={y + h / 2 + 2}
                      width={label.length * 6 + 10} height={15} rx={7}
                      fill="var(--bg-primary)" stroke="transparent" />
                    <text x={x} y={y + h / 2 + 10} textAnchor="middle" dominantBaseline="central"
                      fontSize={10} fill="var(--text-primary)" fontFamily="var(--font-mono)">
                      {fitLabel(label, 180, 10)}
                    </text>
                  </>
                ) : (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                    fontSize={11} fill="var(--text-primary)" fontFamily="var(--font-mono)">
                    {fitLabel(label, w - 12, 11)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 선택한 노드 편집 */}
      {selNode && (
        <div className={css.inspect}>
          <span className={css.inspectTitle}>{lang === "ko" ? "노드" : "Node"} · {selNode.id}</span>
          <Select className={css.inspectField} value={selNode.type}
            onChange={(v) => patch(selNode.id, { type: v as FlowNode["type"] })}
            options={NODE_TYPES.map((v) => ({ value: v, label: v }))} />
          <input className={css.inspectInput} value={selNode.label[lang] ?? ""}
            aria-label={lang === "ko" ? "노드 이름" : "Node label"}
            placeholder={lang === "ko" ? "노드 이름" : "Node label"}
            onChange={(e) => patch(selNode.id, { label: { ...selNode.label, [lang]: e.target.value } })} />
          <Button variant="subtle" shape="circle" size="xs" aria-label="remove node"
            onClick={() => removeNode(selNode.id)}>
            <X size={13} />
          </Button>
        </div>
      )}

      {/* 선택한 연결 편집 */}
      {selEdge != null && edges[selEdge] && (
        <div className={css.inspect}>
          <span className={css.inspectTitle}>
            {lang === "ko" ? "연결" : "Edge"} · {edges[selEdge].from} → {edges[selEdge].to}
          </span>
          <input className={css.inspectInput} value={edges[selEdge].label ?? ""}
            aria-label={lang === "ko" ? "조건" : "Label"}
            placeholder={lang === "ko" ? "조건 (Yes / No)" : "Label (Yes / No)"}
            onChange={(e) => setEdges(edges.map((x, j) => (j === selEdge ? { ...x, label: e.target.value } : x)))} />
          <Button variant="subtle" shape="circle" size="xs" aria-label="remove edge"
            onClick={() => { setEdges(edges.filter((_, j) => j !== selEdge)); setSelEdge(null); }}>
            <X size={13} />
          </Button>
        </div>
      )}
    </div>
  );
}
