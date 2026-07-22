"use client";

/* 개념 ERD (Chen 표기) — React Flow 기반.
 *
 * 직접 그린 SVG 는 도형 경계까지 선을 잘라내는 계산을 손으로 해야 했고,
 * 선이 도형 위로 지나가는 걸 막기 어려웠다.
 * React Flow 로 옮기면 handle 이 경계를 잡아주고 라우팅도 라이브러리가 처리한다. */

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  ReactFlow, Background, BackgroundVariant, Controls,
  useNodesState,
  type Node, type Edge,
} from "@xyflow/react";
import { CHEN_NODE_TYPES, chenHandles, CHEN_SIZE } from "./chenNodes";
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
  tables, relations, lang, className, onEntityClick, children, showControls = true,
}: {
  tables?: ErdTable[];
  relations?: ErdRelation[];
  lang: "ko" | "en";
  className?: string;
  /** 엔티티를 누르면 — 스키마 뷰로 넘겨 실제 테이블을 보여준다 */
  onEntityClick?: (name: string) => void;
  children?: ReactNode;
  showControls?: boolean;
}) {
  const model = useMemo(() => buildChenModel(tables, relations), [tables, relations]);
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

  const reducedMotion = usePrefersReducedMotion();

  /* ── force 시뮬레이션 ──────────────────────────────────
     예전에는 드래그 이벤트마다 이산 완화를 다시 돌렸는데, 한 번에 여러 칸씩
     건너뛰어 주변이 튀었다. 여기서는 속도·감쇠를 가진 연속 적분을 rAF 로 돌린다.
     계산이 멈춘 뒤에는 프레임을 돌리지 않고, 드래그하면 다시 데운다. */
  const sim = useRef({
    pos: new Map<string, { x: number; y: number; vx: number; vy: number }>(),
    links: [] as { a: string; b: string; d: number }[],
    alpha: 0,
    raf: 0,
    drag: null as string | null,
  });

  /* 배치가 바뀌면 시뮬레이션 상태를 그 좌표로 초기화 */
  useEffect(() => {
    const st = sim.current;
    st.pos = new Map(initialNodes.map((n) => {
      const s2 = n.type === "chenEntity" ? CHEN_SIZE.entity
        : n.type === "chenAttr" ? CHEN_SIZE.attr : CHEN_SIZE.rel;
      return [n.id, { x: n.position.x + s2.w / 2, y: n.position.y + s2.h / 2, vx: 0, vy: 0 }];
    }));
    st.links = edges.map((e) => ({ a: e.source, b: e.target, d: 176 }));
    st.alpha = 0;
  }, [initialNodes, edges]);

  const radiusOf = useCallback((id: string) =>
    id.startsWith("E:") ? 104 : id.startsWith("R:") ? 68 : 64, []);

  const tick = useCallback(() => {
    const st = sim.current;
    const ids = [...st.pos.keys()];

    /* 반발 — 겹치는 만큼만 밀어낸다 (전 쌍이지만 수십 개라 60fps 여유) */
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = st.pos.get(ids[i])!, b = st.pos.get(ids[j])!;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const min = radiusOf(ids[i]) + radiusOf(ids[j]);
        if (d >= min) continue;
        const f = ((min - d) / d) * 0.12 * st.alpha;
        a.vx -= dx * f; a.vy -= dy * f;
        b.vx += dx * f; b.vy += dy * f;
      }
    }
    /* 링크 스프링 */
    for (const l of st.links) {
      const a = st.pos.get(l.a), b = st.pos.get(l.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = ((d - l.d) / d) * 0.045 * st.alpha;
      a.vx += dx * f; a.vy += dy * f;
      b.vx -= dx * f; b.vy -= dy * f;
    }

    /* 적분 + 감쇠. 끌고 있는 노드는 손끝에 고정.
       프레임당 이동량을 제한한다 — 안 막으면 재가열 순간 100px 넘게 튄다. */
    const MAX_STEP = 9;
    st.pos.forEach((p, id) => {
      if (id === st.drag) { p.vx = 0; p.vy = 0; return; }
      p.vx *= 0.80; p.vy *= 0.80;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > MAX_STEP) { p.vx = (p.vx / sp) * MAX_STEP; p.vy = (p.vy / sp) * MAX_STEP; }
      p.x += p.vx; p.y += p.vy;
    });

    setNodes((prev) => prev.map((n) => {
      const p = st.pos.get(n.id);
      if (!p || n.id === st.drag) return n;
      const s2 = n.type === "chenEntity" ? CHEN_SIZE.entity
        : n.type === "chenAttr" ? CHEN_SIZE.attr : CHEN_SIZE.rel;
      return { ...n, position: { x: p.x - s2.w / 2, y: p.y - s2.h / 2 } };
    }));

    st.alpha *= 0.94;
    st.raf = st.alpha > 0.02 ? requestAnimationFrame(tick) : 0;
  }, [radiusOf, setNodes]);

  const heat = useCallback(() => {
    /* 동작 줄이기 설정이면 스프링을 아예 돌리지 않는다. 배치는 layoutChen() 이
       이미 겹침 없이 잡아두므로 그림은 그대로고, 끌어놓은 노드도 제자리에 남는다.
       주변이 따라 출렁이는 움직임만 사라진다. */
    if (reducedMotion) return;
    const st = sim.current;
    /* 드래그 중에는 낮게 유지 — 1 로 올리면 한 프레임에 크게 밀린다 */
    st.alpha = Math.max(st.alpha, st.drag ? 0.45 : 0.8);
    if (!st.raf) st.raf = requestAnimationFrame(tick);
  }, [tick, reducedMotion]);

  useEffect(() => () => { if (sim.current.raf) cancelAnimationFrame(sim.current.raf); }, []);

  /* 드래그 중에는 그 노드를 고정하고 주변만 반응하게 한다 */
  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes);
    for (const c of changes) {
      if (c.type !== "position") continue;
      const st = sim.current;
      if (c.dragging && c.position) {
        const n = nodes.find((x) => x.id === c.id);
        const s2 = n?.type === "chenEntity" ? CHEN_SIZE.entity
          : n?.type === "chenAttr" ? CHEN_SIZE.attr : CHEN_SIZE.rel;
        const p = st.pos.get(c.id);
        if (p) { p.x = c.position.x + s2.w / 2; p.y = c.position.y + s2.h / 2; p.vx = 0; p.vy = 0; }
        st.drag = c.id;
        heat();
      } else if (c.dragging === false) {
        st.drag = null;
        heat();
      }
    }
  }, [onNodesChange, nodes, heat]);

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
        onNodesChange={handleNodesChange}
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
        /* 끌어서 재배치 — force 가 주변을 따라 움직인다 */
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
