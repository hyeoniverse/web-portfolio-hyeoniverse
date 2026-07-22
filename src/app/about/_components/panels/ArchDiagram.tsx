"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import {
  type ArchNode, type ArchDiagramData,
  ARCH_ICONS, ARCH_GROUP_COLORS, ARCH_GROUP_LABELS, ARCH_VIEW,
  DEFAULT_ARCH_NODES, DEFAULT_ARCH_EDGES, archEdgePoints,
} from "./archDiagramData";
import styles from "./ArchDiagram.module.css";

export default function ArchDiagram() {
  const cfg = useSiteConfig();
  const arch = (cfg.about as { archDiagram?: ArchDiagramData } | undefined)?.archDiagram;
  // config 에 노드가 있으면 그걸, 없으면 기본값
  const [initNodes] = useState<ArchNode[]>(() => (arch?.nodes?.length ? arch.nodes : DEFAULT_ARCH_NODES));
  const edges = arch?.edges?.length ? arch.edges : DEFAULT_ARCH_EDGES;

  const [nodes, setNodes] = useState<ArchNode[]>(initNodes);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const connectedNodes = new Set<string>();
  const activeId = hovered || dragging;
  if (activeId) {
    connectedNodes.add(activeId);
    edges.forEach((e) => {
      if (e.from === activeId) connectedNodes.add(e.to);
      if (e.to === activeId) connectedNodes.add(e.from);
    });
  }

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handlePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    const node = nodeMap[id];
    const svgPt = toSvg(e.clientX, e.clientY);
    dragOffset.current = { x: svgPt.x - node.x, y: svgPt.y - node.y };
    setDragging(id);
  }, [nodeMap, toSvg]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const svgPt = toSvg(e.clientX, e.clientY);
    setNodes((prev) => prev.map((n) => {
      if (n.id !== dragging) return n;
      const nx = Math.max(0, Math.min(ARCH_VIEW.w - n.w, svgPt.x - dragOffset.current.x));
      const ny = Math.max(0, Math.min(ARCH_VIEW.h - n.h, svgPt.y - dragOffset.current.y));
      return { ...n, x: nx, y: ny };
    }));
  }, [dragging, toSvg]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Force simulation — 연결된 노드가 스프링으로 반응 (rest 위치 = 초기 config/기본 노드)
  const velocities = useRef<Record<string, { vx: number; vy: number }>>({});
  useEffect(() => {
    const SPRING = 0.008;
    const REPULSION = 800;
    const DAMPING = 0.85;
    const REST_THRESHOLD = 0.1;
    const restMap = Object.fromEntries(initNodes.map((n) => [n.id, n]));

    let raf: number;
    const tick = () => {
      setNodes((prev) => {
        let moved = false;
        const next = prev.map((n) => {
          if (n.id === dragging) return n;
          const vel = velocities.current[n.id] || { vx: 0, vy: 0 };
          let fx = 0, fy = 0;
          const init = restMap[n.id];
          if (!init) return n;

          edges.forEach((e) => {
            const otherId = e.from === n.id ? e.to : e.to === n.id ? e.from : null;
            if (!otherId) return;
            const other = prev.find((p) => p.id === otherId);
            const otherInit = restMap[otherId];
            if (!other || !otherInit) return;
            const restDx = init.x - otherInit.x;
            const restDy = init.y - otherInit.y;
            const dx = n.x - other.x - restDx;
            const dy = n.y - other.y - restDy;
            fx -= dx * SPRING;
            fy -= dy * SPRING;
          });

          if (dragging) {
            const dragNode = prev.find((p) => p.id === dragging);
            if (dragNode) {
              const dx = n.x - dragNode.x;
              const dy = n.y - dragNode.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              if (dist < 150) {
                const force = REPULSION / (dist * dist);
                fx += (dx / dist) * force;
                fy += (dy / dist) * force;
              }
            }
          }

          vel.vx = (vel.vx + fx) * DAMPING;
          vel.vy = (vel.vy + fy) * DAMPING;
          velocities.current[n.id] = vel;

          if (Math.abs(vel.vx) > REST_THRESHOLD || Math.abs(vel.vy) > REST_THRESHOLD) {
            moved = true;
            return { ...n, x: Math.max(0, Math.min(ARCH_VIEW.w - n.w, n.x + vel.vx)), y: Math.max(0, Math.min(ARCH_VIEW.h - n.h, n.y + vel.vy)) };
          }
          return n;
        });
        return moved ? next : prev;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging, edges, initNodes]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${ARCH_VIEW.w} ${ARCH_VIEW.h}`}
      className={styles.diagram}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <defs>
        <marker id="archArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-muted)" />
        </marker>
        <marker id="archArrowAccent" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-accent)" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const from = nodeMap[edge.from];
        const to = nodeMap[edge.to];
        if (!from || !to) return null;
        const pts = archEdgePoints(from, to);
        const isHl = activeId && (edge.from === activeId || edge.to === activeId);
        const isDim = activeId && !isHl;
        return (
          <line
            key={i}
            x1={pts.x1} y1={pts.y1} x2={pts.x2} y2={pts.y2}
            stroke={isHl ? "var(--text-accent)" : "var(--border-default-color)"}
            strokeWidth={isHl ? 1.5 : 0.8}
            strokeDasharray={edge.dashed ? "4 3" : undefined}
            markerEnd={isHl ? "url(#archArrowAccent)" : "url(#archArrow)"}
            opacity={isDim ? 0.12 : 1}
            className={styles.edge}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const isHl = !activeId || connectedNodes.has(node.id);
        const isActive = activeId === node.id;
        const groupColor = node.group ? (ARCH_GROUP_COLORS[node.group] ?? "var(--border-default-color)") : "var(--border-default-color)";
        const ic = ARCH_ICONS[node.icon] ?? ARCH_ICONS.user;
        return (
          <g
            key={node.id}
            onPointerDown={(e) => handlePointerDown(node.id, e)}
            onMouseEnter={() => { if (!dragging) setHovered(node.id); }}
            onMouseLeave={() => { if (!dragging) setHovered(null); }}
            opacity={isHl ? 1 : 0.15}
            className={`${styles.node} ${dragging === node.id ? styles.dragging : ""}`}
          >
            <rect
              x={node.x} y={node.y} width={node.w} height={node.h}
              rx={node.h / 2}
              fill="var(--bg-primary)"
              stroke={isActive ? "var(--text-accent)" : groupColor}
              strokeWidth={isActive ? 1.5 : 1}
            />
            <circle cx={node.x + node.h / 2} cy={node.y + node.h / 2} r={node.h / 2 - 4} fill={ic.color} opacity={0.9} />
            <g transform={`translate(${node.x + node.h / 2 - 8}, ${node.y + node.h / 2 - 8})`}>
              <path d={ic.path} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" transform="scale(0.65)" />
            </g>
            <text
              x={node.x + node.h + 2} y={node.y + node.h / 2 + 1}
              dominantBaseline="central"
              fill="var(--text-primary)"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fontWeight={500}
            >
              {node.label}
            </text>
          </g>
        );
      })}

      {/* Group labels */}
      {Object.entries(ARCH_GROUP_COLORS).map(([key, color]) => {
        const groupNodes = nodes.filter((n) => n.group === key);
        if (groupNodes.length === 0) return null;
        const minX = Math.min(...groupNodes.map((n) => n.x)) - 4;
        const minY = Math.min(...groupNodes.map((n) => n.y)) - 14;
        return (
          <text key={key} x={minX} y={minY} fill={color} fontSize={8} fontFamily="var(--font-mono)" fontWeight={600} letterSpacing={1.2} opacity={0.5}>
            {ARCH_GROUP_LABELS[key]}
          </text>
        );
      })}
    </svg>
  );
}
