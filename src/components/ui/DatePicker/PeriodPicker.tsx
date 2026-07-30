"use client";

import { useMemo, useState } from "react";
import type { LocalizedText } from "@/types/common";
import type { SelectOption } from "@/types";
import { Calendar } from "lucide-react";
import type { DatePeriod } from "@/data/profile";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPeriod } from "@/utils/formatPeriod";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import DatePickerPopover from "./DatePickerPopover";
import styles from "./DatePicker.module.css";

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
  /** "표시 형식 + 범위" row 숨김 — 호출부에서 PeriodFormatBar 로 직접 렌더할 때 */
  hideFormatRow?: boolean;
}

/** 외부에서 fieldLabel 등에 inline 으로 렌더하기 위한 format + range 선택 바.
 *  PeriodPicker 의 같은 props 와 짝지어 사용. */
export function PeriodFormatBar({
  value,
  onChange,
  compact = false,
}: {
  value: DatePeriod;
  onChange: (value: DatePeriod) => void;
  /** 라벨 ("표시 형식") 숨기고 segment 만 렌더 */
  compact?: boolean;
}) {
  const { t, language } = useLanguage();
  const safeValue: DatePeriod = value && typeof value === "object" && "format" in value
    ? value
    : { start: "", format: "year" };
  const hasRange = safeValue.end !== undefined || !!safeValue.ongoing;
  const setFormat = (format: Format) => onChange({ ...safeValue, format });
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
    <div className={styles.formatRow}>
      {!compact && (
        <span className={styles.formatLabel}>{t("admin.settings.profile.displayFormat")}</span>
      )}
      <div className={styles.formatSegment}>
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.formatBtn} ${safeValue.format === opt.value ? styles.formatBtnActive : ""}`}
            onClick={() => setFormat(opt.value)}
          >
            {opt.label[language]}
          </button>
        ))}
      </div>
      <div className={styles.formatChecks}>
        <Checkbox
          checked={hasRange}
          onChange={toggleRange}
          shape="square"
          label={t("admin.settings.profile.showAsRange")}
        />
        {hasRange && (
          <Checkbox
            checked={!!safeValue.ongoing}
            onChange={toggleOngoing}
            shape="square"
            label={t("admin.settings.profile.ongoing")}
          />
        )}
      </div>
    </div>
  );
}

type Format = DatePeriod["format"];

const FORMAT_OPTIONS: { value: Format; label: LocalizedText }[] = [
  { value: "year", label: { ko: "연도", en: "Year" } },
  { value: "yearMonth", label: { ko: "연.월", en: "Y.M" } },
  { value: "date", label: { ko: "연.월.일", en: "Y.M.D" } },
];

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
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      showCheck
      size="sm"
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

/** "2024-03-15" → { year: "2024", month: "03", day: "15" } */
function parseDateStr(d: string | undefined): { year: string; month: string; day: string } {
  if (!d) return { year: "", month: "", day: "" };
  const parts = d.split("-");
  return {
    year: parts[0] || "",
    month: parts[1] || "",
    day: parts[2] || "",
  };
}

/** parts → "2024" | "2024-03" | "2024-03-15" */
function buildDateStr(
  year: string,
  month: string,
  day: string,
  format: Format,
): string {
  if (format === "year") return year;
  if (format === "yearMonth") return month ? `${year}-${month}` : year;
  return day ? `${year}-${month || "01"}-${day}` : month ? `${year}-${month}` : year;
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
  const { year, month, day } = parseDateStr(dateStr);
  const maxDay = daysInMonth(Number(month) || 1);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const update = (part: "year" | "month" | "day", val: string) => {
    const y = part === "year" ? val : year;
    const m = part === "month" ? val : month;
    const d = part === "day" ? val : day;
    onChange(buildDateStr(y, m, d, format));
  };

  return (
    <div className={styles.dateRow}>
      {label && <span className={styles.dateLabel}>{label}</span>}
      <div className={styles.dateInputs}>
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
        {(format === "yearMonth" || format === "date") && (
          <>
            <span className={styles.dateSep} aria-hidden>·</span>
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
        {format === "date" && (
          <>
            <span className={styles.dateSep} aria-hidden>·</span>
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
        {/* Picker trigger */}
        <div className={styles.pickerAnchor}>
          <button
            type="button"
            className={styles.pickerBtn}
            onClick={() => setPickerOpen(!pickerOpen)}
            disabled={disabled}
            aria-label="Open date picker"
          >
            <Calendar size={14} strokeWidth={1.5} />
          </button>
          {pickerOpen && (
            <DatePickerPopover
              year={year}
              month={month}
              day={day}
              format={format}
              onSelect={(y, m, d) => {
                onChange(buildDateStr(y, m, d, format));
              }}
              onClose={() => setPickerOpen(false)}
              minDate={minDate}
              maxDate={maxDate}
            />
          )}
        </div>
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
  hideFormatRow = false,
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
      {/* Format selector + range toggle — hideFormatRow=true 면 외부에서 PeriodFormatBar 로 직접 렌더 */}
      {!hideFormatRow && (
        <div className={styles.formatRow}>
          <span className={styles.formatLabel}>{t("admin.settings.profile.displayFormat")}</span>
          <div className={styles.formatSegment}>
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.formatBtn} ${safeValue.format === opt.value ? styles.formatBtnActive : ""}`}
                onClick={() => setFormat(opt.value)}
              >
                {opt.label[language]}
              </button>
            ))}
          </div>
          <div className={styles.formatChecks}>
            <Checkbox
              checked={hasRange}
              onChange={toggleRange}
              shape="square"
              label={t("admin.settings.profile.showAsRange")}
            />
            {hasRange && (
              <Checkbox
                checked={!!safeValue.ongoing}
                onChange={toggleOngoing}
                shape="square"
                label={t("admin.settings.profile.ongoing")}
              />
            )}
          </div>
        </div>
      )}

      {/* Preview — showPreview=false 면 외부에서 별도 위치에 렌더 (예: fieldLabel 옆) */}
      {showPreview && safeValue.start && (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>{t("admin.settings.profile.preview")}</span>
          <span className={styles.previewText}>{preview}</span>
        </div>
      )}

      {/* Start + End date — 기본 2열, 공간 부족 시 wrap */}
      <div className={styles.dateRows}>
        <DateInputRow
          label={t("admin.settings.profile.startDate")}
          dateStr={safeValue.start}
          format={safeValue.format}
          onChange={(v) => onChange({ ...safeValue, start: v })}
          minDate={minDate}
          maxDate={maxDate}
        />
        {hasRange && (
          <DateInputRow
            label={t("admin.settings.profile.endDate")}
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
