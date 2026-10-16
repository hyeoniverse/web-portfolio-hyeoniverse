"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import MongSticker from "../_components/MongSticker";
import type { HistoryEntry } from "@/lib/posts";
import { dayKeyOf, groupByMonth, isTil } from "./historyData";
import styles from "./History.module.css";

/** 달 하나가 차지하는 강 길이(px) — 글이 많으면 늘어난다 */
const MONTH_W = 280;
/** 글 한 칸 — 위아래로 번갈아 놓아 같은 쪽 이웃은 두 칸(200px) 떨어진다 */
const PER_POST = 100;
/** 강 높이(판 높이 대비 가운데) */
const RIVER_Y = 0.55;

/* 시간의 강 — 세로 스크롤을 가로 이동으로 바꿔, 오래된 달(왼쪽)에서 지금(오른쪽)으로 흐르는 강을 따라간다.
   높은 스크롤 구간 안에 화면 크기 판이 붙어 있고(sticky), 판 안의 강 띠가 스크롤만큼 왼쪽으로 흐른다.
   달마다 강가에 이름, 글은 강 위아래로 번갈아 떠 있는 별(일반 글은 큰 별 · TIL 은 작은 ✦). 몽이는 배를 타고 간다 */
export default function HistoryRiver({
  posts,
  tilTag,
  titleOf,
  monthLabel,
  hint,
}: {
  posts: HistoryEntry[];
  tilTag: string;
  titleOf: (p: HistoryEntry) => string;
  monthLabel: (year: number, month: number) => string;
  hint: string;
}) {
  const months = useMemo(() => groupByMonth(posts, "asc"), [posts]);
  // 달마다 시작 x · 너비
  const layout = useMemo(() => {
    const widths = months.map((m) => Math.max(MONTH_W, m.posts.length * PER_POST + 140));
    return widths.map((w, i) => ({ at: 160 + widths.slice(0, i).reduce((a, b) => a + b, 0), w }));
  }, [months]);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(1200);
  const [progress, setProgress] = useState(0);
  // 끝 여백은 화면 절반 — 마지막 달이 배 탄 몽이 앞에서 멈춘다
  const total = (layout.at(-1)?.at ?? 0) + (layout.at(-1)?.w ?? 0) + Math.round(vw / 2);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = sectionRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      const w = el.clientWidth;
      setVw(w);
      setProgress(p);
      track.style.transform = `translateX(${(-p * Math.max(0, total - w)).toFixed(1)}px)`;
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
  }, [total]);

  // 강 물결 — 판 전체 길이의 부드러운 곡선
  const riverPath = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= total; x += 40) {
      const y = Math.sin(x / 260) * 26 + Math.sin(x / 97) * 6;
      pts.push(`${x ? "L" : "M"}${x} ${y.toFixed(1)}`);
    }
    return pts.join("");
  }, [total]);
  const riverY = (x: number) => Math.sin(x / 260) * 26 + Math.sin(x / 97) * 6;

  // 몽이가 지나는 달 — 화면 가운데 x
  const centerX = progress * Math.max(0, total - vw) + vw * 0.5;
  // 몽이가 지난 마지막 달 — 끝 여백에서도 마지막 달을 가리킨다
  const curIdx = Math.max(0, layout.findLastIndex((l) => centerX >= l.at));
  const cur = months[curIdx];

  // 스크롤 구간 높이 — 가로 길이만큼 세로로 내려야 끝에 닿는다
  const height = `calc(100dvh + ${Math.max(0, total - vw)}px)`;

  return (
    <section ref={sectionRef} className={styles.river} style={{ height }}>
      <div className={styles.riverSticky}>
        <div ref={trackRef} className={styles.riverTrack} style={{ width: total }}>
          <svg className={styles.riverSvg} width={total} height="160" viewBox={`0 -80 ${total} 160`} aria-hidden>
            <path className={styles.riverBank} d={riverPath} transform="translate(0 -18)" />
            <path className={styles.riverWater} d={riverPath} />
            <path className={styles.riverBank} d={riverPath} transform="translate(0 18)" />
          </svg>
          {months.map((m, i) => {
            const { at, w } = layout[i];
            const newYear = i === 0 || months[i - 1].year !== m.year;
            return (
              <div key={m.key} className={styles.riverMonth} style={{ left: at, width: w }}>
                {newYear && <span className={styles.riverYear}>{m.year}</span>}
                <span className={styles.riverMonthName} style={{ top: `calc(${RIVER_Y * 100}% + ${riverY(at + 20) + 30}px)` }}>
                  {monthLabel(m.year, m.month)}
                </span>
                {m.posts.map((p, j) => {
                  const til = isTil(p, tilTag);
                  const x = 70 + j * PER_POST;
                  const up = j % 2 === 0;
                  // 강에서 떨어진 높이 — 위아래로 번갈아, 조금씩 다르게
                  const lift = (til ? 56 : 76) + (j % 4 < 2 ? 0 : 28);
                  const y = riverY(at + x) + (up ? -lift : lift);
                  return (
                    <TransitionLink
                      key={p.id}
                      href={`/posts/${p.slug}`}
                      className={`${styles.riverPost} ${til ? styles.isTil : ""} ${up ? styles.riverUp : styles.riverDown}`}
                      style={{ left: x, top: `calc(${RIVER_Y * 100}% + ${y.toFixed(1)}px)`, ["--stem" as string]: `${lift}px` }}
                    >
                      <span className={styles.riverStar} aria-hidden />
                      <span className={styles.riverText}>
                        <span className={styles.postDate}>{dayKeyOf(p).slice(5).replace("-", ".")}</span>
                        <span className={styles.postTitle}>{titleOf(p)}</span>
                        {til && <span className={styles.tilTag}>TIL</span>}
                      </span>
                    </TransitionLink>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 배 탄 몽이 — 판 가운데 강 위에 머물고 강이 흘러간다 */}
        <div className={styles.boat} aria-hidden>
          <span className={styles.boatSign}>{cur ? monthLabel(cur.year, cur.month) : ""}</span>
          <MongSticker pose="happy-front" float flat className={styles.boatMong} />
          <span className={styles.boatHull} />
        </div>

        <p className={styles.riverHint} data-hidden={progress > 0.02 || undefined}>{hint}</p>
        <div className={styles.riverProgress} aria-hidden>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
