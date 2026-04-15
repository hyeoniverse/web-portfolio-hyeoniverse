"use client";

import { useEffect, useRef } from "react";
import styles from "./Fireworks.module.css";

interface FireworksProps {
  /** true로 바뀌는 순간 한 번 터뜨림 */
  trigger: boolean;
  /** 종료 후 호출 — 부모가 trigger를 false로 리셋하는 용도 */
  onDone?: () => void;
  /** 터뜨리기 지속 시간 (ms) */
  duration?: number;
  /** 폭죽과 함께 화면 중앙에 표시할 축하 메시지 */
  message?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  gravity: number;
}

const COLORS = [
  "#ff4f6d", "#ff9f43", "#feca57", "#1dd1a1",
  "#48dbfb", "#5f27cd", "#ff6b9d", "#c44569",
];

function launchBurst(cx: number, cy: number, color: string, count = 40): Particle[] {
  const ps: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 3 + Math.random() * 4;
    ps.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 3,
      life: 0,
      maxLife: 60 + Math.random() * 30,
      gravity: 0.08 + Math.random() * 0.04,
    });
  }
  return ps;
}

export default function Fireworks({ trigger, onDone, duration = 2400, message }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!trigger || firedRef.current) return;
    firedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPR 대응
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];
    const startedAt = performance.now();

    // 3번의 터짐 (시차)
    const bursts = [
      { delay: 0, x: w * 0.5, y: h * 0.5 },
      { delay: 250, x: w * 0.3, y: h * 0.45 },
      { delay: 500, x: w * 0.7, y: h * 0.45 },
    ];

    const burstTimers = bursts.map((b, i) =>
      setTimeout(() => {
        const color = COLORS[i % COLORS.length];
        particles.push(...launchBurst(b.x, b.y, color, 50));
        // 두 번째 색상 섞기
        const color2 = COLORS[(i + 3) % COLORS.length];
        particles.push(...launchBurst(b.x, b.y, color2, 30));
      }, b.delay),
    );

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      if (elapsed < duration || particles.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        firedRef.current = false;
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      burstTimers.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
      firedRef.current = false;
    };
  }, [trigger, duration, onDone]);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      {message && trigger && (
        <div className={styles.message} role="status" aria-live="polite">
          {message}
        </div>
      )}
    </>
  );
}
