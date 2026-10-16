"use client";

import { blogHref } from "@/lib/siteHosts";
import { useEffect, useRef, useState } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import MongSticker, { type MongPose } from "../_components/MongSticker";
import type { HistoryEntry } from "@/lib/posts";
import { dayKeyOf, groupByMonth, isTil } from "./historyData";
import styles from "./History.module.css";

/* 몽이 여행 길 — 세로 한 줄 길에 달마다 표지판, 길 오른쪽에 글이 한 줄씩. 몽이는 화면의 같은 높이에 머물며
   길을 따라 걷고(스크롤 방향을 바라보며 들썩인다), 말풍선에 지금 지나는 연 · 월을 띄운다 */
export default function HistoryTrail({
  posts,
  tilTag,
  titleOf,
  monthLabel,
  countLabel,
}: {
  posts: HistoryEntry[];
  tilTag: string;
  titleOf: (p: HistoryEntry) => string;
  monthLabel: (year: number, month: number) => string;
  countLabel: (n: number) => string;
}) {
  const months = groupByMonth(posts, "desc");
  const [current, setCurrent] = useState(months[0]?.key ?? "");
  const [pose, setPose] = useState<MongPose>("normal-front");
  const [step, setStep] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  // 지금 지나는 달 — 화면 40% 높이 선을 넘은 마지막 표지판
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let raf = 0;
    let lastY = window.scrollY;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const line = window.innerHeight * 0.4;
      let key = months[0]?.key ?? "";
      for (const el of list.querySelectorAll<HTMLElement>("[data-month]")) {
        if (el.getBoundingClientRect().top <= line) key = el.dataset.month ?? key;
      }
      setCurrent(key);
      // 걷는 방향 — 내려가면 앞(아래)을, 올라가면 뒤를 돌아본다. 멈추면 손을 흔든다
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 2) {
        setPose(y > lastY ? "happy-front" : "surprised-front");
        setStep((s) => s + 1);
      }
      lastY = y;
      clearTimeout(idle);
      idle = setTimeout(() => setPose("wave-front"), 600);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
    };
  }, [months]);

  const cur = months.find((m) => m.key === current);
  return (
    <div className={styles.trail}>
      {/* 몽이 — 화면 같은 높이에 붙어 길을 따라 걷는다 */}
      <div className={styles.walker} aria-hidden>
        <span className={styles.walkerSign}>{cur ? monthLabel(cur.year, cur.month) : ""}</span>
        <span key={step % 2} className={styles.walkerBody}>
          <MongSticker pose={pose} flat />
        </span>
      </div>

      <ol ref={listRef} className={styles.trailList}>
        {months.map((m, i) => {
          const newYear = i === 0 || months[i - 1].year !== m.year;
          return (
            <li key={m.key} className={styles.trailMonth} data-month={m.key}>
              {newYear && <p className={styles.trailYear}>{m.year}</p>}
              <div className={styles.trailSign}>
                <span className={styles.trailSignDot} aria-hidden />
                <h2 className={styles.trailSignName}>{monthLabel(m.year, m.month)}</h2>
                <span className={styles.trailSignCount}>{countLabel(m.posts.length)}</span>
              </div>
              <ul className={styles.trailPosts}>
                {m.posts.map((p) => {
                  const til = isTil(p, tilTag);
                  return (
                    <li key={p.id}>
                      <TransitionLink href={blogHref(`/posts/${p.slug}`)} className={`${styles.trailPost} ${til ? styles.isTil : ""}`}>
                        <span className={styles.postDate}>{dayKeyOf(p).slice(5).replace("-", ".")}</span>
                        <span className={styles.postTitle}>{titleOf(p)}</span>
                        {til ? (
                          <span className={styles.tilTag}>✦ TIL</span>
                        ) : (
                          p.category && <span className={styles.postCat}>[{p.category}]</span>
                        )}
                      </TransitionLink>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
