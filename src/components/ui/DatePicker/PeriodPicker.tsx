"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { DatePeriod } from "@/data/profile";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPeriod } from "@/utils/formatPeriod";
import Checkbox from "@/components/ui/Checkbox";
import DatePickerPopover from "./DatePickerPopover";
import styles from "./DatePicker.module.css";

interface PeriodPickerProps {
  value: DatePeriod;
  onChange: (value: DatePeriod) => void;
  className?: string;
}

type Format = DatePeriod["format"];

const FORMAT_OPTIONS: { value: Format; label: { ko: string; en: string } }[] = [
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

/* ── Custom Dropdown ── */
function Dropdown({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={styles.dropdown}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        {selected?.label || "--"}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className={styles.dropdownList} data-lenis-prevent>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.dropdownItem} ${opt.value === value ? styles.dropdownItemActive : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
}: {
  label: string;
  dateStr: string;
  format: Format;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { year, month, day } = parseDateStr(dateStr);
  const maxDay = daysInMonth(Number(month) || 1);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (part: "year" | "month" | "day", val: string) => {
    const y = part === "year" ? val : year;
    const m = part === "month" ? val : month;
    const d = part === "day" ? val : day;
    onChange(buildDateStr(y, m, d, format));
  };

  return (
    <div className={styles.dateRow}>
      <span className={styles.dateLabel}>{label}</span>
      <div className={styles.dateInputs}>
        <input
          type="text"
          className={styles.yearInput}
          value={year}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            update("year", v);
          }}
          placeholder="YYYY"
          maxLength={4}
          disabled={disabled}
        />
        {(format === "yearMonth" || format === "date") && (
          <>
            <span className={styles.dateSep}>.</span>
            <Dropdown
              value={month}
              options={Array.from({ length: 12 }, (_, i) => {
                const v = String(i + 1).padStart(2, "0");
                return { value: v, label: v };
              })}
              onChange={(v) => update("month", v)}
              disabled={disabled}
            />
          </>
        )}
        {format === "date" && (
          <>
            <span className={styles.dateSep}>.</span>
            <Dropdown
              value={day}
              options={Array.from({ length: maxDay }, (_, i) => {
                const v = String(i + 1).padStart(2, "0");
                return { value: v, label: v };
              })}
              onChange={(v) => update("day", v)}
              disabled={disabled}
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
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
}: PeriodPickerProps) {
  const { t, language } = useLanguage();

  // 구 형식이나 undefined 방어
  const safeValue: DatePeriod = value && typeof value === "object" && "format" in value
    ? value
    : { start: "", format: "year" };

  const hasRange = !!(safeValue.end || safeValue.ongoing);

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

      {/* Start date */}
      <DateInputRow
        label={hasRange ? (t("admin.settings.profile.startDate")) : ""}
        dateStr={safeValue.start}
        format={safeValue.format}
        onChange={(v) => onChange({ ...safeValue, start: v })}
      />

      {/* End date */}
      {hasRange && (
        <DateInputRow
          label={t("admin.settings.profile.endDate")}
          dateStr={safeValue.end || ""}
          format={safeValue.format}
          onChange={(v) => onChange({ ...safeValue, end: v })}
          disabled={safeValue.ongoing}
        />
      )}

      {/* Preview */}
      {safeValue.start && (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>{t("admin.settings.profile.preview")}</span>
          <span className={styles.previewText}>{preview}</span>
        </div>
      )}
    </div>
  );
}
