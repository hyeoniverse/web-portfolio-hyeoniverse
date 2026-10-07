"use client";

import { useMemo, useState } from "react";
import type { LocalizedText } from "@/types/common";
import type { SelectOption } from "@/types";
import { Calendar, Clock } from "@/components/icons";
import type { DatePeriod } from "@/data/profile";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPeriod } from "@/utils/formatPeriod";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import DatePickerPopover from "./DatePickerPopover";
import TimePickerPopover from "./TimePickerPopover";
import styles from "./DatePicker.module.css";
import Pressable from "@/components/ui/Pressable";

interface PeriodPickerProps {
  value: DatePeriod;
  onChange: (value: DatePeriod) => void;
  className?: string;
  /** true (default) — picker 내부에 preview 표시. false 면 외부에서 직접 렌더 (예: fieldLabel 옆) */
  showPreview?: boolean;
  /** 이 시점 이후는 선택 불가 (예: works 기록 — 미래 차단). Date 객체 */
  maxDate?: Date;
  /** 이 시점 이전은 선택 불가. Date 객체 */
  minDate?: Date;
  /** 고를 수 있는 형식 — 기본은 전부(연도 · 연.월 · 연.월.일 · 연.월.일.시). 프로필 경력처럼 시각이 필요 없는 곳은 줄인다 */
  formats?: DatePeriod["format"][];
}


type Format = DatePeriod["format"];

const FORMAT_OPTIONS: { value: Format; label: LocalizedText }[] = [
  { value: "year", label: { ko: "연도", en: "Year" } },
  { value: "yearMonth", label: { ko: "연.월", en: "Y.M" } },
  { value: "date", label: { ko: "연.월.일", en: "Y.M.D" } },
  { value: "dateTime", label: { ko: "연.월.일.시", en: "Y.M.D.h" } },
];

/** 날짜까지만 보는 달력에 넘길 형식 — 시각 형식은 날짜 달력을 쓴다 */
const calendarFormat = (f: Format): "year" | "yearMonth" | "date" => (f === "dateTime" ? "date" : f);

/** 해당 월의 최대 일수 (윤년 미고려, 2월=29) */
function daysInMonth(month: number): number {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

/** year/month/day 입력 — 공통 Select (editable=true) 사용.
 *  기본 dropdown, 더블클릭 시 자유 입력 input 으로 전환. */
function DatePart({
  value,
  options,
  onChange,
  disabled,
  maxLength,
  placeholder,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
  maxLength: number;
  placeholder?: string;
}) {
  return (
    <Select
      className={`${styles.datePart} ${maxLength === 4 ? styles.datePartYear : ""}`}
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      /* 기본(32) — 프로필·작업물 편집기의 이웃 입력칸이 전부 md 라 sm 이면 이 줄만 낮아 보인다 */
      width="min"
      editable
      editableInputProps={{
        maxLength,
        placeholder,
        // year (maxLength=4) 는 padding 없이, month/day (maxLength=2) 는 0 padding
        sanitize: (raw) => {
          const v = raw.replace(/\D/g, "").slice(0, maxLength);
          return maxLength === 2 && v ? v.padStart(2, "0") : v;
        },
      }}
    />
  );
}

/** "2024-03-15T14:30" → { year: "2024", month: "03", day: "15", hour: "14", minute: "30" } */
function parseDateStr(d: string | undefined): { year: string; month: string; day: string; hour: string; minute: string } {
  if (!d) return { year: "", month: "", day: "", hour: "", minute: "" };
  const [datePart, timePart = ""] = d.split("T");
  const parts = datePart.split("-");
  const [hour = "", minute = ""] = timePart.split(":");
  return {
    year: parts[0] || "",
    month: parts[1] || "",
    day: parts[2] || "",
    hour,
    minute,
  };
}

/** parts → "2024" | "2024-03" | "2024-03-15" | "2024-03-15T14:30" */
function buildDateStr(
  year: string,
  month: string,
  day: string,
  format: Format,
  hour = "",
  minute = "",
): string {
  if (format === "year") return year;
  if (format === "yearMonth") return month ? `${year}-${month}` : year;
  const date = day ? `${year}-${month || "01"}-${day}` : month ? `${year}-${month}` : year;
  /* 시각은 날짜가 다 있을 때만 붙인다. 시만 골랐으면 분은 00 */
  if (format === "dateTime" && day && hour) return `${date}T${hour}:${minute || "00"}`;
  return date;
}

function DateInputRow({
  label,
  dateStr,
  format,
  onChange,
  disabled,
  minDate,
  maxDate,
}: {
  label: string;
  dateStr: string;
  format: Format;
  onChange: (v: string) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}) {
  const { t } = useLanguage();
  const { year, month, day, hour, minute } = parseDateStr(dateStr);
  const maxDay = daysInMonth(Number(month) || 1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  // 현재 선택된 year/month 기준으로 month/day 의 cap 계산 (min/maxDate 가 같은 year/month 일 때만 조여짐)
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const minYear = minDate?.getFullYear();
  const minMonth = minDate ? minDate.getMonth() + 1 : undefined;
  const minDay = minDate?.getDate();
  const maxYear = maxDate?.getFullYear();
  const maxMonth = maxDate ? maxDate.getMonth() + 1 : undefined;
  const maxDayOfBoundMonth = maxDate?.getDate();
  const monthMinCap = minYear !== undefined && numericYear === minYear ? minMonth : undefined;
  const monthMaxCap = maxYear !== undefined && numericYear === maxYear ? maxMonth : undefined;
  const dayMinCap = (minYear !== undefined && numericYear === minYear && minMonth === numericMonth) ? minDay : undefined;
  const dayMaxCap = (maxYear !== undefined && numericYear === maxYear && maxMonth === numericMonth) ? maxDayOfBoundMonth : undefined;

  const update = (part: "year" | "month" | "day" | "hour" | "minute", val: string) => {
    const y = part === "year" ? val : year;
    const m = part === "month" ? val : month;
    const d = part === "day" ? val : day;
    const h = part === "hour" ? val : hour;
    const mi = part === "minute" ? val : minute;
    onChange(buildDateStr(y, m, d, format, h, mi));
  };

  return (
    /* 시각까지 적는 형식은 줄이 길어 시작·종료를 나란히 두지 않는다 — 한 줄 전체를 써서 폭이 정말 모자랄 때만 줄을 바꾼다 */
    <div className={`${styles.dateRow} ${format === "dateTime" ? styles.dateRowFull : ""}`}>
      {label && <span className={styles.dateLabel}>{label}</span>}
      <div className={styles.dateInputs}>
        {/* 날짜 묶음(연·월·일·달력)과 시각 묶음(시간·시·분·시계)은 각각 한 덩어리 — 줄이 모자라면 묶음 단위로 내린다 */}
        <span className={styles.dateGroup}>
        <DatePart
          value={year}
          options={(() => {
            const cur = new Date().getFullYear();
            const hi = maxYear !== undefined ? Math.min(cur + 5, maxYear) : cur + 5;
            const lo = minYear !== undefined ? Math.max(cur - 30, minYear) : cur - 30;
            const len = Math.max(1, hi - lo + 1);
            // 최신 → 과거 순으로 정렬
            return Array.from({ length: len }, (_, i) => {
              const y = String(hi - i);
              return { value: y, label: y };
            });
          })()}
          onChange={(v) => update("year", v)}
          disabled={disabled}
          maxLength={4}
          placeholder="YYYY"
        />
        {(format === "yearMonth" || format === "date" || format === "dateTime") && (
          <>
            <span className={styles.dateDot} aria-hidden />
            <DatePart
              value={month}
              options={(() => {
                const lo = monthMinCap ?? 1;
                const hi = monthMaxCap ?? 12;
                return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => {
                  const v = String(lo + i).padStart(2, "0");
                  return { value: v, label: v };
                });
              })()}
              onChange={(v) => update("month", v)}
              disabled={disabled}
              maxLength={2}
              placeholder="MM"
            />
          </>
        )}
        {(format === "date" || format === "dateTime") && (
          <>
            <span className={styles.dateDot} aria-hidden />
            <DatePart
              value={day}
              options={(() => {
                const lo = dayMinCap ?? 1;
                const hi = Math.min(maxDay, dayMaxCap ?? maxDay);
                return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => {
                  const v = String(lo + i).padStart(2, "0");
                  return { value: v, label: v };
                });
              })()}
              onChange={(v) => update("day", v)}
              disabled={disabled}
              maxLength={2}
              placeholder="DD"
            />
          </>
        )}
        {/* 날짜 달력 — 시각 형식이면 날짜 칸 바로 뒤, 아니면 줄 끝 */}
        <div className={styles.pickerAnchor}>
          <Pressable
            type="button"
            className={styles.pickerBtn}
            onClick={() => setPickerOpen(!pickerOpen)}
            disabled={disabled}
            aria-label="Open date picker"
          >
            <Calendar size={16} strokeWidth={1.5} />
          </Pressable>
          {pickerOpen && (
            <DatePickerPopover
              year={year}
              month={month}
              day={day}
              format={calendarFormat(format)}
              onSelect={(y, m, d) => {
                /* 달력은 날짜만 고른다 — 이미 고른 시각은 그대로 둔다 */
                onChange(buildDateStr(y, m, d, format, hour, minute));
              }}
              onClose={() => setPickerOpen(false)}
              minDate={minDate}
              maxDate={maxDate}
            />
          )}
        </div>
        </span>
        {/* 시각 — 날짜 뒤에 한 칸 띄워 시:분. 분은 1분 단위, 직접 입력(더블클릭)도 된다 */}
        {format === "dateTime" && (
          <span className={styles.dateGroup}>
            <span className={styles.dateTimeLabel}>{t("common.periodTime")}</span>
            <DatePart
              value={hour}
              options={Array.from({ length: 24 }, (_, i) => {
                const v = String(i).padStart(2, "0");
                return { value: v, label: v };
              })}
              onChange={(v) => update("hour", v)}
              disabled={disabled || !day}
              maxLength={2}
              placeholder="HH"
            />
            <span className={styles.dateSep} aria-hidden>:</span>
            <DatePart
              value={minute}
              options={Array.from({ length: 60 }, (_, i) => {
                const v = String(i).padStart(2, "0");
                return { value: v, label: v };
              })}
              onChange={(v) => update("minute", v)}
              disabled={disabled || !day}
              maxLength={2}
              placeholder="mm"
            />
            {/* 시각 선택 — 시·분 스피너(1분 단위) */}
            <div className={styles.pickerAnchor}>
              <Pressable
                type="button"
                className={styles.pickerBtn}
                onClick={() => setTimeOpen(!timeOpen)}
                disabled={disabled || !day}
                aria-label="Open time picker"
              >
                <Clock size={16} strokeWidth={1.5} />
              </Pressable>
              {timeOpen && (
                <TimePickerPopover
                  hour={hour || "00"}
                  minute={minute || "00"}
                  minuteStep={1}
                  onSelect={(h, mi) => onChange(buildDateStr(year, month, day, format, h, mi))}
                  onClose={() => setTimeOpen(false)}
                />
              )}
            </div>
          </span>
        )}
      </div>
    </div>
  );
}

export default function PeriodPicker({
  value,
  onChange,
  className,
  showPreview = true,
  minDate,
  maxDate,
  formats,
}: PeriodPickerProps) {
  const { t, language } = useLanguage();

  // 구 형식이나 undefined 방어
  const safeValue: DatePeriod = useMemo(
    () => value && typeof value === "object" && "format" in value
      ? value
      : { start: "", format: "year" },
    [value],
  );

  // end 를 빈 문자열("")로 두는 것도 "범위 사용" 의도로 인정.
  // toggleRange(false) 는 destructuring 으로 end 자체를 제거하므로 undefined ↔ defined 가 토글 신호.
  const hasRange = safeValue.end !== undefined || !!safeValue.ongoing;

  const preview = useMemo(
    () => formatPeriod(safeValue, language),
    [safeValue, language],
  );

  const setFormat = (format: Format) => {
    onChange({ ...safeValue, format });
  };

  const toggleRange = (checked: boolean) => {
    if (checked) {
      onChange({
        ...safeValue,
        end: safeValue.end || buildDateStr(new Date().getFullYear().toString(), "", "", safeValue.format),
      });
    } else {
      const { end: _, ongoing: __, ...rest } = safeValue;
      onChange(rest as DatePeriod);
    }
  };

  const toggleOngoing = (checked: boolean) => {
    if (checked) {
      const { end: _, ...rest } = safeValue;
      onChange({ ...rest, ongoing: true });
    } else {
      onChange({
        ...safeValue,
        ongoing: undefined,
        end: buildDateStr(new Date().getFullYear().toString(), "", "", safeValue.format),
      });
    }
  };

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      {/* Format selector + range toggle */}
      {(
        <div className={styles.formatRow}>
          <span className={styles.formatLabel}>{t("common.periodFormat")}</span>
          <div className={styles.formatSegment}>
            {FORMAT_OPTIONS.filter((opt) => !formats || formats.includes(opt.value) || opt.value === safeValue.format).map((opt) => (
              <Pressable
                key={opt.value}
                type="button"
                className={`${styles.formatBtn} ${safeValue.format === opt.value ? styles.formatBtnActive : ""}`}
                onClick={() => setFormat(opt.value)}
              >
                {opt.label[language]}
              </Pressable>
            ))}
          </div>
          <div className={styles.formatChecks}>
            <Checkbox
              checked={hasRange}
              onChange={toggleRange}
              shape="square"
              label={t("common.periodShowAsRange")}
            />
            {hasRange && (
              <Checkbox
                checked={!!safeValue.ongoing}
                onChange={toggleOngoing}
                shape="square"
                label={t("common.periodOngoing")}
              />
            )}
          </div>
        </div>
      )}

      {/* Preview — showPreview=false 면 외부에서 별도 위치에 렌더 (예: fieldLabel 옆) */}
      {showPreview && safeValue.start && (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>{t("common.periodPreview")}</span>
          <span className={styles.previewText}>{preview}</span>
        </div>
      )}

      {/* Start + End date — 기본 2열, 공간 부족 시 wrap */}
      <div className={styles.dateRows}>
        <DateInputRow
          label={t("common.periodStart")}
          dateStr={safeValue.start}
          format={safeValue.format}
          onChange={(v) => onChange({ ...safeValue, start: v })}
          minDate={minDate}
          maxDate={maxDate}
        />
        {hasRange && (
          <DateInputRow
            label={t("common.periodEnd")}
            dateStr={safeValue.end || ""}
            format={safeValue.format}
            onChange={(v) => onChange({ ...safeValue, end: v })}
            disabled={safeValue.ongoing}
            minDate={minDate}
            maxDate={maxDate}
          />
        )}
      </div>
    </div>
  );
}
