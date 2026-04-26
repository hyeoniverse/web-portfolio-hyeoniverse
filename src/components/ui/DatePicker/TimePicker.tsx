"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { SpinnerColumn } from "./DatePicker";
import styles from "./DatePicker.module.css";

interface TimePickerProps {
  hour: string;
  minute: string;
  /** 항상 24h 'HH:mm' 으로 콜백 — 내부에서 12h 변환 처리 */
  onSelect: (hour: string, minute: string) => void;
  /** 분 단위 step — 기본 1 */
  minuteStep?: number;
  /** 초기 표시 형식 — 기본 "24". 사용자가 토글로 바꿀 수 있음 */
  defaultFormat?: "24" | "12";
}

/** 시:분 spinner — 24h / 12h 토글, 컬럼 라벨 + ":" 구분자 */
export default function TimePicker({
  hour,
  minute,
  onSelect,
  minuteStep = 1,
  defaultFormat = "24",
}: TimePickerProps) {
  const { language } = useLanguage();
  const [format, setFormat] = useState<"24" | "12">(defaultFormat);

  const minuteItems = Array.from(
    { length: Math.floor(60 / minuteStep) },
    (_, i) => {
      const m = i * minuteStep;
      const v = String(m).padStart(2, "0");
      return { value: v, label: v };
    },
  );

  // 입력 분이 step에 안 맞으면 가장 가까운 값으로 보정
  const snappedMinute = (() => {
    const n = Number(minute);
    if (isNaN(n)) return "00";
    const snapped = Math.round(n / minuteStep) * minuteStep;
    return String(Math.min(snapped, 60 - minuteStep)).padStart(2, "0");
  })();

  const eh24 = hour || "09";
  const em = snappedMinute;
  const hourNum24 = Number(eh24);

  // 24h ↔ 12h 변환 helpers
  const period: "AM" | "PM" = hourNum24 < 12 ? "AM" : "PM";
  const hour12 = (() => {
    if (hourNum24 === 0) return "12";
    if (hourNum24 > 12) return String(hourNum24 - 12).padStart(2, "0");
    return String(hourNum24).padStart(2, "0");
  })();

  const handle12hChange = (h12: string, p: "AM" | "PM", min: string) => {
    let h24 = Number(h12);
    if (p === "AM") {
      if (h24 === 12) h24 = 0;
    } else {
      if (h24 !== 12) h24 += 12;
    }
    onSelect(String(h24).padStart(2, "0"), min);
  };

  const hourLabel = language === "ko" ? "시" : "HR";
  const minLabel = language === "ko" ? "분" : "MIN";
  const periodLabel = language === "ko" ? "오전/오후" : "AM/PM";
  const labelAM = language === "ko" ? "오전" : "AM";
  const labelPM = language === "ko" ? "오후" : "PM";

  return (
    <div>
      <div className={styles.timeFormatBar}>
        <div className={styles.timeFormatToggle} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={format === "24"}
            className={`${styles.timeFormatBtn} ${format === "24" ? styles.timeFormatBtnActive : ""}`}
            onClick={() => setFormat("24")}
          >
            24h
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={format === "12"}
            className={`${styles.timeFormatBtn} ${format === "12" ? styles.timeFormatBtnActive : ""}`}
            onClick={() => setFormat("12")}
          >
            12h
          </button>
        </div>
      </div>

      <div className={styles.spinnerView}>
        {format === "24" ? (
            <>
              <SpinnerColumn
                items={Array.from({ length: 24 }, (_, i) => {
                  const v = String(i).padStart(2, "0");
                  return { value: v, label: v };
                })}
                value={eh24}
                onChange={(v) => onSelect(v, em)}
                label={hourLabel}
              />
              <span className={styles.timeSep}>
                <span className={styles.spinnerLabel} aria-hidden style={{ visibility: "hidden" }}>·</span>
                <span className={styles.timeSepGlyph}>:</span>
              </span>
              <SpinnerColumn
                items={minuteItems}
                value={em}
                onChange={(v) => onSelect(eh24, v)}
                label={minLabel}
              />
            </>
          ) : (
            <>
              <SpinnerColumn
                items={[
                  { value: "AM", label: labelAM },
                  { value: "PM", label: labelPM },
                ]}
                value={period}
                onChange={(v) => handle12hChange(hour12, v as "AM" | "PM", em)}
                label={periodLabel}
              />
              <SpinnerColumn
                items={Array.from({ length: 12 }, (_, i) => {
                  const v = String(i + 1).padStart(2, "0");
                  return { value: v, label: v };
                })}
                value={hour12}
                onChange={(v) => handle12hChange(v, period, em)}
                label={hourLabel}
              />
              <span className={styles.timeSep}>
                <span className={styles.spinnerLabel} aria-hidden style={{ visibility: "hidden" }}>·</span>
                <span className={styles.timeSepGlyph}>:</span>
              </span>
              <SpinnerColumn
                items={minuteItems}
                value={em}
                onChange={(v) => handle12hChange(hour12, period, v)}
                label={minLabel}
              />
            </>
          )}
      </div>
    </div>
  );
}
