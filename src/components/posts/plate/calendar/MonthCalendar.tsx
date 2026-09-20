"use client";

// ── 이벤트 달력 그리드 (에디터·리더 공용 프레젠테이션) ──
import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Link2, Repeat } from "@/components/icons";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import {
  type CalEvent, type EventLabel, type TimeFormat, eventColorVar, eventDates, eventEndDate, formatClock, monthGrid, monthTitle, weekdayLabels, shiftMonth, parseMonth, connectedComponent,
} from "./model";
import Tooltip from "@/components/ui/Tooltip";
import EventPreview from "./EventPreview";
import { useHoverPreview } from "./useHoverPreview";
import DayEventsPopover, { type DayPopState } from "./DayEventsPopover";
import styles from "./Calendar.module.css";
import Pressable from "@/components/ui/Pressable";

const pad = (n: number) => String(n).padStart(2, "0");

const MAX_CHIPS = 2;

export default function MonthCalendar({
  month, events, labels, language, readOnly, selectedDate, focusEventId, viewToggle, todayButton,
  onMonthChange, onDayClick, onEventClick, onEventMove, relatedIds, timeFormat = "12h",
}: {
  month: string;
  events: CalEvent[];
  labels: EventLabel[];
  language: string;
  readOnly?: boolean;
  timeFormat?: TimeFormat;
  selectedDate?: string | null;
  /** 사이드바에서 focus 한 이벤트 id — 해당 chip 에 펄스 하이라이트 */
  focusEventId?: string | null;
  viewToggle?: React.ReactNode;
  todayButton?: React.ReactNode;
  onMonthChange?: (month: string) => void;
  onDayClick?: (date: string) => void;
  onEventClick?: (ev: CalEvent) => void;
  onEventMove?: (id: string, fromDate: string, toDate: string) => void;
  /** 선행/후속 관계가 있는 이벤트 id 집합 — 관계 아이콘 표시용 */
  relatedIds?: Set<string>;
}) {
  // 사이드바에서 focus 한 이벤트 chip 이 화면 밖이면 스크롤해 보이게
  const focusChipRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (focusEventId && focusChipRef.current) {
      focusChipRef.current.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
  }, [focusEventId]);
  const cells = React.useMemo(() => monthGrid(month), [month]);
  const weeks = React.useMemo(() => {
    const w: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return w;
  }, [cells]);
  const byDate = React.useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      for (const ds of eventDates(e)) {
        if (!map.has(ds)) map.set(ds, []);
        map.get(ds)!.push(e);
      }
    }
    for (const list of map.values()) list.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
    return map;
  }, [events]);
  // 전역 레인 배정 — 기간 이벤트가 여러 셀에서 같은 세로 슬롯에 놓여 이어져 보이게 (그리디 인터벌 패킹)
  const laneOf = React.useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const ae = eventEndDate(a), be = eventEndDate(b);
      return ae > be ? -1 : ae < be ? 1 : 0; // 같은 시작이면 긴 것 먼저
    });
    const laneEnds: string[] = [];
    const map = new Map<string, number>();
    for (const ev of sorted) {
      const s = ev.date, e = eventEndDate(ev);
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] >= s) lane++;
      laneEnds[lane] = e;
      map.set(ev.id, lane);
    }
    return map;
  }, [events]);
  const weekdays = weekdayLabels(language);
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const { hover, show: showHover, hideSoon, hideNow, keepOpen } = useHoverPreview();
  const [chainHi, setChainHi] = React.useState<Set<string> | null>(null); // hover 한 이벤트의 연결 체인 강조
  const [dayPop, setDayPop] = React.useState<DayPopState>(null);
  const [monthPickerOpen, setMonthPickerOpen] = React.useState(false);
  // 드래그앤드롭 — 잡은 이벤트/출발 날짜 + 현재 드롭 대상 셀
  const dragRef = React.useRef<{ id: string; from: string } | null>(null);
  const [dropDate, setDropDate] = React.useState<string | null>(null);
  const canDrag = !readOnly && !!onEventMove;
  const mp = parseMonth(month);
  // 페이지 넘김 방향(슬라이드) + 네비게이션
  const [monthDir, setMonthDir] = React.useState(1);
  const navMonth = (d: number) => { setMonthDir(d); onMonthChange?.(shiftMonth(month, d)); };
  /* 월뷰는 휠로 달을 넘기지 않는다 — 달 이동은 헤더의 이전/다음 버튼으로만.
     (주/일 뷰(AgendaView)는 그대로 useWheelPager 를 쓴다) */

  return (
    <div className={styles.calendar} contentEditable={false}>
      <div className={styles.header}>
        <div className={styles.navGroup}>
          <Tooltip content={t("이전 달", "Previous month")} placement="top">
            <Pressable className={styles.navBtn} onClick={() => navMonth(-1)} aria-label="prev">
              <ChevronLeft size={16} />
            </Pressable>
          </Tooltip>
          <span className={styles.monthNavWrap}>
            <Tooltip content={t("연·월 선택", "Pick year/month")} placement="top">
              <Pressable className={styles.title} onClick={() => setMonthPickerOpen(true)}>{monthTitle(month, language)}</Pressable>
            </Tooltip>
            {monthPickerOpen && (
              <DatePickerPopover
              portal
                forceMode="spinner"
                year={String(mp.y)}
                month={pad(mp.m)}
                day="01"
                format="yearMonth"
                onSelect={(yy, mm) => onMonthChange?.(`${yy}-${mm}`)}
                onClose={() => setMonthPickerOpen(false)}
              />
            )}
          </span>
          <Pressable className={styles.navBtn} onClick={() => navMonth(1)} aria-label="next">
            <ChevronRight size={16} />
          </Pressable>
          {todayButton}
        </div>
        {viewToggle}
      </div>
      <div className={styles.weekRow}>
        {weekdays.map((w, i) => (
          <span key={w} className={`${styles.weekday}${i === 0 ? ` ${styles.sun}` : ""}${i === 6 ? ` ${styles.sat}` : ""}`}>{w}</span>
        ))}
      </div>
      {/* data-lenis-prevent 를 두지 않는다 — 이 칸은 overflow:hidden 이라 스스로 스크롤하지 않고
          월뷰는 휠을 쓰지도 않는다. 붙여 두면 커서가 달력 위에 있는 동안 페이지가 멈춘다. */}
      <div className={styles.gridViewport}>
      <motion.div
        key={month}
        className={styles.grid}
        initial={{ opacity: 0, x: monthDir * 56 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {weeks.map((week, wi) => {
          // 이 주에 걸치는 이벤트 → 스팬 세그먼트(그리드 열 span) + 레인, 초과분은 열별 +N
          const weekStart = week[0].date, weekEnd = week[6].date;
          const segments: { ev: CalEvent; lane: number; startCol: number; span: number; contLeft: boolean; contRight: boolean }[] = [];
          const overflowByCol = [0, 0, 0, 0, 0, 0, 0];
          for (const ev of events) {
            const s = ev.date, e = eventEndDate(ev);
            if (e < weekStart || s > weekEnd) continue;
            const startDate = s < weekStart ? weekStart : s;
            const endDate = e > weekEnd ? weekEnd : e;
            const startCol = week.findIndex((c) => c.date === startDate);
            const endCol = week.findIndex((c) => c.date === endDate);
            if (startCol < 0 || endCol < 0) continue;
            const lane = laneOf.get(ev.id) ?? 0;
            if (lane < MAX_CHIPS) segments.push({ ev, lane, startCol, span: endCol - startCol + 1, contLeft: s < weekStart, contRight: e > weekEnd });
            else for (let ci = startCol; ci <= endCol; ci++) overflowByCol[ci]++;
          }
          return (
            <div
              key={wi}
              className={styles.week}
              onDragOver={canDrag ? (e) => {
                if (!dragRef.current) return;
                e.preventDefault(); e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                const col = Math.max(0, Math.min(6, Math.floor((e.clientX - r.left) / (r.width / 7))));
                const d = week[col].date;
                if (dropDate !== d) setDropDate(d);
              } : undefined}
              onDragLeave={canDrag ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropDate(null); } : undefined}
              onDrop={canDrag ? (e) => {
                if (!dragRef.current) return;
                e.preventDefault(); e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                const col = Math.max(0, Math.min(6, Math.floor((e.clientX - r.left) / (r.width / 7))));
                const to = week[col].date;
                const drag = dragRef.current;
                dragRef.current = null; setDropDate(null);
                if (drag.from !== to) onEventMove?.(drag.id, drag.from, to);
              } : undefined}
            >
              {week.map((c) => {
                const dow = new Date(c.date + "T00:00:00").getDay();
                return (
                  <div
                    key={c.date}
                    className={[
                      styles.cell,
                      c.inMonth ? "" : styles.outMonth,
                      c.isToday ? styles.today : "",
                      dow === 0 || dow === 6 ? styles.cellWeekend : "",
                      selectedDate === c.date ? styles.selected : "",
                      dropDate === c.date ? styles.cellDrop : "",
                      readOnly ? "" : styles.editable,
                    ].filter(Boolean).join(" ")}
                    onClick={readOnly ? undefined : () => onDayClick?.(c.date)}
                    role={readOnly ? undefined : "button"}
                  >
                    <span className={`${styles.dayNum}${dow === 0 ? ` ${styles.sun}` : ""}${dow === 6 ? ` ${styles.sat}` : ""}`}>{c.day}</span>
                  </div>
                );
              })}
              <div className={styles.weekBars}>
                {segments.map(({ ev, lane, startCol, span, contLeft, contRight }) => (
                  <Pressable
                    key={ev.id}
                    ref={ev.id === focusEventId ? focusChipRef : undefined}
                    className={`${styles.chip} ${styles.spanBar}${ev.status === "done" ? ` ${styles.chipDone}` : ""}${contLeft ? ` ${styles.spanL}` : ""}${contRight ? ` ${styles.spanR}` : ""}${hover?.ev.id === ev.id ? ` ${styles.chipHover}` : ""}${chainHi && chainHi.size > 1 && chainHi.has(ev.master ?? ev.id) ? ` ${styles.chipChainHi}` : ""}${ev.id === focusEventId ? ` ${styles.chipHi}` : ""}`}
                    style={{ gridColumn: `${startCol + 1} / span ${span}`, gridRow: lane + 1, ["--_chip" as string]: eventColorVar(ev, labels) }}
                    draggable={canDrag}
                    onMouseDown={canDrag ? () => hideNow() : undefined}
                    onDragStart={canDrag ? (e) => { e.stopPropagation(); dragRef.current = { id: ev.id, from: ev.date }; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ev.id); } : undefined}
                    onDragEnd={canDrag ? (e) => { e.stopPropagation(); dragRef.current = null; setDropDate(null); } : undefined}
                    onClick={(e) => { e.stopPropagation(); hideNow(); onEventClick?.(ev); }}
                    onMouseEnter={(e) => { if (!dragRef.current) { showHover({ ev, rect: e.currentTarget.getBoundingClientRect() }); setChainHi(connectedComponent(ev.master ?? ev.id, events)); } }}
                    onMouseLeave={() => { hideSoon(); setChainHi(null); }}
                    tabIndex={readOnly ? -1 : 0}
                  >
                    <span className={styles.chipDot} />
                    <span className={styles.chipLabel}>{`${ev.time && !contLeft ? `${formatClock(ev.time, timeFormat)} ` : ""}${ev.title || " "}`}</span>
                    {((ev.repeat || ev.master) || relatedIds?.has(ev.master ?? ev.id)) && (
                      <span className={styles.chipInd}>
                        {(ev.repeat || ev.master) && <Repeat size={9} aria-label="recurring" />}
                        {relatedIds?.has(ev.master ?? ev.id) && <Link2 size={9} aria-label="linked" />}
                      </span>
                    )}
                  </Pressable>
                ))}
                {overflowByCol.map((n, ci) => n > 0 ? (
                  <Pressable
                    key={`o${ci}`}
                    className={styles.moreChip}
                    style={{ gridColumn: ci + 1, gridRow: MAX_CHIPS + 1 }}
                    onClick={(e) => { e.stopPropagation(); hideNow(); setDayPop({ date: week[ci].date, events: byDate.get(week[ci].date) || [], rect: e.currentTarget.getBoundingClientRect() }); }}
                  >
                    +{n}
                  </Pressable>
                ) : null)}
              </div>
            </div>
          );
        })}
      </motion.div>
      </div>
      <EventPreview hover={hover} labels={labels} language={language} timeFormat={timeFormat} onMouseEnter={keepOpen} onMouseLeave={hideSoon} />
      <DayEventsPopover
        state={dayPop}
        labels={labels}
        language={language}
        timeFormat={timeFormat}
        readOnly={readOnly}
        onEventClick={onEventClick}
        onClose={() => setDayPop(null)}
        onHover={(ev, rect) => { if (ev && rect) showHover({ ev, rect }); else hideSoon(); }}
      />
    </div>
  );
}
