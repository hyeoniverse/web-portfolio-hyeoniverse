"use client";

import type { ReactNode } from "react";
import styles from "./Checkbox.module.css";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  disabled = false,
  className,
}: CheckboxProps) {
  const state = indeterminate ? "indeterminate" : checked ? "checked" : "";

  return (
    <label
      className={`${styles.wrapper} ${disabled ? styles.disabled : ""} ${className ?? ""}`}
      data-clickable="true"
    >
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={`${styles.box} ${state ? styles[state] : ""}`}>
        {(checked || indeterminate) && (
          <span className={styles.icon}>
            {indeterminate ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line
                  x1="2"
                  y1="5"
                  x2="8"
                  y2="5"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5.2 L4 7.2 L8 3"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        )}
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
