"use client";

// ── 리더용 이벤트 달력 — 연결형(calendarId 서버 fetch) 또는 legacy inline. 읽기전용(월 이동만). ──
import React, { useEffect, useRef, useState } from "react";
import { CalendarClock } from "@/components/icons";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import MonthCalendar from "./calendar/MonthCalendar";
import TimelineView, { type TimelineHandle } from "./calendar/TimelineView";
import AgendaView from "./calendar/AgendaView";
import CalendarToolbar from "./calendar/CalendarToolbar";
import CalendarEventModal from "./calendar/CalendarEventModal";
import { toDateStr } from "./dateUtils";
import { type CalEvent, type CalendarData, type SearchScope, type SortField, type SortDir, type TimeFormat, normalizeCalendar, filterEvents, sortEvents, allTagsIn, currentMonth, expandEvents, relatedEventIds } from "./calendar/model";
import { fetchCalendar } from "./calendar/calendarApi";
import { useModalStore } from "@/stores/modalStore";
import styles from "./calendar/Calendar.module.css";

export default function ReaderCalendar({ calendarId, data, language }: {
  calendarId?: string;
  data?: unknown;         // legacy inline
  language: string;
}) {
  const [cal, setCal] = useState<CalendarData | null>(calendarId ? null : normalizeCalendar(data));
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState<string>(calendarId ? "" : normalizeCalendar(data).month);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "deleted">(calendarId ? "loading" : "ready");
  const [view, setView] = useState<"month" | "week" | "day" | "timeline">(calendarId ? "month" : (normalizeCalendar(data).view ?? "month"));
  const [viewDate, setViewDate] = useState<string>(() => toDateStr(new Date()));
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [sortField, setSortField] = useState<SortField>("default");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activePriorities, setActivePriorities] = useState<Set<string>>(new Set());
  const [tfOverride, setTfOverride] = useState<TimeFormat | null>(null); // 뷰어가 직접 바꾸면 저장값 대신 사용
  const toggleFrom = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) =>
    setter((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const timelineRef = useRef<TimelineHandle>(null);
  const openModal = useModalStore((s) => s.openModal);
  const closeModal = useModalStore((s) => s.closeModal);

  useEffect(() => {
    if (!calendarId) return;
    let cancelled = false;
    fetchCalendar(calendarId).then((r) => {
      if (cancelled) return;
      if (r && "deleted" in r) { setStatus("deleted"); }
      else if (r) { setCal(r.data); setTitle(r.title); setMonth(r.data.month); setView(r.data.view ?? "month"); setStatus("ready"); }
      else setStatus("error");
    });
    return () => { cancelled = true; };
  }, [calendarId]);

  if (status === "loading") return <div className={styles.readerCalendar}><div className={styles.calStatus}>…</div></div>;
  if (status === "deleted") return (
    <div className={styles.readerCalendar}>
      <div className={styles.calDeleted}>
        <CalendarClock size={20} className={styles.calDeletedIcon} />
        <span>{language === "ko" ? "삭제된 달력 블록입니다." : "This calendar block was deleted."}</span>
      </div>
    </div>
  );
  if (status === "error" || !cal) return null;

  const timeFormat: TimeFormat = tfOverride ?? cal.timeFormat ?? "12h";
  const goToday = () => {
    if (view === "timeline") timelineRef.current?.scrollToToday();
    else if (view === "week" || view === "day") setViewDate(toDateStr(new Date()));
    else setMonth(currentMonth());
  };
  const todayBtn = (
    <>
      <Button variant="outline" size="sm" soundDisabled className={styles.ctrlBorderLight} onClick={goToday}>{language === "ko" ? "오늘" : "Today"}</Button>
      <Switch size="lg" showStateText stateLabels={{ on: "24h", off: "12h" }} checked={timeFormat === "24h"} onCheckedChange={(v) => setTfOverride(v ? "24h" : "12h")} />
    </>
  );
  const viewToggle = (
    <SegmentedControl<"month" | "week" | "day" | "timeline">
      variant="subtle"
      items={[
        { value: "month", label: language === "ko" ? "월" : "Month" },
        { value: "week", label: language === "ko" ? "주" : "Week" },
        { value: "day", label: language === "ko" ? "일" : "Day" },
        { value: "timeline", label: language === "ko" ? "타임라인" : "Timeline" },
      ]}
      value={view}
      onChange={setView}
      size="sm"
    />
  );

  const shown = sortEvents(filterEvents(expandEvents(cal.events), query, scope, activeLabels, activeTags, activePriorities), sortField, sortDir);
  const relatedIds = relatedEventIds(cal.events);
  // 이벤트 클릭 → 읽기전용 상세 모달 (편집 불가). 반복이면 마스터에서 deps/repeat, 표시값은 클릭한 회차(ev)
  const openView = (ev: CalEvent) => {
    if (!cal) return;
    const master = cal.events.find((e) => e.id === (ev.master ?? ev.id)) ?? ev;
    const modalId = `cal-view-${ev.id}`;
    openModal(
      <CalendarEventModal
        modalId={modalId}
        mode="edit"
        readOnly
        initial={{ date: ev.date, endDate: ev.endDate && ev.endDate > ev.date ? ev.endDate : null, status: ev.status || null, priority: ev.priority || null, title: ev.title, desc: ev.desc || "", time: ev.time || null, endTime: ev.endTime || null, labelId: ev.labelId || null, tags: ev.tags || [], deps: master.deps || [], repeat: master.repeat ?? null }}
        labels={cal.labels}
        tagSuggestions={[]}
        language={language}
        eventId={master.id}
        allEvents={cal.events}
        onOpenEvent={(id) => { closeModal(modalId); const target = shown.find((e) => e.id === id) ?? cal.events.find((e) => e.id === id); if (target) openView(target); }}
        recurring={null}
        timeFormat={timeFormat}
        onSubmit={() => {}}
      />,
      { id: modalId, header: { title: language === "ko" ? "이벤트" : "Event" }, width: "620px" },
    );
  };
  return (
    <div className={styles.readerCalendar}>
      {title.trim() && <div className={styles.calNameReader}>{title}</div>}
      <CalendarToolbar
        labels={cal.labels}
        tags={allTagsIn(cal.events)}
        language={language}
        query={query} onQuery={setQuery}
        scope={scope} onScope={setScope}
        activeLabels={activeLabels} onToggleLabel={toggleFrom(setActiveLabels)}
        activeTags={activeTags} onToggleTag={toggleFrom(setActiveTags)}
        activePriorities={activePriorities} onTogglePriority={toggleFrom(setActivePriorities)}
        sortField={sortField} onSortField={setSortField} sortDir={sortDir} onSortDir={setSortDir}
      />
      {view === "month" ? (
        <MonthCalendar month={month} events={shown} labels={cal.labels} language={language} readOnly onEventClick={openView} viewToggle={viewToggle} todayButton={todayBtn} onMonthChange={setMonth} relatedIds={relatedIds} timeFormat={timeFormat} />
      ) : view === "week" || view === "day" ? (
        <AgendaView mode={view} date={viewDate} events={shown} labels={cal.labels} language={language} readOnly onEventClick={openView} viewToggle={viewToggle} todayButton={todayBtn} onDateChange={setViewDate} relatedIds={relatedIds} timeFormat={timeFormat} />
      ) : (
        <TimelineView ref={timelineRef} events={shown} labels={cal.labels} language={language} readOnly onEventClick={openView} viewToggle={viewToggle} todayButton={todayBtn} />
      )}
    </div>
  );
}
