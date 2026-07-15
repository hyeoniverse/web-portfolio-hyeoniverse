"use client";

import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { Eraser, Plus } from "lucide-react";
import EditableInput from "./EditableInput/EditableInput";
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
  /** Soft 글자수 권장 한도 — 지정 시(그리고 onAdd/trailingAction 없을 때) EditableInput 에 위임하여
   *  Textarea 와 동일한 초과 highlight + counter 를 얻음. 미지정 시 기존 native input 경로 그대로. */
  maxHint?: number;
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
  /** 우측에 임의의 액션 버튼(업로드 등) — onAdd 대신. 설정되면 onAdd 와 동일하게 capsule 그룹 모드
   *  (wrapper 가 border, input border 제거) + 1:1 정사각 버튼으로 렌더. */
  trailingAction?: {
    icon: ReactNode;
    onClick: () => void;
    ariaLabel: string;
    disabled?: boolean;
  };
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
  maxHint,
  onAdd,
  addDisabled,
  addAriaLabel = "Add",
  trailingAction,
  onKeyDown,
  ...rest
}: InputProps) {
  const hasAdd = !!onAdd;
  const hasTrailing = !!trailingAction;
  const isGrouped = hasAdd || hasTrailing;

  /* maxHint 지정 + grouped 아님 → EditableInput 에 위임 (초과 highlight + counter parity).
     grouped(+버튼/trailingAction)는 EditableInput 이 미지원이라 native 유지. maxHint 미지정 시 기존 경로 그대로.
     label 은 위임 대상 아님 — maxHint 는 신규 prop 이라 기존 조합 없음(회귀 0). */
  if (maxHint != null && !isGrouped) {
    return (
      <EditableInput
        value={value}
        onChange={onChange}
        placeholder={rest.placeholder}
        inlineLabel={inlineLabel}
        maxHint={maxHint}
        maxLength={rest.maxLength}
        variant={variant}
        size={size}
        clearable={clearable}
        disabled={rest.disabled}
        className={className}
      />
    );
  }

  const showClear = !isGrouped && clearable && !!value && !rest.disabled && !rest.readOnly;
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
    isGrouped ? styles.inputGrouped : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${size === "xs" ? styles.wrapperXs : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={`${styles.fieldWrap} ${isGrouped ? styles.fieldWrapGrouped : ""} ${isGrouped && size === "sm" ? styles.fieldWrapGroupedSm : ""} ${isGrouped && size === "xs" ? styles.fieldWrapGroupedXs : ""}`}>
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
        {trailingAction && (
          <button
            type="button"
            className={styles.addBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={trailingAction.onClick}
            disabled={trailingAction.disabled}
            aria-label={trailingAction.ariaLabel}
          >
            {trailingAction.icon}
          </button>
        )}
      </div>
    </div>
  );
}
