"use client";

/* 스키마 ERD — React Flow 기반.
 *
 * 직접 그린 SVG 는 관계선이 박스 사이를 대각선으로 가로질러 교차가 심했고,
 * 텍스트도 viewBox 축소 배율에 따라 뭉갰다.
 * React Flow 로 옮기면 (1) 노드가 HTML 이라 폰트가 선명하고 토큰이 그대로 먹으며
 * (2) 컬럼마다 handle 을 달아 관계선이 그 행에 네이티브로 붙고
 * (3) smoothstep 라우팅이 직각으로 꺾여 지나가 교차가 눈에 덜 걸린다. */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  ReactFlow, Background, BackgroundVariant, Controls, Handle, Position,
  ReactFlowProvider, useReactFlow,
  type Node, type Edge, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  layoutErd, ERD_COL_W, ERD_HEADER_HEIGHT, ERD_ROW_HEIGHT, ERD_PADDING_Y,
} from "@/data/about/erdLayout";
import type { ErdConceptOverlay } from "@/data/about/erdConceptual";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import css from "./ErdFlow.module.css";
import flow from "./flowShared.module.css";

type TableData = {
  table: ErdTable;
  onOpen?: (t: ErdTable) => void;
  /** 개념 겹쳐보기 — 이 테이블이 개념상 M:N 관계일 때의 라벨 */
  junction?: string;
  /** `컬럼명` → multi(배열) / derived(카운트 캐시) */
  columnKind?: Record<string, "multi" | "derived">;
};

/* hover 강조는 context 로 내린다 — 노드 data 에 넣으면 hover 마다 노드 배열이
   새로 만들어지고, React Flow 가 전부 다시 그리며 화면이 깜빡인다. */
const HoverCtx = createContext<{ selected: string | null; related: Set<string> | null }>({
  selected: null, related: null,
});

/* 컬럼 행마다 좌우 handle — 관계선이 정확히 그 행에서 출발/도착한다 */
function TableNode({ data }: NodeProps<Node<TableData>>) {
  const { table, onOpen, junction, columnKind } = data;
  const { selected, related } = useContext(HoverCtx);
  const tone = !selected ? "none"
    : table.name === selected ? "on"
    : related?.has(table.name) ? "related"
    : "dim";
  return (
    /* 클릭은 ReactFlow 의 onNodeClick 이 받는다 — 노드 안 onClick 은 React Flow 의
       포인터 처리(팬 시작 판정)에 삼켜져 실제 마우스 클릭에서 안 먹는다.
       키보드만 여기서 처리한다. */
    <div
      className={`${css.node} ${tone === "on" ? css.nodeOn : ""} ${tone === "related" ? css.nodeRel : ""} ${tone === "dim" ? css.nodeDim : ""}`}
      data-clickable={onOpen ? "true" : undefined}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => { if (onOpen && e.key === "Enter") onOpen(table); }}
    >
      <div className={css.head}>
        {table.name}
        {/* 조인 테이블은 개념상 관계다 — 그 자리에서 그렇게 말해준다 */}
        {junction && <span className={css.junction}>M:N {junction}</span>}
      </div>
      {table.columns.map((c) => (
        <div key={c.name} className={css.row}>
          <span className={`${css.key} ${c.pk ? css.keyPk : c.fk ? css.keyFk : ""}`}>
            {c.pk ? "PK" : c.fk ? "FK" : ""}
          </span>
          <span className={`${css.colName} ${c.pk ? css.colNamePk : ""}`}>{c.name}</span>
          {/* 다중값(배열) · 파생(캐시) — Chen 표기의 이중/점선 타원에 해당 */}
          {columnKind?.[c.name] === "multi" && <span className={css.kindMulti}>다중값</span>}
          {columnKind?.[c.name] === "derived" && <span className={css.kindDerived}>파생</span>}
          <span className={css.colType}>{c.type}</span>
          {/* 좌우 양쪽에 source/target 을 두고, 어느 쪽을 쓸지는 배치가 정한다 */}
          <Handle type="source" id={`${c.name}-sr`} position={Position.Right} className={css.handle} />
          <Handle type="source" id={`${c.name}-sl`} position={Position.Left} className={css.handle} />
          <Handle type="target" id={`${c.name}-tr`} position={Position.Right} className={css.handle} />
          <Handle type="target" id={`${c.name}-tl`} position={Position.Left} className={css.handle} />
        </div>
      ))}
    </div>
  );
}

/* 선택한 테이블 옆에 붙는 설명 카드 — 공개 패널에서 쓴다.
   별도 오버레이로 띄우면 팬/줌과 따로 놀아서, 노드로 두고 같이 움직이게 한다. */
function NoteNode({ data }: NodeProps<Node<{ content: ReactNode }>>) {
  return <div className={css.note}>{data.content}</div>;
}

const NODE_TYPES = { erdTable: TableNode, erdNote: NoteNode };

/* focus 가 바뀌면 그 노드로 부드럽게 이동 — 훅은 ReactFlow 안에서만 쓸 수 있다 */
function FocusOnNode({ focus }: { focus?: string | null }) {
  const rf = useReactFlow();
  useEffect(() => {
    if (!focus) return;
    const node = rf.getNode(focus);
    if (!node) return;
    rf.fitView({ nodes: [{ id: focus }], padding: 0.35, duration: 500, maxZoom: 1.1 });
  }, [focus, rf]);
  return null;
}

function ErdFlowInner({
  tables, relations, selected, related, onHover, onOpen, onPaneClick, concept,
  className,
  focus, note, noteAnchor, showControls = true, initialZoom = 0.62, children, lang = "ko",
}: {
  tables: ErdTable[];
  relations: ErdRelation[];
  selected?: string | null;
  related?: Set<string> | null;
  onHover?: (name: string | null) => void;
  onOpen?: (t: ErdTable) => void;
  /** 빈 캔버스 클릭 */
  onPaneClick?: () => void;
  /** 개념 정보(관계 동사·M:N·다중값/파생)를 함께 표시한다 */
  concept?: ErdConceptOverlay | null;
  className?: string;
  /** 이 테이블로 화면을 옮긴다 */
  focus?: string | null;
  lang?: "ko" | "en";
  /** 설명 카드 내용 */
  note?: ReactNode;
  /** 설명 카드를 붙일 테이블 */
  noteAnchor?: string | null;
  showControls?: boolean;
  initialZoom?: number;
  /** ReactFlow 안에 렌더할 추가 요소 (커스텀 줌 컨트롤 등) */
  children?: ReactNode;
}) {
  const layout = useMemo(() => layoutErd(tables, relations), [tables, relations]);
  const hoverValue = useMemo(
    () => ({ selected: selected ?? null, related: related ?? null }),
    [selected, related],
  );

  const nodes: Node<TableData>[] = useMemo(
    /* selected/related 를 의존성에서 뺀다 — 강조는 context 가 처리한다 */
    () => tables.map((t) => {
      const b = layout.boxes[t.name];
      return {
        id: t.name,
        type: "erdTable",
        position: { x: b?.x ?? 0, y: b?.y ?? 0 },
        data: {
          table: t,
          onOpen,
          junction: concept?.junctions[t.name]
            ? `${concept.junctions[t.name].a} ↔ ${concept.junctions[t.name].b}`
            : undefined,
          columnKind: concept
            ? Object.fromEntries(t.columns
                .map((c) => [c.name, concept.columnKind[`${t.name}.${c.name}`]])
                .filter(([, v]) => v))
            : undefined,
        },
        draggable: false,
        selectable: false,
      };
    }),
    [tables, layout, onOpen, concept],
  );

  const noteNode: Node[] = useMemo(() => {
    if (!note || !noteAnchor) return [];
    const b = layout.boxes[noteAnchor];
    if (!b) return [];
    return [{
      id: "__note",
      type: "erdNote",
      position: { x: b.x + b.w + 24, y: b.y },
      data: { content: note },
      draggable: false,
      selectable: false,
      zIndex: 10,
    }];
  }, [note, noteAnchor, layout]);

  const allNodes = useMemo(() => [...nodes, ...noteNode], [nodes, noteNode]);

  const edges: Edge[] = useMemo(
    () => relations.map((r, i) => {
      const a = layout.boxes[r.from];
      const z = layout.boxes[r.to];
      /* 오른쪽에 있는 쪽으로 나가야 선이 박스를 되돌아 감지 않는다 */
      const toRight = (z?.x ?? 0) >= (a?.x ?? 0);
      return {
        id: `e${i}`,
        source: r.from,
        target: r.to,
        sourceHandle: `${r.fromField}-${toRight ? "sr" : "sl"}`,
        targetHandle: `${r.toField}-${toRight ? "tl" : "tr"}`,
        type: "smoothstep",
        pathOptions: { borderRadius: 14 },
        /* N 쪽 까치발 / 1 쪽 막대 — React Flow 가 url(#…) 로 감싸므로 id 만 넘긴다 */
        markerStart: "erdCrow",
        markerEnd: "erdBar",
        /* 개념 겹쳐보기 — 관계선 위에 "무슨 관계인가" */
        label: concept?.verbs[`${r.from}→${r.to}:${r.fromField}`]
          ? `${concept.verbs[`${r.from}→${r.to}:${r.fromField}`].label[lang]} · ${concept.verbs[`${r.from}→${r.to}:${r.fromField}`].card}`
          : undefined,
        labelShowBg: true,
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 999,
        className: !selected ? css.edge
          : (r.from === selected || r.to === selected) ? `${css.edge} ${css.edgeOn}`
          : `${css.edge} ${css.edgeDim}`,
      };
    }),
    [relations, layout, selected, concept, lang],
  );


  return (
    <div className={`${css.wrap} ${className ?? ""}`} data-lenis-prevent
      style={{
        ["--erd-col-w" as string]: `${ERD_COL_W}px`,
        ["--erd-head-h" as string]: `${ERD_HEADER_HEIGHT}px`,
        ["--erd-row-h" as string]: `${ERD_ROW_HEIGHT}px`,
        ["--erd-pad-y" as string]: `${ERD_PADDING_Y}px`,
      }}>
      {/* crow's foot 마커 — React Flow 가 그리는 edge 에서 url(#) 로 참조한다 */}
      <svg className={css.defs} aria-hidden>
        <defs>
          <marker id="erdCrow" viewBox="0 0 12 12" refX="0" refY="6"
            markerWidth="11" markerHeight="11" orient="auto-start-reverse">
            <path d="M12,6 L0,0 M12,6 L0,6 M12,6 L0,12" className={css.marker} />
          </marker>
          <marker id="erdBar" viewBox="0 0 12 12" refX="10" refY="6"
            markerWidth="11" markerHeight="11" orient="auto">
            <path d="M6,1 L6,11" className={css.marker} />
          </marker>
        </defs>
      </svg>

      <HoverCtx.Provider value={hoverValue}>
      <ReactFlow
        nodes={allNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        /* 배율은 initialZoom 으로 고정하고 위치만 fitView 에 맡긴다.
           그냥 fitView 는 캔버스 전체(≈2400px)를 창에 맞추느라 0.2배까지 줄여
           아무것도 안 읽히고, 반대로 defaultViewport 의 고정 좌표(40,40)는
           창이 좁으면 내용이 없는 빈 구석에 착지한다. min=max 로 묶으면
           배율은 그대로 두고 내용 중앙으로만 잡아준다. */
        fitView
        fitViewOptions={{ minZoom: initialZoom, maxZoom: initialZoom }}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        onNodeMouseEnter={(_, n) => onHover?.(n.id)}
        onNodeMouseLeave={() => onHover?.(null)}
        onPaneClick={onPaneClick}
        onNodeClick={(_, n) => {
          const d = n.data as Partial<TableData>;
          if (d?.table) onOpen?.(d.table);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className={css.bg} />
        {showControls && (
          <Controls showInteractive={false} position="bottom-right" orientation="vertical"
          className={flow.controls} />
        )}
        <FocusOnNode focus={focus} />
        {children}
      </ReactFlow>
      </HoverCtx.Provider>
    </div>
  );
}

/* useReactFlow 를 쓰는 자식(FocusOnNode, 커스텀 컨트롤)이 있으므로 Provider 로 감싼다 */
export default function ErdFlow(props: React.ComponentProps<typeof ErdFlowInner>) {
  return (
    <ReactFlowProvider>
      <ErdFlowInner {...props} />
    </ReactFlowProvider>
  );
}
