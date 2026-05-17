"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, type ReactNode, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import styles from "./Select.module.css";

interface SelectOption {
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
  /** Combobox mode — trigger 가 input. typing + free text add + suggestion 선택 모두 지원 */
  combobox?: boolean;
  /** combobox 의 input value */
  inputValue?: string;
  /** combobox typing 시 호출 */
  onInputChange?: (v: string) => void;
  /** combobox 에서 Enter 또는 option 선택 시 호출 (free text 또는 선택된 option value) */
  onAdd?: (v: string) => void;
  /** combobox: input 값으로 options filter (default true) */
  filterByInput?: boolean;
  /** Trigger width 옵션
   *  - "full" (default): parent flex 1, 100%
   *  - "s"/"m"/"l": 고정 너비 (120/200/320px)
   *  - "min": 가장 짧은 option label width 에 fit
   *  - "max": 가장 긴 option label width 에 fit */
  width?: "full" | "s" | "m" | "l" | "min" | "max";
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
  combobox,
  inputValue = "",
  onInputChange,
  onAdd,
  filterByInput = true,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // resize 시에만 위치 재계산. scroll 시에는 dropdown 을 닫음 (안 닫으면 trigger 따라 이동해 산만함)
  useEffect(() => {
    if (!visible) return;
    const onResize = () => updatePosition();
    const onScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
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
  // fit-content 시 가장 긴 option label 기준 width — sizer span 으로 grid cell 채워서 자연 max-width
  const longestLabel = useMemo(
    () => options.reduce((max, o) => (o.label.length > max.length ? o.label : max), ""),
    [options],
  );

  // combobox: input value 로 options filter
  const filteredOptions = useMemo(() => {
    if (!combobox || !filterByInput) return options;
    const q = inputValue.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [combobox, filterByInput, options, inputValue]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [inputValue, filteredOptions.length]);

  const handleComboKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const chosen = activeIdx >= 0 ? filteredOptions[activeIdx]?.value : inputValue;
      if (chosen) onAdd?.(chosen);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const dropdownContent = hasChildren
    ? (typeof children === "function" ? children({ close }) : children)
    : filteredOptions.map((opt, i) => {
        const isActive = opt.value === value;
        const isHovered = combobox && i === activeIdx;
        return (
          <button
            key={opt.value}
            type="button"
            className={`${styles.option} ${isActive ? styles.optionActive : ""} ${isHovered ? styles.optionActive : ""}`}
            data-active={isActive ? "" : undefined}
            onMouseEnter={() => combobox && setActiveIdx(i)}
            onClick={() => {
              if (combobox) {
                onAdd?.(opt.value);
              } else {
                onChange(opt.value);
              }
              setOpen(false);
            }}
          >
            {isCompact && <span className={styles.check}>{isActive ? "✓" : " "}</span>}
            {renderOption ? renderOption(opt, isActive) : opt.label}
          </button>
        );
      });

  const portalStyle: React.CSSProperties = isCompact
    ? { top: dropPos.top - dropOffset, left: dropPos.left, width: dropPos.width }
    : { top: dropPos.top, left: dropPos.left, width: dropPos.width };

  return (
    <div className={`${styles.root} ${isCompact ? styles.rootCompact : ""} ${open ? styles.rootOpen : ""} ${disabled ? styles.rootDisabled : ""} ${className ?? ""}`} ref={ref}>
      {combobox ? (
        <input
          ref={inputRef}
          type="text"
          className={styles.trigger}
          value={inputValue}
          onChange={(e) => { onInputChange?.(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleComboKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={open}
        />
      ) : (
        <button
          type="button"
          className={styles.trigger}
          onClick={() => { if (!disabled) setOpen(!open); }}
          disabled={disabled}
        >
          <span className={styles.valueStack}>
            <span className={styles.value}>
              {renderValue
                ? renderValue(selected)
                : selected?.label ?? placeholder ?? ""}
            </span>
            <span className={styles.sizer} aria-hidden>{longestLabel || placeholder || ""}</span>
          </span>
          <ChevronRight className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`} size={12} strokeWidth={2.5} />
        </button>
      )}
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
