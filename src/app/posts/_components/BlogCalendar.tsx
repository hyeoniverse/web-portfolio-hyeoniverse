"use client";

import { useMemo, useState } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import Pressable from "@/components/ui/Pressable";
import T from "@/components/ui/T";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { SITE_TIME_ZONE } from "@/constants";
import type { CalendarPost } from "@/lib/posts";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./BlogSidebar.module.css";

/** 한국 시간 기준 YYYY-MM-DD — 서버(UTC)와 브라우저가 같은 날로 묶도록 시간대를 고정한다 */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: SITE_TIME_ZONE });

/* blog 레이아웃 사이드바의 날짜별 달력 — 한 달을 7열 격자로 그리고, 글을 쓴 날에 점과 강조를 준다.
   글이 있는 날을 누르면 그날의 글 목록이 달력 아래에 펼쳐진다. 첫 화면은 가장 최근 글이 있는 달. */
export default function BlogCalendar({ posts }: { posts: CalendarPost[] }) {
  const { language, dateLocale } = useLanguage();

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      const key = dayKey(new Date(p.created_at));
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [posts]);

  // 보이는 달 — [연, 월(0~11)]. 최근 글의 달에서 시작한다(글이 없으면 이번 달)
  const [view, setView] = useState<[number, number]>(() => {
    const [y, m] = dayKey(posts[0] ? new Date(posts[0].created_at) : new Date()).split("-").map(Number);
    return [y, m - 1];
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [year, month] = view;

  const move = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setView([d.getFullYear(), d.getMonth()]);
    setSelected(null);
  };

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const keyOf = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const today = dayKey(new Date());
  const monthLabel = new Date(year, month, 1).toLocaleDateString(dateLocale, { year: "numeric", month: "long" });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 7 + i).toLocaleDateString(dateLocale, { weekday: "narrow" }),
  );
  const monthCount = cells.reduce<number>((n, day) => n + (day ? byDay.get(keyOf(day))?.length ?? 0 : 0), 0);
  const selectedPosts = selected ? byDay.get(selected) ?? [] : [];

  return (
    <section className={styles.section}>
      <div className={styles.label}><T k="postsPage.calendar" /></div>
      <div className={styles.calHead}>
        <Pressable noTapScale className={styles.calNav} onClick={() => move(-1)} aria-label="Previous month">
          <ChevronLeft size={14} />
        </Pressable>
        <span className={styles.calMonth}>
          {monthLabel}
          {monthCount > 0 && <span className={styles.calMonthCount}> · {monthCount}</span>}
        </span>
        <Pressable noTapScale className={styles.calNav} onClick={() => move(1)} aria-label="Next month">
          <ChevronRight size={14} />
        </Pressable>
      </div>
      <div className={styles.calGrid} role="grid">
        {weekdays.map((w, i) => (
          <span key={`w${i}`} className={styles.calWeekday} aria-hidden>{w}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const key = keyOf(day);
          const count = byDay.get(key)?.length ?? 0;
          const cls = [
            styles.calDay,
            count > 0 && styles.calDayHas,
            key === selected && styles.calDaySelected,
            key === today && styles.calDayToday,
          ].filter(Boolean).join(" ");
          return count > 0 ? (
            <Pressable
              key={key}
              noTapScale
              className={cls}
              onClick={() => setSelected(key === selected ? null : key)}
              aria-pressed={key === selected}
              title={`${count}`}
            >
              {day}
            </Pressable>
          ) : (
            <span key={key} className={cls}>{day}</span>
          );
        })}
      </div>
      {selectedPosts.length > 0 && (
        <ul className={styles.calPosts}>
          {selectedPosts.map((p) => (
            <li key={p.slug}>
              <TransitionLink href={`/posts/${p.slug}`} className={styles.calPostLink}>
                {language === "en" && p.title_en ? p.title_en : p.title}
              </TransitionLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
