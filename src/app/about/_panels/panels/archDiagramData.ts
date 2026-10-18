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

/** viewBox 크기 — 노드 좌표계 기준 */
export const ARCH_VIEW = { w: 1000, h: 560 };

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
  { id: "plate", label: "Plate.js", x: 470, y: 400, w: 100, h: 40, icon: "plate" },
  { id: "supabase", label: "Supabase", x: 300, y: 440, w: 110, h: 48, icon: "supabase", group: "db" },
  { id: "postgres", label: "PostgreSQL", x: 140, y: 380, w: 110, h: 40, icon: "postgres", group: "db" },
  { id: "auth", label: "Auth", x: 140, y: 435, w: 110, h: 40, icon: "auth", group: "db" },
  { id: "storage", label: "Storage", x: 140, y: 490, w: 110, h: 40, icon: "storage", group: "db" },
  { id: "realtime", label: "Realtime", x: 300, y: 380, w: 110, h: 40, icon: "realtime", group: "db" },
  { id: "pgcron", label: "pg_cron", x: 300, y: 500, w: 110, h: 40, icon: "cron", group: "db" },
  { id: "vercel", label: "Vercel", x: 820, y: 400, w: 100, h: 48, icon: "vercel", group: "deploy" },
  { id: "ssr", label: "SSR / ISR", x: 820, y: 100, w: 100, h: 40, icon: "ssr", group: "deploy" },
  { id: "giscus", label: "giscus", x: 620, y: 480, w: 110, h: 44, icon: "giscus", group: "external" },
  { id: "resend", label: "Resend", x: 760, y: 480, w: 110, h: 44, icon: "mail", group: "external" },
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
  { from: "react", to: "plate" },
  { from: "supabase", to: "postgres" },
  { from: "supabase", to: "auth" },
  { from: "supabase", to: "storage" },
  { from: "supabase", to: "realtime" },
  { from: "supabase", to: "pgcron" },
  { from: "api", to: "vercel", dashed: true },
  { from: "nextjs", to: "vercel", dashed: true },
  { from: "react", to: "giscus", dashed: true },
  { from: "api", to: "resend", dashed: true },
];
