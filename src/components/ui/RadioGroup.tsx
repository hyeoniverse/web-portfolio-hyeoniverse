"use client";

import { useId, type ReactNode } from "react";
import styles from "./RadioGroup.module.css";

interface RadioOption<T extends string> {
  value: T;
  label: ReactNode;
  /** disabled 옵션 */
  disabled?: boolean;
}

interface RadioGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  /** 같은 form 안에 여러 RadioGroup 가 있을 때 구분 — 생략 시 자동 useId */
  name?: string;
  /** 가로 / 세로 정렬. 기본 horizontal */
  direction?: "horizontal" | "vertical";
  className?: string;
}

/** 공통 RadioGroup — 단일 선택 + lucide-style 점 인디케이터.
 *  Checkbox 와 톤 일치 (circle dot + label). */
export default function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  name,
  direction = "horizontal",
  className,
}: RadioGroupProps<T>) {
  const autoName = useId();
  const groupName = name ?? autoName;

  return (
    <div
      className={`${styles.group} ${direction === "vertical" ? styles.vertical : ""} ${className ?? ""}`}
      role="radiogroup"
    >
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`${styles.option} ${checked ? styles.optionActive : ""} ${opt.disabled ? styles.disabled : ""}`}
            data-clickable="true"
          >
            <input
              type="radio"
              className={styles.input}
              name={groupName}
              value={opt.value}
              checked={checked}
              disabled={opt.disabled}
              onChange={() => !opt.disabled && onChange(opt.value)}
            />
            <span className={`${styles.dot} ${checked ? styles.dotChecked : ""}`} />
            <span className={styles.label}>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
