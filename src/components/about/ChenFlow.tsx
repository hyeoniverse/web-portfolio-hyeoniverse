"use client";

/* 개념 ERD (Chen 표기) — React Flow 기반.
 *
 * 직접 그린 SVG 는 도형 경계까지 선을 잘라내는 계산을 손으로 해야 했고,
 * 선이 도형 위로 지나가는 걸 막기 어려웠다.
 * React Flow 로 옮기면 handle 이 경계를 잡아주고 라우팅도 라이브러리가 처리한다. */

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import {
  ReactFlow, Background, BackgroundVariant, Controls,
  useNodesState,
  type Node, type Edge,
} from "@xyflow/react";
import { CHEN_NODE_TYPES, chenHandles } from "./chenNodes";
import "@xyflow/react/dist/style.css";
import {
  buildChenModel, layoutChen, ENTITY_W, ENTITY_H, ATTR_RX, ATTR_RY, DIAMOND_R,
} from "@/data/about/erdConceptual";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import css from "./ChenFlow.module.css";
import flow from "./flowShared.module.css";

/* 두 도형의 상대 위치로 붙일 변을 고른다.
   handle 을 지정하지 않으면 React Flow 가 첫 handle(top)만 써서
   선이 도형 위를 가로지르고 서로 교차한다. */
export default function ChenFlow({
  tables, relations, lang, className, onEntityClick, focus = null, children, showControls = true,
}: {
  tables?: ErdTable[];
  relations?: ErdRelation[];
  lang: "ko" | "en";
  className?: string;
  /** 엔티티를 누르면 — 개념 뷰 안에서 그 엔티티로 좁혀 본다 */
  onEntityClick?: (name: string) => void;
  /** 좁혀 볼 엔티티 — 이것과 직접 연결된 것만 남기고, 이 엔티티의 속성을 더 펼친다 */
  focus?: string | null;
  children?: ReactNode;
  showControls?: boolean;
}) {
  /* focus 가 모델 자체를 바꾼다 — 관련 없는 엔티티는 빠지고 focus 의 속성이 더 펼쳐진다.
     노드 집합·좌표가 통째로 달라지므로 재배치는 CSS transform 트랜지션이 이어준다. */
  const model = useMemo(() => buildChenModel(tables, relations, focus), [tables, relations, focus]);
  const place = useMemo(() => layoutChen(model), [model]);

  /* 도형마다 좌상단 기준이 달라 중심 → position 변환을 한 곳에 모은다 */
  const posOf = useCallback((kind: "entity" | "attr" | "rel", c: { x: number; y: number }) => {
    if (kind === "entity") return { x: c.x - ENTITY_W / 2, y: c.y - ENTITY_H / 2 };
    if (kind === "attr") return { x: c.x - ATTR_RX, y: c.y - ATTR_RY };
    return { x: c.x - DIAMOND_R, y: c.y - 37 };
  }, []);

  const initialNodes: Node[] = useMemo(() => {
    const out: Node[] = [];
    model.entities.forEach((e) => {
      out.push({
        id: `E:${e.name}`, type: "chenEntity",
        position: posOf("entity", place.entities[e.name]),
        data: { label: e.name, clickable: !!onEntityClick },
        /* 래퍼는 role="group" 이라 "누를 수 있다" 가 안 읽힌다 — 뭘 하는지 붙여준다 */
        ariaLabel: onEntityClick
          ? (lang === "ko" ? `${e.name} 엔티티 — 스키마에서 보기` : `${e.name} entity — view in schema`)
          : `${e.name} ${lang === "ko" ? "엔티티" : "entity"}`,
      });
      e.attributes.forEach((a, i) => {
        out.push({
          id: `A:${e.name}.${a.name}`, type: "chenAttr",
          position: posOf("attr", place.attributes[e.name][i]),
          data: { label: a.name, isKey: a.key, kind: a.kind },
        });
      });
    });
    model.relationships.forEach((r) => {
      const p = place.relationships[r.id];
      if (!p) return;
      out.push({ id: `R:${r.id}`, type: "chenRel", position: posOf("rel", p), data: { label: r.label[lang] } });
    });
    return out;
  }, [model, place, lang, posOf, onEntityClick]);

  const edges: Edge[] = useMemo(() => {
    const out: Edge[] = [];
    const push = (
      id: string, src: string, tgt: string,
      a: { x: number; y: number }, b: { x: number; y: number },
      label?: string,
    ) => {
      out.push({
        id, source: src, target: tgt,
        ...chenHandles(a, b),
        type: "straight", label, className: css.edge, labelShowBg: false,
      });
    };

    const at = (id: string) => {
      if (id.startsWith("E:")) return place.entities[id.slice(2)];
      if (id.startsWith("R:")) return place.relationships[id.slice(2)];
      const [, rest] = id.split(":");
      const dot = rest.lastIndexOf(".");
      const owner = rest.slice(0, dot), attr = rest.slice(dot + 1);
      const e = model.entities.find((x) => x.name === owner);
      const i = e?.attributes.findIndex((a) => a.name === attr) ?? -1;
      return i >= 0 ? place.attributes[owner][i] : undefined;
    };

    /* 엔티티 ↔ 속성 */
    model.entities.forEach((e) => {
      const ep = at(`E:${e.name}`);
      e.attributes.forEach((a) => {
        const ap = at(`A:${e.name}.${a.name}`);
        if (ep && ap) push(`ea:${e.name}.${a.name}`, `E:${e.name}`, `A:${e.name}.${a.name}`, ep, ap);
      });
    });

    /* 엔티티 ↔ 관계 마름모 — 선 위에 다중도 */
    model.relationships.forEach((r) => {
      const rp = at(`R:${r.id}`);
      const fp = at(`E:${r.from}`);
      const tp = at(`E:${r.to}`);
      if (!rp || !fp || !tp) return;
      push(`rf:${r.id}`, `E:${r.from}`, `R:${r.id}`, fp, rp, r.fromCard);
      if (!r.recursive) push(`rt:${r.id}`, `R:${r.id}`, `E:${r.to}`, rp, tp, r.toCard);
    });
    return out;
  }, [model, place]);



  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);

  /* 노드 드래그를 끈다 — 좌표를 저장하지 않아 옮겨도 사라지고, 클릭(좁혀보기)과 겹쳐
     조준이 흔들린다. 스키마 뷰(ErdFlow)도 nodesDraggable={false} 로 같은 규칙이다.

     함께 있던 force 시뮬레이션도 걷어냈다: 그 rAF 루프는 heat() 로만 시작했고
     heat() 를 부르는 곳이 드래그 핸들러뿐이었다. 즉 "끌 때 주변이 따라 출렁이는" 용도였고,
     평소 배치는 layoutChen() 이 이미 겹침 없이 잡아준다. 드래그가 없으면 돌 일이 없다. */

  /* React Flow 가 노드 래퍼에 tabindex=0 을 붙여 포커스는 되지만 Enter 를 받아주진
     않는다. 포커스가 잡히는 곳이 래퍼라서 노드 안쪽 div 의 onKeyDown 은 안 걸린다
     (keydown 은 포커스된 요소에서 위로 올라간다) — 그래서 컨테이너에서 받는다. */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = (e.target as HTMLElement).closest?.(".react-flow__node");
    const id = el?.getAttribute("data-id");
    if (!id?.startsWith("E:")) return;
    e.preventDefault();          // Space 로 페이지가 스크롤되는 것 방지
    onEntityClick?.(id.slice(2));
  }, [onEntityClick]);

  return (
    <div className={`${css.wrap} ${className ?? ""}`} data-lenis-prevent
      onKeyDown={onEntityClick ? handleKeyDown : undefined}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={CHEN_NODE_TYPES}
        onNodesChange={onNodesChange}
        /* 클릭은 ReactFlow 의 onNodeClick 으로 받는다 — 노드 안 onClick 은
           라이브러리 포인터 처리에 삼켜져 실제 마우스 클릭에서 안 먹는다 */
        onNodeClick={(_, n) => {
          if (n.id.startsWith("E:")) onEntityClick?.(n.id.slice(2));
        }}
        fitView
        /* 캔버스가 세로로 길어 fitView 만 두면 0.3배까지 줄어 글자가 뭉갠다 */
        fitViewOptions={{ padding: 0.06, minZoom: 0.42 }}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className={css.bg} />
        {showControls && (
          <Controls showInteractive={false} position="bottom-right" orientation="vertical"
            className={flow.controls} />
        )}
        {children}
      </ReactFlow>
    </div>
  );
}
