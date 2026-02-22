"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { TreeNode, Edge, Pos } from "./architectureLayout";
import { VIEWBOX_WIDTH, VIEWBOX_HEIGHT, CENTER_X, CENTER_Y } from "./architectureLayout";

interface ForceNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  fx?: number;
  fy?: number;
}

/* ── 시뮬레이션 파라미터 ── */
const REPULSION = 6000;
const LINK_DISTANCE = 90;
const LINK_STRENGTH = 0.015;
const CENTER_GRAVITY = 0.01;
const VELOCITY_DECAY = 0.88;
const PADDING = 35;
const COLLISION_RADIUS = 40;

function step(sim: ForceNode[], edges: Edge[], alpha: number) {
  const n = sim.length;

  // 1. 척력 (Coulomb — all pairs)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = sim[j].x - sim[i].x;
      const dy = sim[j].y - sim[i].y;
      const distSq = Math.max(dx * dx + dy * dy, 100);
      const dist = Math.sqrt(distSq);
      const force = (REPULSION * alpha) / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      sim[i].vx -= fx / sim[i].mass;
      sim[i].vy -= fy / sim[i].mass;
      sim[j].vx += fx / sim[j].mass;
      sim[j].vy += fy / sim[j].mass;
    }
  }

  // 2. 인력 (Spring — edges)
  for (const edge of edges) {
    const s = sim[edge.from];
    const t = sim[edge.to];
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = (dist - LINK_DISTANCE) * LINK_STRENGTH * alpha;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    s.vx += fx / s.mass;
    s.vy += fy / s.mass;
    t.vx -= fx / t.mass;
    t.vy -= fy / t.mass;
  }

  // 3. 중심 인력
  for (const node of sim) {
    node.vx += (CENTER_X - node.x) * CENTER_GRAVITY * alpha;
    node.vy += (CENTER_Y - node.y) * CENTER_GRAVITY * alpha;
  }

  // 4. 속도 적용 + 감쇠 + 경계
  for (const node of sim) {
    if (node.fx !== undefined) {
      node.x = node.fx;
      node.vx = 0;
    } else {
      node.vx *= VELOCITY_DECAY;
      node.x += node.vx;
    }
    if (node.fy !== undefined) {
      node.y = node.fy;
      node.vy = 0;
    } else {
      node.vy *= VELOCITY_DECAY;
      node.y += node.vy;
    }
    node.x = Math.max(PADDING, Math.min(VIEWBOX_WIDTH - PADDING, node.x));
    node.y = Math.max(PADDING, Math.min(VIEWBOX_HEIGHT - PADDING, node.y));
  }

  // 5. 충돌 방지 — 최소 거리 보장
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = sim[j].x - sim[i].x;
      const dy = sim[j].y - sim[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < COLLISION_RADIUS && dist > 0) {
        const push = (COLLISION_RADIUS - dist) / 2;
        const px = (dx / dist) * push;
        const py = (dy / dist) * push;
        if (sim[i].fx === undefined) { sim[i].x -= px; sim[i].y -= py; }
        if (sim[j].fx === undefined) { sim[j].x += px; sim[j].y += py; }
      }
    }
  }
}

export function useForceGraph(
  nodes: TreeNode[],
  edges: Edge[],
  active: boolean,
) {
  const [positions, setPositions] = useState<Pos[]>(() =>
    nodes.map(() => ({ x: CENTER_X, y: CENTER_Y })),
  );

  const simRef = useRef<ForceNode[]>([]);
  const rafRef = useRef(0);
  const alphaRef = useRef(1);
  const dragRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = () => {
      step(simRef.current, edges, alphaRef.current);

      if (dragRef.current === null) {
        alphaRef.current *= 0.993;
      }

      setPositions(simRef.current.map((n) => ({ x: n.x, y: n.y })));

      if (alphaRef.current < 0.001 && dragRef.current === null) {
        runningRef.current = false;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [edges]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      return;
    }

    // 원형 초기 배치
    const count = nodes.length;
    const angleStep = (Math.PI * 2) / Math.max(count - 1, 1);
    simRef.current = nodes.map((n, i) => {
      if (i === 0) {
        return { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0, mass: 4 };
      }
      const angle = angleStep * (i - 1) - Math.PI / 2;
      const radius = n.row === 1 ? 130 : 220;
      return {
        x: CENTER_X + Math.cos(angle) * (radius + Math.random() * 20),
        y: CENTER_Y + Math.sin(angle) * (radius + Math.random() * 20),
        vx: 0,
        vy: 0,
        mass: n.childIndices.length > 0 ? 2 : 1,
      };
    });

    alphaRef.current = 1;
    runningRef.current = false;
    startLoop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    };
  }, [active, nodes, startLoop]);

  const onDragStart = useCallback(
    (index: number, vx: number, vy: number) => {
      dragRef.current = index;
      const node = simRef.current[index];
      if (node) {
        node.fx = vx;
        node.fy = vy;
      }
      alphaRef.current = Math.max(alphaRef.current, 0.3);
      startLoop();
    },
    [startLoop],
  );

  const onDrag = useCallback((vx: number, vy: number) => {
    const idx = dragRef.current;
    if (idx === null) return;
    const node = simRef.current[idx];
    if (node) {
      node.fx = Math.max(PADDING, Math.min(VIEWBOX_WIDTH - PADDING, vx));
      node.fy = Math.max(PADDING, Math.min(VIEWBOX_HEIGHT - PADDING, vy));
    }
    alphaRef.current = Math.max(alphaRef.current, 0.3);
  }, []);

  const onDragEnd = useCallback(() => {
    const idx = dragRef.current;
    if (idx !== null && simRef.current[idx]) {
      delete simRef.current[idx].fx;
      delete simRef.current[idx].fy;
    }
    dragRef.current = null;
  }, []);

  return { positions, onDragStart, onDrag, onDragEnd };
}
