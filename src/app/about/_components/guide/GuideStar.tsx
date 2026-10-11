"use client";

/* 길잡이 별 — 첫 화면에서 출발해 페이지 끝까지 스크롤을 따라 날아다니는 별 하나.
   페이지 곳곳에 내려앉을 자리(GuideAnchor, 또는 data-guide 를 단 요소)를 두면, 화면 가운데에 가장 가까운 자리로
   용수철처럼 날아가 앉는다. 고정 장면 안의 자리는 화면에서 멈춰 있으니 별도 머물고, 움직이는 자리(진행 막대 끝 ·
   지금 켜진 별자리 별)는 따라간다. 날아가는 동안엔 빨리 돌며 별가루를 남긴다.
   자리의 크기가 곧 별의 크기이고, 색은 자리의 data-guide-fill(없으면 강조색)을 따른다.
   장면 안에서 별이 맡는 일(그래프의 별을 켜기 · 노선 걷기 · 요청 빛 · 고른 항목 표시 등)은 그 요소가 자리를 옮겨 가며 정한다.
   <html data-guide-hold> 동안은 별을 감추고, 풀리면 날아오지 않고 그 순간의 자리에 바로 나타난다(장면이 별을 따로 연출할 때 — 크레딧 끝의 별똥별). */
import { useEffect, useRef } from "react";
import { STAR_PATH } from "../features/shared";
import styles from "./GuideStar.module.css";

/** 별가루 — 이만큼(px/프레임) 넘게 움직일 때, 이 간격(ms)마다 하나 */
const TRAIL_SPEED = 3;
const TRAIL_EVERY = 40;
/** 별 크기 상한(px) */
const MAX_SIZE = 96;

/** priority — 화면 안에 있으면 머리말 자리보다 먼저 고른다("지금 여기를 보세요" 표시) */
export function GuideAnchor({ size, fill, className, priority }: { size: string; fill?: string; className?: string; priority?: number }) {
  return (
    <span
      className={`${styles.anchor} ${className ?? ""}`}
      style={{ "--size": size } as React.CSSProperties}
      data-guide=""
      data-guide-priority={priority}
      data-guide-fill={fill}
      aria-hidden
    />
  );
}

export default function GuideStar() {
  const starRef = useRef<SVGSVGElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const star = starRef.current;
    const trail = trailRef.current;
    if (!star || !trail) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, x = 0, y = 0, s = 0, rot = 0, first = true, lastTrail = 0, fill = "";
    const tick = (now: number) => {
      /* 장면이 별을 따로 연출하는 동안 — 감춰 두고, 풀리면 첫 그림처럼 그 자리에 바로 */
      if (document.documentElement.dataset.guideHold !== undefined) {
        star.style.opacity = "0";
        first = true;
        raf = requestAnimationFrame(tick);
        return;
      }
      const h = window.innerHeight;
      const w = window.innerWidth;
      const mid = h * 0.5;
      /* 화면 가운데에 가장 가까운 자리 — 보이지 않는(크기 0) 자리는 건너뛴다.
         요소 안에서 할 일이 있는 자리(data-guide-priority)는 화면 안에 있으면 머리말 자리보다 먼저 고른다.
         프레지에선 옆 프레임이 가로로 화면 밖에 있다 — 가로로 벗어난 만큼 멀게 치고, 지금 프레임이 아닌 프레임 안 자리는 건너뛴다(장 머리는 장면보다 수십 배 커서 별이 거대해진다) */
      let best: DOMRect | null = null, bestEl: Element | null = null, bestD = Infinity;
      for (const el of document.querySelectorAll("[data-guide]")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || el.closest("[data-frame]:not([data-current])")) continue;
        const cy = r.top + r.height / 2;
        const outX = Math.max(0, r.left - w, -r.right);
        const inView = cy > h * 0.05 && cy < h * 0.95 && outX === 0;
        const pri = inView ? Number(el.getAttribute("data-guide-priority") || 0) : 0;
        const d = Math.abs(cy - mid) + outX * 2 - pri * h * 0.3;
        if (d < bestD) { bestD = d; best = r; bestEl = el; }
      }
      /* 내려앉을 자리가 없는 프레임 — 별을 감췄다가 자리가 생기면 다시 */
      star.style.opacity = best ? "1" : "0";
      if (best && bestEl) {
        const tx = best.left + best.width / 2;
        /* 자리가 화면 밖이면 가장자리에서 기다린다 — 별이 화면에서 사라지지 않게 */
        const ty = Math.min(h * 0.92, Math.max(h * 0.08, best.top + best.height / 2));
        /* 날아가는 동안 자리가 확대되며 지나가도 별이 화면을 덮지 않게 크기 상한 */
        const ts = Math.min(best.width, MAX_SIZE);
        if (first) { x = tx; y = ty; s = ts; first = false; }
        const px = x, py = y;
        x += (tx - x) * 0.12;
        y += (ty - y) * 0.12;
        s += (ts - s) * 0.12;
        const speed = Math.hypot(x - px, y - py);
        /* 날아갈 땐 빨리, 앉아 있을 땐 천천히 돈다 */
        rot += 0.25 + speed * 1.6;
        star.style.transform = `translate(${(x - s / 2).toFixed(1)}px, ${(y - s / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
        star.style.width = `${s.toFixed(1)}px`;
        const f = (bestEl as HTMLElement).dataset?.guideFill ?? bestEl.getAttribute("data-guide-fill") ?? "";
        if (f !== fill) { fill = f; star.style.setProperty("--fill", f || "var(--text-accent)"); }
        if (speed > TRAIL_SPEED && now - lastTrail > TRAIL_EVERY) {
          lastTrail = now;
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          dot.setAttribute("viewBox", "0 0 100 100");
          dot.classList.add(styles.dust);
          dot.innerHTML = `<path d="${STAR_PATH}"/>`;
          const ds = Math.max(6, s * 0.28);
          dot.style.cssText = `width:${ds}px;left:${x - ds / 2}px;top:${y - ds / 2}px;--fill:${fill || "var(--text-accent)"}`;
          trail.appendChild(dot);
          dot.animate(
            [
              { opacity: 0.9, transform: "scale(1) rotate(0deg)" },
              { opacity: 0, transform: `translate(${(Math.random() - 0.5) * 30}px, ${10 + Math.random() * 20}px) scale(0) rotate(180deg)` },
            ],
            { duration: 800, easing: "ease-out" },
          ).finished.then(() => dot.remove(), () => dot.remove());
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={styles.layer} aria-hidden>
      <div ref={trailRef} />
      <svg ref={starRef} className={styles.star} viewBox="0 0 100 100">
        <path d={STAR_PATH} />
      </svg>
    </div>
  );
}
