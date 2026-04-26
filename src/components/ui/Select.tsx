"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
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
  dropdownClassName?: string;
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
  dropdownClassName,
  disabled,
  variant = "default",
  children,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [dropOffset, setDropOffset] = useState(0);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateOpen(true);
        });
      });
    } else {
      setAnimateOpen(false);
    }
  }, [open]);

  // trigger 위치 기반으로 dropdown 좌표 계산
  const updatePosition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, updatePosition]);

  // scroll/resize 시 위치 재계산
  useEffect(() => {
    if (!visible) return;
    const onUpdate = () => updatePosition();
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [visible, updatePosition]);

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

  // click outside: trigger + portal dropdown 둘 다 확인
  useEffect(() => {
    if (!open && !visible) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
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

  const portalStyle: React.CSSProperties = isCompact
    ? { top: dropPos.top - dropOffset, left: dropPos.left, width: dropPos.width }
    : { top: dropPos.top, left: dropPos.left, width: dropPos.width };

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
        <ChevronDown className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`} size={12} strokeWidth={2.5} />
      </button>
      {visible && createPortal(
        <div
          ref={dropdownRef}
          className={`${styles.dropdown} ${isCompact ? styles.dropdownCompact : ""} ${animateOpen ? styles.dropdownOpen : styles.dropdownClose} ${dropdownClassName ?? ""}`}
          style={portalStyle}
          onTransitionEnd={handleTransitionEnd}
          data-lenis-prevent
        >
          {dropdownContent}
        </div>,
        document.body,
      )}
    </div>
  );
}
