"use client";

import { useEffect, useRef } from "react";
import styles from "./Fireworks.module.css";

interface FireworksProps {
  trigger: boolean;
  onDone?: () => void;
  duration?: number;
  message?: string;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  gravity: number;
  wobble: number;
  wobbleSpeed: number;
}

const COLORS = [
  "#ff4f6d", "#ff9f43", "#feca57", "#1dd1a1",
  "#48dbfb", "#5f27cd", "#ff6b9d", "#54a0ff",
  "#ee5a24", "#0abde3", "#10ac84", "#f368e0",
];

function spawnConfetti(cx: number, cy: number, count: number): Confetti[] {
  const ps: Confetti[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    ps.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed * (0.6 + Math.random()),
      vy: Math.sin(angle) * speed - 3 - Math.random() * 3,
      w: 4 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      life: 0,
      maxLife: 80 + Math.random() * 50,
      gravity: 0.12 + Math.random() * 0.06,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.08,
    });
  }
  return ps;
}

export default function Fireworks({ trigger, onDone, duration = 2800 }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    if (!trigger) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const particles: Confetti[] = [];
    const startedAt = performance.now();

    const bursts = [
      { delay: 0, x: w * 0.5, y: h * 0.35 },
      { delay: 200, x: w * 0.35, y: h * 0.3 },
      { delay: 400, x: w * 0.65, y: h * 0.3 },
    ];

    const burstTimers = bursts.map((b) =>
      setTimeout(() => particles.push(...spawnConfetti(b.x, b.y, 60)), b.delay),
    );

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.x += p.vx + Math.sin(p.wobble) * 0.8;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.wobble += p.wobbleSpeed;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        if (p.life >= p.maxLife) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      if (elapsed < duration || particles.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDoneRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      burstTimers.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [trigger, duration]);

  return (
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
  );
}
