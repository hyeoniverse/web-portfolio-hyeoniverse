// ── 날짜/시간 공용 유틸 (date_mention · calendar 공용) ──
// 날짜는 "YYYY-MM-DD", 시간은 "HH:mm"(선택) 문자열로 저장 — 타임존 이슈 없이 명확.

/** 방금 삽입한 date_mention 을 자동으로 편집 열기 위한 id 공유 (@ 메뉴 "날짜 선택…" → 삽입 후 picker 오픈) */
export const _pendingDateMentionOpen: { current: string | null } = { current: null };

export function genShortId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  } catch { /* noop */ }
  return `d-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "YYYY-MM-DD" (로컬 기준) */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD"(+"HH:mm") → 로컬 Date. 파싱 실패 시 null */
export function parseDate(date?: string | null, time?: string | null): Date | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [h, mi] = (time && /^(\d{1,2}):(\d{2})$/.test(time)) ? time.split(":").map(Number) : [0, 0];
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, mi);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 오늘/상대(offset일) 날짜 문자열 */
export function relativeDateStr(offsetDays: number, base?: Date): string {
  const d = base ? new Date(base) : new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateStr(d);
}

/**
 * 날짜(+시간) 표시 문자열 — locale 기반.
 * date only(ko): "2026년 7월 9일 (목)" / (en): "Thu, Jul 9, 2026"
 * with time: 위 + " · 오후 2:30" / " · 2:30 PM"
 */
export function formatDateValue(date?: string | null, time?: string | null, language: string = "ko"): string {
  const d = parseDate(date, time);
  if (!d) return "";
  const ko = language === "ko";
  const locale = ko ? "ko-KR" : "en-US";
  const datePart = d.toLocaleDateString(locale, ko
    ? { year: "numeric", month: "long", day: "numeric", weekday: "short" }
    : { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  if (!time) return datePart;
  const timePart = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}
