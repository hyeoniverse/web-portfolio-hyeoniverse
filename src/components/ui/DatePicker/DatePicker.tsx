"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./DatePicker.module.css";

type Format = "year" | "yearMonth" | "date";

export interface DatePickerProps {
  year: string;
  month: string;
  day: string;
  format: Format;
  mode: "spinner" | "calendar";
  language: "ko" | "en";
  onSelect: (year: string, month: string, day: string) => void;
}

function daysInMonthCount(y: number, m: number): number {
  if (m === 2) return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28;
  if ([4, 6, 9, 11].includes(m)) return 30;
  return 31;
}

const MONTHS_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ── Spinner Column ── */
const ITEM_H = 40;
const VISIBLE = 5;

function SpinnerColumn({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isUserScroll = useRef(false);

  useEffect(() => {
    const idx = items.findIndex((i) => i.value === value);
    if (idx >= 0 && ref.current && !isUserScroll.current) {
      ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }
    isUserScroll.current = false;
  }, [value, items]);

  const handleScroll = useCallback(() => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      const target = clamped * ITEM_H;

      if (Math.abs(ref.current.scrollTop - target) > 1) {
        ref.current.scrollTo({ top: target, behavior: "smooth" });
      }

      if (items[clamped] && items[clamped].value !== value) {
        isUserScroll.current = true;
        onChange(items[clamped].value);
      }
    }, 120);
  }, [items, value, onChange]);

  const clickItem = (v: string) => {
    isUserScroll.current = true;
    onChange(v);
    const idx = items.findIndex((i) => i.value === v);
    if (idx >= 0 && ref.current) {
      ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }
  };

  return (
    <div className={styles.spinnerCol}>
      <div
        ref={ref}
        className={styles.spinnerScroll}
        onScroll={handleScroll}
        data-lenis-prevent
        style={{ height: ITEM_H * VISIBLE }}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((item) => (
          <div
            key={item.value}
            className={`${styles.spinnerItem} ${item.value === value ? styles.spinnerItemActive : ""}`}
            style={{ height: ITEM_H }}
            onClick={() => clickItem(item.value)}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
      <div className={styles.spinnerHighlight} style={{ top: ITEM_H * 2, height: ITEM_H }} />
    </div>
  );
}

/* ── Spinner View ── */
function SpinnerView({
  year, month, day, format, onSelect, language,
}: {
  year: string; month: string; day: string;
  format: Format;
  onSelect: (y: string, m: string, d: string) => void;
  language: "ko" | "en";
}) {
  const now = new Date().getFullYear();
  const yearItems = Array.from({ length: 50 }, (_, i) => {
    const y = String(now - 25 + i);
    return { value: y, label: y };
  });

  const mLabels = language === "ko" ? MONTHS_KO : MONTHS_EN;
  const monthItems = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: mLabels[i],
  }));

  const numY = Number(year) || now;
  const numM = Number(month) || 1;
  const maxD = daysInMonthCount(numY, numM);
  const dayItems = Array.from({ length: maxD }, (_, i) => {
    const v = String(i + 1).padStart(2, "0");
    return { value: v, label: v };
  });

  const ey = year || String(now);
  const em = month || "01";
  const ed = day || "01";

  return (
    <div className={styles.spinnerView}>
      <SpinnerColumn items={yearItems} value={ey} onChange={(v) => onSelect(v, em, ed)} />
      {(format === "yearMonth" || format === "date") && (
        <SpinnerColumn items={monthItems} value={em} onChange={(v) => onSelect(ey, v, ed)} />
      )}
      {format === "date" && (
        <SpinnerColumn items={dayItems} value={ed} onChange={(v) => onSelect(ey, em, v)} />
      )}
    </div>
  );
}

/* ── Calendar View ── */
function CalendarView({
  year, month, day, format, onSelect, language,
}: {
  year: string; month: string; day: string;
  format: Format;
  onSelect: (y: string, m: string, d: string) => void;
  language: "ko" | "en";
}) {
  const now = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(Number(year) || now);
  const [viewMonth, setViewMonth] = useState(Number(month) || new Date().getMonth() + 1);

  useEffect(() => {
    if (year) setViewYear(Number(year));
  }, [year]);

  useEffect(() => {
    if (month) setViewMonth(Number(month));
  }, [month]);

  if (format === "year") {
    const base = Math.floor(viewYear / 12) * 12;
    const years = Array.from({ length: 12 }, (_, i) => base + i);
    return (
      <div className={styles.calView}>
        <div className={styles.calNav}>
          <button type="button" onClick={() => setViewYear(viewYear - 12)}>‹</button>
          <span>{years[0]}–{years[11]}</span>
          <button type="button" onClick={() => setViewYear(viewYear + 12)}>›</button>
        </div>
        <div className={styles.calYearGrid}>
          {years.map((y) => (
            <button
              key={y} type="button"
              className={`${styles.calCell} ${String(y) === year ? styles.calCellActive : ""}`}
              onClick={() => onSelect(String(y), month, day)}
            >{y}</button>
          ))}
        </div>
      </div>
    );
  }

  if (format === "yearMonth") {
    const mLabels = language === "ko" ? MONTHS_KO : MONTHS_EN;
    return (
      <div className={styles.calView}>
        <div className={styles.calNav}>
          <button type="button" onClick={() => setViewYear(viewYear - 1)}>‹</button>
          <span>{viewYear}</span>
          <button type="button" onClick={() => setViewYear(viewYear + 1)}>›</button>
        </div>
        <div className={styles.calMonthGrid}>
          {mLabels.map((label, i) => {
            const mv = String(i + 1).padStart(2, "0");
            const active = String(viewYear) === year && mv === month;
            return (
              <button
                key={mv} type="button"
                className={`${styles.calCell} ${active ? styles.calCellActive : ""}`}
                onClick={() => onSelect(String(viewYear), mv, day)}
              >{label}</button>
            );
          })}
        </div>
      </div>
    );
  }

  /* date format — full day calendar */
  const weekdays = language === "ko" ? WEEKDAYS_KO : WEEKDAYS_EN;
  const maxD = daysInMonthCount(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const cells: (number | null)[] = Array.from({ length: firstDow }, () => null);
  for (let d = 1; d <= maxD; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else setViewMonth(viewMonth + 1);
  };

  const monthLabel = language === "ko"
    ? `${viewYear}년 ${viewMonth}월`
    : `${MONTHS_EN[viewMonth - 1]} ${viewYear}`;

  return (
    <div className={styles.calView}>
      <div className={styles.calNav}>
        <button type="button" onClick={() => setViewYear(viewYear - 1)}>«</button>
        <button type="button" onClick={prevMonth}>‹</button>
        <span>{monthLabel}</span>
        <button type="button" onClick={nextMonth}>›</button>
        <button type="button" onClick={() => setViewYear(viewYear + 1)}>»</button>
      </div>
      <div className={styles.calDayGrid}>
        {weekdays.map((wd) => (
          <span key={wd} className={styles.calWeekday}>{wd}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const dv = String(d).padStart(2, "0");
          const mv = String(viewMonth).padStart(2, "0");
          const active = String(viewYear) === year && mv === month && dv === day;
          return (
            <button
              key={d} type="button"
              className={`${styles.calDayCell} ${active ? styles.calCellActive : ""}`}
              onClick={() => onSelect(String(viewYear), mv, dv)}
            >{d}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ── */
export default function DatePicker({
  year, month, day, format, mode, language, onSelect,
}: DatePickerProps) {
  return mode === "spinner" ? (
    <SpinnerView year={year} month={month} day={day} format={format} onSelect={onSelect} language={language} />
  ) : (
    <CalendarView year={year} month={month} day={day} format={format} onSelect={onSelect} language={language} />
  );
}
