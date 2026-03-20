"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  renderOption?: (option: SelectOption, isActive: boolean) => ReactNode;
  renderValue?: (option: SelectOption | undefined) => ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function Select({
  value,
  options,
  onChange,
  placeholder,
  renderOption,
  renderValue,
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`${styles.root} ${open ? styles.rootOpen : ""} ${disabled ? styles.rootDisabled : ""} ${className ?? ""}`} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => { if (!disabled) setOpen(!open); }}
        disabled={disabled}
      >
        <span className={styles.value}>
          {renderValue
            ? renderValue(selected)
            : selected?.label ?? placeholder ?? ""}
        </span>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>
          &#9662;
        </span>
      </button>
      {open && (
        <div className={styles.dropdown} data-lenis-prevent>
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {renderOption ? renderOption(opt, isActive) : opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
