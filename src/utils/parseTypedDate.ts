/**
 * 날짜 칸에 이어서 적은 글을 저장 형식으로 — "19990827" · "990827" · "1999-08-27" · "1999.8.27" · "1999/08/27".
 *
 * 저장 형식은 PeriodPicker 와 같다: "1999" | "1999-08" | "1999-08-27" | "1999-08-27T14:30".
 * 형식(format)보다 자세한 부분은 버리고, 모자란 부분은 비운다(연.월.일 형식에 "1999" 만 적으면 "1999").
 * 없는 날짜(2월 30일 · 13월)나 범위(min · max) 밖이면 null.
 */
export type TypedDateFormat = "year" | "yearMonth" | "date" | "dateTime";

export interface ParsedTypedDate {
  /** 저장 형식 문자열 — 빈 입력이면 "" */
  value: string;
  /** 형식의 끝 자리까지 다 적었는지(연.월.일이면 일까지) — 적는 도중 바로 적용할지 가른다 */
  complete: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 두 자리 연도 — 올해 + 5년까지는 20xx, 그 위는 19xx ("99" → 1999, "26" → 2026) */
function expandYear(yy: number, now: Date): number {
  const pivot = (now.getFullYear() % 100) + 5;
  return yy <= pivot ? 2000 + yy : 1900 + yy;
}

function daysIn(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 구분자 없는 숫자열 → [연, 월, 일, 시, 분] 조각. 길이로 가른다 */
function splitDigits(s: string, format: TypedDateFormat): string[] | null {
  const n = s.length;
  if (format === "year") return n === 4 || n === 2 ? [s] : null;
  if (format === "yearMonth") {
    if (n === 6) return [s.slice(0, 4), s.slice(4)]; // 199908
    if (n === 5) return [s.slice(0, 4), s.slice(4)]; // 19998
    if (n === 4 || n === 2) return [s]; // 연도만
    return null;
  }
  // date · dateTime
  if (n === 12 && format === "dateTime") return [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8), s.slice(8, 10), s.slice(10)];
  if (n === 10 && format === "dateTime") return [s.slice(0, 2), s.slice(2, 4), s.slice(4, 6), s.slice(6, 8), s.slice(8)];
  if (n === 8) return [s.slice(0, 4), s.slice(4, 6), s.slice(6)]; // 19990827
  if (n === 6) return [s.slice(0, 2), s.slice(2, 4), s.slice(4)]; // 990827
  if (n === 4 || n === 2) return [s]; // 연도만
  return null;
}

export function parseTypedDate(
  raw: string,
  format: TypedDateFormat,
  opts: { now?: Date; min?: Date; max?: Date } = {},
): ParsedTypedDate | null {
  const now = opts.now ?? new Date();
  const text = raw.trim();
  if (!text) return { value: "", complete: false };
  const parts = /\D/.test(text)
    ? text.split(/\D+/).filter(Boolean)
    : splitDigits(text, format);
  if (!parts || parts.length === 0 || parts.length > 5) return null;

  const [ys, ms, ds, hs, mis] = parts;
  if (ys.length !== 4 && ys.length !== 2) return null;
  const year = ys.length === 2 ? expandYear(Number(ys), now) : Number(ys);

  const want = format === "year" ? 1 : format === "yearMonth" ? 2 : format === "date" ? 3 : 5;
  const take = Math.min(parts.length, want);

  const month = take >= 2 ? Number(ms) : undefined;
  if (month !== undefined && (ms.length > 2 || month < 1 || month > 12)) return null;
  const day = take >= 3 ? Number(ds) : undefined;
  if (day !== undefined && (ds.length > 2 || day < 1 || day > daysIn(year, month!))) return null;
  const hour = take >= 4 ? Number(hs) : undefined;
  if (hour !== undefined && (hs.length > 2 || hour > 23)) return null;
  const minute = take >= 5 ? Number(mis) : undefined;
  if (minute !== undefined && (mis.length > 2 || minute > 59)) return null;

  // 범위 — 적은 자리까지만 견준다(연도만 적었으면 연도로)
  const lo = new Date(year, (month ?? 1) - 1, day ?? 1);
  const hi = new Date(year, (month ?? 12) - 1, day ?? daysIn(year, month ?? 12));
  if (opts.min && hi < new Date(opts.min.getFullYear(), opts.min.getMonth(), opts.min.getDate())) return null;
  if (opts.max && lo > new Date(opts.max.getFullYear(), opts.max.getMonth(), opts.max.getDate())) return null;

  let value = String(year);
  if (month !== undefined) value += `-${pad(month)}`;
  if (day !== undefined) value += `-${pad(day)}`;
  if (hour !== undefined) value += `T${pad(hour)}:${pad(minute ?? 0)}`;
  // 시각 형식에서 시를 적었으면 끝까지 적은 것으로 본다(분은 00)
  const complete = format === "dateTime" ? hour !== undefined : take === want;
  return { value, complete };
}

/** 저장 형식 → 칸에 보일 글 ("1999-08-27T14:30" → "1999.08.27 14:30") */
export function formatTypedDate(value: string): string {
  if (!value) return "";
  const [date, time] = value.split("T");
  return time ? `${date.replace(/-/g, ".")} ${time}` : date.replace(/-/g, ".");
}

/** 형식별 안내 글 */
export const TYPED_DATE_PLACEHOLDER: Record<TypedDateFormat, string> = {
  year: "YYYY",
  yearMonth: "YYYY.MM",
  date: "YYYY.MM.DD",
  dateTime: "YYYY.MM.DD HH:mm",
};
