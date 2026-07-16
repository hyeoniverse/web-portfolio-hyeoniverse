"use client";

// ── 이벤트 달력 블록 (void, 연결형 공유) ──
// 달력 원본은 서버(calendars)에 저장, 블록은 calendarId 만 참조 → 여러 게시물이 공유.
// 셀 클릭 → 이벤트 추가, 칩 클릭 → 편집(모달). 편집 시 서버에 저장.

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorRef, PlateElement, type PlateElementProps } from "platejs/react";
import { CalendarClock, CalendarDays, Loader2, Maximize2, Minimize2, Upload, Download, ChevronLeft, ChevronRight, Keyboard, Check, PanelLeft, X } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { genShortId, parseDate, toDateStr, formatDateValue } from "./dateUtils";
import SegmentedControl from "@/components/ui/SegmentedControl";
import MonthCalendar from "./calendar/MonthCalendar";
import TimelineView, { type TimelineHandle } from "./calendar/TimelineView";
import AgendaView from "./calendar/AgendaView";
import RecurScopeDialog from "./calendar/RecurScopeDialog";
import CalendarToolbar from "./calendar/CalendarToolbar";
import CalendarEventModal, { type EventDraft, type RelationIntent, type RecurScope } from "./calendar/CalendarEventModal";
import CalendarDayModal from "./calendar/CalendarDayModal";
import CalendarEventList from "./calendar/CalendarEventList";
import CalendarChainModal from "./calendar/CalendarChainModal";
import { ModalFooterContext } from "@/components/ui/Modal";
import { AnimatePresence, motion } from "framer-motion";
import CalendarPickerModal from "./calendar/CalendarPickerModal";
import { fetchCalendar, saveCalendar, createCalendar, purgeCalendar } from "./calendar/calendarApi";
import { downloadCalendar, type ExportFormat } from "./calendar/calendarExport";
import Popover from "@/components/ui/Popover";
import Tooltip from "@/components/ui/Tooltip";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import {
  type CalEvent, type EventLabel, type CalendarData, type SearchScope, type SortField, type SortDir, type TimeFormat,
  normalizeCalendar, allTagsIn, defaultLabels, currentMonth, shiftMonth, filterEvents, sortEvents, eventEndDate, wouldCycle, expandEvents, relatedEventIds, enforceDepOrder,
} from "./calendar/model";
import { showToast } from "@/stores/toastStore";
import styles from "./calendar/Calendar.module.css";

/** 캘린더 제목 최대 글자수 — 상단 한 줄에 들어가도록 짧게 제한 */
const CAL_TITLE_MAX = 40;

export function CalendarElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const { language } = useLanguage();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const openModal = useModalStore((s) => s.openModal);
  const closeModal = useModalStore((s) => s.closeModal);
  // 참고: void(달력) 클릭 시 페이지가 블록 아래로 점프하던 문제는 window 가 아니라 에디터 내부
  // 스크롤 컨테이너(.editorContent, overflow-y:auto)가 Slate 기본 scrollSelectionIntoView 로
  // 움직인 것 → 근본 수정은 PlateEditor 의 <PlateContent scrollSelectionIntoView> 에서 void 선택 시 억제.

  const el = props.element as Record<string, unknown>;
  const calendarId = el.calendarId as string | undefined;

  // 서버 달력 데이터 + 상태
  const [cal, setCal] = useState<CalendarData | null>(null);
  // 달력 이름 — 불러오기 picker 에서 구분용. 서버 calendars.title 에 저장.
  const [title, setTitle] = useState("");
  const [titleFocused, setTitleFocused] = useState(false);
  const titleRef = useRef("");
  titleRef.current = title;
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "deleted">("loading");
  const [viewMonth, setViewMonth] = useState<string>(currentMonth());
  const calRef = useRef<CalendarData | null>(null);
  calRef.current = cal;
  const createdRef = useRef(false);
  // 이 블록이 새로 만든 달력 id (아직 이벤트 없는 임시 달력이면 전환 시 자동삭제)
  const ownCreatedIdRef = useRef<string | null>(null);

  // 뷰 모드 (월 그리드 / 타임라인)
  const [view, setView] = useState<"month" | "week" | "day" | "timeline">("month");
  const [viewDate, setViewDate] = useState<string>(() => toDateStr(new Date()));
  const [focusEventId, setFocusEventId] = useState<string | null>(null); // 사이드바→이동 시 월뷰 chip 펄스 강조 (다음 인터랙션까지)
  // 필터/검색/정렬
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [sortField, setSortField] = useState<SortField>("default");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activePriorities, setActivePriorities] = useState<Set<string>>(new Set());
  const toggleFrom = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) =>
    setter((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleLabelFilter = toggleFrom(setActiveLabels);
  const toggleTagFilter = toggleFrom(setActiveTags);
  const togglePriorityFilter = toggleFrom(setActivePriorities);

  // 전체화면
  const [fullscreen, setFullscreen] = useState(false);
  // 이벤트 목록 사이드바 (왼쪽, 기본 닫힘)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 전체화면 peek 패널 — 날짜/연결작업 상세를 모달(가림) 대신 우측 인라인 패널로 (전체화면일 때만).
  // 달력 그리드 맥락을 유지한 채 상세 확인 (Google Calendar / Notion side-peek 패턴).
  const [peek, setPeek] = useState<{ node: React.ReactNode; title: string; icon?: React.ReactNode } | null>(null);
  const [peekFooterEl, setPeekFooterEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (peek) setPeek(null);       // peek 먼저 닫고
      else setFullscreen(false);     // 없으면 전체화면 종료
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen, peek]);

  // 노드(참조/레이아웃) 갱신 — stale path 방지
  const elementRef = useRef(props.element);
  elementRef.current = props.element;
  const updateNode = (patch: Record<string, unknown>) => {
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { editor.tf.setNodes(patch, { at: p }); } catch { /* noop */ }
  };

  // 마운트 시 로드 — calendarId 있으면 fetch, 없으면 새로 생성(legacy inline 데이터 seed)
  //  StrictMode(dev)에서 effect 가 2회 실행돼도 create 는 1회만, 완료 상태는 반드시 반영.
  //  실패 시 최대 3회 재시도 후 에러 표시(무한 로딩 방지).
  useEffect(() => {
    let alive = true;
    const retry = async <T,>(fn: () => Promise<T | null>, tries = 3): Promise<T | null> => {
      for (let i = 0; i < tries; i++) {
        const r = await fn();
        if (r) return r;
        if (i < tries - 1) await new Promise((res) => setTimeout(res, 400 * (i + 1)));
      }
      return null;
    };
    (async () => {
      setStatus("loading");
      if (calendarId) {
        const r = await retry(() => fetchCalendar(calendarId));
        if (!alive) return;
        if (r && "deleted" in r) { setStatus("deleted"); }        // 원본 달력이 휴지통 → 연결 끊김
        else if (r) { setCal(r.data); setTitle(r.title); setViewMonth(r.data.month); setView(r.data.view ?? "month"); setStatus("ready"); }
        else setStatus("error");
      } else {
        if (createdRef.current) return; // 이 인스턴스에서 이미 생성 중/완료
        createdRef.current = true;
        const seed = normalizeCalendar(el); // legacy inline 데이터 있으면 승계
        const seedData: CalendarData = {
          month: seed.month,
          events: seed.events,
          labels: seed.labels.length ? seed.labels : defaultLabels(),
        };
        const autoTitle = new Date().toLocaleString(language === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" });
        const id = await retry(() => createCalendar(seedData, autoTitle));
        if (id) {
          // 생성 성공은 cancelled 여부와 무관하게 반영 (StrictMode remount 시에도 안전)
          ownCreatedIdRef.current = id; // 이 블록이 만든 임시 달력 (이벤트 추가 전 전환 시 삭제)
          setCal(seedData); setTitle(autoTitle); setViewMonth(seedData.month); setStatus("ready");
          updateNode({ calendarId: id });
        } else {
          createdRef.current = false; // 실패 → 다음 마운트에서 재시도 허용
          if (alive) setStatus("error");
        }
      }
    })();
    return () => { alive = false; };
  }, [calendarId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 다른 탭(달력 관리)에서 이 달력을 휴지통으로 옮기거나 복구하면, 편집 탭으로 돌아올 때(focus/visibility)
  // 재확인해 연결 끊김/복구를 즉시 반영 — 새로고침 없이. (ready 상태의 로컬 편집은 건드리지 않고 삭제/복구 전환만)
  useEffect(() => {
    if (!calendarId || (status !== "ready" && status !== "deleted")) return;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await fetchCalendar(calendarId);
      if (!r) return;
      if ("deleted" in r) {
        if (status !== "deleted") setStatus("deleted");            // 휴지통 이동 → 연결 끊김
      } else if (status === "deleted") {
        setCal(r.data); setTitle(r.title); setViewMonth(r.data.month); setView(r.data.view ?? "month"); setStatus("ready"); // 복구됨 → 다시 로드
      }
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [status, calendarId]);

  // 저장 상태 표시 (저장 중 / 저장됨)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trackSave = (p: Promise<boolean>) => {
    setSaveState("saving");
    p.then((ok) => {
      setSaveState(ok ? "saved" : "idle");
      if (ok) { clearTimeout(savedTimerRef.current); savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1800); }
    }).catch(() => setSaveState("idle"));
  };

  // 변경분을 서버에 저장 (연결형 → 모든 임베드에 반영)
  const persist = (next: CalendarData) => {
    setCal(next);
    if (calendarId) trackSave(saveCalendar(calendarId, next));
  };
  // 시각 표기(12h/24h) — 기본 12h, 달력 데이터에 저장
  const timeFormat: TimeFormat = cal?.timeFormat ?? "12h";
  const toggleTimeFormat = () => { const cur = calRef.current; if (cur) persist({ ...cur, timeFormat: timeFormat === "12h" ? "24h" : "12h" }); };
  // 뷰 모드(월/주/일/타임라인) — 달력 데이터에 저장해 편집기·리더가 마지막 뷰로 열림
  const changeView = (v: "month" | "week" | "day" | "timeline") => {
    setView(v);
    const cur = calRef.current;
    if (cur && cur.view !== v) persist({ ...cur, view: v });
  };

  // 달력 이름 저장 — 값이 실제로 바뀐 경우에만 서버 반영 (blur/enter)
  const savedTitleRef = useRef("");
  const commitTitle = () => {
    const cur = calRef.current;
    const next = titleRef.current.trim();
    if (!calendarId || !cur || next === savedTitleRef.current) return;
    savedTitleRef.current = next;
    if (next !== titleRef.current) setTitle(next);
    trackSave(saveCalendar(calendarId, cur, next));
  };
  // 로드 시 savedTitleRef 동기화 (불러오기로 title 바뀌면 재저장 안 하게)
  useEffect(() => { savedTitleRef.current = title; }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const elPath = (() => { try { const pp = editor.api.findPath(props.element); return pp ? Array.from(pp) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  // 월 이동은 로컬 view (공유 원본의 default month 는 건드리지 않음)
  const changeMonth = (m: string) => setViewMonth(m);

  // ── 이벤트 저장/삭제 ── (날짜는 draft.date 로 모달에서 선택)
  // 날짜 문자열에 일수 가감 / 두 날짜 간 일수 차
  const addDays = (iso: string, n: number) => { const d = parseDate(iso); if (!d) return iso; d.setDate(d.getDate() + n); return toDateStr(d); };
  const dayDelta = (from: string, to: string) => { const a = parseDate(from), b = parseDate(to); return a && b ? Math.round((b.getTime() - a.getTime()) / 86400000) : 0; };
  // draft → CalEvent (id·반복 유지 여부 지정)
  const buildEvent = (evId: string, d: EventDraft, keepRepeat: boolean): CalEvent => ({
    id: evId, date: d.date, title: d.title,
    ...(d.endDate && d.endDate > d.date ? { endDate: d.endDate } : {}),
    ...(d.status ? { status: d.status as CalEvent["status"] } : {}),
    ...(d.priority ? { priority: d.priority as CalEvent["priority"] } : {}),
    ...(d.desc ? { desc: d.desc } : {}),
    ...(d.time ? { time: d.time } : {}),
    ...(d.time && d.endTime ? { endTime: d.endTime } : {}),
    ...(d.labelId ? { labelId: d.labelId } : {}),
    ...(d.tags.length ? { tags: d.tags } : {}),
    ...(d.deps.length ? { deps: d.deps } : {}),
    ...(keepRepeat && d.repeat ? { repeat: d.repeat } : {}),
  });
  // 후속 작업 반영 — successorIds 에 든 이벤트는 deps 에 id 를 갖고, 빠진 이벤트는 제거
  const reconcileSuccessors = (events: CalEvent[], id: string, relations: RelationIntent): CalEvent[] => {
    const succSet = new Set(relations.successorIds);
    return events.map((e) => {
      if (e.id === id) return e;
      const hasDep = (e.deps || []).includes(id);
      const shouldHave = succSet.has(e.id);
      if (hasDep === shouldHave) return e;
      const nextDeps = shouldHave ? [...(e.deps || []), id] : (e.deps || []).filter((d) => d !== id);
      if (nextDeps.length) return { ...e, deps: nextDeps };
      const { deps: _drop, ...rest } = e;
      return rest as CalEvent;
    });
  };
  const exceptionId = (masterId: string, occDate: string) => `${masterId}~${occDate}`;
  const commit = (
    mode: "add" | "edit", id: string, draft: EventDraft, labels: EventLabel[], relations: RelationIntent,
    scope: RecurScope = "single", recurCtx?: { masterId: string; occurrenceDate: string } | null,
  ) => {
    const cur = calRef.current;
    if (!cur) return;

    // 반복 회차 "이 일정만" — 원본 회차를 exdates 로 제외하고 독립 이벤트(반복 없음)로 분리
    if (scope === "this" && recurCtx) {
      const master = cur.events.find((e) => e.id === recurCtx.masterId);
      if (!master) return;
      const exId = exceptionId(recurCtx.masterId, recurCtx.occurrenceDate);
      const standalone = buildEvent(exId, draft, false);
      const exdates = [...new Set([...(master.exdates || []), recurCtx.occurrenceDate])];
      let events = cur.events.map((e) => (e.id === master.id ? { ...master, exdates } : e));
      events = events.some((e) => e.id === exId) ? events.map((e) => (e.id === exId ? standalone : e)) : [...events, standalone];
      events = reconcileSuccessors(events, exId, relations);
      persist({ ...cur, events, labels });
      return;
    }

    // 반복 시리즈 전체 — 마스터에 적용(반복 유지). 날짜 변경분은 시리즈 시작일에 반영해 통째 이동
    if (scope === "all" && recurCtx) {
      const master = cur.events.find((e) => e.id === recurCtx.masterId);
      if (!master) return;
      const delta = dayDelta(recurCtx.occurrenceDate, draft.date);
      const span = draft.endDate && draft.endDate > draft.date ? dayDelta(draft.date, draft.endDate) : 0;
      const newBase = addDays(master.date, delta);
      const shifted: EventDraft = { ...draft, date: newBase, endDate: span > 0 ? addDays(newBase, span) : null };
      const next: CalEvent = { ...buildEvent(master.id, shifted, true), ...(master.exdates ? { exdates: master.exdates } : {}), ...(master.order != null ? { order: master.order } : {}) };
      let events = cur.events.map((e) => (e.id === master.id ? next : e));
      events = reconcileSuccessors(events, master.id, relations);
      persist({ ...cur, events, labels });
      return;
    }

    // 반복 아님 (기존 로직) — 편집 시 세로 순서(order) 보존
    const existing = mode === "edit" ? cur.events.find((e) => e.id === id) : undefined;
    const next = { ...buildEvent(id, draft, true), ...(existing?.order != null ? { order: existing.order } : {}) };
    let events = mode === "edit" ? cur.events.map((e) => (e.id === id ? next : e)) : [...cur.events, next];
    events = reconcileSuccessors(events, id, relations);
    persist({ ...cur, events, labels });
  };
  const removeEvent = (id: string, scope: RecurScope = "single", recurCtx?: { masterId: string; occurrenceDate: string } | null) => {
    const cur = calRef.current;
    if (!cur) return;
    // 반복 회차 "이 일정만" 삭제 → exdates 로 제외 (있을 수 있는 예외 독립 이벤트도 함께 제거)
    if (scope === "this" && recurCtx) {
      const exId = exceptionId(recurCtx.masterId, recurCtx.occurrenceDate);
      const events = cur.events
        .filter((e) => e.id !== exId)
        .map((e) => (e.id === recurCtx.masterId
          ? { ...e, exdates: [...new Set([...(e.exdates || []), recurCtx.occurrenceDate])] }
          : e));
      persist({ ...cur, events });
      return;
    }
    // 삭제 이벤트를 다른 이벤트의 선행(deps)에서도 제거 (dangling 방지)
    const events = cur.events.filter((e) => e.id !== id).map((e) => {
      if (!(e.deps || []).includes(id)) return e;
      const nextDeps = (e.deps || []).filter((d) => d !== id);
      if (nextDeps.length) return { ...e, deps: nextDeps };
      const { deps: _drop, ...rest } = e;
      return rest as CalEvent;
    });
    persist({ ...cur, events });
  };
  // 일 뷰 인라인 패널 — 실제 이벤트에 부분 패치(제목/라벨/상태/중요도/태그). 가상 반복 회차는 무시.
  const patchEvent = (id: string, patch: Partial<CalEvent>) => {
    const cur = calRef.current;
    if (!cur || !cur.events.some((e) => e.id === id)) return;
    const events = cur.events.map((e) => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch } as CalEvent;
      if (!next.title) next.title = "";
      if (!next.labelId) delete next.labelId;
      if (!next.status) delete next.status;
      if (!next.priority) delete next.priority;
      if (!next.tags || next.tags.length === 0) delete next.tags;
      return next;
    });
    persist({ ...cur, events });
  };
  // 일 뷰 인라인 패널 삭제 — 반복 회차/마스터/일반 구분
  const deleteEventInline = (ev: CalEvent) => {
    if (ev.master) removeEvent(ev.id, "this", { masterId: ev.master, occurrenceDate: ev.date });
    else removeEvent(ev.id);
  };
  // 드래그앤드롭 — 잡은 날(fromDate)이 놓은 날(toDate)로 오도록 전체 이벤트를 같은 일수만큼 이동(기간 유지)
  const moveEvent = (id: string, fromDate: string, toDate: string) => {
    if (fromDate === toDate) return;
    const cur = calRef.current;
    const from = parseDate(fromDate), to = parseDate(toDate);
    if (!cur || !from || !to) return;
    if (cur.events.find((e) => e.id === id)?.repeat) return; // 반복 이벤트는 드래그 이동 비활성(시리즈 편집으로)
    const days = Math.round((to.getTime() - from.getTime()) / 86400000);
    if (!days) return;
    const shift = (iso: string) => { const d = parseDate(iso); if (!d) return iso; d.setDate(d.getDate() + days); return toDateStr(d); };
    let events = cur.events.map((e) => (e.id === id ? { ...e, date: shift(e.date), ...(e.endDate ? { endDate: shift(e.endDate) } : {}) } : e));
    // 선후 규칙 위반 시 위반 이벤트만 가장 가까운 유효 위치로 자동 이동 (뒤로 이동=후속 밀기, 앞으로=선행 당기기)
    events = enforceDepOrder(events, days > 0 ? "forward" : "backward");
    persist({ ...cur, events });
  };
  // 일 시간축에서 이벤트 시간(시작/종료) 직접 변경 — 드래그 이동/리사이즈
  const changeEventTime = (ev: CalEvent, time: string, endTime: string | null) => {
    const cur = calRef.current;
    if (!cur) return;
    const masterId = ev.master ?? ev.id;
    const master = cur.events.find((e) => e.id === masterId);
    // 반복(회차)이면 적용 범위 확인 다이얼로그, 아니면 바로 반영
    if (ev.master || master?.repeat) { askTimeScope(ev, time, endTime); return; }
    const events = cur.events.map((e) => {
      if (e.id !== ev.id) return e;
      const { endTime: _drop, ...rest } = e;
      return { ...rest, time, ...(endTime && endTime > time ? { endTime } : {}) };
    });
    persist({ ...cur, events });
  };
  // 반복 회차 시간 변경 — "이 일정만"(exdates + 독립 이벤트로 분리) / "전체"(마스터 시각 변경)
  const applyTimeScope = (ev: CalEvent, time: string, endTime: string | null, scope: "this" | "all") => {
    const cur = calRef.current;
    if (!cur) return;
    const masterId = ev.master ?? ev.id;
    const master = cur.events.find((e) => e.id === masterId);
    if (!master) return;
    if (scope === "this") {
      const exId = exceptionId(masterId, ev.date);
      const { master: _m, repeat: _r, exdates: _ex, endTime: _et, ...base } = ev;
      const standalone = { ...base, id: exId, time, ...(endTime && endTime > time ? { endTime } : {}) } as CalEvent;
      const exdates = [...new Set([...(master.exdates || []), ev.date])];
      let events = cur.events.map((e) => (e.id === masterId ? { ...master, exdates } : e));
      events = events.some((e) => e.id === exId) ? events.map((e) => (e.id === exId ? standalone : e)) : [...events, standalone];
      persist({ ...cur, events });
    } else {
      const { endTime: _drop, ...rest } = master;
      const next = { ...rest, time, ...(endTime && endTime > time ? { endTime } : {}) } as CalEvent;
      persist({ ...cur, events: cur.events.map((e) => (e.id === masterId ? next : e)) });
    }
  };
  const askTimeScope = (ev: CalEvent, time: string, endTime: string | null) => {
    const id = "cal-time-scope";
    openModal(
      <RecurScopeDialog
        language={language}
        message={t("반복 일정의 시간을 변경합니다. 어디에 적용할까요?", "Change the time of a recurring event. Where should it apply?")}
        onCancel={() => closeModal(id)}
        onConfirm={(scope) => { closeModal(id); applyTimeScope(ev, time, endTime, scope); }}
      />,
      { id, header: { title: t("적용 범위", "Apply to"), icon: <CalendarClock size={16} /> }, width: "360px" },
    );
  };
  // 타임라인 노드 드래그 연결 — fromId(선행)를 toId(후속)의 deps 에 추가. 순환/중복 방지.
  const linkEvents = (fromId: string, toId: string) => {
    const cur = calRef.current;
    if (!cur) return;
    // 반복 회차는 가상 id(`마스터id#날짜`) — 마스터로 해석해 피드백/차단 (그냥 두면 조용히 무시됨)
    const toMaster = (id: string) => (id.includes("#") ? id.slice(0, id.indexOf("#")) : id);
    const fId = toMaster(fromId), tId = toMaster(toId);
    // 같은 반복 마스터의 회차끼리(또는 회차↔마스터) — 연결 대상 아님. up 은 서로 다른 바일 때만 호출하므로 곧 반복 연결 시도.
    if (fId === tId) { showToast(t("반복으로 생성된 이벤트는 연결할 수 없습니다.", "Recurring events can't be linked."), "warning"); return; }
    const pred = cur.events.find((e) => e.id === fId);   // 선행
    const target = cur.events.find((e) => e.id === tId);  // 후속
    if (!pred || !target || (target.deps || []).includes(fId)) return;
    if (pred.repeat || target.repeat) { showToast(t("반복으로 생성된 이벤트는 연결할 수 없습니다.", "Recurring events can't be linked."), "warning"); return; }
    if (wouldCycle(tId, fId, cur.events)) {
      showToast(t("순환 관계는 만들 수 없습니다.", "That would create a cycle."), "warning");
      return;
    }
    let events = cur.events.map((e) => (e.id === tId ? { ...e, deps: [...(e.deps || []), fId] } : e));
    // 규칙(선행≤후속) 위반이면 차단 대신 후속(+downstream)을 선행 이후로 자동 이동
    events = enforceDepOrder(events, "forward");
    persist({ ...cur, events });
  };
  // 타임라인 포트(노드 dot) 클릭 — side "start": 이 이벤트의 선행 연결 전부 해제, "end": 후속 연결 전부 해제
  const stripDeps = (e: CalEvent, remove: (id: string) => boolean): CalEvent => {
    const nextDeps = (e.deps || []).filter((d) => !remove(d));
    if (nextDeps.length === (e.deps || []).length) return e;
    if (nextDeps.length) return { ...e, deps: nextDeps };
    const { deps: _drop, ...rest } = e;
    return rest as CalEvent;
  };
  const unlinkPort = (eventId: string, side: "start" | "end") => {
    const cur = calRef.current;
    if (!cur) return;
    const events = side === "start"
      ? cur.events.map((e) => (e.id === eventId ? stripDeps(e, () => true) : e))         // 이 이벤트의 모든 선행 제거
      : cur.events.map((e) => stripDeps(e, (d) => d === eventId));                        // 이 이벤트를 선행으로 가진 후속들에서 제거
    persist({ ...cur, events });
  };
  // 화살표 클릭 — 연결된 체인 이벤트를 순서대로 모달로
  const openChainModal = (relatedIds: string[]) => {
    const cur = calRef.current;
    if (!cur) return;
    const chain = cur.events.filter((e) => relatedIds.includes(e.id));
    if (chain.length < 2) return;
    const modalId = "cal-chain";
    const title = t("연결된 작업", "Connected tasks");
    const node = (
      <CalendarChainModal
        events={chain}
        labels={cur.labels}
        language={language}
        timeFormat={timeFormat}
        onOpenEvent={(eid) => { if (!fullscreen) closeModal(modalId); openEdit(cur.events.find((e) => e.id === eid) ?? chain[0]); }}
      />
    );
    if (fullscreen) { setPeek({ node, title, icon: <CalendarClock size={16} /> }); return; }
    openModal(node, { id: modalId, header: { title, icon: <CalendarClock size={16} /> }, width: "420px" });
  };
  // 타임라인 세로 DnD 재정렬 — 새 순서(위→아래 id)를 order 로 저장
  // 타임라인 자유 레인 배치 — 그룹키(=저장 이벤트 id) → 행 인덱스. 지정된 그룹만 order 갱신(빈 행 gap 허용).
  const reorderEvent = (rowByGroup: Record<string, number>) => {
    const cur = calRef.current;
    if (!cur) return;
    const events = cur.events.map((e) => (e.id in rowByGroup ? { ...e, order: rowByGroup[e.id] } : e));
    persist({ ...cur, events });
  };
  // 타임라인 바 양끝 리사이즈 — 시작일/종료일(기간) 직접 설정
  const resizeEvent = (id: string, date: string, endDate: string | null) => {
    const cur = calRef.current;
    if (!cur) return;
    const self0 = cur.events.find((e) => e.id === id);
    if (self0?.repeat) return; // 반복은 리사이즈 비활성
    const movedEarlier = self0 ? date < self0.date : false;
    let events = cur.events.map((e) => {
      if (e.id !== id) return e;
      const { endDate: _drop, ...rest } = e;
      return endDate && endDate > date ? { ...rest, date, endDate } : { ...rest, date };
    });
    // 시작일 변경으로 선후 규칙 위반 시 위반 이벤트만 자동 이동
    events = enforceDepOrder(events, movedEarlier ? "backward" : "forward");
    persist({ ...cur, events });
  };

  // 날짜 클릭 → 그날 모든 일정 상세 모달 (월/타임라인 공용). 기간 이벤트는 범위에 포함.
  const openDayModal = (date: string) => {
    const cur = calRef.current;
    if (!cur) return;
    const dayEvents = expandEvents(cur.events).filter((ev) => ev.date <= date && eventEndDate(ev) >= date);
    const modalId = `cal-day-${date}`;
    const title = formatDateValue(date, null, language);
    const node = (
      <CalendarDayModal
        modalId={modalId}
        date={date}
        events={dayEvents}
        labels={cur.labels}
        language={language}
        timeFormat={timeFormat}
        onOpenEvent={openEdit}
        onAdd={openAdd}
        onClose={fullscreen ? () => setPeek(null) : undefined}
      />
    );
    if (fullscreen) { setPeek({ node, title, icon: <CalendarDays size={16} /> }); return; }
    openModal(node, { id: modalId, header: { title, icon: <CalendarDays size={16} /> }, width: "460px" });
  };

  const openAdd = (date: string, time?: string, endTime?: string) => {
    const cur = calRef.current;
    if (!cur) return;
    const id = genShortId();
    const labelsForModal = cur.labels.length ? cur.labels : defaultLabels();
    openModal(
      <CalendarEventModal
        modalId={`cal-add-${id}`}
        mode="add"
        initial={{ date, endDate: null, status: null, priority: null, title: "", desc: "", time: time ?? null, endTime: endTime ?? null, labelId: labelsForModal[0]?.id ?? null, tags: [], deps: [], repeat: null }}
        labels={labelsForModal}
        tagSuggestions={allTagsIn(cur.events)}
        language={language}
        eventId={id}
        allEvents={cur.events}
        onOpenEvent={navPush}
        timeFormat={timeFormat}
        onSubmit={(draft, labels, relations) => commit("add", id, draft, labels, relations)}
      />,
      { id: `cal-add-${id}`, header: { title: t("이벤트 추가", "Add event") }, width: "620px" },
    );
  };
  // ── 이벤트 상세 모달 + 멘션/관계 네비게이션(뒤로/앞으로) ──
  const navRef = useRef<{ back: string[]; forward: string[]; current: string | null }>({ back: [], forward: [], current: null });
  const renderEventModal = (ev: CalEvent, occurrenceDate?: string) => {
    const cur = calRef.current;
    if (!cur) return;
    const nav = navRef.current;
    const modalId = `cal-event-${ev.id}`;
    // ev 는 마스터. 반복이면 클릭한 회차(occurrenceDate) 기준으로 표시 — 날짜/종료일을 회차로 시프트
    const recurring = ev.repeat ? { masterId: ev.id, occurrenceDate: occurrenceDate ?? ev.date } : null;
    const dispDate = recurring ? recurring.occurrenceDate : ev.date;
    const dispEnd = ev.endDate && ev.endDate > ev.date
      ? addDays(dispDate, dayDelta(ev.date, ev.endDate))
      : null;
    openModal(
      <CalendarEventModal
        modalId={modalId}
        mode="edit"
        initial={{ date: dispDate, endDate: dispEnd, status: ev.status || null, priority: ev.priority || null, title: ev.title, desc: ev.desc || "", time: ev.time || null, endTime: ev.endTime || null, labelId: ev.labelId || null, tags: ev.tags || [], deps: ev.deps || [], repeat: ev.repeat ?? null }}
        labels={cur.labels.length ? cur.labels : defaultLabels()}
        tagSuggestions={allTagsIn(cur.events)}
        language={language}
        eventId={ev.id}
        allEvents={cur.events}
        onOpenEvent={navPush}
        recurring={recurring}
        timeFormat={timeFormat}
        onSubmit={(draft, labels, relations, scope) => commit("edit", ev.id, draft, labels, relations, scope, recurring)}
        onDelete={(scope) => removeEvent(ev.id, scope, recurring)}
      />,
      {
        id: modalId,
        header: { title: t("이벤트", "Event") },
        subButtons: (
          <span className={styles.navBtns}>
            <Tooltip content={t("뒤로", "Back")} placement="bottom">
              <button type="button" className={styles.navBtn} disabled={nav.back.length === 0} onClick={navBack} aria-label={t("뒤로", "Back")}><ChevronLeft size={15} /></button>
            </Tooltip>
            <Tooltip content={t("앞으로", "Forward")} placement="bottom">
              <button type="button" className={styles.navBtn} disabled={nav.forward.length === 0} onClick={navForward} aria-label={t("앞으로", "Forward")}><ChevronRight size={15} /></button>
            </Tooltip>
          </span>
        ),
        width: "620px",
      },
    );
  };
  // 셀/바 클릭 = 새 진입 → 히스토리 리셋. 반복 가상 occurrence 는 마스터로 해석하되, 클릭한 회차(날짜)를 넘겨 "이 일정만/전체" 선택 가능케.
  const openEdit = (ev: CalEvent) => {
    const real = calRef.current?.events.find((e) => e.id === (ev.master ?? ev.id)) ?? ev;
    navRef.current = { back: [], forward: [], current: real.id };
    renderEventModal(real, real.repeat ? ev.date : undefined);
  };
  // 멘션/관계 클릭 = 앞으로 이동(현재를 back 에 push, forward 비움)
  const navPush = (id: string) => {
    const target = calRef.current?.events.find((e) => e.id === id);
    if (!target) return;
    const nav = navRef.current;
    if (nav.current && nav.current !== id) { nav.back.push(nav.current); closeModal(`cal-event-${nav.current}`); }
    nav.forward = [];
    nav.current = id;
    renderEventModal(target);
  };
  const navBack = () => {
    const nav = navRef.current;
    const prev = nav.back.pop();
    if (!prev) return;
    const target = calRef.current?.events.find((e) => e.id === prev);
    if (nav.current) { nav.forward.push(nav.current); closeModal(`cal-event-${nav.current}`); }
    nav.current = prev;
    if (target) renderEventModal(target);
  };
  const navForward = () => {
    const nav = navRef.current;
    const nxt = nav.forward.pop();
    if (!nxt) return;
    const target = calRef.current?.events.find((e) => e.id === nxt);
    if (nav.current) { nav.back.push(nav.current); closeModal(`cal-event-${nav.current}`); }
    nav.current = nxt;
    if (target) renderEventModal(target);
  };

  // 이 블록이 만든 임시 달력이 아직 비어있으면(이벤트 0개) 다른 달력으로 전환 시 영구삭제.
  // (한 번도 안 쓴 임시본이라 휴지통 대신 hard purge — 빈 임시 달력이 휴지통에 쌓이지 않게)
  const cleanupOwnEmpty = () => {
    const own = ownCreatedIdRef.current;
    if (own && own === calendarId && calRef.current && calRef.current.events.length === 0) {
      purgeCalendar(own);
    }
    ownCreatedIdRef.current = null;
  };

  // 달력 전환/재연결 시 즉시 로드 — updateNode(노드 속성 변경)만으론 void 엘리먼트가
  // 재렌더/재fetch 안 되는 경우가 있어(특히 deleted 상태) 화면이 새로고침 전까지 안 바뀜.
  // 마운트 effect 에 의존하지 않고 여기서 직접 상태를 갱신한다.
  const loadCalendarNow = async (id: string) => {
    setStatus("loading");
    const r = await fetchCalendar(id);
    if (r && "deleted" in r) setStatus("deleted");
    else if (r) { setCal(r.data); setTitle(r.title); setViewMonth(r.data.month); setView(r.data.view ?? "month"); setStatus("ready"); }
    else setStatus("error");
  };

  // ── 다른 공유 달력 불러오기 / 새로 만들기 ──
  const openPicker = () => {
    openModal(
      <CalendarPickerModal
        modalId="cal-picker"
        currentId={calendarId}
        language={language}
        onPick={(id) => {
          if (id === calendarId) return;
          cleanupOwnEmpty();
          createdRef.current = true; // 불러온 달력은 이 블록이 만든 게 아님
          updateNode({ calendarId: id });
          loadCalendarNow(id);       // 노드 변경만으론 재렌더 안 될 수 있어 즉시 로드
        }}
        onRestore={(id) => {
          // 휴지통에서 복구 → 이 블록에 연결(deleted 상태의 같은 달력을 복구하는 경우 id 가 같아도 재연결)
          cleanupOwnEmpty();
          createdRef.current = true;
          updateNode({ calendarId: id });
          loadCalendarNow(id);
        }}
        onCreateNew={async () => {
          cleanupOwnEmpty();
          const seedData: CalendarData = { month: currentMonth(), events: [], labels: defaultLabels() };
          const autoTitle = new Date().toLocaleString(language === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" });
          const id = await createCalendar(seedData, autoTitle);
          if (id) {
            ownCreatedIdRef.current = id; createdRef.current = true;
            updateNode({ calendarId: id });
            // 생성한 데이터는 이미 알고 있으니 바로 반영 (fetch 불필요)
            setCal(seedData); setTitle(autoTitle); setViewMonth(seedData.month); setStatus("ready");
          }
        }}
        onManage={() => { window.open("/admin/settings?tab=content&sub=calendars", "_blank", "noopener"); }}
      />,
      { id: "cal-picker", header: { title: t("달력 불러오기", "Load calendar") }, width: "460px" },
    );
  };

  const timelineRef = useRef<TimelineHandle>(null);
  const goToday = () => {
    if (view === "timeline") timelineRef.current?.scrollToToday();
    else if (view === "week" || view === "day") setViewDate(toDateStr(new Date()));
    else setViewMonth(currentMonth());
  };
  // 사이드바에서 이벤트 클릭 → 상세 모달 대신 현재 뷰를 그 이벤트 위치로 이동 (모달은 뷰의 chip/bar 로 여전히 열림)
  const goToEvent = (ev: CalEvent) => {
    if (view === "month") { setViewMonth(ev.date.slice(0, 7)); setFocusEventId(ev.id); }
    else if (view === "week" || view === "day") setViewDate(ev.date);
    else timelineRef.current?.scrollToEvent(ev.id, ev.date);
  };
  // 월뷰 focus 강조 — 다음 사용자 인터랙션 전까지 펄스 (타임라인과 동일 컨셉)
  useEffect(() => {
    if (!focusEventId) return;
    const clear = () => setFocusEventId(null);
    const tid = window.setTimeout(() => {
      window.addEventListener("pointerdown", clear, true);
      window.addEventListener("wheel", clear, { capture: true, passive: true });
      window.addEventListener("keydown", clear, true);
    }, 450);
    return () => {
      window.clearTimeout(tid);
      window.removeEventListener("pointerdown", clear, true);
      window.removeEventListener("wheel", clear, true);
      window.removeEventListener("keydown", clear, true);
    };
  }, [focusEventId]);
  // ── 키보드 단축키 (블록 hover 시 · 입력창/모달 중엔 무시) ──
  const calBodyRef = useRef<HTMLDivElement>(null);
  const modalOpen = useModalStore((s) => s.isModalOpen);
  const shiftViewDate = (n: number) => { const d = parseDate(viewDate); if (d) { d.setDate(d.getDate() + n); setViewDate(toDateStr(d)); } };
  const navPrev = () => { if (view === "month") setViewMonth(shiftMonth(viewMonth, -1)); else if (view === "week") shiftViewDate(-7); else if (view === "day") shiftViewDate(-1); };
  const navNext = () => { if (view === "month") setViewMonth(shiftMonth(viewMonth, 1)); else if (view === "week") shiftViewDate(7); else if (view === "day") shiftViewDate(1); };
  const shortcutRef = useRef<(e: KeyboardEvent) => void>(() => {});
  shortcutRef.current = (e: KeyboardEvent) => {
    // 캘린더 블록 위에 실제로 hover 중일 때만 (onMouseEnter ref 대신 브라우저 :hover 상태 — Plate void 에서도 정확)
    if (modalOpen || e.metaKey || e.ctrlKey || e.altKey || !calBodyRef.current?.matches(":hover")) return;
    const el = e.target as HTMLElement | null;
    // 캘린더 블록 "내부"의 편집 필드(제목·검색 등)에 포커스일 때만 무시 —
    // 바깥 Plate 에디터(contentEditable)에 포커스여도 블록 hover 중이면 단축키 동작
    if (el && calBodyRef.current?.contains(el) && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
    // e.key 는 한글 IME 조합 시 "m" 이 아니라 조합문자/"Process" 가 됨(→ 화살표만 되고 글자는 안 되던 원인).
    // 물리 키(e.code, KeyM 등)로 매핑하면 IME/언어와 무관하게 동작.
    const codeMap: Record<string, () => void> = {
      KeyT: goToday, ArrowLeft: navPrev, ArrowRight: navNext,
      KeyM: () => changeView("month"), KeyW: () => changeView("week"), KeyD: () => changeView("day"), KeyL: () => changeView("timeline"),
      KeyN: () => openAdd(view === "month" ? toDateStr(new Date()) : viewDate),
    };
    const fn = codeMap[e.code];
    if (fn) { e.preventDefault(); e.stopPropagation(); fn(); }
  };
  useEffect(() => {
    // capture 단계 — Plate/Slate 가 bubble 에서 keydown 을 소비해도 먼저 잡음. 매치 시 stopPropagation 으로 에디터 입력 차단.
    const h = (e: KeyboardEvent) => shortcutRef.current(e);
    document.addEventListener("keydown", h, true);
    return () => document.removeEventListener("keydown", h, true);
  }, []);
  // 비포커스 요소(day cell·의존성 화살표 등) 클릭 시 Slate 가 void 를 선택하며 생기는 caret/블록선택 링
  // 방지. (페이지 스크롤 점프 자체는 PlateContent 의 scrollSelectionIntoView 에서 근본 처리.)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !calBodyRef.current?.contains(target)) return; // 캘린더 블록 밖은 무시
      if (target.closest('input, textarea, select, button, a[href], [tabindex], [contenteditable="true"]')) return; // 자체 컨트롤은 정상 동작
      e.preventDefault();   // 브라우저 caret 이동 차단
      e.stopPropagation();  // Slate mousedown 처리 차단
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, []);
  const todayBtn = (
    <Tooltip content={t("오늘로 이동", "Go to today")} placement="top">
      <Button variant="outline" size="sm" soundDisabled className={styles.ctrlBorderLight} onClick={goToday}>{t("오늘", "Today")}</Button>
    </Tooltip>
  );
  const viewToggle = (
    <SegmentedControl<"month" | "week" | "day" | "timeline">
      variant="subtle"
      items={[
        { value: "month", label: t("월", "Month") },
        { value: "week", label: t("주", "Week") },
        { value: "day", label: t("일", "Day") },
        { value: "timeline", label: t("타임라인", "Timeline") },
      ]}
      value={view}
      onChange={changeView}
      size="sm"
    />
  );

  const body = (
    <div
      ref={calBodyRef}
      contentEditable={false}
      role="group"
      aria-label={t("이벤트 달력", "Event calendar")}
      className={fullscreen ? styles.calFullscreen : undefined}
      style={fullscreen ? undefined : { position: "relative", width: "100%", maxWidth: "100%", marginBottom: "var(--spacing-md)" }}
    >
      {/* 에디터 전용 상단 바 — 제목 | 검색·필터·정렬 | 불러오기·내보내기·전체화면 (한 줄) */}
      <div className={styles.blockBar}>
        {/* 캘린더 제목 — 불러오기 picker 에서 구분용. 비워두면 월 이름으로 대체 표시. */}
        {status === "ready" && cal && (
          <span className={styles.calNameWrap}>
            <input
              className={styles.calNameInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => { setTitleFocused(false); commitTitle(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
              placeholder={t("캘린더 제목", "Calendar title")}
              maxLength={CAL_TITLE_MAX}
              aria-label={t("캘린더 제목", "Calendar title")}
            />
            {titleFocused && (
              <span className={`${styles.calNameCount}${title.length >= CAL_TITLE_MAX ? ` ${styles.calNameCountMax}` : ""}`}>
                {title.length}/{CAL_TITLE_MAX}
              </span>
            )}
          </span>
        )}
        {cal ? (
          <CalendarToolbar
            labels={cal.labels}
            tags={allTagsIn(cal.events)}
            language={language}
            query={query} onQuery={setQuery}
            scope={scope} onScope={setScope}
            activeLabels={activeLabels} onToggleLabel={toggleLabelFilter}
            activeTags={activeTags} onToggleTag={toggleTagFilter}
            activePriorities={activePriorities} onTogglePriority={togglePriorityFilter}
            sortField={sortField} onSortField={setSortField} sortDir={sortDir} onSortDir={setSortDir}
          />
        ) : (
          <span className={styles.blockBarLabel}><CalendarClock size={13} />{t("공유 달력", "Shared calendar")}</span>
        )}
        <span className={styles.blockBarActions}>
          {saveState !== "idle" && (
            <span className={styles.saveState} aria-live="polite">
              {saveState === "saving"
                ? <><Loader2 size={12} className={styles.spin} />{t("저장 중", "Saving")}</>
                : <><Check size={12} />{t("저장됨", "Saved")}</>}
            </span>
          )}
          {/* 24/12h 스위치 — 사이드바 토글 왼쪽 */}
          <Tooltip content={t("12/24시간 표기 전환", "Toggle 12/24-hour")} placement="top">
            <Switch size="lg" showStateText stateLabels={{ on: "24h", off: "12h" }} checked={timeFormat === "24h"} onCheckedChange={toggleTimeFormat} />
          </Tooltip>
          <Tooltip content={sidebarOpen ? t("이벤트 목록 닫기", "Close event list") : t("이벤트 목록", "Event list")} placement="bottom">
            <button type="button" className={`${styles.blockBarIconBtn}${sidebarOpen ? ` ${styles.blockBarIconOn}` : ""}`} onClick={() => setSidebarOpen((v) => !v)} aria-label={t("이벤트 목록", "Event list")}><PanelLeft size={13} /></button>
          </Tooltip>
          <Tooltip
            placement="bottom"
            content={
              <div className={styles.kbdHint}>
                <div><kbd>T</kbd> {t("오늘", "Today")}</div>
                <div><kbd>←</kbd> <kbd>→</kbd> {t("이전/다음", "Prev/Next")}</div>
                <div><kbd>M</kbd> <kbd>W</kbd> <kbd>D</kbd> <kbd>L</kbd> {t("월/주/일/타임라인", "Month/Week/Day/Timeline")}</div>
                <div><kbd>N</kbd> {t("새 이벤트", "New event")}</div>
              </div>
            }
          >
            <button type="button" className={styles.blockBarIconBtn} aria-label={t("키보드 단축키", "Keyboard shortcuts")}><Keyboard size={13} /></button>
          </Tooltip>
          <Tooltip content={t("다른 공유 달력 불러오기", "Load a shared calendar")} placement="top">
            <button type="button" className={styles.blockBarIconBtn} onClick={openPicker} aria-label={t("불러오기", "Load")}><Download size={13} /></button>
          </Tooltip>
          <Popover
            placement="bottom-end"
            offset={6}
            maxHeight={false}
            responsive={false}
            contentClassName={styles.exportMenu}
            trigger={
              <Tooltip content={t("내보내기 (.ics/CSV/JSON/MD)", "Export (.ics/CSV/JSON/MD)")} placement="top">
                <button type="button" className={styles.blockBarIconBtn}>
                  <Upload size={13} />
                </button>
              </Tooltip>
            }
          >
            {({ close }) => (
              <>
                {([
                  ["ics", "iCalendar (.ics)"],
                  ["csv", "CSV (.csv)"],
                  ["json", "JSON (.json)"],
                  ["md", "Markdown (.md)"],
                ] as [ExportFormat, string][]).map(([fmt, label]) => (
                  <button
                    key={fmt}
                    type="button"
                    className={styles.exportItem}
                    onClick={() => { if (cal) downloadCalendar(cal, title.trim() || t("달력", "calendar"), fmt); close(); }}
                  >
                    {label}
                  </button>
                ))}
              </>
            )}
          </Popover>
          <Tooltip content={fullscreen ? t("전체화면 종료", "Exit fullscreen") : t("전체화면", "Fullscreen")} placement="top">
            <button
              type="button"
              className={styles.blockBarIconBtn}
              onClick={() => { setFullscreen((v) => !v); setPeek(null); }}
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </Tooltip>
        </span>
      </div>

      {status === "loading" && (
        <div className={styles.calStatus}><Loader2 size={16} className={styles.spin} />{t("불러오는 중…", "Loading…")}</div>
      )}
      {status === "error" && (
        <div className={styles.calStatus}>{t("달력을 불러오지 못했습니다.", "Failed to load calendar.")}</div>
      )}
      {status === "deleted" && (
        <div className={styles.calDeleted}>
          <CalendarClock size={22} className={styles.calDeletedIcon} />
          <div className={styles.calDeletedText}>
            <strong>{t("연결된 달력이 삭제됨", "Linked calendar deleted")}</strong>
            <span>{t("이 달력이 휴지통으로 이동됐어요. 설정에서 복구하거나 다른 달력을 다시 연결하세요.", "This calendar was moved to trash. Restore it in settings, or reconnect another.")}</span>
          </div>
          <Button variant="outline" size="sm" soundDisabled onClick={openPicker}>
            <Download size={13} />{t("다시 연결", "Reconnect")}
          </Button>
        </div>
      )}
      {status === "ready" && cal && (() => {
        const shown = sortEvents(filterEvents(expandEvents(cal.events), query, scope, activeLabels, activeTags, activePriorities), sortField, sortDir);
        const relatedIds = relatedEventIds(cal.events);
        return (
          <div className={styles.calShell}>
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.div
                  key="ev-sidebar"
                  className={styles.evSidebarMotion}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 276, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CalendarEventList
                    events={shown}
                    labels={cal.labels}
                    language={language}
                    onEventGoto={goToEvent}
                    onClose={() => setSidebarOpen(false)}
                    timeFormat={timeFormat}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <div className={styles.calMain}>
            {view === "month" ? (
              <MonthCalendar
                month={viewMonth}
                events={shown}
                labels={cal.labels}
                language={language}
                focusEventId={focusEventId}
                viewToggle={viewToggle}
                todayButton={todayBtn}
                onMonthChange={changeMonth}
                onDayClick={openDayModal}
                onEventClick={openEdit}
                onEventMove={moveEvent}
                relatedIds={relatedIds}
                timeFormat={timeFormat}
              />
            ) : view === "week" || view === "day" ? (
              <AgendaView
                mode={view}
                date={viewDate}
                events={shown}
                labels={cal.labels}
                language={language}
                viewToggle={viewToggle}
                todayButton={todayBtn}
                onDateChange={setViewDate}
                onEventClick={openEdit}
                onDateDetail={openDayModal}
                onAdd={openAdd}
                onEventTimeChange={changeEventTime}
                onEventPatch={patchEvent}
                onEventDelete={deleteEventInline}
                relatedIds={relatedIds}
                timeFormat={timeFormat}
              />
            ) : (
              <TimelineView
                ref={timelineRef}
                events={shown}
                labels={cal.labels}
                language={language}
                viewToggle={viewToggle}
                todayButton={todayBtn}
                onEventClick={openEdit}
                onAdd={openAdd}
                onDateDetail={openDayModal}
                onEventResize={resizeEvent}
                onEventMove={moveEvent}
                onEventReorder={reorderEvent}
                onEventLink={linkEvents}
                onPortUnlink={unlinkPort}
                onLinkClick={openChainModal}
              />
            )}
            </div>
            <AnimatePresence initial={false}>
              {fullscreen && peek && (
                <motion.aside
                  key="cal-peek"
                  className={styles.peekPanel}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 400, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className={styles.peekInner}>
                    <div className={styles.peekHeader}>
                      {peek.icon}
                      <span className={styles.peekTitle}>{peek.title}</span>
                      <button type="button" className={styles.peekClose} onClick={() => setPeek(null)} aria-label={t("닫기", "Close")}><X size={16} /></button>
                    </div>
                    <div className={styles.peekBody}>
                      <ModalFooterContext.Provider value={peekFooterEl}>
                        {peek.node}
                      </ModalFooterContext.Provider>
                    </div>
                    <div ref={setPeekFooterEl} className={styles.peekFooter} />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        );
      })()}
    </div>
  );

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps}>
        <PlateElement {...props}>
          {fullscreen ? null : body}
          {props.children}
        </PlateElement>
      </div>
      {fullscreen && createPortal(body, document.body)}
    </BlockDropZone>
  );
}
