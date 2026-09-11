"use client";

import { useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { Eraser, Eye, EyeOff, Plus } from "@/components/icons";
import styles from "./Input.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";

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
  /** 에러 상태 — accent 테두리로 강조 (필수 입력 누락 등) */
  error?: boolean;
  /** 내부 <input> 에 연결할 ref — 포커스 제어 등 (예: 링크 툴바 열릴 때 URL 자동 포커스) */
  inputRef?: Ref<HTMLInputElement>;
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
  error = false,
  inputRef,
  id,
  clearable = true,
  onAdd,
  addDisabled,
  addAriaLabel = "Add",
  trailingAction,
  onKeyDown,
  required,
  type,
  ...rest
}: InputProps) {
  const clearLabel = useLanguage().t("common.clear");
  const hasAdd = !!onAdd;
  const hasTrailing = !!trailingAction;
  const isGrouped = hasAdd || hasTrailing;

  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  // password 면 눈 토글(마스크 해제) 버튼. clear(지우개)와 공존 — 지우개는 맨 우측, 눈은 그 왼쪽
  const showReveal = isPassword && !isGrouped && !rest.disabled && !rest.readOnly;
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
    error ? styles.error : "",
    inlineLabel ? styles.hasInlineLabel : "",
    showClear && showReveal ? styles.hasClear2 : (showClear || showReveal) ? styles.hasClear : "",
    isGrouped ? styles.inputGrouped : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${size === "xs" ? styles.wrapperXs : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && <span className={styles.requiredDot} aria-hidden />}
        </label>
      )}
      <div className={`${styles.fieldWrap} ${isGrouped ? styles.fieldWrapGrouped : ""} ${isGrouped && size === "sm" ? styles.fieldWrapGroupedSm : ""} ${isGrouped && size === "xs" ? styles.fieldWrapGroupedXs : ""}`}>
        {inlineLabel && <span className={styles.inlineLabel}>{inlineLabel}</span>}
        <input
          ref={inputRef}
          id={id}
          className={inputCls}
          value={value}
          type={isPassword && showPassword ? "text" : type}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          required={required}
          {...rest}
        />
        {showClear && (
          <Pressable noTapScale
            type="button"
            className={`${styles.clearBtn}${showReveal ? ` ${styles.clearBtnShift}` : ""}`}
            data-cursor="big"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange("");
            }}
            aria-label={clearLabel}
            title={clearLabel}
          >
            <Eraser size={11} strokeWidth={2} />
          </Pressable>
        )}
        {showReveal && (
          <Pressable noTapScale
            type="button"
            className={styles.clearBtn}
            data-cursor="big"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "숨기기" : "표시"}
          >
            {showPassword ? <EyeOff size={13} strokeWidth={2} /> : <Eye size={13} strokeWidth={2} />}
          </Pressable>
        )}
        {hasAdd && (
          <Pressable noTapScale
            type="button"
            className={styles.addBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { if (!isAddDisabled) onAdd!(value); }}
            disabled={isAddDisabled}
            aria-label={addAriaLabel}
          >
            <Plus size={14} strokeWidth={2} />
          </Pressable>
        )}
        {trailingAction && (
          <Pressable noTapScale
            type="button"
            className={styles.addBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={trailingAction.onClick}
            disabled={trailingAction.disabled}
            aria-label={trailingAction.ariaLabel}
          >
            {trailingAction.icon}
          </Pressable>
        )}
      </div>
    </div>
  );
}
