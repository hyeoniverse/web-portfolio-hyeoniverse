"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import DatePickerPopover from "./DatePickerPopover";
import TimePickerPopover from "./TimePickerPopover";
import styles from "./DatePicker.module.css";

interface DateTimePickerProps {
  /** ISO timestamp 또는 null */
  value: string | null;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
  /** 이 시점 이전은 선택 불가 (예: 예약 발행 — 현재 이전 disable). Date 객체 */
  minDate?: Date;
  /** 이 시점 이후는 선택 불가 (예: 미래 시점 차단). Date 객체 */
  maxDate?: Date;
  /** 날짜/시간 picker 가 absolute popover 대신 trigger 아래에 inline 으로 펼쳐짐. */
  inline?: boolean;
}

/** 날짜 + 시간(시:분) picker — 예약 발행 등에 사용
 *  - 날짜 부분: 기존 DatePickerPopover 재사용
 *  - 시간 부분: 24h HH:mm 입력
 *  - 출력: ISO timestamp (UTC) — `value` 가 ISO 면 로컬로 표시 */
export default function DateTimePicker({ value, onChange, disabled, minDate, maxDate, inline = false }: DateTimePickerProps) {
  const { language } = useLanguage();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  // ISO → 로컬 부분
  const local = value ? new Date(value) : null;
  const validLocal = local && !isNaN(local.getTime()) ? local : null;
  const year = validLocal ? String(validLocal.getFullYear()) : "";
  const month = validLocal ? String(validLocal.getMonth() + 1).padStart(2, "0") : "";
  const day = validLocal ? String(validLocal.getDate()).padStart(2, "0") : "";
  const time = validLocal
    ? `${String(validLocal.getHours()).padStart(2, "0")}:${String(validLocal.getMinutes()).padStart(2, "0")}`
    : "";

  /** 부분(date/time) 변경 → 로컬 Date 재조립 → ISO toISOString */
  const updateParts = (
    nextYear: string,
    nextMonth: string,
    nextDay: string,
    nextTime: string,
  ) => {
    if (!nextYear || !nextMonth || !nextDay || !nextTime) {
      onChange(null);
      return;
    }
    const [hh, mm] = nextTime.split(":");
    const d = new Date(
      Number(nextYear),
      Number(nextMonth) - 1,
      Number(nextDay),
      Number(hh) || 0,
      Number(mm) || 0,
      0,
      0,
    );
    if (isNaN(d.getTime())) {
      onChange(null);
      return;
    }
    onChange(d.toISOString());
  };

  const handleDateSelect = (y: string, m: string, d: string) => {
    // 시간이 비어있으면 09:00 기본값
    updateParts(y, m, d, time || "09:00");
    setPickerOpen(false);
  };

  const handleTimeSelect = (h: string, m: string) => {
    const t = `${h}:${m}`;
    if (!validLocal) {
      const today = new Date();
      updateParts(
        String(today.getFullYear()),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
        t,
      );
    } else {
      updateParts(year, month, day, t);
    }
  };

  const [hourPart, minPart] = (time || "09:00").split(":");

  // 표시용 라벨 (날짜 입력칸이 비어있을 때 placeholder 처리)
  const dateLabel = validLocal
    ? `${year}.${month}.${day}`
    : language === "ko" ? "날짜 선택" : "Select date";

  return (
    <div className={`${styles.dateRow}${inline ? ` ${styles.dateRowInline}` : ""}`}>
      <div className={styles.dateInputs}>
        <div className={styles.pickerAnchor} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setPickerOpen((v) => {
                const next = !v;
                if (next && inline) setTimeOpen(false);
                return next;
              });
            }}
            disabled={disabled}
            className={styles.yearInput}
            style={{ width: "auto", minWidth: 110, textAlign: "left", padding: "var(--box-xs)" }}
          >
            {dateLabel}
          </button>
          {pickerOpen && !inline && (
            <DatePickerPopover
              year={year || String(new Date().getFullYear())}
              month={month || String(new Date().getMonth() + 1).padStart(2, "0")}
              day={day || String(new Date().getDate()).padStart(2, "0")}
              format="date"
              onSelect={handleDateSelect}
              onClose={() => setPickerOpen(false)}
              minDate={minDate}
              maxDate={maxDate}
            />
          )}
        </div>
        <span className={styles.dateSep}>·</span>
        <div className={styles.pickerAnchor} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setTimeOpen((v) => {
                const next = !v;
                if (next && inline) setPickerOpen(false);
                return next;
              });
            }}
            disabled={disabled}
            className={styles.yearInput}
            style={{ width: "auto", minWidth: 90, textAlign: "left", padding: "var(--box-xs)" }}
          >
            {validLocal ? time : (language === "ko" ? "시간" : "Time")}
          </button>
          {timeOpen && !inline && (
            <TimePickerPopover
              hour={hourPart || "09"}
              minute={minPart || "00"}
              onSelect={(h, m) => {
                handleTimeSelect(h, m);
              }}
              onClose={() => setTimeOpen(false)}
            />
          )}
        </div>
      </div>
      {inline && (
        <div className={styles.dateRowInlinePanels}>
          <AnimatePresence initial={false}>
            {pickerOpen && (
              <motion.div
                key="date-inline-panel"
                initial={{ clipPath: "inset(0 0 100% 0)", height: 0, opacity: 0 }}
                animate={{ clipPath: "inset(0 0 0 0)", height: "auto", opacity: 1 }}
                exit={{ clipPath: "inset(0 0 100% 0)", height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <DatePickerPopover
                  year={year || String(new Date().getFullYear())}
                  month={month || String(new Date().getMonth() + 1).padStart(2, "0")}
                  day={day || String(new Date().getDate()).padStart(2, "0")}
                  format="date"
                  onSelect={handleDateSelect}
                  onClose={() => setPickerOpen(false)}
                  minDate={minDate}
                  maxDate={maxDate}
                  inline
                />
              </motion.div>
            )}
            {timeOpen && (
              <motion.div
                key="time-inline-panel"
                initial={{ clipPath: "inset(0 0 100% 0)", height: 0, opacity: 0 }}
                animate={{ clipPath: "inset(0 0 0 0)", height: "auto", opacity: 1 }}
                exit={{ clipPath: "inset(0 0 100% 0)", height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: "hidden" }}
              >
                <TimePickerPopover
                  hour={hourPart || "09"}
                  minute={minPart || "00"}
                  onSelect={handleTimeSelect}
                  onClose={() => setTimeOpen(false)}
                  inline
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}


