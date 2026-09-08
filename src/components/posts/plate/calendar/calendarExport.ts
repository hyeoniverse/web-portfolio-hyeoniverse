// ── 달력 내보내기 (ics / csv / json / markdown) ──
import { type CalendarData, type CalEvent, findLabel, eventEndDate } from "./model";
import { parseDate, toDateStr } from "../dateUtils";

export type ExportFormat = "ics" | "csv" | "json" | "md";

/** 이벤트를 날짜+시간 오름차순 정렬 */
function sortedEvents(cal: CalendarData): CalEvent[] {
  return [...cal.events].sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99")));
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
const ymd = (dateStr: string) => dateStr.replace(/-/g, "");
const nextDay = (dateStr: string) => {
  const d = parseDate(dateStr) ?? new Date();
  d.setDate(d.getDate() + 1);
  return ymd(toDateStr(d));
};
// 75옥텟 line folding (RFC5545) — 간단 버전(문자 기준)
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 73) { parts.push(" " + rest.slice(0, 73)); rest = rest.slice(73); }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

/** CalendarData → .ics 문자열 */
function toIcs(cal: CalendarData, title = "Calendar", stamp = "19700101T000000Z"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//web-portfolio//calendar//KO",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(title)}`,
  ];
  for (const ev of cal.events) {
    if (!ev.date) continue;
    const label = findLabel(ev.labelId, cal.labels);
    const descParts: string[] = [];
    if (ev.desc) descParts.push(ev.desc);
    if (label) descParts.push(`[${label.name}]`);
    if (ev.tags?.length) descParts.push(ev.tags.map((tg) => `#${tg}`).join(" "));
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${esc(ev.id || ev.date)}@web-portfolio`);
    lines.push(`DTSTAMP:${stamp}`);
    if (ev.time) {
      const dt = `${ymd(ev.date)}T${ev.time.replace(":", "")}00`;
      lines.push(`DTSTART:${dt}`);
      // 기간(종료일)이 있으면 종료일 다음날 00:00 까지
      if (ev.endDate && ev.endDate > ev.date) lines.push(`DTEND:${nextDay(eventEndDate(ev))}T000000`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(ev.date)}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay(eventEndDate(ev))}`);
    }
    lines.push(fold(`SUMMARY:${esc(ev.title || "(제목 없음)")}`));
    if (descParts.length) lines.push(fold(`DESCRIPTION:${esc(descParts.join("\n"))}`));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ── CSV ──
function csvCell(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
/** CalendarData → CSV (date,time,title,label,tags,description) */
function toCsv(cal: CalendarData): string {
  const header = ["date", "time", "title", "label", "tags", "description"];
  const rows = sortedEvents(cal).map((ev) => {
    const label = findLabel(ev.labelId, cal.labels);
    return [
      ev.date,
      ev.time || "",
      ev.title || "",
      label?.name || "",
      (ev.tags || []).join(" "),
      ev.desc || "",
    ].map((v) => csvCell(String(v))).join(",");
  });
  return "﻿" + [header.join(","), ...rows].join("\r\n"); // BOM(엑셀 한글)
}

// ── JSON ── 라벨명까지 resolve 한 읽기 좋은 구조
function toJson(cal: CalendarData): string {
  const events = sortedEvents(cal).map((ev) => ({
    date: ev.date,
    ...(ev.time ? { time: ev.time } : {}),
    title: ev.title,
    ...(ev.desc ? { desc: ev.desc } : {}),
    ...(ev.labelId ? { label: findLabel(ev.labelId, cal.labels)?.name || null } : {}),
    ...(ev.tags?.length ? { tags: ev.tags } : {}),
  }));
  return JSON.stringify({ labels: cal.labels.map((l) => ({ name: l.name, color: l.color })), events }, null, 2);
}

// ── Markdown ── 테이블
function mdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
function toMarkdown(cal: CalendarData, title = "Calendar"): string {
  const lines = [`# ${title}`, "", "| 날짜 | 시간 | 제목 | 라벨 | 태그 | 설명 |", "| --- | --- | --- | --- | --- | --- |"];
  for (const ev of sortedEvents(cal)) {
    const label = findLabel(ev.labelId, cal.labels);
    lines.push(`| ${mdCell(ev.date)} | ${mdCell(ev.time || "-")} | ${mdCell(ev.title || "")} | ${mdCell(label?.name || "-")} | ${mdCell((ev.tags || []).map((t) => `#${t}`).join(" ") || "-")} | ${mdCell(ev.desc || "-")} |`);
  }
  return lines.join("\n");
}

// ── 공통 다운로드 ──
function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const EXPORT_META: Record<ExportFormat, { ext: string; mime: string }> = {
  ics: { ext: "ics", mime: "text/calendar" },
  csv: { ext: "csv", mime: "text/csv" },
  json: { ext: "json", mime: "application/json" },
  md: { ext: "md", mime: "text/markdown" },
};

/** 지정 형식으로 달력 다운로드 */
export function downloadCalendar(cal: CalendarData, title = "calendar", format: ExportFormat = "ics") {
  let content: string;
  if (format === "csv") content = toCsv(cal);
  else if (format === "json") content = toJson(cal);
  else if (format === "md") content = toMarkdown(cal, title);
  else {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    content = toIcs(cal, title, stamp);
  }
  const { ext, mime } = EXPORT_META[format];
  const safe = (title || "calendar").replace(/[^\w가-힣-]+/g, "_");
  download(content, `${safe}.${ext}`, mime);
}
