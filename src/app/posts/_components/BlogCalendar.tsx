"use client";

import { useMemo, useState } from "react";
import DatePicker from "@/components/ui/DatePicker/DatePicker";
import Pressable from "@/components/ui/Pressable";
import { Switch } from "@/components/ui/Switch";
import T from "@/components/ui/T";
import { CalendarDays, X } from "@/components/icons";
import { SITE_TIME_ZONE } from "@/constants";
import type { CalendarPost } from "@/lib/posts";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./BlogSidebar.module.css";

/** 한국 시간 기준 YYYY-MM-DD — 서버(UTC)와 브라우저가 같은 날로 묶도록 시간대를 고정한다 */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: SITE_TIME_ZONE });

/* 글 목록 사이드바의 날짜별 기록 — 날을 고르면 글 목록이 그날로 걸러진다(필터 상태 activeDate 를 부모가 가진다).
   - 달력: 공용 DatePicker(달력 모드)에 글 쓴 날을 표시(marks). 제목(연 · 월)을 누르면 달 → 연도 격자로 올라가고,
     아래 "오늘" 로 이번 달 오늘로 돌아온다.
   - 기록된 날만: 달력 대신 글 쓴 날만 달별로 묶어 한눈에 늘어놓는다(최근 달부터). */
export default function BlogCalendar({
  posts,
  activeDate,
  onDateChange,
}: {
  posts: CalendarPost[];
  activeDate: string | null;
  onDateChange: (date: string | null) => void;
}) {
  const { language, t, dateLocale } = useLanguage();
  const lang = language === "en" ? "en" : "ko";

  const marks = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of posts) {
      const key = dayKey(new Date(p.created_at));
      m[key] = (m[key] ?? 0) + 1;
    }
    return m;
  }, [posts]);
  // 기록된 날만 — [달("YYYY-MM"), 그 달의 날들(최근순)] 최근 달부터
  const byMonth = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of Object.keys(marks).sort().reverse()) {
      const month = key.slice(0, 7);
      map.set(month, [...(map.get(month) ?? []), key]);
    }
    return [...map];
  }, [marks]);

  const [onlyMarked, setOnlyMarked] = useState(false);
  // 달력이 보여 줄 달 — 고른 날, 없으면 최근 글이 있는 달
  const shown = activeDate ?? dayKey(posts[0] ? new Date(posts[0].created_at) : new Date());
  const [y, m] = shown.split("-");
  const pick = (key: string) => onDateChange(key === activeDate ? null : key);
  const monthLabel = (month: string) =>
    new Date(`${month}-01T12:00:00Z`).toLocaleDateString(dateLocale, { year: "numeric", month: "long", timeZone: "UTC" });
  const activeLabel = activeDate
    ? new Date(`${activeDate}T12:00:00Z`).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
    : "";

  return (
    <section className={styles.section}>
      <div className={styles.label}>
        <CalendarDays size={14} aria-hidden />
        <T k="postsPage.calendar" />
      </div>
      <div className={styles.calOptions}>
        {activeDate ? (
          <Pressable noTapScale className={styles.calActive} onClick={() => onDateChange(null)} aria-label={t("postsPage.clearDate")}>
            {activeLabel}
            <X size={12} aria-hidden />
          </Pressable>
        ) : <span />}
        <Switch label={t("postsPage.onlyMarked")} checked={onlyMarked} onCheckedChange={setOnlyMarked} />
      </div>
      {onlyMarked ? (
        byMonth.length > 0 ? (
          <div className={styles.calMarked}>
            {byMonth.map(([month, days]) => (
              <div key={month} className={styles.calMarkedMonth}>
                <span className={styles.calMarkedLabel}>{monthLabel(month)}</span>
                <div className={styles.calMarkedDays}>
                  {days.map((key) => (
                    <Pressable
                      key={key}
                      noTapScale
                      className={`${styles.calMarkedDay} ${key === activeDate ? styles.calMarkedDayActive : ""}`}
                      onClick={() => pick(key)}
                      aria-pressed={key === activeDate}
                      title={`${key} · ${marks[key]}`}
                    >
                      {Number(key.slice(8))}
                      {marks[key] > 1 && <sup className={styles.calMarkedCount}>{marks[key]}</sup>}
                    </Pressable>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.calEmpty}><T k="postsPage.calendarEmpty" /></p>
        )
      ) : (
        <div className={styles.calPicker}>
          <DatePicker
            year={y}
            month={m}
            day={activeDate ? activeDate.slice(8) : ""}
            format="date"
            mode="calendar"
            language={lang}
            marks={marks}
            onSelect={(yy, mm, dd) => pick(`${yy}-${mm}-${dd}`)}
          />
        </div>
      )}
    </section>
  );
}
