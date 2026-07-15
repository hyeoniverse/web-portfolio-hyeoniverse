"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import styles from "./ArchDiagram.module.css";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon: string;
  group?: string;
}

interface Edge {
  from: string;
  to: string;
  dashed?: boolean;
}

const ICONS: Record<string, { path: string; color: string }> = {
  user:     { path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", color: "#6b7280" },
  nextjs:   { path: "M12 2L2 19.5h20L12 2z", color: "#000000" },
  react:    { path: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M2 12c0-2.8 4.5-5 10-5s10 2.2 10 5-4.5 5-10 5S2 14.8 2 12z", color: "#61dafb" },
  css:      { path: "M4 3l1.8 18L12 23l6.2-2L20 3H4zM16 8H8l.3 3h7.4l-.5 5-3.2.9-3.2-.9-.2-2.5", color: "#1572b6" },
  gsap:     { path: "M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z", color: "#88ce02" },
  framer:   { path: "M5 2h14v7H12l7 7H5v-7h7L5 2zM5 16h7v7l-7-7z", color: "#e846ff" },
  threejs:  { path: "M3 3h18v18H3V3zM8 8l4 8 4-8", color: "#049ef4" },
  lenis:    { path: "M2 12c2-3 4-6 6-6s4 3 6 6 4 6 6 6", color: "#ff6b35" },
  api:      { path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", color: "#f59e0b" },
  plate:    { path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8", color: "#6366f1" },
  supabase: { path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", color: "#3ecf8e" },
  postgres: { path: "M12 2a8 8 0 0 0-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 0 0-8-8zM12 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", color: "#336791" },
  auth:     { path: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4", color: "#f97316" },
  storage:  { path: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", color: "#10b981" },
  vercel:   { path: "M12 2L2 19.5h20L12 2z", color: "#000000" },
  ssr:      { path: "M2 5h6v6H2zM10 5h12v2H10zM10 9h8v2h-8zM2 13h20v2H2zM2 17h14v2H2z", color: "#3b82f6" },
  realtime: { path: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2", color: "#3ecf8e" },
  giscus:   { path: "M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4.2-.9L3 20.5l1.6-4.4A8.3 8.3 0 0 1 3.6 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.4 8.4z", color: "#6e5494" },
};

const INITIAL_NODES: Node[] = [
  { id: "user", label: "User", x: 880, y: 210, w: 72, h: 72, icon: "user" },

  { id: "nextjs", label: "Next.js 16", x: 640, y: 100, w: 120, h: 48, icon: "nextjs", group: "frontend" },
  { id: "react", label: "React 19", x: 640, y: 200, w: 120, h: 48, icon: "react", group: "frontend" },
  { id: "css", label: "CSS Modules", x: 640, y: 300, w: 120, h: 48, icon: "css", group: "frontend" },

  { id: "gsap", label: "GSAP", x: 470, y: 100, w: 100, h: 40, icon: "gsap", group: "animation" },
  { id: "framer", label: "Framer", x: 470, y: 155, w: 100, h: 40, icon: "framer", group: "animation" },
  { id: "threejs", label: "Three.js", x: 470, y: 210, w: 100, h: 40, icon: "threejs", group: "animation" },
  { id: "lenis", label: "Lenis", x: 470, y: 265, w: 100, h: 40, icon: "lenis", group: "animation" },

  { id: "api", label: "API Routes", x: 640, y: 400, w: 120, h: 48, icon: "api", group: "backend" },
  { id: "plate", label: "Plate.js", x: 470, y: 400, w: 100, h: 40, icon: "plate", group: "backend" },

  { id: "supabase", label: "Supabase", x: 300, y: 440, w: 110, h: 48, icon: "supabase", group: "db" },
  { id: "postgres", label: "PostgreSQL", x: 140, y: 380, w: 110, h: 40, icon: "postgres", group: "db" },
  { id: "auth", label: "Auth", x: 140, y: 435, w: 110, h: 40, icon: "auth", group: "db" },
  { id: "storage", label: "Storage", x: 140, y: 490, w: 110, h: 40, icon: "storage", group: "db" },
  // 편집 presence (usePostPresence) — supabase 바로 위, 수직 엣지라 다른 노드를 안 지나간다
  { id: "realtime", label: "Realtime", x: 300, y: 380, w: 110, h: 40, icon: "realtime", group: "db" },

  { id: "vercel", label: "Vercel", x: 820, y: 400, w: 100, h: 48, icon: "vercel", group: "deploy" },
  { id: "ssr", label: "SSR / ISR", x: 820, y: 100, w: 100, h: 40, icon: "ssr", group: "deploy" },
  // 외부 댓글 provider — admin 에서 system(supabase) ↔ giscus 전환. api 아래 빈 영역.
  { id: "giscus", label: "giscus", x: 620, y: 480, w: 110, h: 44, icon: "giscus", group: "external" },
];

const EDGES: Edge[] = [
  { from: "user", to: "nextjs" },
  { from: "user", to: "react" },
  { from: "nextjs", to: "ssr" },
  { from: "nextjs", to: "react" },
  { from: "react", to: "css" },
  { from: "react", to: "gsap" },
  { from: "react", to: "framer" },
  { from: "react", to: "threejs" },
  { from: "react", to: "lenis" },
  { from: "nextjs", to: "api" },
  { from: "api", to: "supabase" },
  { from: "api", to: "plate" },
  { from: "supabase", to: "postgres" },
  { from: "supabase", to: "auth" },
  { from: "supabase", to: "storage" },
  { from: "supabase", to: "realtime" },
  { from: "api", to: "vercel", dashed: true },
  { from: "nextjs", to: "vercel", dashed: true },
  // giscus 선택 시 시스템 댓글(api→supabase) 대신 GitHub Discussions 를 씀
  { from: "api", to: "giscus", dashed: true },
];

const GROUP_COLORS: Record<string, string> = {
  frontend: "var(--text-accent)",
  animation: "var(--text-tertiary)",
  backend: "var(--text-secondary)",
  db: "var(--text-muted)",
  deploy: "var(--text-tertiary)",
  external: "var(--text-muted)",
};

function getCenter(n: Node) {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function getEdgePoints(from: Node, to: Node) {
  const fc = getCenter(from);
  const tc = getCenter(to);
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;
  const angle = Math.atan2(dy, dx);

  const fx = fc.x + Math.cos(angle) * (from.w / 2);
  const fy = fc.y + Math.sin(angle) * (from.h / 2);
  const tx = tc.x - Math.cos(angle) * (to.w / 2);
  const ty = tc.y - Math.sin(angle) * (to.h / 2);

  return { x1: fx, y1: fy, x2: tx, y2: ty };
}

export default function ArchDiagram() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const connectedNodes = new Set<string>();
  const activeId = hovered || dragging;
  if (activeId) {
    connectedNodes.add(activeId);
    EDGES.forEach((e) => {
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
      const nx = Math.max(0, Math.min(1000 - n.w, svgPt.x - dragOffset.current.x));
      const ny = Math.max(0, Math.min(560 - n.h, svgPt.y - dragOffset.current.y));
      return { ...n, x: nx, y: ny };
    }));
  }, [dragging, toSvg]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Force simulation — 연결된 노드가 스프링으로 반응
  const velocities = useRef<Record<string, { vx: number; vy: number }>>({});
  useEffect(() => {
    const SPRING = 0.008;
    const REPULSION = 800;
    const DAMPING = 0.85;
    const REST_THRESHOLD = 0.1;

    let raf: number;
    const tick = () => {
      setNodes((prev) => {
        let moved = false;
        const next = prev.map((n) => {
          if (n.id === dragging) return n;
          const vel = velocities.current[n.id] || { vx: 0, vy: 0 };
          let fx = 0, fy = 0;

          const init = INITIAL_NODES.find((i) => i.id === n.id)!;

          // Edge spring — 연결된 노드와의 거리 유지
          EDGES.forEach((e) => {
            const otherId = e.from === n.id ? e.to : e.to === n.id ? e.from : null;
            if (!otherId) return;
            const other = prev.find((p) => p.id === otherId)!;
            const otherInit = INITIAL_NODES.find((i) => i.id === otherId)!;
            const restDx = init.x - otherInit.x;
            const restDy = init.y - otherInit.y;
            const dx = n.x - other.x - restDx;
            const dy = n.y - other.y - restDy;
            fx -= dx * SPRING;
            fy -= dy * SPRING;
          });

          // Repulsion from dragged node
          if (dragging) {
            const dragNode = prev.find((p) => p.id === dragging)!;
            const dx = n.x - dragNode.x;
            const dy = n.y - dragNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 150) {
              const force = REPULSION / (dist * dist);
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          }

          vel.vx = (vel.vx + fx) * DAMPING;
          vel.vy = (vel.vy + fy) * DAMPING;
          velocities.current[n.id] = vel;

          if (Math.abs(vel.vx) > REST_THRESHOLD || Math.abs(vel.vy) > REST_THRESHOLD) {
            moved = true;
            return { ...n, x: Math.max(0, Math.min(1000 - n.w, n.x + vel.vx)), y: Math.max(0, Math.min(560 - n.h, n.y + vel.vy)) };
          }
          return n;
        });
        return moved ? next : prev;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 560"
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
      {EDGES.map((edge, i) => {
        const pts = getEdgePoints(nodeMap[edge.from], nodeMap[edge.to]);
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
        const groupColor = node.group ? GROUP_COLORS[node.group] : "var(--border-default-color)";
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
            <circle cx={node.x + node.h / 2} cy={node.y + node.h / 2} r={node.h / 2 - 4} fill={ICONS[node.icon].color} opacity={0.9} />
            <g transform={`translate(${node.x + node.h / 2 - 8}, ${node.y + node.h / 2 - 8})`}>
              <path d={ICONS[node.icon].path} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" transform="scale(0.65)" />
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
      {Object.entries(GROUP_COLORS).map(([key, color]) => {
        const groupNodes = nodes.filter((n) => n.group === key);
        if (groupNodes.length === 0) return null;
        const minX = Math.min(...groupNodes.map((n) => n.x)) - 4;
        const minY = Math.min(...groupNodes.map((n) => n.y)) - 14;
        const labels: Record<string, string> = { frontend: "FRONTEND", animation: "ANIMATION / 3D", backend: "BACKEND", db: "DATABASE", deploy: "DEPLOY" };
        return (
          <text key={key} x={minX} y={minY} fill={color} fontSize={8} fontFamily="var(--font-mono)" fontWeight={600} letterSpacing={1.2} opacity={0.5}>
            {labels[key]}
          </text>
        );
      })}
    </svg>
  );
}
