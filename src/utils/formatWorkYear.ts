import type { DatePeriod } from "@/data/profile";
import { formatPeriod } from "@/utils/formatPeriod";

/**
 * works.year 에 JSON 으로 저장된 기간을 읽는다. JSON 이 아니거나 모양이 맞지 않으면 null.
 *
 * 편집기는 단일 연도("2024")는 글자 그대로 저장하고, 기간·월 단위·진행 중은 DatePeriod 를 JSON 으로 저장한다
 * (workEditor/periodFormat 의 serializePeriodAsYear).
 */
export function parseStoredPeriod(year: string | number | null | undefined): DatePeriod | null {
  const trimmed = String(year ?? "").trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.start === "string" && parsed.format) return parsed as DatePeriod;
  } catch {
    /* JSON 이 아니다 */
  }
  return null;
}

/**
 * 작업물 연도를 화면에 찍을 글자로 바꾼다.
 *
 * 저장된 값을 그대로 찍으면 기간으로 저장한 작업물은 `{"start":"2024-03",...}` 가 보였다(#1115).
 * JSON 이면 프로필 경력과 같은 formatPeriod 로 "2024.03 - 2024.06", "2024 - 현재" 처럼 바꾸고,
 * 단일 연도처럼 JSON 이 아닌 값은 그대로 둔다.
 */
export function formatWorkYear(year: string | number | null | undefined, language: "ko" | "en"): string {
  const period = parseStoredPeriod(year);
  if (period) return formatPeriod(period, language);
  return String(year ?? "").trim();
}
