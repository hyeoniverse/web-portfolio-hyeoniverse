"use client";

import { useMemo, useState } from "react";
import TransitionLink from "@/components/ui/TransitionLink";
import DatePicker from "@/components/ui/DatePicker/DatePicker";
import { Switch } from "@/components/ui/Switch";
import T from "@/components/ui/T";
import { SITE_TIME_ZONE } from "@/constants";
import type { CalendarPost } from "@/lib/posts";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./BlogSidebar.module.css";

/** 한국 시간 기준 YYYY-MM-DD — 서버(UTC)와 브라우저가 같은 날로 묶도록 시간대를 고정한다 */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: SITE_TIME_ZONE });

/* 글 목록 사이드바의 날짜별 기록 — 공용 DatePicker(달력 모드)에 글 쓴 날을 표시(marks)해 그린다.
   제목(연 · 월)을 누르면 달 → 연도 격자로 올라가고, 아래 "오늘" 로 이번 달 오늘로 돌아온다.
   "기록된 날만" 을 켜면 글 없는 날 · 달 · 해는 고를 수 없게 흐려진다. 날을 고르면 그날의 글이 달력 아래에 펼쳐진다 */
export default function BlogCalendar({ posts }: { posts: CalendarPost[] }) {
  const { language, t } = useLanguage();
  const lang = language === "en" ? "en" : "ko";

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      const key = dayKey(new Date(p.created_at));
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [posts]);
  const marks = useMemo(() => Object.fromEntries([...byDay].map(([k, v]) => [k, v.length])), [byDay]);

  // 고른 날 — 없으면 달력은 최근 글이 있는 달을 보여 준다
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyMarked, setOnlyMarked] = useState(false);
  const shown = selected ?? dayKey(posts[0] ? new Date(posts[0].created_at) : new Date());
  const [y, m] = shown.split("-");
  const selectedPosts = selected ? byDay.get(selected) ?? [] : [];

  return (
    <section className={styles.section}>
      <div className={styles.calLabel}><T k="postsPage.calendar" /></div>
      <div className={styles.calOptions}>
        <Switch label={t("postsPage.onlyMarked")} checked={onlyMarked} onCheckedChange={setOnlyMarked} />
      </div>
      <div className={styles.calPicker}>
        <DatePicker
          year={y}
          month={m}
          day={selected ? selected.slice(8) : ""}
          format="date"
          mode="calendar"
          language={lang}
          marks={marks}
          onlyMarked={onlyMarked}
          onSelect={(yy, mm, dd) => {
            const key = `${yy}-${mm}-${dd}`;
            setSelected(key === selected ? null : key);
          }}
        />
      </div>
      {selected && (
        selectedPosts.length > 0 ? (
          <ul className={styles.calPosts}>
            {selectedPosts.map((p) => (
              <li key={p.slug}>
                <TransitionLink href={`/posts/${p.slug}`} className={styles.calPostLink}>
                  {lang === "en" && p.title_en ? p.title_en : p.title}
                </TransitionLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.calEmpty}><T k="postsPage.calendarEmpty" /></p>
        )
      )}
    </section>
  );
}
