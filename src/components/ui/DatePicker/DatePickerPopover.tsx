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
}

export default function DatePickerPopover({
  year, month, day, format, onSelect, onClose,
}: DatePickerPopoverProps) {
  const { language } = useLanguage();
  const { datePickerStyle } = useSiteConfig();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const mode = datePickerStyle === "calendar" ? "calendar" : "spinner";

  return (
    <div ref={popoverRef} className={styles.popover}>
      <DatePicker
        year={year} month={month} day={day}
        format={format} mode={mode} language={language}
        onSelect={onSelect}
      />
    </div>
  );
}
