/* ─────────────────────────────────────────────────────────────
   Architecture 다이어그램 공유 데이터 — 공개 ArchDiagram(렌더) 과
   admin 스튜디오(편집기) 가 함께 씀. 노드/엣지 기본값 + 아이콘 + 그룹.
   ───────────────────────────────────────────────────────────── */

export interface ArchNode {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon: string;
  group?: string;
}
export interface ArchEdge {
  from: string;
  to: string;
  dashed?: boolean;
}
export interface ArchDiagramData {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

/** viewBox 크기 — 노드 좌표계 기준 */
export const ARCH_VIEW = { w: 1000, h: 560 };

export const ARCH_ICONS: Record<string, { path: string; color: string }> = {
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

export const ARCH_GROUP_COLORS: Record<string, string> = {
  frontend: "var(--text-accent)",
  animation: "var(--text-tertiary)",
  backend: "var(--text-secondary)",
  db: "var(--text-muted)",
  deploy: "var(--text-tertiary)",
  external: "var(--text-muted)",
};
export const ARCH_GROUP_LABELS: Record<string, string> = {
  frontend: "FRONTEND",
  animation: "ANIMATION / 3D",
  backend: "BACKEND",
  db: "DATABASE",
  deploy: "DEPLOY",
  external: "EXTERNAL",
};

export const DEFAULT_ARCH_NODES: ArchNode[] = [
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
  { id: "realtime", label: "Realtime", x: 300, y: 380, w: 110, h: 40, icon: "realtime", group: "db" },
  { id: "vercel", label: "Vercel", x: 820, y: 400, w: 100, h: 48, icon: "vercel", group: "deploy" },
  { id: "ssr", label: "SSR / ISR", x: 820, y: 100, w: 100, h: 40, icon: "ssr", group: "deploy" },
  { id: "giscus", label: "giscus", x: 620, y: 480, w: 110, h: 44, icon: "giscus", group: "external" },
];

export const DEFAULT_ARCH_EDGES: ArchEdge[] = [
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
  { from: "api", to: "giscus", dashed: true },
];

function archNodeCenter(n: ArchNode) {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

/** 두 노드 사이 엣지의 시작/끝 좌표 (테두리에 맞물리게) */
export function archEdgePoints(from: ArchNode, to: ArchNode) {
  const fc = archNodeCenter(from);
  const tc = archNodeCenter(to);
  const angle = Math.atan2(tc.y - fc.y, tc.x - fc.x);
  return {
    x1: fc.x + Math.cos(angle) * (from.w / 2),
    y1: fc.y + Math.sin(angle) * (from.h / 2),
    x2: tc.x - Math.cos(angle) * (to.w / 2),
    y2: tc.y - Math.sin(angle) * (to.h / 2),
  };
}
