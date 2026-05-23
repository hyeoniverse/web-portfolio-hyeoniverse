"use client";

import { useRef, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import DatePicker from "./DatePicker";
import styles from "./DatePicker.module.css";

type Format = "year" | "yearMonth" | "date";
interface DatePickerPopoverProps {
  year: string;
  month: string;
  day: string;
  format: Format;
  onSelect: (year: string, month: string, day: string) => void;
  onClose: () => void;
  /** 이 시점 이전은 cell 비활성 */
  minDate?: Date;
  /** 이 시점 이후는 cell 비활성 */
  maxDate?: Date;
  /** trigger 아래 inline 으로 펼침 (absolute popover 대신). 외부 클릭/ESC 자동 닫힘 비활성. */
  inline?: boolean;
}

export default function DatePickerPopover({
  year, month, day, format, onSelect, onClose, minDate, maxDate, inline = false,
}: DatePickerPopoverProps) {
  const { language } = useLanguage();
  const { datePickerStyle } = useSiteConfig();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inline) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, inline]);

  useEffect(() => {
    if (inline) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, inline]);

  const mode = datePickerStyle === "calendar" ? "calendar" : "spinner";

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover}${inline ? ` ${styles.popoverInline}` : ""}`}
    >
      <div className={styles.popoverChrome}>
        <DatePicker
          year={year} month={month} day={day}
          format={format} mode={mode} language={language}
          onSelect={onSelect}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    </div>
  );
}
