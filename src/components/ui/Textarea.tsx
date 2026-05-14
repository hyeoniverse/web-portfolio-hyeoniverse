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
  ...rest
}: TextareaProps) {
  const inputCls = [
    styles.textarea,
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    textareaClassName,
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
    </div>
  );
}
