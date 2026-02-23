"use client";

import styles from "./Toggle.module.css";

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <div className={styles.row}>
      {label && <span className={styles.label}>{label}</span>}
      <button
        type="button"
        className={`${styles.track} ${checked ? styles.on : ""}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
      >
        <span className={styles.thumb} />
      </button>
    </div>
  );
}
