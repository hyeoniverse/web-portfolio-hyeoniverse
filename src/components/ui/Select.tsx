"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from "react";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

type SelectVariant = "default" | "compact";

interface SelectProps {
  value: string;
  options?: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  renderOption?: (option: SelectOption, isActive: boolean) => ReactNode;
  renderValue?: (option: SelectOption | undefined) => ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: SelectVariant;
  children?: ReactNode | ((ctx: { close: () => void }) => ReactNode);
}

export default function Select({
  value,
  options = [],
  onChange,
  placeholder,
  renderOption,
  renderValue,
  className,
  disabled,
  variant = "default",
  children,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropOffset, setDropOffset] = useState(0);

  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  // compact: 선택된 옵션이 trigger 위치에 오도록 offset 계산
  useLayoutEffect(() => {
    if (variant !== "compact" || !visible || !dropdownRef.current) return;
    const dropdown = dropdownRef.current;
    const activeEl = dropdown.querySelector("[data-active]") as HTMLElement | null;
    if (!activeEl) { setDropOffset(0); return; }
    setDropOffset(activeEl.offsetTop);
  }, [visible, value, options, variant]);

  const handleTransitionEnd = () => {
    if (!open) setVisible(false);
  };

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open && !visible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, visible]);

  const selected = options.find((o) => o.value === value);
  const isCompact = variant === "compact";
  const hasChildren = children != null;

  const dropdownContent = hasChildren
    ? (typeof children === "function" ? children({ close }) : children)
    : options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
            data-active={isActive ? "" : undefined}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          >
            {isCompact && <span className={styles.check}>{isActive ? "✓" : "\u2002"}</span>}
            {renderOption ? renderOption(opt, isActive) : opt.label}
          </button>
        );
      });

  return (
    <div className={`${styles.root} ${isCompact ? styles.rootCompact : ""} ${open ? styles.rootOpen : ""} ${disabled ? styles.rootDisabled : ""} ${className ?? ""}`} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => { if (!disabled) setOpen(!open); }}
        disabled={disabled}
      >
        <span className={styles.value}>
          {renderValue
            ? renderValue(selected)
            : selected?.label ?? placeholder ?? ""}
        </span>
        <svg className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {visible && (
        <div
          ref={dropdownRef}
          className={`${styles.dropdown} ${open ? styles.dropdownOpen : styles.dropdownClose}`}
          style={isCompact ? { top: -dropOffset } : undefined}
          onTransitionEnd={handleTransitionEnd}
          data-lenis-prevent
        >
          {dropdownContent}
        </div>
      )}
    </div>
  );
}
