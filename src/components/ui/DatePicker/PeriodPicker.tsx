"use client";

import { useMemo, useRef, useState } from "react";
import type { LocalizedText } from "@/types/common";
import { Calendar, Clock } from "@/components/icons";
import type { DatePeriod } from "@/data/profile";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPeriod } from "@/utils/formatPeriod";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import { formatTypedDate, parseTypedDate, TYPED_DATE_PLACEHOLDER } from "@/utils/parseTypedDate";
import DatePickerPopover from "./DatePickerPopover";
import TimePickerPopover from "./TimePickerPopover";
import styles from "./DatePicker.module.css";
import Pressable from "@/components/ui/Pressable";
import { useInControlSizeScope } from "@/components/ui/controlSize";

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
  /** 고를 수 있는 형식 — 기본은 연도 · 연.월 · 연.월.일. 시각까지 필요한 곳만 "dateTime"(연.월.일.시)을 넣어 넘긴다 */
  formats?: DatePeriod["format"][];
}


type Format = DatePeriod["format"];

const FORMAT_OPTIONS: { value: Format; label: LocalizedText }[] = [
  { value: "year", label: { ko: "연도", en: "Year" } },
  { value: "yearMonth", label: { ko: "연.월", en: "Y.M" } },
  { value: "date", label: { ko: "연.월.일", en: "Y.M.D" } },
  { value: "dateTime", label: { ko: "연.월.일.시", en: "Y.M.D.h" } },
];

/** formats 를 주지 않았을 때 — 기간 표시에 시각은 거의 쓰지 않아 연.월.일.시는 옵션으로만 */
const DEFAULT_FORMATS: Format[] = ["year", "yearMonth", "date"];

/** 날짜까지만 보는 달력에 넘길 형식 — 시각 형식은 날짜 달력을 쓴다 */
const calendarFormat = (f: Format): "year" | "yearMonth" | "date" => (f === "dateTime" ? "date" : f);

/** 날짜 칸 — 이어서 적는 글 하나("19990827" · "990827" · "1999-08-27" …). 평소엔 형식대로("1999.08.27") 보이고,
 *  형식 끝까지 적는 순간 · Enter · 칸을 벗어날 때 적용한다. 못 읽는 글이면 테두리로 알리고 Esc 로 되돌린다.
 *  예전에는 연 · 월 · 일 셀렉트를 하나씩 눌러 골라야 했다 */
function DateTextField({
  value,
  format,
  onChange,
  disabled,
  minDate,
  maxDate,
  label,
}: {
  value: string;
  format: Format;
  onChange: (v: string) => void;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  label: string;
}) {
  // null — 적는 중이 아님(저장 값을 형식대로 보여 준다)
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  // Esc 로 되돌린 직후의 blur 는 적용하지 않는다 — 화면에 남은 못 읽는 글로 다시 오류가 났다
  const skipBlurRef = useRef(false);
  const parse = (raw: string) => parseTypedDate(raw, format, { min: minDate, max: maxDate });
  const commit = (raw: string) => {
    const r = parse(raw);
    if (!r) { setInvalid(true); return; }
    setInvalid(false);
    if (r.value !== value) onChange(r.value);
    setDraft(null);
  };
  return (
    <Input
      className={`${styles.dateText} ${styles[`dateText_${format}`]}`}
      value={draft ?? formatTypedDate(value)}
      onChange={(v) => {
        setDraft(v);
        setInvalid(false);
        const r = parse(v);
        if (r?.complete && r.value !== value) onChange(r.value);
      }}
      onFocus={() => setDraft(formatTypedDate(value))}
      onBlur={(e) => {
        if (skipBlurRef.current) { skipBlurRef.current = false; return; }
        commit(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter") { e.preventDefault(); commit(e.currentTarget.value); }
        else if (e.key === "Escape") { skipBlurRef.current = true; setDraft(null); setInvalid(false); e.currentTarget.blur(); }
      }}
      placeholder={TYPED_DATE_PLACEHOLDER[format]}
      error={invalid}
      aria-invalid={invalid || undefined}
      aria-label={label}
      clearable={false}
      disabled={disabled}
      autoComplete="off"
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
  const { year, month, day, hour, minute } = parseDateStr(dateStr);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  return (
    /* 시각까지 적는 형식은 줄이 길어 시작·종료를 나란히 두지 않는다 — 한 줄 전체를 써서 폭이 정말 모자랄 때만 줄을 바꾼다 */
    <div className={`${styles.dateRow} ${format === "dateTime" ? styles.dateRowFull : ""}`}>
      {label && <span className={styles.dateLabel}>{label}</span>}
      <div className={styles.dateInputs}>
        {/* 날짜 묶음(연·월·일·달력)과 시각 묶음(시간·시·분·시계)은 각각 한 덩어리 — 줄이 모자라면 묶음 단위로 내린다 */}
        <span className={styles.dateGroup}>
        <DateTextField
          value={dateStr}
          format={format}
          onChange={onChange}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          label={label}
        />
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
        {/* 시각 — 날짜 칸에 이어 적거나("1999.08.27 14:30") 시계로 고른다 */}
        {format === "dateTime" && (
          <span className={styles.dateGroup}>
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
  formats = DEFAULT_FORMATS,
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

  const inScope = useInControlSizeScope();
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`} data-size={inScope ? "md" : undefined}>
      {/* Format selector + range toggle */}
      {(
        <div className={styles.formatRow}>
          <span className={styles.formatLabel}>{t("common.periodFormat")}</span>
          <div className={styles.formatSegment}>
            {FORMAT_OPTIONS.filter((opt) => formats.includes(opt.value) || opt.value === safeValue.format).map((opt) => (
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
