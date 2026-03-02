"use client";

import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function Input({
  label,
  value,
  onChange,
  className,
  id,
  ...rest
}: InputProps) {
  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}
