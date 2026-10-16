"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Pressable from "@/components/ui/Pressable";
import { CONSTELLATIONS, litCount } from "./constellations";
import styles from "./TilSpace.module.css";

/** 3D 우주 — three 묶음이 커서 브라우저에서만 따로 싣는다 */
const TilSpace3D = dynamic(() => import("./TilSpace3D"), { ssr: false });

/** CSS 색(oklch 등)을 three 가 읽는 #rrggbb 로 — 1px 캔버스에 칠해 읽는다 */
function cssColorToHex(value: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return "#ff4f9a";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/* 별자리 우주 — 스크롤 구간(화면 높이 여러 배) 안에 3D 화면이 붙어 있고, 스크롤할수록 카메라가
   1월 → 12월 별자리로 날아간다. 위에 지금 별자리 이름 · 진행도, 옆에 열두 달 점. 별자리를 누르거나
   "이달 기록 보기" 를 누르면 아래 피드가 그달로 좁혀진다 */
export default function TilSpace({
  year,
  byDay,
  monthName,
  lang,
  doneLabel,
  scrollHint,
  openLabel,
  onMonth,
}: {
  year: number;
  byDay: Map<string, unknown[]>;
  monthName: (m: number) => string;
  lang: "ko" | "en";
  doneLabel: string;
  scrollHint: string;
  openLabel: string;
  onMonth: (m: number) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  const [accent, setAccent] = useState("#ff4f9a");
  const lits = CONSTELLATIONS.map((_, m) => litCount(byDay, year, m));

  // 강조색 — 테마 토큰(--text-accent)을 읽어 3D 에도 같은 분홍을 쓴다
  useEffect(() => {
    // 토큰 값은 light-dark(var(..)) 식이라 그대로는 못 읽는다 — 그 색을 입힌 요소의 계산된 색을 읽는다
    const el = sectionRef.current;
    if (!el) return;
    const probe = document.createElement("span");
    probe.style.color = "var(--text-accent)";
    el.appendChild(probe);
    setAccent(cssColorToHex(getComputedStyle(probe).color));
    probe.remove();
  }, []);

  // 스크롤 진행도 — 구간 맨 위가 화면 위에 닿을 때 0, 구간 끝이 화면 아래에 닿을 때 1
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      progress.current = p;
      setActive(Math.round(p * 11));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // 달 점을 누르면 그달 별자리 자리로 스크롤한다
  const flyTo = (m: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (span * m) / 11, behavior: "smooth" });
  };

  const c = CONSTELLATIONS[active];
  const lit = lits[active];
  const done = lit >= c.stars.length;
  const doneCount = CONSTELLATIONS.filter((cc, m) => lits[m] >= cc.stars.length).length;

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.sticky}>
        <div className={styles.canvas}>
          <TilSpace3D progress={progress} lits={lits} accent={accent} active={active} onPick={onMonth} />
        </div>

        {/* 지금 별자리 */}
        <div className={styles.hud}>
          <span className={styles.hudYear}>
            {year} · ✦ {doneLabel.replace("{{n}}", String(doneCount))}
          </span>
          <h2 key={active} className={styles.hudName}>
            <span className={styles.hudMonth}>{monthName(active)}</span>
            {lang === "en" ? c.en : c.ko}
            {lang !== "en" && <span className={styles.hudLatin}>{c.en}</span>}
          </h2>
          <p className={`${styles.hudCount} ${done ? styles.hudDone : ""}`}>
            {done ? "✦ " : ""}
            {lit} / {c.stars.length}
          </p>
          <Pressable noTapScale className={styles.hudOpen} onClick={() => onMonth(active)}>
            {openLabel} ↓
          </Pressable>
        </div>

        {/* 열두 달 점 — 지금 자리 · 완성한 달 표시, 누르면 그달로 날아간다 */}
        <ol className={styles.rail}>
          {CONSTELLATIONS.map((cc, m) => (
            <li key={m}>
              <Pressable
                noTapScale
                className={`${styles.railDot} ${m === active ? styles.railOn : ""} ${lits[m] >= cc.stars.length ? styles.railDone : ""}`}
                aria-label={`${monthName(m)} ${lang === "en" ? cc.en : cc.ko} ${lits[m]}/${cc.stars.length}`}
                onClick={() => flyTo(m)}
              />
            </li>
          ))}
        </ol>

        <p className={styles.hint} data-hidden={active > 0 || undefined}>
          {scrollHint}
        </p>
      </div>
    </section>
  );
}
