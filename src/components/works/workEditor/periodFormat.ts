import { type DatePeriod } from "@/data/profile";
import { parseStoredPeriod } from "@/utils/formatWorkYear";
// ── year ↔ DatePeriod 변환 ──
// 기존 work.year 는 "2024" 같은 단순 문자열. 이제 "기간" 도 지원하기 위해 JSON 직렬화로 저장.
// 구버전 데이터와의 back-compat — JSON 이 아니면 단순 year 로 fallback.
// 화면에 찍을 때는 utils/formatWorkYear 를 거친다(JSON 을 그대로 찍지 않게).
export function parseYearAsPeriod(year: string): DatePeriod {
  // 신규 작품(빈 year) 은 "기간으로 표시" default — end 를 빈 문자열로 둬서
  // PeriodPicker 의 hasRange (`end !== undefined`) 가 true 가 되게 함
  if (!year || !year.trim()) return { start: "", end: "", format: "year" };
  const parsed = parseStoredPeriod(year);
  if (parsed) return parsed;
  // 구버전: "2024" / "2024-2025" / "2024.01" 등 — start 만 채움 (range OFF, back-compat 유지)
  return { start: year.trim(), format: "year" };
}

export function serializePeriodAsYear(p: DatePeriod): string {
  if (!p.start) return "";
  // 기간 / 진행중 정보가 없으면 단순 string 으로 저장 (back-compat 유지)
  if (!p.end && !p.ongoing && p.format === "year") return p.start;
  return JSON.stringify(p);
}
