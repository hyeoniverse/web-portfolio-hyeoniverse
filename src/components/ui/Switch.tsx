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
      className={cn(styles.root, sizeClass, variant === "accent" && styles.accent, !label && className)}
      onClick={toggle}
      name={name}
    >
      <span
        className={styles.thumb}
        data-state={isChecked ? "checked" : "unchecked"}
      />
    </button>
  );

  if (label) {
    return (
      <div className={cn(styles.row, className)}>
        <span className={styles.label}>{label}</span>
        {button}
      </div>
    );
  }

  return button;
}

export { Switch };
