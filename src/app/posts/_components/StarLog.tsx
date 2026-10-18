"use client";

import { useEffect, useRef, useState } from "react";
/* 로그 스킨의 별밭 — 로고의 ✦ 별을 모티프로, 글 목록 페이지 바탕 전체에 옅은 별가루와 반짝이는 별 몇 개를 깐다.
   페이지와 함께 스크롤된다. 포인터 둘레(손전등)에서는 숨은 별까지 밝게 드러나고, 빈 곳을 누르면 ✦ 이 터진다.
   장식이라 읽지 않는다.
   별 자리는 씨앗 문자열로 정해져 서버 · 브라우저가 같은 그림을 그린다(하이드레이션 어긋남 없음) */
import styles from "./StarLog.module.css";

const W = 720;
const H = 640;

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** 네 갈래 별(로고 모양) — 중심 (x, y), 반지름 r */
function star(x: number, y: number, r: number) {
  const k = r * 0.16;
  return `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
}

type Spark = { a: number; d: number; size: number; spin: number; dur: number; delay: number; dust: boolean; soft: boolean };
type Burst = { id: number; x: number; y: number; sparks: Spark[] };

/** 별 조각 — 개수 · 방향 · 거리 · 크기 · 회전 · 속도를 매번 제각각으로 뽑아 불규칙하게 흩어진다 */
function makeSparks(): Spark[] {
  const n = 5 + Math.floor(Math.random() * 6);
  return Array.from({ length: n }, () => {
    const dust = Math.random() < 0.35;
    return {
      a: Math.random() * 360,
      d: 24 + Math.random() * 56,
      size: dust ? 3 + Math.random() * 3 : 8 + Math.random() * 14,
      spin: (Math.random() - 0.5) * 240,
      dur: 0.5 + Math.random() * 0.6,
      delay: Math.random() * 0.12,
      dust,
      soft: Math.random() < 0.4,
    };
  });
}

function Tile({ id, items, glow }: { id: string; items: ReturnType<typeof makeItems>; glow?: boolean }) {
  return (
    <pattern id={id} width={W} height={H} patternUnits="userSpaceOnUse">
      {items.map((s, i) =>
        s.big ? (
          <path key={i} className={glow ? styles.glowStar : styles.twinkle} d={star(s.x, s.y, 5 + s.size * 6)} style={glow ? undefined : { animationDelay: `${s.delay}s` }} />
        ) : (
          <circle key={i} className={glow ? styles.glowDust : styles.dust} cx={s.x} cy={s.y} r={0.8 + s.size * 1.2} />
        ),
      )}
    </pattern>
  );
}

function makeItems(seed: string, n: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, size: r(), big: r() < 0.08, delay: r() * 5 }));
}

export default function StarLog({ seed }: { seed: string }) {
  const items = makeItems(seed, 45);
  // 손전등에서만 보이는 숨은 별 — 평소엔 안 보이다가 포인터 둘레에서 드러난다
  const hidden = makeItems(`${seed}:hidden`, 60);
  const ref = useRef<HTMLDivElement>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", `${e.clientX - r.left}px`);
        el.style.setProperty("--py", `${e.clientY - r.top}px`);
        el.dataset.lit = "true";
      });
    };
    const onLeave = () => { delete el.dataset.lit; };
    let id = 0;
    const onDown = (e: PointerEvent) => {
      if (reduce) return;
      // 링크 · 버튼 · 입력 위에서는 터뜨리지 않는다 — 빈 바탕을 눌렀을 때만
      if ((e.target as Element).closest("a, button, input, textarea, select, label, [role='button'], [data-clickable]")) return;
      const r = el.getBoundingClientRect();
      const b = { id: ++id, x: e.clientX - r.left, y: e.clientY - r.top, sparks: makeSparks() };
      setBursts((list) => [...list.slice(-6), b]);
      setTimeout(() => setBursts((list) => list.filter((x) => x.id !== b.id)), 1300);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div ref={ref} className={styles.wrap} aria-hidden>
      <svg className={styles.field} focusable="false">
        <defs>
          {/* 별 한 판(W × H)을 이어 붙여 페이지 길이만큼 채운다 — 스크롤하면 함께 흘러간다 */}
          <Tile id="starlog-tile" items={items} />
        </defs>
        <rect width="100%" height="100%" fill="url(#starlog-tile)" />
        {/* 맨 위 오른쪽에 한 번만 — 로고 별과 별똥별 */}
        <svg x="86%" y="110" overflow="visible">
          <path className={styles.brand} d={star(0, 0, 14)} />
        </svg>
        <svg x="55%" y="40" overflow="visible">
          <line className={styles.shoot} x1="0" y1="0" x2="110" y2="38" />
        </svg>
      </svg>
      {/* 손전등 — 포인터 둘레만 드러나는 밝은 별 판 */}
      <svg className={`${styles.field} ${styles.lamp}`} focusable="false">
        <defs>
          <Tile id="starlog-tile-lit" items={items} glow />
          <Tile id="starlog-tile-hidden" items={hidden} glow />
        </defs>
        <rect width="100%" height="100%" fill="url(#starlog-tile-lit)" />
        <rect width="100%" height="100%" fill="url(#starlog-tile-hidden)" />
      </svg>
      {bursts.map((b) => (
        <span key={b.id} className={styles.burst} style={{ left: b.x, top: b.y }}>
          {b.sparks.map((sp, i) =>
            sp.dust ? (
              <span
                key={i}
                className={styles.sparkDust}
                style={{ ["--a" as string]: `${sp.a}deg`, ["--d" as string]: `${sp.d}px`, ["--s" as string]: `${sp.size}px`, animationDuration: `${sp.dur}s`, animationDelay: `${sp.delay}s` }}
              />
            ) : (
              <svg
                key={i}
                className={`${styles.spark} ${sp.soft ? styles.sparkSoft : ""}`}
                viewBox="-10 -10 20 20"
                style={{ ["--a" as string]: `${sp.a}deg`, ["--d" as string]: `${sp.d}px`, ["--s" as string]: `${sp.size}px`, ["--spin" as string]: `${sp.spin}deg`, animationDuration: `${sp.dur}s`, animationDelay: `${sp.delay}s` }}
              >
                <path d={star(0, 0, 9)} />
              </svg>
            ),
          )}
        </span>
      ))}
    </div>
  );
}
