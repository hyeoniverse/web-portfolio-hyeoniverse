"use client";

import { useState, useCallback } from "react";
import styles from "./Switch.module.css";
import { cn } from "@/utils";

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  variant?: "default" | "accent";
  /** "sm" (default, 36×20) — 컴팩트 UI / "md" (44×24) — form row */
  size?: "sm" | "md";
  /** 좌측에 라벨이 붙는 form-row 레이아웃. 비어 있으면 그냥 raw 토글 */
  label?: string;
  /** label 배치 — "left" (default, 좌측 inline) / "top" (라벨이 토글 위에 stack) */
  labelPosition?: "left" | "top";
  /** 토글 안에 ON/OFF 텍스트 표시 — title 라인 등 self-describing 컨텍스트용 */
  showStateText?: boolean;
}

function Switch({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  className,
  name,
  variant = "default",
  size = "sm",
  label,
  labelPosition = "left",
  showStateText = false,
}: SwitchProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = controlledChecked ?? internalChecked;

  const toggle = useCallback(() => {
    if (disabled) return;
    const next = !isChecked;
    if (controlledChecked === undefined) setInternalChecked(next);
    onCheckedChange?.(next);
  }, [disabled, isChecked, controlledChecked, onCheckedChange]);

  const sizeClass = size === "md" ? styles.sizeMd : styles.sizeSm;

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      disabled={disabled}
      className={cn(styles.root, sizeClass, variant === "accent" && styles.accent, showStateText && styles.withText, !label && className)}
      onClick={toggle}
      name={name}
    >
      {showStateText && <span className={cn(styles.stateText, styles.stateOn)}>ON</span>}
      <span
        className={styles.thumb}
        data-state={isChecked ? "checked" : "unchecked"}
      />
      {showStateText && <span className={cn(styles.stateText, styles.stateOff)}>OFF</span>}
    </button>
  );

  if (label) {
    return (
      <div className={cn(labelPosition === "top" ? styles.stack : styles.row, className)}>
        <span className={styles.label}>{label}</span>
        {button}
      </div>
    );
  }

  return button;
}

export { Switch };
