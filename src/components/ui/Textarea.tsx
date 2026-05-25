"use client";

import type { TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

type Variant = "capsule" | "underline";
type Size = "sm" | "md";

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "size"> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** textarea 자체 className override */
  textareaClassName?: string;
  /** Soft 글자수 권장 한도 — 카운터 표시 + 80% 부터 warning, 100% 초과 시 over (입력은 계속 허용) */
  maxHint?: number;
}

export default function Textarea({
  label,
  value,
  onChange,
  variant = "capsule",
  size = "md",
  className,
  textareaClassName,
  id,
  rows = 3,
  maxHint,
  ...rest
}: TextareaProps) {
  const inputCls = [
    styles.textarea,
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    textareaClassName,
  ].filter(Boolean).join(" ");

  const len = value.length;
  const ratio = maxHint ? len / maxHint : 0;
  const counterCls = [
    styles.counter,
    maxHint && ratio >= 1 ? styles.counterOver : "",
    maxHint && ratio >= 0.8 && ratio < 1 ? styles.counterWarn : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        data-lenis-prevent
        {...rest}
      />
      {maxHint != null && (
        <span className={counterCls} aria-live="polite">
          {len} / {maxHint}
        </span>
      )}
    </div>
  );
}
