import { SITE_TIME_ZONE } from "@/constants";

/** 영어 월 약어 (0부터). 타임라인 카드·인덱스가 EN 표기에 쓴다. */
export const MONTHS_SHORT_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/* 날짜를 한국 시간 기준으로 나눈다. 실행 환경의 시간대(서버는 UTC, 브라우저는 제각각)를 따르면 서버가 미리 그린 날짜와
   브라우저가 그린 날짜가 갈려 하이드레이션이 어긋난다. */
const PARTS = new Intl.DateTimeFormat("en-US", { timeZone: SITE_TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" });

/** 한국 시간의 연 · 월(0부터) · 일. 읽을 수 없는 날짜면 null */
export function siteDateParts(value: string): { year: number; month: number; day: number } | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = PARTS.formatToParts(date);
  const part = (type: "year" | "month" | "day") => Number(parts.find((p) => p.type === type)?.value);
  return { year: part("year"), month: part("month") - 1, day: part("day") };
}
