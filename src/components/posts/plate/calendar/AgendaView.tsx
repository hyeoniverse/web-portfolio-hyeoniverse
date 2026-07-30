"use client";

// ── 주/일 뷰 — 주: 날짜별 심플 리스트(박스 없음) / 일: 시간축 그리드. ──
import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Link2, Repeat } from "@/components/icons";
import Tooltip from "@/components/ui/Tooltip";
import { type CalEvent, type EventLabel, type TimeFormat, eventColorVar, eventEndDate, eventTimeLabel, formatClock, formatHourLabel, weekdayLabels, connectedComponent } from "./model";
import { parseDate, toDateStr, formatDateValue } from "../dateUtils";
import EventPreview from "./EventPreview";
import { useHoverPreview } from "./useHoverPreview";
import MiniCalendar from "./MiniCalendar";
import DayDetailPanel from "./DayDetailPanel";
import { useWheelPager } from "./useWheelPager";
import styles from "./Calendar.module.css";

const shiftDate = (date: string, days: number) => {
  const d = parseDate(date);
  if (!d) return date;
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

// 일 뷰 시간축 상수
const HOUR_H = 46;   // 한 시간 높이(px)
const PAD_TOP = 14;  // 00:00 위·23:59 아래 여백(px) — 첫/마지막 시간대 라벨이 잘리지 않게
const MIN_H = 20;    // 블록 최소 높이(px)
const DEFAULT_DUR = 30; // 종료 시각 없을 때 기본 길이(분)
const SNAP = 15;     // 본체 이동 스냅 단위(분)
const MIN_DUR = 5;   // 리사이즈 최소 길이(분)
const timeToMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const pad2 = (n: number) => String(n).padStart(2, "0");
const minToTime = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
const snapMin = (m: number) => Math.round(m / SNAP) * SNAP;
const clampMin = (m: number) => Math.max(0, Math.min(24 * 60, m));

// 시간 이벤트 겹침 → 컬럼 분할 배치. 블록 높이는 기간(time~endTime)에 비례.
type Laid = { e: CalEvent; y0: number; y1: number; h: number; col: number; cols: number };
function layoutDay(timed: CalEvent[]): Laid[] {
  const items: Laid[] = timed
    .map((e) => {
      const startMin = timeToMin(e.time!);
      const endMin = e.endTime && e.endTime > e.time! ? timeToMin(e.endTime) : startMin + DEFAULT_DUR;
      const y0 = (startMin / 60) * HOUR_H;
      const h = Math.max(MIN_H, ((endMin - startMin) / 60) * HOUR_H);
      return { e, y0, y1: y0 + h, h, col: 0, cols: 1 };
    })
    .sort((a, b) => a.y0 - b.y0);
  let cluster: Laid[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const colEnds: number[] = [];
    for (const it of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) { if (colEnds[c] <= it.y0) { it.col = c; colEnds[c] = it.y1; placed = true; break; } }
      if (!placed) { it.col = colEnds.length; colEnds.push(it.y1); }
    }
    for (const it of cluster) it.cols = colEnds.length;
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.y0 >= clusterEnd) flush();
    cluster.push(it); clusterEnd = Math.max(clusterEnd, it.y1);
  }
  flush();
  return items;
}

export default function AgendaView({
  mode, date, events, labels, language, readOnly, viewToggle, todayButton,
  onDateChange, onEventClick, onDateDetail, onAdd, onEventTimeChange, onEventPatch, onEventDelete, relatedIds, timeFormat = "12h",
}: {
  mode: "week" | "day";
  date: string;
  events: CalEvent[];
  labels: EventLabel[];
  language: string;
  readOnly?: boolean;
  timeFormat?: TimeFormat;
  viewToggle?: React.ReactNode;
  todayButton?: React.ReactNode;
  onDateChange?: (date: string) => void;
  onEventClick?: (ev: CalEvent) => void;
  onDateDetail?: (date: string) => void;
  onAdd?: (date: string, time?: string, endTime?: string) => void;
  /** 일 시간축에서 드래그 이동/리사이즈로 시간 변경 — 반복 회차는 상위에서 적용 범위 확인 */
  onEventTimeChange?: (ev: CalEvent, time: string, endTime: string | null) => void;
  /** 일 뷰 인라인 패널 — 부분 편집(제목/라벨/상태/태그 등) */
  onEventPatch?: (id: string, patch: Partial<CalEvent>) => void;
  onEventDelete?: (ev: CalEvent) => void;
  /** 선행/후속 관계가 있는 이벤트 id 집합 — 관계 아이콘 */
  relatedIds?: Set<string>;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const { hover, show: showHover, hideSoon, hideNow, keepOpen } = useHoverPreview();
  // 일 뷰 인라인 패널에서 선택된 이벤트
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const prevDayRef = React.useRef(date);
  if (prevDayRef.current !== date) { prevDayRef.current = date; if (selectedId) setSelectedId(null); }
  const selectDay = (ev: CalEvent) => { hideNow(); setSelectedId(ev.id); };
  const selectedEvent = selectedId ? events.find((e) => e.id === selectedId) ?? null : null;
  const [chainHi, setChainHi] = React.useState<Set<string> | null>(null); // hover 한 이벤트의 연결 체인 강조
  const inChain = (ev: CalEvent) => !!chainHi && chainHi.size > 1 && chainHi.has(ev.master ?? ev.id);
  const enterChain = (ev: CalEvent) => setChainHi(connectedComponent(ev.master ?? ev.id, events));

  const eventsOn = (day: string) =>
    events
      .filter((ev) => ev.date <= day && eventEndDate(ev) >= day)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const base = parseDate(date) ?? new Date();
  const days = mode === "week"
    ? (() => { const sun = new Date(base); sun.setDate(base.getDate() - base.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(sun); d.setDate(sun.getDate() + i); return toDateStr(d); }); })()
    : [date];

  const step = mode === "week" ? 7 : 1;
  const title = mode === "week"
    ? `${formatDateValue(days[0], null, language)} ~ ${formatDateValue(days[6], null, language)}`
    : formatDateValue(date, null, language);
  const todayStr = toDateStr(new Date());
  const wd = weekdayLabels(language);

  const [dir, setDir] = React.useState(1);
  const nav = (d: number) => { setDir(d); onDateChange?.(shiftDate(date, d * step)); };
  // 경계에서 당기는 진행도(방향·0~1) — 인디케이터로 명시적 넘김 의도를 유도
  const [pull, setPull] = React.useState<{ dir: -1 | 1; p: number } | null>(null);
  const wheelRef = useWheelPager(() => nav(-1), () => nav(1), !!onDateChange, {
    scrollSelector: "[data-agenda-scroll]",
    threshold: 150, // 경계에서 의도적으로 더 당겨야 넘어감(실수 방지)
    onPull: (d, p) => setPull(d === 0 || p <= 0 ? null : { dir: d, p }),
  });
  const pageKey = mode === "week" ? days[0] : date;

  // 일 뷰 진입/날짜 변경 시 시간축을 첫 이벤트(또는 8시)로 스크롤
  const dayScrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (mode !== "day") return;
    const el = dayScrollRef.current;
    if (!el) return;
    const timed = eventsOn(date).filter((e) => e.time);
    const firstH = timed.length ? Math.max(0, Math.floor(timeToMin(timed[0].time!) / 60) - 1) : 8;
    el.scrollTop = PAD_TOP + firstH * HOUR_H;
  }, [mode, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 일 시간축 드래그: 빈 슬롯 생성 / 블록 이동 / 하단 리사이즈 ──
  const gridBodyRef = React.useRef<HTMLDivElement>(null);
  const didDragRef = React.useRef(false);
  const [createDrag, setCreateDrag] = React.useState<{ top: number; height: number } | null>(null);
  const [timeDrag, setTimeDrag] = React.useState<{ id: string; y0: number; h: number; label: string; edge: "top" | "bottom" } | null>(null);
  const canEditTime = !readOnly && !!onEventTimeChange;

  // 빈 영역 드래그 → 그 시간 범위로 이벤트 생성
  const onGridDown = (e: React.PointerEvent) => {
    if (readOnly || !onAdd || e.button !== 0) return;
    const body = gridBodyRef.current;
    if (!body || (e.target as HTMLElement).closest("[data-day-event]")) return;
    const rect = body.getBoundingClientRect();
    const startY = e.clientY - rect.top;
    let curY = startY;
    const yToMin = (y: number) => clampMin(((y - PAD_TOP) / HOUR_H) * 60);
    const onMove = (me: PointerEvent) => { curY = me.clientY - rect.top; setCreateDrag({ top: Math.min(startY, curY), height: Math.abs(curY - startY) }); };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setCreateDrag(null);
      let s = snapMin(yToMin(Math.min(startY, curY)));
      let en = snapMin(yToMin(Math.max(startY, curY)));
      if (en - s < SNAP) en = s + DEFAULT_DUR;
      s = Math.min(s, 24 * 60 - SNAP); en = Math.min(en, 24 * 60);
      onAdd(date, minToTime(s), minToTime(en));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 블록 본체 드래그 → 시작 시각 이동(기간 유지). 하단 핸들 → 종료 시각, 상단 핸들 → 시작 시각 리사이즈.
  const onBlockDown = (e: React.PointerEvent, ev: CalEvent, kind: "move" | "resize" | "resizeStart") => {
    if (!canEditTime || !ev.time || e.button !== 0) return;
    e.stopPropagation();
    const startClientY = e.clientY;
    const startMin = timeToMin(ev.time);
    const endMin = ev.endTime && ev.endTime > ev.time ? timeToMin(ev.endTime) : startMin + DEFAULT_DUR;
    const dur = endMin - startMin;
    let moved = false;
    let nStart = startMin, nEnd = endMin;
    const onMove = (me: PointerEvent) => {
      const dMin = ((me.clientY - startClientY) / HOUR_H) * 60;
      if (!moved && Math.abs(me.clientY - startClientY) < 4) return;
      moved = true; didDragRef.current = true;
      if (kind === "move") {
        nStart = Math.max(0, Math.min(24 * 60 - dur, snapMin(startMin + dMin)));
        nEnd = nStart + dur;
      } else if (kind === "resizeStart") {
        nStart = Math.max(0, Math.min(endMin - MIN_DUR, Math.round(startMin + dMin))); // 1분 단위
        nEnd = endMin;
      } else {
        nEnd = Math.max(startMin + MIN_DUR, Math.min(24 * 60, Math.round(endMin + dMin))); // 1분 단위
      }
      const clock = (m: number) => formatClock(minToTime(m), timeFormat);
      const label = kind === "resize" ? clock(nEnd) : kind === "resizeStart" ? clock(nStart) : `${clock(nStart)} – ${clock(nEnd)}`;
      const edge: "top" | "bottom" = kind === "resize" ? "bottom" : "top";
      setTimeDrag({ id: ev.id, y0: (nStart / 60) * HOUR_H, h: ((nEnd - nStart) / 60) * HOUR_H, label, edge });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setTimeDrag(null);
      if (moved) onEventTimeChange!(ev, minToTime(nStart), minToTime(nEnd));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const eventBtn = (ev: CalEvent, cls: string, extraStyle?: React.CSSProperties, children?: React.ReactNode) => (
    <button
      key={ev.id}
      type="button"
      className={`${cls}${inChain(ev) ? ` ${styles.agendaChainHi}` : ""}`}
      style={{ ["--_c" as string]: eventColorVar(ev, labels), ...extraStyle }}
      onClick={() => { hideNow(); if (mode === "day") setSelectedId(ev.id); else onEventClick?.(ev); }}
      onMouseEnter={(e) => { showHover({ ev, rect: e.currentTarget.getBoundingClientRect() }); enterChain(ev); }}
      onMouseLeave={() => { hideSoon(); setChainHi(null); }}
      tabIndex={0}
    >
      {children}
    </button>
  );

  // ── 주 뷰: 날짜별 컬럼(박스 없음) ──
  const weekBody = (
    <>
      {days.map((day) => {
        const dow = new Date(day + "T00:00:00").getDay();
        const evs = eventsOn(day);
        return (
          <div key={day} className={`${styles.agendaCol}${day === todayStr ? ` ${styles.agendaToday}` : ""}`}>
            <button type="button" className={styles.agendaColHead} onClick={() => onDateDetail?.(day)}>
              <span className={`${styles.agendaDow}${dow === 0 ? ` ${styles.sun}` : ""}${dow === 6 ? ` ${styles.sat}` : ""}`}>{wd[dow]}</span>
              <span className={styles.agendaDate}>{new Date(day + "T00:00:00").getDate()}</span>
              {evs.length > 0 && <span className={styles.agendaCount}>{evs.length}</span>}
            </button>
            <div className={styles.agendaList} data-agenda-scroll>
              {evs.length === 0 ? (
                <div className={styles.agendaEmpty}>{t("일정 없음", "No events")}</div>
              ) : (
                evs.map((ev) => eventBtn(
                  ev,
                  `${styles.agendaItem}${ev.status === "done" ? ` ${styles.agendaItemDone}` : ""}`,
                  undefined,
                  <>
                    <span className={styles.agendaDot} />
                    {ev.time && <span className={styles.agendaTime}>{formatClock(ev.time, timeFormat)}</span>}
                    <span className={styles.agendaItemTitle}>{ev.title || t("(제목 없음)", "(Untitled)")}</span>
                    {(ev.repeat || ev.master) && <Repeat size={10} className={styles.agendaRel} aria-label="recurring" />}
                    {relatedIds?.has(ev.master ?? ev.id) && <Link2 size={10} className={styles.agendaRel} aria-label="linked" />}
                  </>,
                ))
              )}
            </div>
            {!readOnly && onAdd && (
              <button type="button" className={styles.agendaAdd} onClick={() => onAdd(day)}><Plus size={12} />{t("추가", "Add")}</button>
            )}
          </div>
        );
      })}
    </>
  );

  // ── 일 뷰: 시간축 그리드 ──
  const dayBody = (() => {
    const evs = eventsOn(date);
    const allDay = evs.filter((e) => !e.time);
    const laid = layoutDay(evs.filter((e) => e.time));
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return (
      <>
        {(allDay.length > 0 || (!readOnly && onAdd)) && (
          <div className={styles.dayAllDay}>
            <span className={styles.dayAllDayLabel}>{t("종일", "All-day")}</span>
            {allDay.map((ev) => eventBtn(
              ev,
              `${styles.dayAllDayItem}${ev.status === "done" ? ` ${styles.agendaItemDone}` : ""}`,
              undefined,
              <><span className={styles.agendaDot} /><span className={styles.agendaItemTitle}>{ev.title || t("(제목 없음)", "(Untitled)")}</span></>,
            ))}
            {!readOnly && onAdd && <button type="button" className={styles.dayAllDayAdd} onClick={() => onAdd(date)} aria-label={t("추가", "Add")}><Plus size={12} /></button>}
          </div>
        )}
        <div className={styles.dayGridScroll} data-agenda-scroll ref={dayScrollRef}>
          <div className={styles.dayGridBody} ref={gridBodyRef} style={{ height: 24 * HOUR_H + PAD_TOP * 2 }} onPointerDown={onGridDown}>
            {Array.from({ length: 25 }, (_, h) => (
              <div key={h} className={styles.dayHour} style={{ top: PAD_TOP + h * HOUR_H }}>
                <span className={styles.dayHourLabel}>{formatHourLabel(h, timeFormat)}</span>
              </div>
            ))}
            {date === todayStr && (
              <div className={styles.dayNowLine} style={{ top: PAD_TOP + (nowMin / 60) * HOUR_H }}><span className={styles.dayNowDot} /></div>
            )}
            {createDrag && createDrag.height > 3 && (
              <div className={styles.dayCreatePreview} style={{ top: createDrag.top, height: createDrag.height }} />
            )}
            {laid.map(({ e, y0, h, col, cols }) => {
              const td = timeDrag?.id === e.id ? timeDrag : null;
              const top = PAD_TOP + (td ? td.y0 : y0);
              const hh = td ? td.h : h;
              return (
                <button
                  key={e.id}
                  type="button"
                  data-day-event
                  className={`${styles.dayEvent}${e.status === "done" ? ` ${styles.agendaItemDone}` : ""}${hh < 34 ? ` ${styles.dayEventShort}` : ""}${td ? ` ${styles.dayEventDragging}` : ""}${canEditTime ? ` ${styles.dayEventDraggable}` : ""}${inChain(e) ? ` ${styles.agendaChainHi}` : ""}${selectedId === e.id ? ` ${styles.dayEventSelected}` : ""}`}
                  style={{ ["--_c" as string]: eventColorVar(e, labels), top, height: hh - 2, left: `calc(var(--_axis) + (100% - var(--_axis)) * ${col / cols} + 2px)`, width: `calc((100% - var(--_axis)) / ${cols} - 4px)` }}
                  onPointerDown={canEditTime ? (ev) => onBlockDown(ev, e, "move") : undefined}
                  onClick={() => { if (didDragRef.current) { didDragRef.current = false; return; } selectDay(e); }}
                  onMouseEnter={(ev) => { if (!timeDrag) { showHover({ ev: e, rect: ev.currentTarget.getBoundingClientRect() }); enterChain(e); } }}
                  onMouseLeave={() => { hideSoon(); setChainHi(null); }}
                  tabIndex={0}
                >
                  <span className={styles.dayEventHead}>
                    <span className={styles.dayEventTitle}>{e.title || t("(제목 없음)", "(Untitled)")}</span>
                    {(e.repeat || e.master) && <Repeat size={11} className={styles.dayEventIcon} aria-label="recurring" />}
                    {relatedIds?.has(e.master ?? e.id) && <Link2 size={11} className={styles.dayEventIcon} aria-label="linked" />}
                  </span>
                  <span className={styles.dayEventTime}>{eventTimeLabel(e, timeFormat)}</span>
                  {td && <span className={`${styles.dayEventDragTime}${td.edge === "bottom" ? ` ${styles.dayEventDragTimeBottom}` : ""}`}>{td.label}</span>}
                  {canEditTime && <span className={`${styles.dayEventResize} ${styles.dayEventResizeTop}`} data-cursor="resizeV" onPointerDown={(ev) => onBlockDown(ev, e, "resizeStart")} onClick={(ev) => ev.stopPropagation()} />}
                  {canEditTime && <span className={styles.dayEventResize} data-cursor="resizeV" onPointerDown={(ev) => onBlockDown(ev, e, "resize")} onClick={(ev) => ev.stopPropagation()} />}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  })();

  return (
    <div className={styles.calendar} contentEditable={false}>
      <div className={`${styles.header} ${styles.agendaHeader}`}>
        <div className={styles.navGroup}>
          <Tooltip content={mode === "week" ? t("이전 주", "Previous week") : t("이전 날", "Previous day")} placement="top">
            <button type="button" className={styles.navBtn} onClick={() => nav(-1)} aria-label="prev"><ChevronLeft size={16} /></button>
          </Tooltip>
          <span className={styles.agendaTitle}>{title}</span>
          <Tooltip content={mode === "week" ? t("다음 주", "Next week") : t("다음 날", "Next day")} placement="top">
            <button type="button" className={styles.navBtn} onClick={() => nav(1)} aria-label="next"><ChevronRight size={16} /></button>
          </Tooltip>
          {todayButton}
        </div>
        <div className={styles.agendaHeadRight}>
          {!readOnly && onAdd && (
            <button type="button" className={styles.agendaHeadAdd} onClick={() => onAdd(date)}>
              <Plus size={14} />{t("이벤트 추가", "Add event")}
            </button>
          )}
          {viewToggle}
        </div>
      </div>

      <div className={`${styles.agendaViewport}${mode === "day" ? ` ${styles.agendaViewportDay}` : ""}`} ref={wheelRef} data-lenis-prevent>
        <motion.div
          key={pageKey}
          className={mode === "week" ? styles.agendaWeek : styles.dayGrid}
          initial={{ opacity: 0, x: dir * 56 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {mode === "week" ? weekBody : dayBody}
        </motion.div>
        {mode === "day" && (
          <div className={styles.dayRightCol} data-no-pager data-lenis-prevent>
            {onDateChange && <MiniCalendar date={date} onSelect={onDateChange} language={language} events={events} />}
            <DayDetailPanel
              event={selectedEvent}
              labels={labels}
              language={language}
              timeFormat={timeFormat}
              readOnly={readOnly}
              date={date}
              onPatch={onEventPatch}
              onDelete={onEventDelete ? (ev) => { onEventDelete(ev); setSelectedId(null); } : undefined}
              onFullEdit={onEventClick}
              onCreate={onAdd ? (d) => onAdd(d) : undefined}
            />
          </div>
        )}
        {pull && (() => {
          // 주뷰는 좌우로 페이지가 넘어가므로 링도 좌/우 방향, 일뷰는 상/하
          const horiz = mode === "week";
          const posClass = pull.dir === 1
            ? (horiz ? styles.pullRight : styles.pullBottom)
            : (horiz ? styles.pullLeft : styles.pullTop);
          const Icon = pull.dir === 1 ? (horiz ? ChevronRight : ChevronDown) : (horiz ? ChevronLeft : ChevronUp);
          return (
            <div
              className={`${styles.pullHint} ${posClass}${pull.p >= 1 ? ` ${styles.pullReady}` : ""}`}
              style={{ ["--_p" as string]: pull.p }}
              aria-hidden
            >
              <span className={styles.pullRing}>
                <span className={styles.pullRingIcon}><Icon size={16} /></span>
              </span>
            </div>
          );
        })()}
      </div>

      <EventPreview hover={hover} labels={labels} language={language} timeFormat={timeFormat} onMouseEnter={keepOpen} onMouseLeave={hideSoon} />
    </div>
  );
}
