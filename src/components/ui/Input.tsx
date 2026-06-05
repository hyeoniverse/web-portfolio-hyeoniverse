"use client";

import type { InputHTMLAttributes, KeyboardEvent } from "react";
import { Eraser, Plus } from "lucide-react";
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
  /** 입력값 지우기 (Eraser) 버튼 — value 있을 때 우측 표시. 기본 true.
   *  onAdd 가 있으면 자동으로 false (+ 버튼이 우측 점유 + Enter 로 값 처리). */
  clearable?: boolean;
  /** 우측 inline + 버튼. Enter 또는 + 클릭 시 호출.
   *  설정되면 wrapper 가 border 담당, input 자체 border 제거 + capsule 그룹 모드 */
  onAdd?: (value: string) => void;
  /** + 버튼 강제 disabled — 미제공 시 value 가 비어있으면 자동 disabled */
  addDisabled?: boolean;
  /** + 버튼 aria-label (default: "Add") */
  addAriaLabel?: string;
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
  onAdd,
  addDisabled,
  addAriaLabel = "Add",
  onKeyDown,
  ...rest
}: InputProps) {
  const hasAdd = !!onAdd;
  const showClear = !hasAdd && clearable && !!value && !rest.disabled && !rest.readOnly;
  const isAddDisabled = addDisabled ?? !value.trim();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (hasAdd && !e.defaultPrevented && !e.nativeEvent.isComposing && e.key === "Enter" && !isAddDisabled) {
      e.preventDefault();
      onAdd!(value);
    }
  };

  const inputCls = [
    styles.input,
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    size === "xs" ? styles.xs : "",
    inlineLabel ? styles.hasInlineLabel : "",
    showClear ? styles.hasClear : "",
    hasAdd ? styles.inputGrouped : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${size === "xs" ? styles.wrapperXs : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={`${styles.fieldWrap} ${hasAdd ? styles.fieldWrapGrouped : ""} ${hasAdd && size === "sm" ? styles.fieldWrapGroupedSm : ""} ${hasAdd && size === "xs" ? styles.fieldWrapGroupedXs : ""}`}>
        {inlineLabel && <span className={styles.inlineLabel}>{inlineLabel}</span>}
        <input
          id={id}
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
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
        {hasAdd && (
          <button
            type="button"
            className={styles.addBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { if (!isAddDisabled) onAdd!(value); }}
            disabled={isAddDisabled}
            aria-label={addAriaLabel}
          >
            <Plus size={14} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
