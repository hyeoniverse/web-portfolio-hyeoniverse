"use client";

/* 스키마 ERD — React Flow 기반.
 *
 * 직접 그린 SVG 는 관계선이 박스 사이를 대각선으로 가로질러 교차가 심했고,
 * 텍스트도 viewBox 축소 배율에 따라 뭉갰다.
 * React Flow 로 옮기면 (1) 노드가 HTML 이라 폰트가 선명하고 토큰이 그대로 먹으며
 * (2) 컬럼마다 handle 을 달아 관계선이 그 행에 네이티브로 붙고
 * (3) smoothstep 라우팅이 직각으로 꺾여 지나가 교차가 눈에 덜 걸린다. */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  ReactFlow, Background, BackgroundVariant, Controls, Handle, Position,
  ReactFlowProvider,
  type Node, type Edge, type NodeProps, type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  layoutErd, ERD_COL_W, ERD_HEADER_HEIGHT, ERD_ROW_HEIGHT, ERD_PADDING_Y,
} from "@/data/about/erdLayout";
import type { ErdConceptOverlay } from "@/data/about/erdConceptual";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import Tooltip from "@/components/ui/Tooltip";
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

/* 호버 설명 — **화면에 안 보이는 것만** 담는다.
   NOT NULL·UNIQUE·인덱스·기본값은 이미 행에 배지로 있어 되풀이하면 소음이다.
   담을 게 없으면 null 을 돌려 Tooltip 자체를 만들지 않는다 — 노드마다 컬럼이 여럿이라
   전부 감싸면 리스너와 포털이 수백 개가 된다. */
function columnHint(c: ErdTable["columns"][number]): string | null {
  const parts = [
    c.comment,
    c.enumValues?.length ? `${c.type}: ${c.enumValues.join(" | ")}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

/* 툴팁은 내용이 있을 때만 씌운다 — 없으면 자식을 그대로 통과시킨다 */
function Hint({ text, children }: { text: string | null; children: ReactNode }) {
  if (!text) return <>{children}</>;
  return (
    <Tooltip content={text} placement="auto" delay={200}
      wrapperStyle={{ display: "block", width: "100%" }}>
      {children}
    </Tooltip>
  );
}

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
      <Hint text={table.comment ?? null}>
      <div className={css.head}>
        {/* 이름이 길어도 오른쪽 관계 배지를 밀어내지 않게 자체적으로 줄임표 처리 */}
        <span className={css.headName}>{table.name}</span>
        {/* 뷰는 실체 테이블이 아니다 — 한눈에 구분되어야 오해가 없다 */}
        {table.kind === "view" && <span className={css.kindView}>VIEW</span>}
        {/* 조인 테이블은 개념상 관계다 — 그 자리에서 그렇게 말해준다 */}
        {junction && <span className={css.junction}>M:N {junction}</span>}
      </div>
      </Hint>
      {table.columns.map((c) => (
        <Hint key={c.name} text={columnHint(c)}>
        <div className={css.row}>
          <span className={`${css.key} ${c.pk ? css.keyPk : c.fk ? css.keyFk : ""}`}>
            {c.pk ? "PK" : c.fk ? "FK" : ""}
          </span>
          <span className={`${css.colName} ${c.pk ? css.colNamePk : ""}`}>{c.name}</span>
          {/* NOT NULL — 기호 하나로 붙여 행 너비를 늘리지 않는다 */}
          {c.required && !c.pk && <span className={css.req} aria-label="NOT NULL">*</span>}
          {c.unique && <span className={css.flag}>U</span>}
          {c.indexed && !c.unique && <span className={css.flagSoft}>IX</span>}
          {/* 다중값(배열) · 파생(캐시) — Chen 표기의 이중/점선 타원에 해당 */}
          {columnKind?.[c.name] === "multi" && <span className={css.kindMulti}>다중값</span>}
          {columnKind?.[c.name] === "derived" && <span className={css.kindDerived}>파생</span>}
          <span className={css.colType}>{c.type}</span>
          {/* 기본값은 타입 뒤에 옅게 — 있으면 스키마를 읽는 데 큰 단서다 */}
          {c.defaultValue && <span className={css.colDefault}>={c.defaultValue}</span>}
          {/* 좌우 양쪽에 source/target 을 두고, 어느 쪽을 쓸지는 배치가 정한다 */}
          <Handle type="source" id={`${c.name}-sr`} position={Position.Right} className={css.handle} />
          <Handle type="source" id={`${c.name}-sl`} position={Position.Left} className={css.handle} />
          <Handle type="target" id={`${c.name}-tr`} position={Position.Right} className={css.handle} />
          <Handle type="target" id={`${c.name}-tl`} position={Position.Left} className={css.handle} />
        </div>
        </Hint>
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

/* 화면 이동 시간 — 어디로 갔는지 눈이 따라갈 만큼만. 길면 조작이 굼떠 보인다 */
const FIT_MS = 450;

/* focus 가 바뀌면 **지금 보이는 것 전체**를 화면에 담는다 (훅은 ReactFlow 안에서만 쓸 수 있다).
   한 노드만 확대하면 어느 쪽이든 테이블 하나가 화면을 채워서, 포커스가 걸렸는지 풀렸는지
   화면만 보고는 알 수 없다. 담긴 테이블 수가 곧 상태를 말해주게 한다.
   nodesInitialized 를 기다리는 이유 — 크기가 측정되기 전에 부르면 fitView 가 빗나간다. */
function ErdFlowInner({
  tables, relations, selected, related, onHover, onOpen, onNodeEdit, onCreateRelation, onPaneClick, concept,
  className,
  focus, zoomTo, onNoteClick, lastViewport, onViewportSettled, note, noteAnchor, showControls = true, initialZoom = 0.62, children, lang = "ko",
}: {
  tables: ErdTable[];
  relations: ErdRelation[];
  selected?: string | null;
  related?: Set<string> | null;
  onHover?: (name: string | null) => void;
  onOpen?: (t: ErdTable) => void;
  /** 더블클릭 편집 — 주면 관리자 편집 경로가 열린다(공개 패널은 안 넘김) */
  onNodeEdit?: (t: ErdTable) => void;
  /** 컬럼 handle 을 끌어 관계 생성 — 주면 노드가 connectable 이 된다 (admin 전용) */
  onCreateRelation?: (rel: ErdRelation) => void;
  /** 빈 캔버스 클릭 */
  onPaneClick?: () => void;
  /** 개념 정보(관계 동사·M:N·다중값/파생)를 함께 표시한다 */
  concept?: ErdConceptOverlay | null;
  className?: string;
  /** 이 테이블(+연결된 것들)로 화면을 잡는다 */
  focus?: string | null;
  /** 이 노드 하나만 크게 본다 — 좁혀 본 상태에서 한 번 더 누른 대상 */
  zoomTo?: string | null;
  /** 설명 노트 클릭 — 노트는 테이블이 아니라 onOpen 경로를 타지 않는다 */
  onNoteClick?: () => void;
  /** 리마운트 전 화면 위치 — 여기서 출발해야 새 화면으로 '이동'하는 것처럼 보인다 */
  lastViewport?: Viewport;
  /** 화면 이동이 끝난 위치를 밖에 남긴다 (리마운트를 넘어 이어붙이려고) */
  onViewportSettled?: (v: Viewport) => void;
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
      /* 클릭으로 노트에 초점을 맞출 수 있어야 한다 — 커서로도 그렇다고 알린다 */
      className: css.noteNode,
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
    <div className={`${css.wrap} ${onCreateRelation ? css.wrapConnectable : ""} ${className ?? ""}`} data-lenis-prevent
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
        /* 포커스/해제 화면은 **여기서** 확정한다. key 가 바뀌며 어차피 리마운트되므로
           마운트 시점 fitView 가 곧 그 상태의 화면이다.
           effect 로 잡으면 노드 측정 타이밍에 기대게 되고, 어긋나면 빈 구석에 착지한다. */
        fitView
        /* 이전 화면 위치에서 시작 — 이게 없으면 매번 기본 위치에서 튀어나온다.
           fitView 가 duration 을 갖고 있어 여기서 목표 위치까지 부드럽게 이동한다. */
        defaultViewport={lastViewport}
        onMoveEnd={(_, v) => onViewportSettled?.(v)}
        fitViewOptions={zoomTo
          /* 한 번 더 누른 대상 — 그것 하나만 화면에 가득. 긴 테이블도 잘리지 않게 fitView 로 맞춘다 */
          ? { nodes: [{ id: zoomTo }], padding: 0.12, maxZoom: 1.2, duration: FIT_MS }
          : focus
            /* 좁혀 본 상태 — 연결된 테이블과 노트까지 한 눈에 */
            ? { padding: 0.22, maxZoom: 1, duration: FIT_MS }
            /* 전체 보기 — 테이블이 다 들어오게. 처음 배율보다 더 당기지는 않는다 */
            : { padding: 0.1, maxZoom: initialZoom, duration: FIT_MS }}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        /* 더블클릭을 편집에 쓰는 admin 에서는 기본 동작(캔버스 확대)을 끈다 —
           안 끄면 편집 모달이 열리면서 화면이 같이 줌돼 '움찔'거린다. 공개 패널은 그대로 둔다. */
        zoomOnDoubleClick={!onNodeEdit}
        /* 컬럼 handle 을 끌어 관계를 만든다 — 콜백을 준 admin 에서만 (공개 패널은 그대로 잠금) */
        nodesConnectable={!!onCreateRelation}
        onConnect={(c) => {
          if (!onCreateRelation || !c.source || !c.target) return;
          /* handle id 는 `${컬럼}-sr|sl|tr|tl` — 방향 접미사만 떼면 컬럼명이다 */
          const col = (h?: string | null) => (h ? h.replace(/-(sr|sl|tr|tl)$/, "") : "");
          const fromField = col(c.sourceHandle);
          const toField = col(c.targetHandle);
          /* 자기 자신으로 거는 선은 배치가 표현하지 못한다 */
          if (!fromField || !toField || c.source === c.target) return;
          onCreateRelation({ from: c.source, fromField, to: c.target, toField, label: "N:1" });
        }}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
        /* 노트 노드는 테이블이 아니다 — hover 상태에 넣으면 강조 대상이 아닌데 리렌더만 유발한다 */
        onNodeMouseEnter={(_, n) => { if (n.type !== "erdNote") onHover?.(n.id); }}
        onNodeMouseLeave={(_, n) => { if (n.type !== "erdNote") onHover?.(null); }}
        onPaneClick={onPaneClick}
        onNodeClick={(_, n) => {
          /* 노트는 테이블이 아니라 data.table 이 없다 — 따로 받아야 클릭이 먹는다 */
          if (n.type === "erdNote") { onNoteClick?.(); return; }
          const d = n.data as Partial<TableData>;
          if (d?.table) onOpen?.(d.table);
        }}
        /* 더블클릭 = 바로 편집. 노드 안 버튼은 React Flow 포인터 처리에 삼켜지므로
           편집 진입은 RF 이벤트로 받는다(포커스 칩의 편집 버튼과 함께 두 경로). */
        onNodeDoubleClick={(_, n) => {
          const d = n.data as Partial<TableData>;
          if (d?.table) onNodeEdit?.(d.table);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className={css.bg} />
        {showControls && (
          <Controls showInteractive={false} position="bottom-right" orientation="vertical"
          className={flow.controls} />
        )}
        {children}
      </ReactFlow>
      </HoverCtx.Provider>
    </div>
  );
}

/* useReactFlow 를 쓰는 자식(커스텀 컨트롤 등)이 있으므로 Provider 로 감싼다 */
export default function ErdFlow(props: React.ComponentProps<typeof ErdFlowInner>) {
  return (
    <ReactFlowProvider>
      <ErdFlowInner {...props} />
    </ReactFlowProvider>
  );
}
