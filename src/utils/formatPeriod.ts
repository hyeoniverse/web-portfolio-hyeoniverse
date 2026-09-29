import type { DatePeriod } from "@/data/profile";

/**
 * DatePeriod를 사람이 읽을 수 있는 문자열로 포맷.
 * format에 따라 "2024" / "2024.03" / "2024.03.15" / "2024.03.15 14:30" 형태로 변환.
 */
export function formatPeriod(
  period: DatePeriod | null | undefined,
  language: "ko" | "en",
): string {
  if (!period || typeof period !== "object" || !("format" in period)) return "";
  const fmt = (d: string | undefined): string => {
    if (!d) return "";
    /* 시각이 붙은 값("2024-03-15T14:30") — 날짜 뒤에 한 칸 띄워 시각 */
    const [datePart, timePart] = d.split("T");
    const parts = datePart.split("-");
    if (period.format === "dateTime") {
      const date = parts.join(".");
      return timePart ? `${date} ${timePart.slice(0, 5)}` : date;
    }
    if (period.format === "year") return parts[0];
    if (period.format === "yearMonth")
      return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0];
    // date
    return parts.length >= 3
      ? `${parts[0]}.${parts[1]}.${parts[2]}`
      : parts.join(".");
  };

  if (!period?.start) return "";

  let result = fmt(period.start);

  if (period.ongoing) {
    const ongoingText = language === "ko" ? "현재" : "Present";
    result += ` - ${ongoingText}`;
  } else if (period.end) {
    result += ` - ${fmt(period.end)}`;
  }

  return result;
}
