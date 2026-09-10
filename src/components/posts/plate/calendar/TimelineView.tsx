"use client";

// ── 이벤트 달력 — 타임라인. 간트(무한 스크롤 날짜축 + 이벤트 바 + 오늘선). ──
import React from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { Plus, X } from "@/components/icons";
import { type CalEvent, type EventLabel, eventColorVar, eventEndDate } from "./model";
import { toDateStr, parseDate, formatDateValue } from "../dateUtils";
import EventPreview from "./EventPreview";
import { useHoverPreview } from "./useHoverPreview";
import styles from "./Calendar.module.css";
import Pressable from "@/components/ui/Pressable";

const COL_W = 48;      // 하루 컬럼 폭(px)
const ROW_H = 40;      // 이벤트 행 높이(px)
const CHUNK = 3;       // 무한 스크롤 시 한 번에 늘리는 개월 수
const EDGE = 400;      // 가장자리 감지 임계(px)
const DAY_MS = 86400000;

const monthShift = (base: Date, months: number, day: number) => new Date(base.getFullYear(), base.getMonth() + months, day);
const addDays = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
const monthsBetween = (from: Date, to: Date) => (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

type DayCell = { date: string; day: number; dow: number; monthStart: boolean; monthLabel: string };
export type TimelineHandle = { scrollToToday: () => void; scrollToEvent: (id: string, date: string) => void };

function TimelineViewInner({
  events, labels, language, viewToggle, todayButton, readOnly, onEventClick, onAdd, onDateDetail, onEventResize, onEventMove, onEventReorder, onEventLink, onPortUnlink, onLinkClick,
}: {
  events: CalEvent[];
  labels: EventLabel[];
  language: string;
  viewToggle?: React.ReactNode;
  todayButton?: React.ReactNode;
  readOnly?: boolean;
  onEventClick?: (ev: CalEvent) => void;
  onAdd?: (date: string) => void;
  onDateDetail?: (date: string) => void;
  onEventResize?: (id: string, date: string, endDate: string | null) => void;
  /** 바 본체 드래그로 이동 — 전체 이벤트를 날짜만큼 shift (기간 유지). */
  onEventMove?: (id: string, fromDate: string, toDate: string) => void;
  /** 세로 DnD 자유 레인 배치 — 그룹키(master/단일 id) → 놓일 행 인덱스 맵. 빈 행 gap 허용. */
  onEventReorder?: (rowByGroup: Record<string, number>) => void;
  /** 노드 드래그 연결 — fromId(선행) → toId(후속). toId 의 deps 에 fromId 추가. */
  onEventLink?: (fromId: string, toId: string) => void;
  /** 포트(노드 dot) 클릭으로 연결 해제 — side "start": 이 이벤트의 선행 연결 전부, "end": 후속 연결 전부. */
  onPortUnlink?: (eventId: string, side: "start" | "end") => void;
  /** 화살표 클릭 — 연결된 체인(선행·후속 전체) 이벤트 id 목록을 모달로. */
  onLinkClick?: (relatedIds: string[]) => void;
}, ref: React.Ref<TimelineHandle>) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const ko = language === "ko";
  const todayStr = toDateStr(new Date());
  const today = React.useMemo(() => parseDate(todayStr)!, [todayStr]);
  const { hover, show: showHover, hideSoon, hideNow, keepOpen } = useHoverPreview();
  const ganttRef = React.useRef<HTMLDivElement>(null);
  // 바 리사이즈(양끝 드래그)로 시작/종료일 변경 — 드래그 중 라이브 미리보기
  const [resizing, setResizing] = React.useState<{ id: string; date: string; endDate: string } | null>(null);
  const canResize = !readOnly && !!onEventResize;

  // 세로 순서: order(수동 배치)가 있으면 그 순, 없으면 날짜순 기본
  const sorted = React.useMemo(() => {
    const byDate = (a: CalEvent, b: CalEvent) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99"));
    if (!events.some((e) => e.order != null)) return [...events].sort(byDate);
    return [...events].sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER, bo = b.order ?? Number.MAX_SAFE_INTEGER;
      return ao !== bo ? ao - bo : byDate(a, b);
    });
  }, [events]);

  // ── 행(레인) 배치 ── 같은 반복(master)끼리만 한 행. 그 외 이벤트는 각자 별도 행.
  //   자유 레인: order 가 그 그룹이 놓일 행(레인)을 직접 지정(빈 행 gap 허용). 미지정 그룹은 빈 행에 순서대로.
  const { rowMap, laneCount, laneOf } = React.useMemo(() => {
    const gk = (ev: CalEvent) => ev.master ?? ev.id;
    const order: string[] = [];             // 그룹 첫 등장 순서
    const seen = new Set<string>();
    const explicit = new Map<string, number>(); // 그룹 → 지정 레인
    for (const ev of sorted) {
      const k = gk(ev);
      if (!seen.has(k)) {
        seen.add(k); order.push(k);
        if (typeof ev.order === "number" && isFinite(ev.order)) explicit.set(k, Math.max(0, Math.round(ev.order)));
      }
    }
    const laneOf = new Map<string, number>();
    const taken = new Set<number>();
    // 1) 지정 레인 우선 배치 (충돌 시 다음 빈 행으로 밀기)
    for (const k of [...explicit.keys()].sort((a, b) => explicit.get(a)! - explicit.get(b)!)) {
      let row = explicit.get(k)!;
      while (taken.has(row)) row++;
      taken.add(row); laneOf.set(k, row);
    }
    // 2) 미지정 그룹은 남은 빈 행에 첫 등장 순서대로
    let cursor = 0;
    for (const k of order) {
      if (laneOf.has(k)) continue;
      while (taken.has(cursor)) cursor++;
      taken.add(cursor); laneOf.set(k, cursor); cursor++;
    }
    const maxLane = taken.size ? Math.max(...taken) : 0;
    const rowMap = new Map<string, number>();
    for (const ev of sorted) rowMap.set(ev.id, laneOf.get(gk(ev)) ?? 0);
    return { rowMap, laneCount: maxLane + 1, laneOf };
  }, [sorted]);
  const groupKey = React.useCallback((ev: CalEvent) => ev.master ?? ev.id, []);

  // ── 무한 스크롤 범위(개월 오프셋) — 초기엔 이벤트 + today ±6 커버, 스크롤로 확장 ──
  const initRange = () => {
    let s = -6, e = 6;
    for (const ev of events) {
      const d = parseDate(ev.date), de = parseDate(eventEndDate(ev));
      if (d) s = Math.min(s, monthsBetween(today, d) - 1);
      if (de) e = Math.max(e, monthsBetween(today, de) + 1);
    }
    return { s, e };
  };
  const [startM, setStartM] = React.useState(() => initRange().s);
  const [endM, setEndM] = React.useState(() => initRange().e);
  const startMRef = React.useRef(startM); useSyncRef(startMRef, startM);
  const prependPxRef = React.useRef(0);

  const monthLabelOf = React.useCallback((d: Date) =>
    d.toLocaleDateString(ko ? "ko-KR" : "en-US", { year: "numeric", month: "long" }), [ko]);

  const { days, dayIndex, todayIdx } = React.useMemo(() => {
    const arr: DayCell[] = [];
    const push = (cursor: Date, prevMonth: number | null) => arr.push({
      date: toDateStr(cursor), day: cursor.getDate(), dow: cursor.getDay(),
      monthStart: prevMonth !== cursor.getMonth(), monthLabel: monthLabelOf(cursor),
    });
    const start = monthShift(today, startM, 1);
    const end = monthShift(today, endM + 1, 0);
    let cursor = start, prevMonth: number | null = null;
    while (cursor <= end) { push(cursor, prevMonth); prevMonth = cursor.getMonth(); cursor = addDays(cursor, 1); }
    const dayIndex = new Map<string, number>();
    arr.forEach((d, i) => dayIndex.set(d.date, i));
    return { days: arr, dayIndex, todayIdx: dayIndex.get(todayStr) ?? -1 };
  }, [startM, endM, today, todayStr, monthLabelOf]);

  const totalW = days.length * COL_W;
  // 뷰 높이 고정 — 이벤트 수와 무관하게 항상 VISIBLE_ROWS 만큼. 넘치면 내부 세로 스크롤.
  const VISIBLE_ROWS = 6;
  const TL_HEADER_H = 32 + 37; // 월 라벨(32) + 날짜 행(≈37)
  const barsH = Math.max(laneCount, VISIBLE_ROWS) * ROW_H + 12; // 최소 VISIBLE_ROWS 채워 항상 같은 높이
  const ganttFixedH = TL_HEADER_H + VISIBLE_ROWS * ROW_H + 12;

  const scrollToToday = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = ganttRef.current;
    if (!el || todayIdx < 0) return;
    el.scrollTo({ left: todayIdx * COL_W - el.clientWidth / 2 + COL_W / 2, behavior });
  }, [todayIdx]);
  // 특정 컬럼(날짜)로 가운데 정렬 스크롤 — scrollToEvent 용
  const scrollToCol = React.useCallback((idx: number, behavior: ScrollBehavior = "smooth") => {
    const el = ganttRef.current;
    if (!el || idx < 0) return;
    el.scrollTo({ left: idx * COL_W - el.clientWidth / 2 + COL_W / 2, behavior });
  }, []);

  // 이동 대상 강조(오늘로 이동 등) — 다음 사용자 인터랙션 전까지 표시.
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const [highlightDate, setHighlightDate] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!highlightId && !highlightDate) return;
    const clear = () => { setHighlightId(null); setHighlightDate(null); };
    // 점프 직후 프로그램 스크롤/초기 클릭이 바로 지우지 않게 약간 지연 후 리스너 등록
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
  }, [highlightId, highlightDate]);

  // prepend(왼쪽 확장) 후 스크롤 위치 보정
  React.useLayoutEffect(() => {
    if (prependPxRef.current && ganttRef.current) {
      ganttRef.current.scrollLeft += prependPxRef.current;
      prependPxRef.current = 0;
    }
  }, [startM]);

  // 최초 마운트 시 오늘로 스크롤
  React.useEffect(() => {
    scrollToToday("auto");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useImperativeHandle(ref, () => ({
    scrollToToday: () => { setHighlightId(null); setHighlightDate(todayStr); scrollToToday("smooth"); },
    scrollToEvent: (id, date) => {
      const idx = dayIndex.get(date);
      if (idx == null) return; // 현재 무한스크롤 범위 밖(마운트 후 추가된 먼 날짜)
      setHighlightDate(null);
      setHighlightId(id); // .tlBarHighlight 펄스 → 다음 인터랙션까지
      scrollToCol(idx, "smooth");
    },
  }), [scrollToToday, scrollToCol, dayIndex, todayStr]);

  // 스크롤 가장자리 → 범위 확장(무한)
  const onScroll = React.useCallback(() => {
    const el = ganttRef.current;
    if (!el) return;
    if (el.scrollLeft < EDGE && prependPxRef.current === 0) {
      const s = startMRef.current;
      const added = Math.round((monthShift(today, s, 1).getTime() - monthShift(today, s - CHUNK, 1).getTime()) / DAY_MS);
      prependPxRef.current = added * COL_W;
      setStartM(s - CHUNK);
    } else if (el.scrollLeft + el.clientWidth > el.scrollWidth - EDGE) {
      setEndM((e) => e + CHUNK);
    }
  }, [today]);

  const dayCells = React.useMemo(() => days.map((d) => (
    <Pressable key={d.date}
      className={[styles.tlDay, d.dow === 0 ? styles.sun : "", d.dow === 6 ? styles.sat : "", d.date === todayStr ? styles.tlDayToday : "", d.date === highlightDate ? styles.tlDayHi : ""].filter(Boolean).join(" ")}
      style={{ width: COL_W }} onClick={onDateDetail ? () => onDateDetail(d.date) : (readOnly ? undefined : () => onAdd?.(d.date))} title={onDateDetail ? t("이 날짜 일정 보기", "View this day") : (readOnly ? undefined : t("이 날짜에 이벤트 추가", "Add event on this day"))}>
      <span className={styles.tlDayNum}>{d.day}</span>
    </Pressable>
  )), [days, todayStr, readOnly, onAdd, onDateDetail, highlightDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthLabels = React.useMemo(() => days.map((d, i) => d.monthStart && (
    <span key={d.date} className={styles.tlMonthLabel} style={{ left: i * COL_W }}>{d.monthLabel}</span>
  )), [days]);

  // 주말(토·일) 세로 밴드 — 옅은 accent 로 구분감
  const weekendCols = React.useMemo(() => days.map((d, i) => (d.dow === 0 || d.dow === 6) ? (
    <span key={`w${d.date}`} className={styles.tlWeekendCol} style={{ left: i * COL_W, width: COL_W }} />
  ) : null), [days]);

  // 바 본체 드래그로 이동 — 가로(날짜) + 세로(행 재정렬). 라이브 미리보기 dayDelta/rowDelta.
  const canMove = !readOnly && !!onEventMove;
  // 세로 재정렬 = 그룹(반복 시리즈/단일 이벤트) 단위 행 이동. 가로 날짜 이동·리사이즈는 유지.
  const canReorder = !readOnly && !!onEventReorder;
  const didMoveRef = React.useRef(false);
  const [movePreview, setMovePreview] = React.useState<{ id: string; groupKey: string; dayDelta: number; rowDelta: number } | null>(null);
  const onBarDown = (e: React.PointerEvent, ev: CalEvent) => {
    if ((!canMove && !canReorder) || e.button !== 0) return;
    setLinkHi(null);
    const startX = e.clientX, startY = e.clientY;
    const gk = groupKey(ev);
    const startRow = rowMap.get(ev.id) ?? 0; // 그룹의 현재 행
    const maxRow = Math.max(laneCount, VISIBLE_ROWS) - 1; // 보이는 빈 행까지 자유 배치
    const gantt = ganttRef.current;
    // 드래그 시작 순간 주축(가로=날짜 이동 / 세로=행 재정렬)을 고정 → 세로로 옮길 때 날짜가 딸려가지 않음
    let dayDelta = 0, rowDelta = 0, started = false, axis: "x" | "y" | null = null;
    let lastX = startX, lastY = startY, rafId = 0, scrollDir = 0;
    const apply = () => {
      let d = 0, r = 0;
      if (axis === "x" && canMove) d = Math.round((lastX - startX) / COL_W);
      if (axis === "y" && canReorder) {
        const barsRect = tlBarsRef.current?.getBoundingClientRect();
        // 절대 위치 기준(컨테이너 스크롤 반영) → 스크롤해서 화면 밖 먼 행까지 도달 가능
        if (barsRect) r = Math.max(0, Math.min(maxRow, Math.floor((lastY - barsRect.top) / ROW_H))) - startRow;
      }
      if (d !== dayDelta || r !== rowDelta) { dayDelta = d; rowDelta = r; didMoveRef.current = true; setMovePreview({ id: ev.id, groupKey: gk, dayDelta: d, rowDelta: r }); }
    };
    const tickScroll = () => {
      if (!scrollDir || !gantt) { rafId = 0; return; }
      gantt.scrollTop += scrollDir * 10;
      apply(); // 스크롤로 barsRect 이동 → 목표 행 재계산
      rafId = requestAnimationFrame(tickScroll);
    };
    const onMove = (me: PointerEvent) => {
      if (!started && Math.abs(me.clientX - startX) < 4 && Math.abs(me.clientY - startY) < 4) return;
      if (!started) { started = true; axis = Math.abs(me.clientX - startX) >= Math.abs(me.clientY - startY) ? "x" : "y"; }
      lastX = me.clientX; lastY = me.clientY;
      if (axis === "y" && gantt) { // 뷰포트 위/아래 가장자리 근처면 자동 스크롤
        const gr = gantt.getBoundingClientRect();
        scrollDir = me.clientY < gr.top + ROW_H ? -1 : me.clientY > gr.bottom - ROW_H ? 1 : 0;
        if (scrollDir && !rafId) rafId = requestAnimationFrame(tickScroll);
      }
      apply();
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (rafId) cancelAnimationFrame(rafId);
      document.body.style.cursor = "";
      setMovePreview(null);
      if (dayDelta !== 0 && canMove) onEventMove?.(ev.id, ev.date, toDateStr(addDays(parseDate(ev.date)!, dayDelta)));
      if (rowDelta !== 0 && canReorder) {
        // 자유 레인: 잡은 그룹을 목표 행으로, 목표 행 점유 그룹은 원래 행으로 스왑(빈 행이면 그냥 이동)
        const targetRow = startRow + rowDelta;
        const assign: Record<string, number> = {};
        for (const [k, row] of laneOf) assign[k] = row;
        for (const [k, row] of laneOf) { if (k !== gk && row === targetRow) { assign[k] = startRow; break; } }
        assign[gk] = targetRow;
        onEventReorder?.(assign);
      }
    };
    document.body.style.cursor = "grabbing";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // 바 양끝 핸들 드래그 — start/end 를 날짜 컬럼에 스냅해 라이브 갱신, 놓을 때 persist
  const didResizeRef = React.useRef(false);
  const onHandleDown = React.useCallback((e: React.PointerEvent, ev: CalEvent, edge: "start" | "end") => {
    e.preventDefault();
    e.stopPropagation();
    const el = ganttRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const i0 = dayIndex.get(ev.date) ?? 0;
    const iEnd0 = dayIndex.get(eventEndDate(ev)) ?? i0;
    let liveStart = ev.date, liveEnd = eventEndDate(ev);
    didResizeRef.current = false;
    const dayAt = (clientX: number) => Math.floor((clientX - rect.left + el.scrollLeft) / COL_W);
    const onMove = (me: PointerEvent) => {
      const idx = Math.max(0, Math.min(days.length - 1, dayAt(me.clientX)));
      if (edge === "end") liveEnd = days[Math.max(i0, idx)].date;
      else liveStart = days[Math.min(iEnd0, idx)].date;
      didResizeRef.current = true;
      setResizing({ id: ev.id, date: liveStart, endDate: liveEnd });
    };
    // 드래그 내내 커스텀 커서를 resizeH 로 고정 — 전체화면 오버레이(data-cursor)로 포인터가 바(draggable) 위를 지나도 유지
    const overlay = document.createElement("div");
    overlay.setAttribute("data-cursor", "resizeH");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;cursor:ew-resize;";
    document.body.appendChild(overlay);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      overlay.remove();
      document.body.style.cursor = "";
      setResizing(null);
      const endOut = liveEnd > liveStart ? liveEnd : null;
      const curEnd = eventEndDate(ev) > ev.date ? eventEndDate(ev) : null;
      if (liveStart !== ev.date || endOut !== curEnd) onEventResize?.(ev.id, liveStart, endOut);
    };
    document.body.style.cursor = "ew-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [dayIndex, days, onEventResize]);

  // ── 의존 관계(선행/후속) 화살표 + 노드 드래그 연결 ──
  const arrowId = React.useId().replace(/:/g, "");
  const tlBarsRef = React.useRef<HTMLDivElement>(null);
  const canLink = !readOnly && !!onEventLink;
  const [linkDrag, setLinkDrag] = React.useState<{ fromId: string; side: "start" | "end"; x: number; y: number } | null>(null);

  // 각 바의 캔버스 좌표 (좌/우/세로중심). resize 중이면 라이브 위치 반영.
  const barGeom = React.useMemo(() => {
    const m = new Map<string, { left: number; right: number; cy: number; row: number }>();
    sorted.forEach((ev) => {
      const row = rowMap.get(ev.id) ?? 0;
      const rz = resizing && resizing.id === ev.id ? resizing : null;
      const i = dayIndex.get(rz ? rz.date : ev.date);
      if (i == null) return;
      const iEnd = dayIndex.get(rz ? rz.endDate : eventEndDate(ev)) ?? i;
      const span = Math.max(1, iEnd - i + 1);
      const left = i * COL_W + 4;
      const right = left + span * COL_W - 8;
      const cy = row * ROW_H + 9 + (ROW_H - 10) / 2;
      m.set(ev.id, { left, right, cy, row });
    });
    return m;
  }, [sorted, dayIndex, resizing, rowMap]);

  // 선행(deps) → 후속 화살표 경로 (predecessor 오른쪽 끝 → successor 왼쪽 시작)
  const depPaths = React.useMemo(() => {
    const out: { key: string; d: string; hitD: string; predId: string; succId: string }[] = [];
    for (const ev of sorted) {
      for (const pid of ev.deps || []) {
        const from = barGeom.get(pid);
        const to = barGeom.get(ev.id);
        if (!from || !to) continue;
        const x1 = from.right, y1 = from.cy, x2 = to.left, y2 = to.cy;
        out.push({
          key: `${pid}->${ev.id}`,
          d: `M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2 - 2} ${y2}`,
          // 클릭 히트영역은 양 끝(포트/핸들 영역) 못 미치게 짧게 — 포트 클릭과 충돌 방지
          hitD: `M ${x1 + 16} ${y1} C ${x1 + 26} ${y1}, ${x2 - 26} ${y2}, ${x2 - 20} ${y2}`,
          predId: pid, succId: ev.id,
        });
      }
    }
    return out;
  }, [sorted, barGeom]);
  const canUnlink = !readOnly && !!onPortUnlink;
  // 어떤 이벤트가 다른 이벤트의 선행인지(=후속 연결 보유) 집합 — 우측 포트가 "연결됨"인지 판단
  const predSet = React.useMemo(() => {
    const s = new Set<string>();
    for (const ev of sorted) for (const pid of ev.deps || []) s.add(pid);
    return s;
  }, [sorted]);
  // 화살표 선 클릭 → 그 연결의 선행·후속 바 강조 (예전 노드 dot 클릭 강조를 선 클릭으로 이동)
  // 화살표 hover 시 강조할 관련 노드 집합 (선행·후속 체인 전체 = 연결 컴포넌트)
  const [linkHi, setLinkHi] = React.useState<Set<string> | null>(null);
  const succMap = React.useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of events) for (const p of e.deps || []) { if (!m.has(p)) m.set(p, []); m.get(p)!.push(e.id); }
    return m;
  }, [events]);
  // 두 노드에서 선행(deps)·후속(reverse) 양방향으로 전이적으로 도달하는 모든 노드
  const relatedComponent = React.useCallback((aId: string, bId: string): Set<string> => {
    const set = new Set<string>();
    const stack = [aId, bId];
    while (stack.length) {
      const id = stack.pop()!;
      if (set.has(id)) continue;
      set.add(id);
      const ev = events.find((e) => e.id === id);
      for (const p of ev?.deps || []) stack.push(p);
      for (const s of succMap.get(id) || []) stack.push(s);
    }
    return set;
  }, [events, succMap]);
  const isHiLink = (predId: string, succId: string) => !!linkHi && linkHi.has(predId) && linkHi.has(succId);

  // 포트(노드 dot): 드래그 = 연결 생성, 클릭(드래그 없이) = 그 포트의 연결 해제.
  // side "end"(오른쪽) = this 가 선행 → 후속 연결. "start"(왼쪽) = this 가 후속 → 선행 연결.
  const portConnected = (ev: CalEvent, side: "start" | "end") => (side === "start" ? (ev.deps?.length ?? 0) > 0 : predSet.has(ev.id));
  const onPortDown = (e: React.PointerEvent, ev: CalEvent, side: "start" | "end") => {
    if (!canLink && !canUnlink) return;
    e.stopPropagation(); e.preventDefault();
    const rect0 = tlBarsRef.current?.getBoundingClientRect();
    const toCanvas = (cx: number, cy: number) => ({ x: cx - (rect0?.left ?? 0), y: cy - (rect0?.top ?? 0) });
    const startX = e.clientX, startY = e.clientY;
    let moved = false;
    const move = (me: PointerEvent) => {
      if (!moved && Math.abs(me.clientX - startX) + Math.abs(me.clientY - startY) < 4) return;
      if (!moved) { moved = true; hideNow(); } // 드래그 시작 순간 hover 미리보기 즉시 닫기
      if (!canLink) return; // 연결 생성 불가면 드래그 무시
      const p = toCanvas(me.clientX, me.clientY);
      setLinkDrag({ fromId: ev.id, side, x: p.x, y: p.y });
    };
    const up = (ue: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      setLinkDrag(null);
      if (!moved) { // 클릭 = 연결 해제 (연결돼 있을 때만)
        if (canUnlink && portConnected(ev, side)) onPortUnlink?.(ev.id, side);
        return;
      }
      if (!canLink) return;
      const el = document.elementFromPoint(ue.clientX, ue.clientY) as HTMLElement | null;
      const barEl = el?.closest("[data-event-id]") as HTMLElement | null;
      const toId = barEl?.getAttribute("data-event-id");
      if (toId && toId !== ev.id) {
        if (side === "end") onEventLink?.(ev.id, toId);   // this → 후속
        else onEventLink?.(toId, ev.id);                   // 선행 → this
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  // ── 노션식 hover-to-add ── 빈 셀에 마우스 올리면 가상 이벤트 블록, 클릭하면 그 날짜로 추가
  const canAdd = !readOnly && !!onAdd;
  const [addGhost, setAddGhost] = React.useState<{ dayIdx: number; row: number } | null>(null);
  const cellOccupied = React.useCallback((dayIdx: number, row: number) => {
    for (const ev of sorted) {
      if ((rowMap.get(ev.id) ?? 0) !== row) continue;
      const i = dayIndex.get(ev.date);
      if (i == null) continue;
      const iEnd = dayIndex.get(eventEndDate(ev)) ?? i;
      if (dayIdx >= i && dayIdx <= iEnd) return true;
    }
    return false;
  }, [sorted, rowMap, dayIndex]);
  const onBarsHover = (e: React.MouseEvent) => {
    if (!canAdd || resizing || movePreview || linkDrag) { if (addGhost) setAddGhost(null); return; }
    const el = tlBarsRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dayIdx = Math.floor((e.clientX - rect.left) / COL_W);
    const y = e.clientY - rect.top;
    const row = Math.floor(y / ROW_H);
    if (dayIdx < 0 || dayIdx >= days.length || row < 0 || y >= barsH || cellOccupied(dayIdx, row)) {
      if (addGhost) setAddGhost(null);
      return;
    }
    if (!addGhost || addGhost.dayIdx !== dayIdx || addGhost.row !== row) setAddGhost({ dayIdx, row });
  };
  const onBarsAdd = () => {
    if (addGhost && canAdd) { onAdd?.(days[addGhost.dayIdx].date); setAddGhost(null); }
  };

  const bars = React.useMemo(() => sorted.map((ev) => {
    const row = rowMap.get(ev.id) ?? 0;
    const rz = resizing && resizing.id === ev.id ? resizing : null;
    // 세로 이동 중엔 같은 그룹 전체 dim(행이 통째로 뜨는 느낌), 가로 이동은 잡은 바만 dim
    const mv = movePreview && (movePreview.id === ev.id || (movePreview.rowDelta !== 0 && movePreview.groupKey === groupKey(ev))) ? movePreview : null;
    const startDate = rz ? rz.date : ev.date;
    const endDate = rz ? rz.endDate : eventEndDate(ev);
    const i = dayIndex.get(startDate);
    if (i == null) return null;
    const iEnd = dayIndex.get(endDate) ?? i;
    const span = Math.max(1, iEnd - i + 1);
    const leftConn = canUnlink && (ev.deps?.length ?? 0) > 0;   // 선행 연결 보유(좌측 포트 = 해제)
    const rightConn = canUnlink && predSet.has(ev.id);          // 후속 연결 보유(우측 포트 = 해제)
    return (
      <Pressable key={ev.id} data-event-id={ev.id}
        className={`${styles.tlBar}${ev.status === "done" ? ` ${styles.tlBarDone}` : ""}${rz ? ` ${styles.tlBarResizing}` : ""}${mv ? ` ${styles.tlBarMoveSrc}` : ""}${highlightId === ev.id ? ` ${styles.tlBarHighlight}` : ""}${linkHi?.has(ev.id) ? ` ${styles.tlBarLinkHi}` : ""}${linkDrag && linkDrag.fromId !== ev.id ? ` ${styles.tlBarLinkTarget}` : ""}${(canMove || canReorder) ? ` ${styles.tlBarDraggable}` : ""}`}
        style={{ left: i * COL_W + 4, top: row * ROW_H + 9, height: ROW_H - 10, width: span * COL_W - 8, ["--_c" as string]: eventColorVar(ev, labels) }}
        onPointerDown={(canMove || canReorder) ? (e) => onBarDown(e, ev) : undefined}
        onClick={() => { if (didResizeRef.current || didMoveRef.current) { didResizeRef.current = false; didMoveRef.current = false; return; } hideNow(); onEventClick?.(ev); }}
        onMouseEnter={(e) => { if (!resizing && !movePreview && !linkDrag) showHover({ ev, rect: e.currentTarget.getBoundingClientRect() }); }}
        onMouseLeave={() => hideSoon()}
        tabIndex={readOnly ? -1 : 0}>
        {canResize && <span data-cursor="resizeH" className={`${styles.tlBarHandle} ${styles.tlBarHandleL}`} onPointerDown={(e) => onHandleDown(e, ev, "start")} onClick={(e) => e.stopPropagation()}><svg className={styles.tlBarGrip} viewBox="0 0 16 30" aria-hidden><path d="M15 0 A 15 15 0 0 0 15 30" /></svg></span>}
        {(canLink || leftConn) && (
          <span className={`${styles.tlBarPort} ${styles.tlBarPortL}${leftConn ? ` ${styles.tlBarPortConn}` : ""}`} title={leftConn ? t("클릭해 선행 연결 해제", "Click to remove predecessor link") : t("드래그해 선행 작업 연결", "Drag to link a predecessor")} onPointerDown={(e) => onPortDown(e, ev, "start")} onClick={(e) => e.stopPropagation()}>
            {leftConn && <X className={styles.tlBarPortX} size={8} />}
          </span>
        )}
        <span className={styles.tlBarDot} />
        {ev.time && <span className={styles.tlBarTime}>{ev.time}</span>}
        <span className={styles.tlBarTitle}>{ev.title || t("(제목 없음)", "(Untitled)")}</span>
        {canResize && <span data-cursor="resizeH" className={`${styles.tlBarHandle} ${styles.tlBarHandleR}`} onPointerDown={(e) => onHandleDown(e, ev, "end")} onClick={(e) => e.stopPropagation()}><svg className={styles.tlBarGrip} viewBox="0 0 16 30" aria-hidden><path d="M1 0 A 15 15 0 0 1 1 30" /></svg></span>}
        {(canLink || rightConn) && (
          <span className={`${styles.tlBarPort} ${styles.tlBarPortR}${rightConn ? ` ${styles.tlBarPortConn}` : ""}`} title={rightConn ? t("클릭해 후속 연결 해제", "Click to remove successor link") : t("드래그해 후속 작업 연결", "Drag to link a successor")} onPointerDown={(e) => onPortDown(e, ev, "end")} onClick={(e) => e.stopPropagation()}>
            {rightConn && <X className={styles.tlBarPortX} size={8} />}
          </span>
        )}
      </Pressable>
    );
  }), [sorted, rowMap, dayIndex, labels, readOnly, onEventClick, resizing, canResize, onHandleDown, highlightId, canLink, canUnlink, predSet, linkDrag, canMove, canReorder, movePreview, linkHi]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`${styles.calendar} ${styles.timeline}`} contentEditable={false}>
      <div className={styles.tlHead}>
        <span className={styles.tlHeadTitle}>{t("타임라인", "Timeline")} · {events.length}</span>
        <span className={styles.tlHeadRight}>
          {todayButton}
          {!readOnly && onAdd && (
            <Pressable className={styles.tlAdd} onClick={() => onAdd(todayStr)}>
              <Plus size={13} />{t("이벤트 추가", "Add event")}
            </Pressable>
          )}
          {viewToggle}
        </span>
      </div>

      <div className={styles.tlGantt} data-lenis-prevent ref={ganttRef} onScroll={onScroll} style={{ height: ganttFixedH }}>
          <div className={styles.tlCanvas} style={{ width: totalW }}>
            <div className={styles.tlWeekendLayer}>{weekendCols}</div>
            <div className={styles.tlMonthRow} style={{ height: 32 }}>{monthLabels}</div>
            <div className={styles.tlDayRow}>{dayCells}</div>
            <div className={`${styles.tlBars}${addGhost ? ` ${styles.tlBarsAdding}` : ""}`} ref={tlBarsRef} style={{ height: barsH }}
              onMouseMove={canAdd ? onBarsHover : undefined}
              onMouseLeave={() => { if (addGhost) setAddGhost(null); }}
              onClick={canAdd ? onBarsAdd : undefined}>
              <div className={styles.tlGrid} style={{ backgroundSize: `${COL_W}px 100%` }} />
              {addGhost && (
                <div className={styles.tlAddGhost} style={{ left: addGhost.dayIdx * COL_W + 4, top: addGhost.row * ROW_H + 9, height: ROW_H - 10, width: COL_W - 8 }}>
                  <Plus size={14} />
                </div>
              )}
              {todayIdx >= 0 && <div className={styles.tlTodayLine} style={{ left: todayIdx * COL_W + COL_W / 2 }}><span className={styles.tlTodayDot} /></div>}
              {(depPaths.length > 0 || linkDrag) && (
                <svg className={styles.tlDepLayer} width={totalW} height={barsH} aria-hidden>
                  <defs>
                    <marker id={`arw-${arrowId}`} markerWidth="6" markerHeight="6" refX="4.6" refY="2.5" orient="auto">
                      <path d="M0 0 L5 2.5 L0 5 z" className={styles.tlDepArrowHead} />
                    </marker>
                    <marker id={`arw-t-${arrowId}`} markerWidth="6" markerHeight="6" refX="4.6" refY="2.5" orient="auto">
                      <path d="M0 0 L5 2.5 L0 5 z" className={styles.tlDepTempHead} />
                    </marker>
                  </defs>
                  {depPaths.map((p) => {
                    const hi = isHiLink(p.predId, p.succId);
                    return <path key={p.key} className={`${styles.tlDepPath}${hi ? ` ${styles.tlDepPathHi}` : ""}`} d={p.d} markerEnd={hi ? `url(#arw-t-${arrowId})` : `url(#arw-${arrowId})`} />;
                  })}
                  {depPaths.map((p) => (
                    <path
                      key={`hit-${p.key}`}
                      className={styles.tlDepHit}
                      d={p.hitD}
                      onMouseEnter={() => setLinkHi(relatedComponent(p.predId, p.succId))}
                      onMouseLeave={() => setLinkHi(null)}
                      onClick={onLinkClick ? () => onLinkClick([...relatedComponent(p.predId, p.succId)]) : undefined}
                      style={onLinkClick ? { cursor: "pointer" } : undefined}
                    />
                  ))}
                  {linkDrag && (() => {
                    const g = barGeom.get(linkDrag.fromId);
                    if (!g) return null;
                    const ox = linkDrag.side === "end" ? g.right : g.left;
                    const dir = linkDrag.side === "end" ? 1 : -1;
                    const dx = Math.max(24, Math.abs(linkDrag.x - ox) * 0.4); // 기존 의존 화살표와 같은 곡선
                    const d = `M ${ox} ${g.cy} C ${ox + dir * dx} ${g.cy}, ${linkDrag.x - dir * dx} ${linkDrag.y}, ${linkDrag.x} ${linkDrag.y}`;
                    return <path className={styles.tlDepTemp} d={d} markerEnd={`url(#arw-t-${arrowId})`} />;
                  })()}
                </svg>
              )}
              {bars}
              {movePreview && movePreview.rowDelta !== 0 && (() => {
                // 세로 재정렬 프리뷰 — 그룹 전체 고스트가 목표 행으로 이동 + 삽입 위치 가로선
                const targetRow = (rowMap.get(movePreview.id) ?? 0) + movePreview.rowDelta;
                const groupEvs = sorted.filter((e) => groupKey(e) === movePreview.groupKey);
                return (
                  <React.Fragment>
                    <div className={styles.tlDropRow} style={{ top: targetRow * ROW_H, width: totalW }} />
                    {groupEvs.map((ge) => {
                      const i = dayIndex.get(ge.date);
                      if (i == null) return null;
                      const iEnd = dayIndex.get(eventEndDate(ge)) ?? i;
                      const span = Math.max(1, iEnd - i + 1);
                      return (
                        <div key={ge.id} className={styles.tlBarGhost} style={{ left: i * COL_W + 4, top: targetRow * ROW_H + 9, height: ROW_H - 10, width: span * COL_W - 8, ["--_c" as string]: eventColorVar(ge, labels) }}>
                          <span className={styles.tlBarDot} />
                          <span className={styles.tlBarTitle}>{ge.title || t("(제목 없음)", "(Untitled)")}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })()}
              {movePreview && movePreview.rowDelta === 0 && movePreview.dayDelta !== 0 && (() => {
                // 가로 날짜 이동 프리뷰 — 잡은 이벤트 하나만 이동 + 날짜 뱃지
                const ev = sorted.find((e) => e.id === movePreview.id);
                const g = ev && barGeom.get(ev.id);
                const i = ev && dayIndex.get(ev.date);
                if (!ev || !g || i == null) return null;
                const iEnd = dayIndex.get(eventEndDate(ev)) ?? i;
                const span = Math.max(1, iEnd - i + 1);
                const gi = i + movePreview.dayDelta;
                const targetDate = toDateStr(addDays(parseDate(ev.date)!, movePreview.dayDelta));
                return (
                  <React.Fragment>
                    <div className={styles.tlDropLine} style={{ left: gi * COL_W }}>
                      <span className={styles.tlDropDate}>{formatDateValue(targetDate, null, language)}</span>
                    </div>
                    <div className={styles.tlBarGhost} style={{ left: gi * COL_W + 4, top: g.row * ROW_H + 9, height: ROW_H - 10, width: span * COL_W - 8, ["--_c" as string]: eventColorVar(ev, labels) }}>
                      <span className={styles.tlBarDot} />
                      <span className={styles.tlBarTitle}>{ev.title || t("(제목 없음)", "(Untitled)")}</span>
                    </div>
                  </React.Fragment>
                );
              })()}
            </div>
          </div>
        </div>

      <EventPreview hover={hover} labels={labels} language={language} onMouseEnter={keepOpen} onMouseLeave={hideSoon} />
    </div>
  );
}

const TimelineView = React.forwardRef(TimelineViewInner);
export default TimelineView;
