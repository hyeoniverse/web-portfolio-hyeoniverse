"use client";

import type { InputHTMLAttributes } from "react";
import { Eraser } from "lucide-react";
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
  /** 입력값 지우기 (Eraser) 버튼 — value 있을 때 우측 표시. 기본 true. */
  clearable?: boolean;
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
  clearable = true,
  ...rest
}: InputProps) {
  const showClear = clearable && !!value && !rest.disabled && !rest.readOnly;
  const inputCls = [
    styles.input,
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    size === "xs" ? styles.xs : "",
    inlineLabel ? styles.hasInlineLabel : "",
    showClear ? styles.hasClear : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${size === "xs" ? styles.wrapperXs : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={styles.fieldWrap}>
        {inlineLabel && <span className={styles.inlineLabel}>{inlineLabel}</span>}
        <input
          id={id}
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
        {showClear && (
          <button
            type="button"
            className={styles.clearBtn}
            data-cursor="big"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange("");
            }}
            aria-label="clear"
            title="지우기"
          >
            <Eraser size={11} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
