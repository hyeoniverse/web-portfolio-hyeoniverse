"use client";

import { useInControlSizeScope } from "@/components/ui/controlSize";
import type { ReactNode } from "react";
import { Check, Minus } from "@/components/icons";
import styles from "./Checkbox.module.css";

type CheckboxShape = "circle" | "square";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  shape?: CheckboxShape;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  shape = "circle",
  label,
  disabled = false,
  className,
}: CheckboxProps) {
  /* 컨트롤 높이 범위(설정 페이지 등) 안이면 상자는 그대로, 줄 높이만 sm */
  const inScope = useInControlSizeScope();
  const state = indeterminate ? "indeterminate" : checked ? "checked" : "";

  return (
    <label
      className={`${styles.wrapper} ${inScope ? styles.scopeBox : ""} ${disabled ? styles.disabled : ""} ${className ?? ""}`}
      data-clickable="true"
    >
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={`${styles.box} ${styles[shape]} ${state ? styles[state] : ""}`}>
        {(checked || indeterminate) && (
          <span className={styles.icon}>
            {indeterminate ? (
              <Minus size={10} strokeWidth={2.5} />
            ) : (
              <Check size={10} strokeWidth={2.5} />
            )}
          </span>
        )}
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
