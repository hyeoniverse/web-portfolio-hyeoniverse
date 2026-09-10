"use client";

// ── 일 뷰 사이드 미니 달력 — 날짜 클릭 이동, 이벤트 개수 표시, 제목 클릭 시 연/월 spinner ──
import React from "react";
import { useStateFromProp } from "@/hooks/useStateFromProp";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import Button from "@/components/ui/Button";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import { type CalEvent, monthGrid, monthTitle, weekdayLabels, shiftMonth, eventDates } from "./model";
import styles from "./Calendar.module.css";
import Pressable from "@/components/ui/Pressable";

export default function MiniCalendar({
  date, onSelect, language, events = [],
}: {
  date: string;                       // 현재 선택된 날짜 (YYYY-MM-DD)
  onSelect: (date: string) => void;
  language: string;
  events?: CalEvent[];
}) {
  // 선택 날짜가 다른 달로 바뀌면 따라감
  const [month, setMonth] = useStateFromProp(date, (d) => d.slice(0, 7));
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const cells = React.useMemo(() => monthGrid(month), [month]);
  const wd = weekdayLabels(language);
  const countByDate = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) for (const ds of eventDates(e)) m.set(ds, (m.get(ds) || 0) + 1);
    return m;
  }, [events]);
  const [my, mm] = month.split("-");

  return (
    <div className={styles.miniCal} contentEditable={false}>
      <div className={styles.miniCalHead}>
        <Button variant="ghost" shape="circle" size="xs" icon={<ChevronLeft size={14} />} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="prev" soundDisabled />
        <span className={styles.miniCalTitleWrap}>
          <Button variant="ghost" size="xs" onClick={() => setPickerOpen((o) => !o)} soundDisabled>
            {monthTitle(month, language)}
          </Button>
          {pickerOpen && (
            <DatePickerPopover
              portal
              year={my} month={mm} day="01"
              format="yearMonth" forceMode="spinner"
              onSelect={(y, mo) => setMonth(`${y}-${mo}`)}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </span>
        <Button variant="ghost" shape="circle" size="xs" icon={<ChevronRight size={14} />} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="next" soundDisabled />
      </div>
      <div className={styles.miniCalWeek}>
        {wd.map((w, i) => <span key={i} className={`${styles.miniCalDow}${i === 0 ? ` ${styles.sun}` : ""}${i === 6 ? ` ${styles.sat}` : ""}`}>{w}</span>)}
      </div>
      <div className={styles.miniCalGrid}>
        {cells.map((c) => {
          const n = countByDate.get(c.date) || 0;
          return (
            <Pressable
              key={c.date}
              className={`${styles.miniCalCell}${!c.inMonth ? ` ${styles.miniCalOut}` : ""}${c.date === date ? ` ${styles.miniCalSel}` : ""}${c.isToday && c.date !== date ? ` ${styles.miniCalToday}` : ""}`}
              onClick={() => onSelect(c.date)}
            >
              <span className={styles.miniCalNum}>{c.day}</span>
              {n > 0 && <span className={styles.miniCalCount}>{n}</span>}
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
