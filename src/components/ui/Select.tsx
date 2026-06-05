"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, type ReactNode, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import styles from "./Select.module.css";

interface SelectOption {
  value: string;
  label: string;
  /** 같은 group 끼리 dropdown 안에서 헤더와 함께 묶임. undefined 면 ungrouped (헤더 없음) */
  group?: string;
  /** option 라벨 왼쪽에 인라인 아이콘 */
  icon?: ReactNode;
  /** option 라벨 오른쪽에 trailing 요소 (예: 선택됨 ✓ 표시) */
  trailing?: ReactNode;
  /** 외부에서 "이미 추가됨" 같은 selected 상태 표시 — accent-subtle 배경. Select 의 value 매칭과 별개 */
  selected?: boolean;
  /** combobox 필터 매칭에 사용할 추가 검색어 (예: 한국어 alias "리액트" → React 매칭) */
  searchTerms?: string[];
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
  /** trigger 크기 — "sm" 은 ColorPicker 등 좁은 popover 안에서 사용 */
  size?: "default" | "sm";
  /** true 면 trigger 더블클릭 시 자유 입력 input 모드로 전환. 옵션 외 값도 입력 가능. */
  editable?: boolean;
  /** editable input mode 의 추가 input attr (maxLength, pattern 등) + commit 시 normalize */
  editableInputProps?: {
    maxLength?: number;
    placeholder?: string;
    /** input commit 직전 값 정규화 (예: 숫자만, 0 padding 등) */
    sanitize?: (raw: string) => string;
  };
  /** 말풍선 dropdown — 아래가 아니라 trigger 오른쪽에 solid 말풍선(꼬리 포함)으로 연다. */
  bubble?: boolean;
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
  size = "default",
  editable,
  editableInputProps,
  width,
  bubble = false,
}: SelectProps) {
  // editable + value 비어있으면 mount 시 default editing (= 직접 입력 mode 부터 시작).
  const [editing, setEditing] = useState(() => !!editable && !value);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  // hydration mismatch 방지 — invisible probe 의 portal 은 client mount 후에만 렌더
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [animateOpen, setAnimateOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [dropOffset, setDropOffset] = useState(0);
  /** mount 시 invisible probe 로 측정한 dropdown content width — trigger 가 첫 paint 부터 이 width 가짐 */
  const [_triggerWidth, setTriggerWidth] = useState<number | null>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  /** editable 더블클릭 감지용 — 첫 click 을 setTimeout 으로 지연, 두번째 click 오면 cancel + editing */
  const clickTimerRef = useRef<number | null>(null);

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
    if (bubble) {
      // 오른쪽 말풍선 — trigger 오른쪽. 꼬리가 trigger 세로 중앙을 가리키도록 bubble 보정.
      const GAP = 7;
      const TAIL_CENTER = 21.5; // CSS .bubbleRight::before: top(16) + height(11)/2
      const dw = dropdownRef.current?.offsetWidth ?? 220;
      let left = rect.right + GAP;
      if (left + dw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - dw - 8);
      const top = Math.max(8, rect.top + rect.height / 2 - TAIL_CENTER);
      setDropPos({ top, left, width: rect.width });
    } else {
      setDropPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  }, [bubble]);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, updatePosition]);

  // mount 시 invisible probe 로 dropdown content width 측정 → trigger 가 첫 paint 부터 같은 width
  useLayoutEffect(() => {
    if (!probeRef.current) return;
    setTriggerWidth(probeRef.current.offsetWidth);
  }, [options, variant]);


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

  // compact: 선택된 옵션의 center 가 trigger 의 center 와 정렬되도록 offset 계산.
  // dropPos.top = trigger.bottom 이라, dropOffset 만큼 위로 올리면 dropdown.top = trigger.bottom - dropOffset.
  // active.center = dropdown.top + activeOffsetTop + activeH/2
  //             = trigger.bottom - dropOffset + activeOffsetTop + activeH/2
  // trigger.center = trigger.bottom - triggerH/2.
  // 둘이 일치하려면 dropOffset = activeOffsetTop + activeH/2 + triggerH/2.
  useLayoutEffect(() => {
    if (variant !== "compact" || !visible || !dropdownRef.current || !ref.current) return;
    const dropdown = dropdownRef.current;
    const activeEl = dropdown.querySelector("[data-active]") as HTMLElement | null;
    if (!activeEl) { setDropOffset(0); return; }
    const triggerH = ref.current.offsetHeight;
    const activeH = activeEl.offsetHeight;
    setDropOffset(activeEl.offsetTop + activeH / 2 + triggerH / 2);
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
  /* fit-content 시 trigger width — 모든 옵션 label 을 sizer 로 stack 해서
     가장 넓은 자연 width 가 grid track 결정 (글자수 length 비교 X — 실제 렌더 width 기준). */

  // combobox: input value 로 options filter — label + searchTerms 둘 다 매칭
  const filteredOptions = useMemo(() => {
    if (!combobox || !filterByInput) return options;
    const q = inputValue.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      if (o.label.toLowerCase().includes(q)) return true;
      return o.searchTerms?.some((t) => t.toLowerCase().includes(q)) ?? false;
    });
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

  // option button renderer — 단독 / 그룹 안 둘 다 공통
  const renderOptionBtn = (opt: SelectOption, i: number) => {
    const isActive = opt.value === value;
    const isHovered = combobox && i === activeIdx;
    return (
      <button
        key={opt.value}
        type="button"
        className={`${styles.option} ${isActive ? styles.optionActive : ""} ${isHovered ? styles.optionActive : ""} ${opt.selected ? styles.optionSelected : ""}`}
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
        {isCompact && (<span className={styles.check} style={{ visibility: isActive ? "visible" : "hidden" }}>{"✓"}</span>)}
        {renderOption ? renderOption(opt, isActive) : (
          <span className={styles.optionContent}>
            {opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
            <span className={styles.optionLabel}>{opt.label}</span>
            {opt.trailing && <span className={styles.optionTrailing}>{opt.trailing}</span>}
          </span>
        )}
      </button>
    );
  };

  // 그룹이 있는 옵션은 group 별로 묶어서 헤더와 함께. 없는 옵션은 그냥 flat.
  const hasGroups = filteredOptions.some((o) => o.group);
  const isEmpty = !hasChildren && filteredOptions.length === 0;
  const dropdownContent = hasChildren
    ? (typeof children === "function" ? children({ close }) : children)
    : isEmpty
      ? <div className={styles.optionEmpty}>{inputValue.trim() ? `“${inputValue.trim()}” — 프리셋에 없음` : "옵션 없음"}</div>
      : hasGroups
        ? (() => {
            // 입력 순서 유지하며 group 별 packing (Map insertion order)
            const groups = new Map<string, SelectOption[]>();
            filteredOptions.forEach((o) => {
              const key = o.group ?? "";
              const arr = groups.get(key) ?? [];
              arr.push(o);
              groups.set(key, arr);
            });
            let runningIdx = 0;
            return Array.from(groups.entries()).map(([groupName, opts]) => (
              <div key={groupName || "__ungrouped__"} className={styles.optionGroup}>
                {groupName && <div className={styles.optionGroupLabel}>{groupName}</div>}
                {opts.map((opt) => renderOptionBtn(opt, runningIdx++))}
              </div>
            ));
          })()
        : filteredOptions.map((opt, i) => renderOptionBtn(opt, i));

  // dropdown 은 trigger 의 width 를 minWidth 로 보장. content 가 더 wide 면 자연 grow.
  // 단 width="full" 일 땐 trigger 가 부모 column 폭에 맞춰져 있으므로 dropdown 도 그 폭을 cap (max-width) 으로 두고
  // 옵션 라벨은 .option 의 ellipsis 로 잘림 처리 → 긴 옵션 라벨 때문에 dropdown 이 무한히 길어지는 현상 방지.
  // trigger 자체 width 는 sizer 기반 (가장 긴 label) 이라 open 전후 변하지 않음.
  const portalStyle: React.CSSProperties = bubble
    ? { top: dropPos.top, left: dropPos.left, minWidth: 160, maxWidth: 280 }
    : isCompact
      ? { top: dropPos.top - dropOffset, left: dropPos.left, minWidth: dropPos.width }
      : width === "full"
        ? { top: dropPos.top, left: dropPos.left, width: dropPos.width, maxWidth: dropPos.width }
        : { top: dropPos.top, left: dropPos.left, minWidth: dropPos.width };

  return (
    <div className={`${styles.root} ${isCompact ? styles.rootCompact : ""} ${open ? styles.rootOpen : ""} ${disabled ? styles.rootDisabled : ""} ${width === "full" ? styles.rootFull : ""} ${className ?? ""}`} ref={ref}>
      {combobox ? (
        <>
          <input
            ref={inputRef}
            type="text"
            className={`${styles.trigger} ${styles.triggerCombobox} ${size === "sm" ? styles.triggerSm : ""}`}
            value={inputValue}
            onChange={(e) => { onInputChange?.(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onMouseDown={(e) => {
              // 이미 focused 인 상태 (= 이전에 한 번 열렸다 닫힌 경우 포함) 면 토글.
              // 처음 클릭은 focused 아니라서 onFocus 가 open 시킴 (default 동작).
              if (document.activeElement === inputRef.current) {
                e.preventDefault();
                setOpen((o) => !o);
              }
            }}
            onKeyDown={handleComboKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {/* combobox chevron — button mode 와 시각적 일관성. pointer-events: none 이라 input click 방해 안함 */}
          <ChevronRight className={`${styles.arrow} ${styles.arrowCombobox} ${open ? styles.arrowOpen : ""}`} size={12} strokeWidth={2.5} />
        </>
      ) : editable && editing ? (
        <input
          type="text"
          autoFocus
          defaultValue={value}
          className={`${styles.trigger} ${size === "sm" ? styles.triggerSm : ""}`}
          /* triggerWidth (probe-measured) 제거 — trigger 가 자기 자연 너비 (.root width: max-content) 유지.
             probe 가 dropdown 폰트(xs)로 측정해서 trigger 폰트(sm) 보다 짧아지는 문제 방지. */
          maxLength={editableInputProps?.maxLength}
          placeholder={editableInputProps?.placeholder ?? placeholder}
          disabled={disabled}
          onBlur={(e) => {
            const raw = e.target.value;
            const v = editableInputProps?.sanitize ? editableInputProps.sanitize(raw) : raw;
            onChange(v);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const raw = e.currentTarget.value;
              const v = editableInputProps?.sanitize ? editableInputProps.sanitize(raw) : raw;
              onChange(v);
              setEditing(false);
            } else if (e.key === "Escape") {
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className={`${styles.trigger} ${size === "sm" ? styles.triggerSm : ""}`}
          /* triggerWidth (probe-measured) 제거 — trigger 가 자기 자연 너비 (.root width: max-content) 유지.
             probe 가 dropdown 폰트(xs)로 측정해서 trigger 폰트(sm) 보다 짧아지는 문제 방지. */
          onClick={() => {
            if (disabled) return;
            if (!editable) { setOpen(!open); return; }
            // 더블클릭 감지 위해 single click 을 250ms 지연. 그 안에 두번째 click 오면 editing 진입.
            if (clickTimerRef.current !== null) {
              window.clearTimeout(clickTimerRef.current);
              clickTimerRef.current = null;
              setOpen(false);
              setEditing(true);
              return;
            }
            clickTimerRef.current = window.setTimeout(() => {
              clickTimerRef.current = null;
              setOpen((o) => !o);
            }, 250);
          }}
          disabled={disabled}
          title={editable ? "더블클릭으로 직접 입력" : undefined}
        >
          <span className={styles.valueStack}>
            <span className={styles.value}>
              {renderValue
                ? renderValue(selected)
                : selected ? (
                    <span className={styles.optionContent}>
                      {selected.icon && <span className={styles.optionIcon}>{selected.icon}</span>}
                      <span className={styles.optionLabel}>{selected.label}</span>
                    </span>
                  ) : (placeholder ?? "")}
            </span>
            {options.length > 0
              ? options.map((o, i) => (
                  <span key={i} className={styles.sizer} aria-hidden>{o.label}</span>
                ))
              : <span className={styles.sizer} aria-hidden>{placeholder || ""}</span>}
          </span>
          <ChevronRight className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`} size={12} strokeWidth={2.5} />
        </button>
      )}
      {visible && createPortal(
        <div
          ref={dropdownRef}
          className={`${styles.dropdown} ${isCompact ? styles.dropdownCompact : ""} ${bubble ? `${styles.bubble} ${styles.bubbleRight}` : ""} ${animateOpen ? styles.dropdownOpen : styles.dropdownClose} ${dropdownClassName ?? ""}`}
          style={portalStyle}
          onTransitionEnd={handleTransitionEnd}
          data-lenis-prevent
        >
          {bubble ? <div className={styles.bubbleScroll}>{dropdownContent}</div> : dropdownContent}
        </div>,
        document.body,
      )}
      {/* invisible probe — dropdown content 와 동일 mount 해서 width 측정.
       * visibility:hidden + position:absolute + off-screen → 사용자에겐 안 보이고 paint 영향 없음.
       * trigger 가 첫 paint 부터 이 width 적용. SSR 시 document 없으니 가드. */}
      {mounted && createPortal(
        <div
          ref={probeRef}
          className={`${styles.dropdown} ${isCompact ? styles.dropdownCompact : ""} ${dropdownClassName ?? ""}`}
          style={{ position: "absolute", top: -9999, left: -9999, visibility: "hidden", pointerEvents: "none", opacity: 0 }}
          aria-hidden
        >
          {dropdownContent}
        </div>,
        document.body,
      )}
    </div>
  );
}
