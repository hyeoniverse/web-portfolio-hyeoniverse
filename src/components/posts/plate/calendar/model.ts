// ── 이벤트 달력 데이터 모델 ──
import { toDateStr } from "../dateUtils";

/** 라벨 = 이름 + 색. 달력 단위로 공유(labels)되고 이벤트는 labelId 로 참조. */
export type EventLabel = {
  id: string;
  name: string;
  color: string; // 팔레트 키(EVENT_COLORS) 또는 커스텀 색 값(hex 등)
};

/** 이벤트 상태 (노션식) */
export type EventStatusKey = "todo" | "doing" | "done" | "hold";
export const EVENT_STATUSES: { key: EventStatusKey; name: [string, string]; color: string }[] = [
  { key: "todo", name: ["예정", "To-do"], color: "var(--text-tertiary)" },
  { key: "doing", name: ["진행 중", "In progress"], color: "var(--color-info)" },
  { key: "done", name: ["완료", "Done"], color: "var(--color-success)" },
  { key: "hold", name: ["중단", "On hold"], color: "var(--color-error)" },
];
export function statusOf(key?: string) {
  return key ? EVENT_STATUSES.find((s) => s.key === key) : undefined;
}
export function statusName(key: string | undefined, language: string): string {
  const s = statusOf(key);
  return s ? (language === "ko" ? s.name[0] : s.name[1]) : "";
}

/** 이벤트 중요도 */
export type EventPriorityKey = "high" | "normal" | "low";
export const EVENT_PRIORITIES: { key: EventPriorityKey; name: [string, string]; color: string }[] = [
  { key: "high", name: ["높음", "High"], color: "var(--color-error)" },
  { key: "normal", name: ["보통", "Normal"], color: "var(--color-info)" },
  { key: "low", name: ["낮음", "Low"], color: "var(--text-tertiary)" },
];
export function priorityOf(key?: string) {
  return key ? EVENT_PRIORITIES.find((p) => p.key === key) : undefined;
}
export function priorityName(key: string | undefined, language: string): string {
  const p = priorityOf(key);
  return p ? (language === "ko" ? p.name[0] : p.name[1]) : "";
}

export type CalEvent = {
  id: string;
  date: string;    // "YYYY-MM-DD" (시작일)
  endDate?: string; // "YYYY-MM-DD" (종료일, 기간 이벤트일 때 date 보다 이후)
  status?: EventStatusKey; // 상태
  priority?: EventPriorityKey; // 중요도
  title: string;
  desc?: string;   // 내용/설명 (선택)
  time?: string;   // "HH:mm" (시작 시각, 선택)
  endTime?: string; // "HH:mm" (종료 시각, time 있을 때만 의미. time 보다 이후)
  labelId?: string; // → CalendarData.labels
  tags?: string[]; // 자유 텍스트 태그 (달력 내 공유·자동완성)
  color?: string;  // (legacy) 라벨 도입 전 단일 색 — labelId 없을 때 fallback
  deps?: string[]; // 선행 작업(predecessor) 이벤트 id 들. 후속 작업은 역방향(이 id 를 deps 에 가진 이벤트)으로 계산.
  repeat?: RecurRule; // 반복 규칙 (마스터 이벤트에만). 없으면 단일.
  exdates?: string[]; // 반복에서 제외할 날짜들 ("이 일정만 삭제/수정" 시 원본 회차 제외)
  order?: number;     // 타임라인 세로 순서(행). 없으면 날짜순 기본. DnD 세로 이동 시 설정됨.
  master?: string;    // (가상) 반복 확장으로 생성된 occurrence — 원본(마스터) 이벤트 id. 저장 안 됨.
};

export type RecurFreq = "daily" | "weekly" | "monthly" | "yearly";
// interval: 매 N(일/주/월/년)마다 (기본 1).
// byweekday: weekly = 해당 요일들(0=일~6=토). monthly·yearly "조건 지정" = [단일 요일].
// bymonthday: monthly "날짜 지정" = 해당 일(1~31).
// bymonth: yearly = 해당 달(1~12).
// bysetpos: monthly·yearly "조건 지정" 서수 = 1~5(n번째), -1(마지막), -2(끝에서 두 번째). byweekday 와 함께 "n번째 요일".
// 종료: until("YYYY-MM-DD" 포함) 또는 count(총 발생 횟수) — 둘 다 없으면 안 함(무한). 둘 다 있으면 먼저 도달하는 쪽.
export type RecurRule = { freq: RecurFreq; interval?: number; byweekday?: number[]; bymonthday?: number[]; bymonth?: number[]; bysetpos?: number; until?: string; count?: number };

const _pad2 = (n: number) => String(n).padStart(2, "0");
const _fmtDate = (d: Date) => `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())}`;

/** 반복 규칙에 따른 occurrence 시작일들(문자열) — until/최대 400회. */
// 특정 달에서 요일이 weekdaySet 에 속하는 날들을 모아 setpos 번째 → Date | null.
//   setpos > 0: 앞에서 n번째. setpos < 0: 뒤에서 (-1=마지막, -2=끝에서 두 번째).
//   단일 요일 집합이면 "n번째 월요일", {1~5}면 "n번째 평일", {0,6}면 "n번째 주말", {0~6}면 "n번째 날".
function nthSetposDayOfMonth(year: number, month0: number, weekdaySet: Set<number>, setpos: number): Date | null {
  const dim = new Date(year, month0 + 1, 0).getDate();
  const days: number[] = [];
  for (let d = 1; d <= dim; d++) {
    if (weekdaySet.has(new Date(year, month0, d).getDay())) days.push(d);
  }
  if (days.length === 0) return null;
  const idx = setpos > 0 ? setpos - 1 : days.length + setpos; // -1 → 마지막, -2 → 끝에서 두 번째
  if (idx < 0 || idx >= days.length) return null;
  return new Date(year, month0, days[idx]);
}

function* recurDates(startStr: string, rule: RecurRule): Generator<string> {
  const start = new Date(startStr + "T00:00:00");
  if (isNaN(start.getTime())) return;
  const interval = Math.max(1, Math.floor(rule.interval ?? 1));
  const { freq, until } = rule;
  const max = rule.count && rule.count > 0 ? Math.min(400, Math.floor(rule.count)) : 400;
  const weekdays = rule.byweekday && rule.byweekday.length > 0
    ? [...new Set(rule.byweekday)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
    : null;
  const setpos = typeof rule.bysetpos === "number" ? rule.bysetpos : null;
  let count = 0;

  // 한 period 내에서 정렬된 Date[] 를 방출 — start 이전은 skip, until 초과는 중단(false 반환)
  const emitDates = function* (dates: Date[]): Generator<string, boolean> {
    for (const d of dates.sort((a, b) => a.getTime() - b.getTime())) {
      if (d < start) continue;
      const s = _fmtDate(d);
      if (until && s > until) return false;
      yield s;
      if (++count >= max) return false;
    }
    return true;
  };

  if (freq === "weekly" && weekdays) {
    // 주 시작(일요일) 기준 interval 주 간격, 각 주의 선택 요일
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - start.getDay());
    for (let w = 0; count < max && w <= 400 * interval + 7; w += interval) {
      const dates = weekdays.map((wd) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + w * 7 + wd); return d; });
      if (!(yield* emitDates(dates))) return;
    }
    return;
  }

  if (freq === "monthly") {
    for (let m = 0; count < max && m <= 400 * interval; m += interval) {
      const base = new Date(start.getFullYear(), start.getMonth() + m, 1);
      const y = base.getFullYear(), mo = base.getMonth();
      let dates: Date[];
      if (rule.bymonthday && rule.bymonthday.length > 0) {
        dates = [...new Set(rule.bymonthday)].filter((n) => n >= 1 && n <= 31)
          .map((n) => new Date(y, mo, n)).filter((d) => d.getMonth() === mo); // 그 달에 없는 날(31 등) 제외
      } else if (setpos != null && weekdays && weekdays.length > 0) {
        const d = nthSetposDayOfMonth(y, mo, new Set(weekdays), setpos);
        dates = d ? [d] : [];
      } else {
        const d = new Date(y, mo, start.getDate());
        dates = d.getMonth() === mo ? [d] : []; // 매월 같은 날 — 없는 달(2월 30 등) 건너뜀
      }
      if (!(yield* emitDates(dates))) return;
    }
    return;
  }

  if (freq === "yearly") {
    const months0 = rule.bymonth && rule.bymonth.length > 0
      ? [...new Set(rule.bymonth)].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b).map((n) => n - 1)
      : [start.getMonth()];
    for (let yi = 0; count < max && yi <= 400 * interval; yi += interval) {
      const y = start.getFullYear() + yi;
      const dates: Date[] = [];
      for (const mo of months0) {
        if (setpos != null && weekdays && weekdays.length > 0) {
          const d = nthSetposDayOfMonth(y, mo, new Set(weekdays), setpos);
          if (d) dates.push(d);
        } else {
          const d = new Date(y, mo, start.getDate());
          if (d.getMonth() === mo) dates.push(d);
        }
      }
      if (!(yield* emitDates(dates))) return;
    }
    return;
  }

  // daily (+ byweekday 없는 weekly 도 안전하게)
  const cur = new Date(start);
  for (; count < max; count++) {
    const s = _fmtDate(cur);
    if (until && s > until) return;
    yield s;
    if (freq === "weekly") cur.setDate(cur.getDate() + 7 * interval);
    else cur.setDate(cur.getDate() + interval);
  }
}

/** 반복 규칙 → 사람이 읽는 요약 ("매주 월·수", "2주마다", "매일 · 10회" 등) */
export function recurSummary(rule: RecurRule, language = "ko", withEnd = true): string {
  const ko = language === "ko";
  const iv = Math.max(1, Math.floor(rule.interval ?? 1));
  const wdN = ko ? ["일", "월", "화", "수", "목", "금", "토"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const moN = ko ? null : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ordName = (p: number): string => {
    if (ko) return ({ 1: "첫 번째", 2: "두 번째", 3: "세 번째", 4: "네 번째", 5: "다섯 번째", [-1]: "마지막", [-2]: "끝에서 두 번째" } as Record<number, string>)[p] ?? `${p}번째`;
    return ({ 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", [-1]: "last", [-2]: "2nd-to-last" } as Record<number, string>)[p] ?? `${p}`;
  };
  const unit = rule.freq === "daily" ? (ko ? "일" : "day") : rule.freq === "weekly" ? (ko ? "주" : "week") : rule.freq === "monthly" ? (ko ? "개월" : "month") : (ko ? "년" : "year");
  let base: string;
  if (iv === 1) base = rule.freq === "daily" ? (ko ? "매일" : "Daily") : rule.freq === "weekly" ? (ko ? "매주" : "Weekly") : rule.freq === "monthly" ? (ko ? "매월" : "Monthly") : (ko ? "매년" : "Yearly");
  else base = ko ? `${iv}${unit}마다` : `Every ${iv} ${unit}s`;

  const weekdaySetName = (wds: number[]): string => {
    const s = [...new Set(wds)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
    const key = s.join(",");
    if (key === "0,1,2,3,4,5,6") return ko ? "일" : "day";
    if (key === "1,2,3,4,5") return ko ? "평일" : "weekday";
    if (key === "0,6") return ko ? "주말" : "weekend day";
    if (s.length === 1) return ko ? `${wdN[s[0]]}요일` : wdN[s[0]];
    return s.map((d) => wdN[d]).join("·");
  };
  const ordWd = (rule.bysetpos != null && rule.byweekday && rule.byweekday.length > 0)
    ? `${ordName(rule.bysetpos)} ${weekdaySetName(rule.byweekday)}`
    : null;

  if (rule.freq === "weekly" && rule.byweekday && rule.byweekday.length > 0) {
    const days = [...new Set(rule.byweekday)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b).map((d) => wdN[d]);
    if (days.length) base += ` ${days.join("·")}`;
  } else if (rule.freq === "monthly") {
    if (rule.bymonthday && rule.bymonthday.length > 0) {
      const ds = [...new Set(rule.bymonthday)].filter((n) => n >= 1 && n <= 31).sort((a, b) => a - b);
      if (ds.length) base += ko ? ` ${ds.join("·")}일` : ` on ${ds.join(",")}`;
    } else if (ordWd) base += ` ${ordWd}`;
  } else if (rule.freq === "yearly") {
    if (rule.bymonth && rule.bymonth.length > 0) {
      const ms = [...new Set(rule.bymonth)].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);
      if (ms.length) base += ` ${ms.map((m) => (ko ? `${m}월` : moN![m - 1])).join("·")}`;
    }
    if (ordWd) base += ` ${ordWd}`;
  }

  if (withEnd) {
    if (rule.count && rule.count > 0) base += ko ? ` · ${rule.count}회` : ` · ${rule.count}×`;
    else if (rule.until) base += ` · ~ ${rule.until}`;
  }
  return base;
}

/** 이벤트가 실제로 걸치는 종료일 (endDate 없거나 이전이면 date) */
export function eventEndDate(ev: CalEvent): string {
  return ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
}
/** 반복 이벤트(마스터) 또는 그 가상 occurrence 인지 */
export function isRecurring(ev: CalEvent): boolean {
  return !!(ev.repeat || ev.master);
}
/** 반복 마스터를 가상 occurrence 로 확장 — 표시용. 마스터 시작일부터 freq 간격, until/최대 400회. */
export function expandEvents(events: CalEvent[]): CalEvent[] {
  const out: CalEvent[] = [];
  for (const ev of events) {
    if (!ev.repeat) { out.push(ev); continue; }
    const start = new Date(ev.date + "T00:00:00");
    if (isNaN(start.getTime())) { out.push(ev); continue; }
    const endD = eventEndDate(ev);
    const spanDays = endD > ev.date ? Math.round((new Date(endD + "T00:00:00").getTime() - start.getTime()) / 86400000) : 0;
    const ex = ev.exdates ? new Set(ev.exdates) : null;
    let n = 0;
    for (const occDate of recurDates(ev.date, ev.repeat)) {
      if (ex?.has(occDate)) continue; // "이 일정만" 예외 처리된 회차는 건너뜀
      const occ: CalEvent = { ...ev, date: occDate };
      delete occ.exdates;
      if (spanDays > 0) { const e = new Date(occDate + "T00:00:00"); e.setDate(e.getDate() + spanDays); occ.endDate = _fmtDate(e); }
      if (occDate !== ev.date) { occ.id = `${ev.id}#${occDate}`; occ.master = ev.id; delete occ.repeat; }
      out.push(occ);
      if (++n >= 400) break;
    }
  }
  return out;
}

/** 시각 표기 체계 — 12h(오전/오후) 또는 24h */
export type TimeFormat = "12h" | "24h";
/** "HH:MM" → 표시 문자열. 12h면 "1:30 PM"/"1 PM", 24h면 "13:30" */
export function formatClock(hhmm: string, fmt: TimeFormat = "12h"): string {
  const [h, m] = hhmm.split(":").map(Number);
  const mm = String(m || 0).padStart(2, "0");
  if (fmt === "24h") return `${String(h || 0).padStart(2, "0")}:${mm}`;
  const ap = (h % 24) < 12 ? "AM" : "PM";
  const h12 = (h % 12) === 0 ? 12 : h % 12;
  return (m || 0) === 0 ? `${h12} ${ap}` : `${h12}:${mm} ${ap}`;
}
/** 시간축 정각 라벨 (h: 0~24). 12h면 "12 AM"/"1 PM", 24h면 "13:00" */
export function formatHourLabel(h: number, fmt: TimeFormat = "12h"): string {
  if (fmt === "24h") return `${String(h).padStart(2, "0")}:00`;
  const hh = h % 24;
  const ap = hh < 12 ? "AM" : "PM";
  const h12 = (hh % 12) === 0 ? 12 : hh % 12;
  return `${h12} ${ap}`;
}
/** 시각 표시 — "10:00" 또는 "10:00–11:30" (endTime 이 time 보다 이후일 때만 범위) */
export function eventTimeLabel(ev: { time?: string; endTime?: string }, fmt: TimeFormat = "12h"): string {
  if (!ev.time) return "";
  if (ev.endTime && ev.endTime > ev.time) return `${formatClock(ev.time, fmt)}–${formatClock(ev.endTime, fmt)}`;
  return formatClock(ev.time, fmt);
}
/** 이벤트가 걸치는 날짜 목록 ["YYYY-MM-DD", ...] */
export function eventDates(ev: CalEvent): string[] {
  const end = eventEndDate(ev);
  if (end === ev.date) return [ev.date];
  const out: string[] = [];
  const s = new Date(ev.date + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  for (let d = s; d <= e; d.setDate(d.getDate() + 1)) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
}

/** 이벤트 제목/내용/태그 글자수·개수 제한 */
export const EVENT_TITLE_MAX = 80;
export const EVENT_LABEL_MAX = 24;

export type CalendarData = {
  month: string;      // "YYYY-MM" — 처음 보여줄 달
  events: CalEvent[];
  labels: EventLabel[]; // 공유 라벨 정의
  width?: string;     // 블록 너비 (예: "70%") — 크기 조절
  timeFormat?: TimeFormat; // 시각 표기 (기본 12h)
  view?: "month" | "week" | "day" | "timeline"; // 마지막 뷰 모드 — 편집기·리더가 같은 뷰로 열림
};

/** 이벤트의 표시 색 — labelId → label.color, 없으면 legacy color, 그것도 없으면 기본 */
export function eventColorVar(ev: CalEvent, labels: EventLabel[]): string {
  const label = ev.labelId ? labels.find((l) => l.id === ev.labelId) : undefined;
  return colorVar(label?.color ?? ev.color);
}
export function findLabel(labelId: string | undefined, labels: EventLabel[]): EventLabel | undefined {
  return labelId ? labels.find((l) => l.id === labelId) : undefined;
}

/** 새 달력에 기본 세팅되는 라벨 (문서 lang 기준 ko/en). 색 키는 EVENT_COLORS 참조. */
export function defaultLabels(): EventLabel[] {
  const ko = typeof document !== "undefined" && (document.documentElement.lang || "ko").toLowerCase().startsWith("ko");
  const defs: { name: [string, string]; color: string }[] = [
    { name: ["중요", "Important"], color: "red" },
    { name: ["업무", "Work"], color: "orange" },
    { name: ["개인", "Personal"], color: "yellow" },
    { name: ["건강", "Health"], color: "green" },
    { name: ["미팅", "Meeting"], color: "blue" },
    { name: ["학습", "Study"], color: "indigo" },
    { name: ["기타", "Etc"], color: "violet" },
  ];
  return defs.map((d, i) => ({ id: `lbl-${i}`, name: ko ? d.name[0] : d.name[1], color: d.color }));
}

export type SearchScope = "all" | "title" | "desc";
export type SortField = "default" | "title" | "priority" | "status";
export type SortDir = "asc" | "desc";

/** 검색(범위별) + 라벨/태그 필터로 이벤트 필터링.
 *  activeLabels/activeTags 비어있으면 해당 필터 없음. 라벨·태그는 AND, 각 집합 내부는 OR. */
export function filterEvents(
  events: CalEvent[], query: string, scope: SearchScope,
  activeLabels: Set<string>, activeTags: Set<string>, activePriorities: Set<string> = new Set(),
): CalEvent[] {
  const q = query.trim().toLowerCase();
  return events.filter((e) => {
    if (activeLabels.size > 0 && (!e.labelId || !activeLabels.has(e.labelId))) return false;
    if (activeTags.size > 0 && !(e.tags || []).some((tg) => activeTags.has(tg))) return false;
    if (activePriorities.size > 0 && (!e.priority || !activePriorities.has(e.priority))) return false;
    if (!q) return true;
    const parts: string[] = [];
    if (scope === "all" || scope === "title") parts.push(e.title);
    if (scope === "all" || scope === "desc") parts.push(e.desc || "");
    return parts.join(" ").toLowerCase().includes(q);
  });
}

/** 이벤트 정렬 */
const PRIORITY_ORDER: Record<string, number> = { high: 0, normal: 1, low: 2 };
const STATUS_ORDER: Record<string, number> = { doing: 0, todo: 1, hold: 2, done: 3 };
export function sortEvents(events: CalEvent[], field: SortField, dir: SortDir = "asc"): CalEvent[] {
  const arr = [...events];
  const byDate = (a: CalEvent, b: CalEvent) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99"));
  // "default" → 정렬 없이 배열(생성/사용자 지정) 순서 유지
  if (field === "title") arr.sort((a, b) => a.title.localeCompare(b.title) || byDate(a, b));
  else if (field === "priority") arr.sort((a, b) => (PRIORITY_ORDER[a.priority ?? ""] ?? 9) - (PRIORITY_ORDER[b.priority ?? ""] ?? 9) || byDate(a, b));
  else if (field === "status") arr.sort((a, b) => (STATUS_ORDER[a.status ?? ""] ?? 9) - (STATUS_ORDER[b.status ?? ""] ?? 9) || byDate(a, b));
  if (dir === "desc") arr.reverse();
  return arr;
}

/** 달력 내 모든 이벤트에서 쓰인 태그 목록(중복 제거) — 공유/자동완성용 */
export function allTagsIn(events: CalEvent[]): string[] {
  const set = new Set<string>();
  for (const e of events) for (const tg of e.tags || []) { const t = tg.trim(); if (t) set.add(t); }
  return Array.from(set);
}

// ── 이벤트 관계(선행/후속) ──
function eventById(id: string, events: CalEvent[]): CalEvent | undefined {
  return events.find((e) => e.id === id);
}
/** id 의 후속 작업 — id 를 선행(deps)으로 가진 이벤트들 */
export function successorsOf(id: string, events: CalEvent[]): CalEvent[] {
  return events.filter((e) => (e.deps || []).includes(id));
}
/** 선행/후속 관계가 있는 이벤트 id 집합 (양쪽 다) — 뷰에서 관계 인디케이터 표시용 */
export function relatedEventIds(events: CalEvent[]): Set<string> {
  const s = new Set<string>();
  for (const e of events) {
    if (e.deps && e.deps.length) { s.add(e.id); for (const d of e.deps) s.add(d); }
  }
  return s;
}
/** id 이벤트가 속한 의존 연결 컴포넌트(선행·후속 전이 전체) id 집합. 연결 없으면 {id} 만. */
export function connectedComponent(id: string, events: CalEvent[]): Set<string> {
  const succMap = new Map<string, string[]>();
  for (const e of events) for (const p of e.deps || []) { if (!succMap.has(p)) succMap.set(p, []); succMap.get(p)!.push(e.id); }
  const set = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (set.has(cur)) continue;
    set.add(cur);
    const ev = events.find((e) => e.id === cur);
    for (const p of ev?.deps || []) stack.push(p);
    for (const s of succMap.get(cur) || []) stack.push(s);
  }
  return set;
}
/** predId 를 targetId 의 선행으로 추가하면 순환이 생기는가 (predId 가 targetId 에 이미 (전이적으로) 의존?) */
export function wouldCycle(targetId: string, predId: string, events: CalEvent[]): boolean {
  if (targetId === predId) return true;
  // predId 에서 deps 를 따라 올라가며 targetId 에 닿으면 순환
  const seen = new Set<string>();
  const stack = [predId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === targetId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const ev = eventById(cur, events);
    for (const d of ev?.deps || []) stack.push(d);
  }
  return false;
}

/** 위상 정렬 (deps=선행이 먼저). 순환이 있어도 남은 노드를 뒤에 붙여 안전. */
function topoOrder(events: CalEvent[]): string[] {
  const ids = events.map((e) => e.id);
  const idSet = new Set(ids);
  const indeg = new Map<string, number>();
  const succ = new Map<string, string[]>();
  for (const e of events) {
    let c = 0;
    for (const p of e.deps || []) if (idSet.has(p)) { c++; (succ.get(p) ?? succ.set(p, []).get(p)!).push(e.id); }
    indeg.set(e.id, c);
  }
  const queue = ids.filter((id) => (indeg.get(id) || 0) === 0);
  const out: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    for (const s of succ.get(id) || []) { const n = (indeg.get(s) || 0) - 1; indeg.set(s, n); if (n === 0) queue.push(s); }
  }
  for (const id of ids) if (!out.includes(id)) out.push(id);
  return out;
}

/** 선후(deps) 규칙: 선행의 "끝 날짜" < 후속의 "시작 날짜" (엄격·finish-to-start).
 *  위반 이벤트만 가장 가까운 유효 위치로 최소 이동(기간 유지).
 *  dir "forward": 후속을 (선행 끝+1)로 밀기(이벤트가 뒤로 이동/링크/기간 연장 시).
 *  dir "backward": 선행을 (후속 시작−기간−1)로 당기기(이벤트가 앞으로 이동 시). */
export function enforceDepOrder(events: CalEvent[], dir: "forward" | "backward"): CalEvent[] {
  const map = new Map(events.map((e) => [e.id, { ...e }]));
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const parse = (s: string) => new Date(s + "T00:00:00");
  const addDaysStr = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
  const spanDays = (e: CalEvent) => Math.round((parse(eventEndDate(e)).getTime() - parse(e.date).getTime()) / 86400000);
  const shift = (e: CalEvent, newStart: string) => {
    if (newStart === e.date) return;
    const delta = Math.round((parse(newStart).getTime() - parse(e.date).getTime()) / 86400000);
    e.date = newStart;
    if (e.endDate) e.endDate = addDaysStr(e.endDate, delta);
  };
  const order = topoOrder(events);
  if (dir === "forward") {
    for (const id of order) {
      const e = map.get(id)!;
      let maxPredEnd: string | null = null; // 선행들의 끝 날짜 최댓값
      for (const p of e.deps || []) { const pe = map.get(p); if (pe) { const pend = eventEndDate(pe); if (maxPredEnd === null || pend > maxPredEnd) maxPredEnd = pend; } }
      if (maxPredEnd) { const req = addDaysStr(maxPredEnd, 1); if (e.date < req) shift(e, req); } // 선행 끝 다음 날 이후
    }
  } else {
    const succ = new Map<string, string[]>();
    for (const e of events) for (const p of e.deps || []) { if (!succ.has(p)) succ.set(p, []); succ.get(p)!.push(e.id); }
    for (const id of [...order].reverse()) {
      const e = map.get(id)!;
      let minSuccStart: string | null = null; // 후속들의 시작 날짜 최솟값
      for (const s of succ.get(id) || []) { const se = map.get(s); if (se && (minSuccStart === null || se.date < minSuccStart)) minSuccStart = se.date; }
      if (minSuccStart) { const maxStart = addDaysStr(minSuccStart, -(spanDays(e) + 1)); if (e.date > maxStart) shift(e, maxStart); } // 끝이 후속 시작보다 하루 앞
    }
  }
  return events.map((e) => map.get(e.id)!);
}

/** 이벤트 색상 팔레트 (토큰 참조) */
export const EVENT_COLORS: { key: string; var: string }[] = [
  { key: "red", var: "var(--color-label-red)" },
  { key: "orange", var: "var(--color-label-orange)" },
  { key: "yellow", var: "var(--color-label-yellow)" },
  { key: "green", var: "var(--color-label-green)" },
  { key: "blue", var: "var(--color-label-blue)" },
  { key: "indigo", var: "var(--color-label-indigo)" },
  { key: "violet", var: "var(--color-label-violet)" },
];
/** 구버전 색 키 → 현재 토큰 (기존 이벤트 호환) */
const LEGACY_COLOR_ALIAS: Record<string, string> = {
  accent: "var(--color-accent)",
  amber: "var(--color-label-yellow)",
  info: "var(--color-label-blue)",
  success: "var(--color-label-green)",
  warning: "var(--color-label-yellow)",
  error: "var(--color-label-red)",
};
/** 리치 메모(HTML) → 미리보기용 순수 텍스트 */
export function stripHtml(html?: string): string {
  if (!html) return "";
  if (!/[<&]/.test(html)) return html.trim();
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\s+/g, " ").trim();
}

/** 라벨/색칩 추가 개수 상한 */
export const EVENT_LABEL_COUNT_MAX = 12;
export const EVENT_COLOR_COUNT_MAX = 8;

/** 팔레트 키면 토큰 var, 아니면 커스텀 색 값(hex/oklch 등) 그대로, 빈 값이면 기본색. */
export const colorVar = (key?: string) => {
  const preset = EVENT_COLORS.find((c) => c.key === key);
  if (preset) return preset.var;
  if (key && LEGACY_COLOR_ALIAS[key]) return LEGACY_COLOR_ALIAS[key];
  return key || EVENT_COLORS[0].var;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** 현재 달 "YYYY-MM" */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function parseMonth(month?: string | null): { y: number; m: number } {
  const m = month && /^(\d{4})-(\d{2})$/.exec(month);
  if (m) return { y: Number(m[1]), m: Number(m[2]) };
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}

/** month 를 delta(±개월) 이동 */
export function shiftMonth(month: string, delta: number): string {
  const { y, m } = parseMonth(month);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export type GridCell = { date: string; day: number; inMonth: boolean; isToday: boolean };

/** 6주(42칸) 그리드 — 주 시작은 일요일 */
export function monthGrid(month: string): GridCell[] {
  const { y, m } = parseMonth(month);
  const first = new Date(y, m - 1, 1);
  const startDow = first.getDay(); // 0=일
  const start = new Date(y, m - 1, 1 - startDow);
  const today = toDateStr(new Date());
  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const ds = toDateStr(d);
    cells.push({ date: ds, day: d.getDate(), inMonth: d.getMonth() === m - 1, isToday: ds === today });
  }
  return cells;
}

export function normalizeCalendar(raw: unknown): CalendarData {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const month = typeof d.month === "string" && /^\d{4}-\d{2}$/.test(d.month) ? d.month : currentMonth();
  const labels = Array.isArray(d.labels)
    ? (d.labels as unknown[]).map((l) => {
        const lb = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
        return { id: String(lb.id ?? ""), name: String(lb.name ?? ""), color: String(lb.color ?? EVENT_COLORS[0].key) } as EventLabel;
      }).filter((l) => l.id)
    : [];
  const events = Array.isArray(d.events)
    ? (d.events as unknown[]).map((e) => {
        const ev = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
        const tags = Array.isArray(ev.tags) ? (ev.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean) : [];
        return {
          id: String(ev.id ?? ""),
          date: String(ev.date ?? ""),
          ...(ev.endDate ? { endDate: String(ev.endDate) } : {}),
          ...(ev.status ? { status: String(ev.status) as EventStatusKey } : {}),
          ...(ev.priority ? { priority: String(ev.priority) as EventPriorityKey } : {}),
          title: String(ev.title ?? ""),
          ...(ev.desc ? { desc: String(ev.desc) } : {}),
          ...(ev.time ? { time: String(ev.time) } : {}),
          ...(ev.time && ev.endTime ? { endTime: String(ev.endTime) } : {}),
          ...(ev.labelId ? { labelId: String(ev.labelId) } : {}),
          ...(tags.length ? { tags } : {}),
          ...(ev.color ? { color: String(ev.color) } : {}),
          ...(Array.isArray(ev.deps) ? { deps: (ev.deps as unknown[]).map((x) => String(x)).filter(Boolean) } : {}),
          ...(() => {
            const r = ev.repeat as { freq?: string; interval?: unknown; byweekday?: unknown; until?: string; count?: unknown } | undefined;
            if (r && (r.freq === "daily" || r.freq === "weekly" || r.freq === "monthly")) {
              const iv = typeof r.interval === "number" && isFinite(r.interval) && r.interval > 1 ? Math.floor(r.interval) : undefined;
              const bw = Array.isArray(r.byweekday)
                ? [...new Set((r.byweekday as unknown[]).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b)
                : undefined;
              const cnt = typeof r.count === "number" && isFinite(r.count) && r.count > 0 ? Math.floor(r.count) : undefined;
              const hasUntil = typeof r.until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.until);
              return { repeat: {
                freq: r.freq,
                ...(iv ? { interval: iv } : {}),
                ...(r.freq === "weekly" && bw && bw.length > 0 ? { byweekday: bw } : {}),
                ...(cnt ? { count: cnt } : hasUntil ? { until: r.until } : {}),
              } };
            }
            return {};
          })(),
          ...(Array.isArray(ev.exdates) ? { exdates: (ev.exdates as unknown[]).map((x) => String(x)).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)) } : {}),
          ...(typeof ev.order === "number" && isFinite(ev.order) ? { order: ev.order } : {}),
        } as CalEvent;
      }).filter((e) => e.date)
    : [];
  const width = typeof d.width === "string" && /^\d{1,3}%$/.test(d.width) ? d.width : undefined;
  const timeFormat: TimeFormat | undefined = d.timeFormat === "24h" ? "24h" : d.timeFormat === "12h" ? "12h" : undefined;
  const view = d.view === "week" || d.view === "day" || d.view === "timeline" || d.view === "month" ? d.view : undefined;
  return { month, events, labels, ...(width ? { width } : {}), ...(timeFormat ? { timeFormat } : {}), ...(view ? { view } : {}) };
}

export function monthTitle(month: string, language: string): string {
  const { y, m } = parseMonth(month);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long" });
}

/** ISO 문자열 → "방금 / 3분 전 / 2시간 전 / 5일 전 / 3개월 전 / 1년 전" (relative). */
export function relTimeLabel(iso: string, language: string): string {
  const ms = new Date(iso).getTime();
  if (!ms) return "";
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  const ko = language === "ko";
  if (sec < 60) return ko ? "방금" : "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return ko ? `${min}분 전` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return ko ? `${hr}시간 전` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return ko ? `${day}일 전` : `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return ko ? `${mo}개월 전` : `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return ko ? `${yr}년 전` : `${yr}y ago`;
}

export function weekdayLabels(language: string): string[] {
  return language === "ko"
    ? ["일", "월", "화", "수", "목", "금", "토"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}
