"use client";

import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

type Variant = "capsule" | "underline";
type Size = "xs" | "sm" | "md";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  label?: string;
  inlineLabel?: string;
  value: string;
  onChange: (value: string) => void;
  variant?: Variant;
  size?: Size;
  className?: string;
}

export default function Input({
  label,
  inlineLabel,
  value,
  onChange,
  variant = "capsule",
  size = "md",
  className,
  id,
  ...rest
}: InputProps) {
  const inputCls = [
    styles.input,
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    size === "xs" ? styles.xs : "",
    inlineLabel ? styles.hasInlineLabel : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${size === "xs" ? styles.wrapperXs : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      {inlineLabel ? (
        <div className={styles.inlineWrap}>
          <span className={styles.inlineLabel}>{inlineLabel}</span>
          <input
            id={id}
            className={inputCls}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            {...rest}
          />
        </div>
      ) : (
        <input
          id={id}
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      )}
    </div>
  );
}
