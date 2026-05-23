"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import TimePicker from "./TimePicker";
import styles from "./DatePicker.module.css";

interface TimePickerPopoverProps {
  hour: string;
  minute: string;
  onSelect: (hour: string, minute: string) => void;
  onClose: () => void;
  minuteStep?: number;
  /** trigger 아래 inline 으로 펼침 (absolute popover 대신). */
  inline?: boolean;
}

/** 시:분 picker popover — DatePickerPopover와 동일 패턴 */
export default function TimePickerPopover({
  hour, minute, onSelect, onClose, minuteStep, inline = false,
}: TimePickerPopoverProps) {
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

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover}${inline ? ` ${styles.popoverInline}` : ""}`}
    >
      <motion.div
        className={styles.popoverChrome}
        layout
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <TimePicker hour={hour} minute={minute} onSelect={onSelect} minuteStep={minuteStep} />
      </motion.div>
    </div>
  );
}
