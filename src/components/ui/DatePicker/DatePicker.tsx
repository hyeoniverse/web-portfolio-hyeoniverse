"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { SelectOption } from "@/types";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "@/components/icons";
import styles from "./DatePicker.module.css";
import Pressable from "@/components/ui/Pressable";

export type Format = "year" | "yearMonth" | "date";

export interface DatePickerProps {
  year: string;
  month: string;
  day: string;
  format: Format;
  mode: "spinner" | "calendar";
  language: "ko" | "en";
  onSelect: (year: string, month: string, day: string) => void;
  /** 이 시점 이전 cell 은 비활성 */
  minDate?: Date;
  /** 이 시점 이후 cell 은 비활성 */
  maxDate?: Date;
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
export const SPINNER_ITEM_H = 28;
export const SPINNER_VISIBLE = 5;
const ITEM_H = SPINNER_ITEM_H;
const VISIBLE = SPINNER_VISIBLE;

export function SpinnerColumn({
  items,
  value,
  onChange,
  label,
}: {
  items: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  /** 컬럼 하단에 표시할 라벨 (예: "년", "시", "오전/오후") — optional */
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isUserScroll = useRef(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollIdx, setScrollIdx] = useState<number | null>(null);

  useEffect(() => {
    const idx = items.findIndex((i) => i.value === value);
    if (idx >= 0 && ref.current && !isUserScroll.current) {
      ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }
    isUserScroll.current = false;
  }, [value, items]);

  useEffect(() => () => {
    clearTimeout(scrollTimer.current);
    clearTimeout(idleTimer.current);
  }, []);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    // 즉각 시각 피드백 — 현재 가운데 가까운 인덱스 추적
    const liveIdx = Math.round(ref.current.scrollTop / ITEM_H);
    const liveClamped = Math.max(0, Math.min(liveIdx, items.length - 1));
    setScrollIdx(liveClamped);
    setIsScrolling(true);

    // idle 감지 — 스크롤 멈춘 뒤 잠깐 효과 유지
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsScrolling(false), 220);

    // snap + onChange (디바운스)
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
      setScrollIdx(null);
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

  const activeIdx = scrollIdx ?? items.findIndex((i) => i.value === value);

  return (
    <div className={styles.spinnerColWrap}>
      {label && <span className={styles.spinnerLabel}>{label}</span>}
      <div className={`${styles.spinnerCol} ${isScrolling ? styles.spinnerColActive : ""}`}>
        <div
          ref={ref}
          className={styles.spinnerScroll}
          onScroll={handleScroll}
          data-lenis-prevent
          style={{ height: ITEM_H * VISIBLE }}
        >
          <div style={{ height: ITEM_H * 2 }} />
          {items.map((item, i) => {
            const dist = activeIdx >= 0 ? Math.abs(i - activeIdx) : 0;
            return (
              <div
                key={item.value}
                className={`${styles.spinnerItem} ${item.value === value ? styles.spinnerItemActive : ""}`}
                data-dist={Math.min(dist, 3)}
                style={{ height: ITEM_H }}
                onClick={() => clickItem(item.value)}
              >
                {item.label}
              </div>
            );
          })}
          <div style={{ height: ITEM_H * 2 }} />
        </div>
        <div className={`${styles.spinnerHighlight} ${isScrolling ? styles.spinnerHighlightScrolling : ""}`} style={{ top: ITEM_H * 2, height: ITEM_H }} />
      </div>
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
  minDate?: Date;  /* spinner mode 에선 visual disable 미구현 — calendar mode 만 적용 */
  maxDate?: Date;
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

  const yLabel = language === "ko" ? "년" : "Y";
  const mLabel = language === "ko" ? "월" : "M";
  const dLabel = language === "ko" ? "일" : "D";

  return (
    <div className={styles.spinnerView}>
      <SpinnerColumn items={yearItems} value={ey} onChange={(v) => onSelect(v, em, ed)} label={yLabel} />
      {(format === "yearMonth" || format === "date") && (
        <SpinnerColumn items={monthItems} value={em} onChange={(v) => onSelect(ey, v, ed)} label={mLabel} />
      )}
      {format === "date" && (
        <SpinnerColumn items={dayItems} value={ed} onChange={(v) => onSelect(ey, em, v)} label={dLabel} />
      )}
    </div>
  );
}

/* ── Calendar View ── */
function CalendarView({
  year, month, day, format, onSelect, language, minDate, maxDate,
}: {
  year: string; month: string; day: string;
  format: Format;
  onSelect: (y: string, m: string, d: string) => void;
  language: "ko" | "en";
  minDate?: Date;
  maxDate?: Date;
}) {
  // min/max 의 date-only (자정) — 비교 시 시간 무시
  const minDay = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime()
    : null;
  const maxDay = maxDate
    ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime()
    : null;
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
          <Pressable onClick={() => setViewYear(viewYear - 12)} aria-label="Previous"><ChevronLeft size={14} strokeWidth={2} /></Pressable>
          <span>{years[0]}–{years[11]}</span>
          <Pressable onClick={() => setViewYear(viewYear + 12)} aria-label="Next"><ChevronRight size={14} strokeWidth={2} /></Pressable>
        </div>
        <div className={styles.calYearGrid}>
          {years.map((y) => (
            <Pressable
              key={y} type="button"
              className={`${styles.calCell} ${String(y) === year ? styles.calCellActive : ""}`}
              onClick={() => onSelect(String(y), month, day)}
            >{y}</Pressable>
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
          <Pressable onClick={() => setViewYear(viewYear - 1)} aria-label="Previous year"><ChevronLeft size={14} strokeWidth={2} /></Pressable>
          <span>{viewYear}</span>
          <Pressable onClick={() => setViewYear(viewYear + 1)} aria-label="Next year"><ChevronRight size={14} strokeWidth={2} /></Pressable>
        </div>
        <div className={styles.calMonthGrid}>
          {mLabels.map((label, i) => {
            const mv = String(i + 1).padStart(2, "0");
            const active = String(viewYear) === year && mv === month;
            return (
              <Pressable
                key={mv} type="button"
                className={`${styles.calCell} ${active ? styles.calCellActive : ""}`}
                onClick={() => onSelect(String(viewYear), mv, day)}
              >{label}</Pressable>
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
        <Pressable onClick={() => setViewYear(viewYear - 1)} aria-label="Previous year"><ChevronsLeft size={14} strokeWidth={2} /></Pressable>
        <Pressable onClick={prevMonth} aria-label="Previous month"><ChevronLeft size={14} strokeWidth={2} /></Pressable>
        <span>{monthLabel}</span>
        <Pressable onClick={nextMonth} aria-label="Next month"><ChevronRight size={14} strokeWidth={2} /></Pressable>
        <Pressable onClick={() => setViewYear(viewYear + 1)} aria-label="Next year"><ChevronsRight size={14} strokeWidth={2} /></Pressable>
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
          const cellTime = new Date(viewYear, viewMonth - 1, d).getTime();
          const outOfRange = (minDay !== null && cellTime < minDay) || (maxDay !== null && cellTime > maxDay);
          return (
            <Pressable
              key={d} type="button"
              className={`${styles.calDayCell} ${active ? styles.calCellActive : ""} ${outOfRange ? styles.calCellDisabled : ""}`}
              onClick={() => { if (!outOfRange) onSelect(String(viewYear), mv, dv); }}
              disabled={outOfRange}
            >{d}</Pressable>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ── */
export default function DatePicker({
  year, month, day, format, mode, language, onSelect, minDate, maxDate,
}: DatePickerProps) {
  return mode === "spinner" ? (
    <SpinnerView year={year} month={month} day={day} format={format} onSelect={onSelect} language={language} minDate={minDate} maxDate={maxDate} />
  ) : (
    <CalendarView year={year} month={month} day={day} format={format} onSelect={onSelect} language={language} minDate={minDate} maxDate={maxDate} />
  );
}
