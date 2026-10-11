"use client";

/* 비 · 눈 · 번개 — 하늘 위 캔버스 하나에 입자로 그린다. CSS 무늬로는 비가 줄무늬, 눈이 점 격자로 보였다.
   - 비: 길이 · 빠르기 · 굵기가 다른 빗줄기가 세 겹(먼 · 중간 · 가까운) 깊이로 바람에 비스듬히 떨어지고, 바닥 근처에서 튄다
   - 눈: 크기가 다른 부드러운 눈송이가 좌우로 흔들리며 천천히 내린다(가까울수록 크고 빠르다)
   - 뇌우: 비 + 몇 초마다 갈라지는 번개가 내리치고 하늘이 두 번 번쩍인 뒤 잦아든다
   색은 하늘 밝기를 따른다(밝은 하늘엔 어두운 빗줄기) — CSS 토큰을 읽은 색이다. 움직임 줄이기 · 탭 숨김이면 멈춘다 */
import { useEffect, useRef } from "react";
import type { WeatherKind } from "@/lib/weather/sky";
import styles from "./TimeSky.module.css";

interface Drop { x: number; y: number; z: number; len: number; speed: number; w: number; a: number }
interface Flake { x: number; y: number; z: number; r: number; speed: number; sway: number; phase: number; a: number }
interface Splash { x: number; y: number; vx: number; vy: number; life: number }
interface Bolt { paths: { x: number; y: number }[][]; born: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 위에서 아래로 갈라지며 내려가는 번개 — 줄기 하나와 가지 몇 개 */
function makeBolt(w: number, h: number): Bolt["paths"] {
  const paths: { x: number; y: number }[][] = [];
  const grow = (x: number, y: number, endY: number, spread: number, depth: number) => {
    const pts = [{ x, y }];
    while (y < endY) {
      y += rand(h * 0.02, h * 0.05);
      x += rand(-spread, spread);
      pts.push({ x, y });
      if (depth < 2 && Math.random() < 0.18) grow(x, y, y + rand(h * 0.08, h * 0.2), spread * 0.8, depth + 1);
    }
    paths.push(pts);
  };
  grow(rand(w * 0.15, w * 0.85), 0, rand(h * 0.45, h * 0.75), w * 0.025, 0);
  return paths;
}

export default function WeatherCanvas({ kind }: { kind: WeatherKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const darkRef = useRef<HTMLSpanElement>(null);
  const rain = kind === "rain" || kind === "storm";
  const snow = kind === "snow";
  const storm = kind === "storm";

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || (!rain && !snow)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sky = canvas.parentElement as HTMLElement;
    let w = 0, h = 0, dpr = 1;
    let drops: Drop[] = [];
    let flakes: Flake[] = [];
    const splashes: Splash[] = [];
    let bolt: Bolt | null = null;
    let nextBolt = performance.now() + rand(1500, 4000);
    let flash = 0;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = w * h;
      drops = rain
        ? Array.from({ length: Math.round((area / 7000) * (storm ? 1.5 : 1)) }, () => {
            const z = Math.random();
            return { x: rand(-w * 0.2, w), y: rand(-h, h), z, len: 10 + z * 22, speed: 700 + z * 900, w: 0.6 + z * 1.1, a: 0.18 + z * 0.4 };
          })
        : [];
      flakes = snow
        ? Array.from({ length: Math.round(area / 5500) }, () => {
            const z = Math.random();
            return { x: rand(0, w), y: rand(-h, h), z, r: 0.8 + z * 3.2, speed: 25 + z * 70, sway: 10 + z * 30, phase: rand(0, Math.PI * 2), a: 0.45 + z * 0.5 };
          })
        : [];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      /* 밝은 하늘이면 어두운 빗줄기 — 하늘이 고른 밝기(data-bright)를 따른다 */
      const bright = sky.dataset.bright === "light";
      const tint = getComputedStyle((bright ? darkRef : lightRef).current!).color;
      const wind = storm ? 0.32 : 0.18;

      if (rain) {
        ctx.strokeStyle = tint;
        ctx.lineCap = "round";
        for (const d of drops) {
          d.y += d.speed * dt;
          d.x += d.speed * wind * dt;
          /* 바닥 가까이(가까운 겹만) — 튀는 물방울 */
          if (d.y > h * (0.88 + d.z * 0.1)) {
            if (d.z > 0.6 && splashes.length < 120) {
              for (let k = 0; k < 2; k++) splashes.push({ x: d.x, y: d.y, vx: rand(-60, 60), vy: rand(-120, -50), life: 1 });
            }
            d.y = rand(-h * 0.3, -10);
            d.x = rand(-w * 0.2, w);
          }
          ctx.globalAlpha = d.a;
          ctx.lineWidth = d.w;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * wind, d.y - d.len);
          ctx.stroke();
        }
        ctx.fillStyle = tint;
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.vy += 600 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life -= dt * 3;
          if (s.life <= 0) { splashes.splice(i, 1); continue; }
          ctx.globalAlpha = s.life * 0.5;
          ctx.fillRect(s.x, s.y, 1.5, 1.5);
        }
      }

      if (snow) {
        const t = now / 1000;
        ctx.fillStyle = getComputedStyle(lightRef.current!).color;
        /* 부드러운 눈송이 — 어두운 하늘엔 번지는 흰 빛, 밝은 하늘엔 보이게 옅은 그림자 */
        ctx.shadowColor = getComputedStyle((bright ? darkRef : lightRef).current!).color;
        for (const f of flakes) {
          f.y += f.speed * dt;
          const x = f.x + Math.sin(t * (0.6 + f.z * 0.6) + f.phase) * f.sway;
          if (f.y > h + 10) { f.y = rand(-40, -10); f.x = rand(0, w); }
          ctx.globalAlpha = f.a;
          ctx.shadowBlur = 3 + f.z * 5;
          ctx.beginPath();
          ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      if (storm) {
        if (now > nextBolt) {
          bolt = { paths: makeBolt(w, h), born: now };
          flash = 1;
          nextBolt = now + rand(3500, 9000);
        }
        if (bolt) {
          const age = (now - bolt.born) / 1000;
          /* 번쩍 — 바로 한 번, 0.12초 뒤 한 번 더, 0.6초에 걸쳐 잦아든다 */
          const flicker = age < 0.08 ? 1 : age < 0.14 ? 0.25 : age < 0.22 ? 0.9 : Math.max(0, 1 - (age - 0.22) / 0.45);
          if (flicker <= 0) bolt = null;
          else {
            ctx.strokeStyle = getComputedStyle(lightRef.current!).color;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 32;
            ctx.lineJoin = "round";
            bolt.paths.forEach((p, i) => {
              ctx.globalAlpha = flicker * (i === bolt!.paths.length - 1 ? 1 : 0.6);
              ctx.lineWidth = i === bolt!.paths.length - 1 ? 4 : 1.8;
              ctx.beginPath();
              p.forEach((pt, j) => (j ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
              ctx.stroke();
            });
            ctx.shadowBlur = 0;
            flash = flicker;
          }
        }
        if (flash > 0) {
          ctx.globalAlpha = flash * 0.42;
          ctx.fillStyle = getComputedStyle(lightRef.current!).color;
          ctx.fillRect(0, 0, w, h);
          flash = bolt ? flash : Math.max(0, flash - dt * 3);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      ctx.clearRect(0, 0, w, h);
    };
  }, [rain, snow, storm]);

  return (
    <>
      <canvas ref={ref} className={styles.weatherCanvas} />
      {/* 캔버스가 읽어 갈 색 — 보이지 않는다 */}
      <span ref={lightRef} className={styles.tintLight} />
      <span ref={darkRef} className={styles.tintDark} />
    </>
  );
}
