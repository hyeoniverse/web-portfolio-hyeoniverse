"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useId, Fragment, type ReactNode, type KeyboardEvent } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { createPortal } from "react-dom";
import { ChevronRight, X } from "@/components/icons";
import { usePortalContainer } from "./portalContainer";
import styles from "./Select.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";

interface SelectOption {
  value: string;
  label: string;
  /** 같은 group 끼리 dropdown 안에서 헤더와 함께 묶임. undefined 면 ungrouped (헤더 없음) */
  group?: string;
  /** 이 옵션 위에 구분선(hairline) 표시 — 그룹핑 없이 시각적 분리만 (ungrouped 목록에서 동작) */
  divider?: boolean;
  /** option 라벨 왼쪽에 인라인 아이콘 */
  icon?: ReactNode;
  /** option 라벨 오른쪽에 trailing 요소 (예: 선택됨 ✓ 표시) */
  trailing?: ReactNode;
  /** 외부에서 "이미 추가됨" 같은 selected 상태 표시 — accent-subtle 배경. Select 의 value 매칭과 별개 */
  selected?: boolean;
  /** combobox 필터 매칭에 사용할 추가 검색어 (예: 한국어 alias "리액트" → React 매칭) */
  searchTerms?: string[];
}

type SelectVariant = "default" | "bubble";

interface SelectProps {
  value: string;
  options?: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  renderOption?: (option: SelectOption, isActive: boolean) => ReactNode;
  renderValue?: (option: SelectOption | undefined) => ReactNode;
  className?: string;
  /** trigger 버튼 추가 className (예: floating toolbar 에서 border 제거) */
  triggerClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  /** "default"(아래로 여는 글래스 드롭다운) / "bubble"(trigger 오른쪽에 꼬리 달린 말풍선). */
  variant?: SelectVariant;
  /** 옵션 왼쪽에 선택 표시 ✓ 를 붙인다. (variant 와 무관하게 조합 가능) */
  showCheck?: boolean;
  /** dropdown 정렬 — "active"(기본, 선택 항목을 trigger 에 맞춤, native select 식) /
   *  "below"(trigger 아래로 연다. floating bar 처럼 위를 덮으면 안 되는 자리) */
  dropAlign?: "active" | "below";
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
  /** floating toolbar 등 "포커스가 풀리면 사라지는" 컨테이너 안에서 쓸 때 — trigger·옵션
   *  클릭 시 mousedown preventDefault 로 에디터 포커스를 유지한다(클릭으로 닫히는 것 방지). */
  preserveFocus?: boolean;
}

/* 기본값을 매 렌더 새 [] 로 두면 위치/스크롤 effect 의 deps(options)가 매번 바뀌어
   재실행 → FontPicker 처럼 스크롤 중 리렌더가 잦은 경우 active 로 계속 되돌아간다. 안정 참조로 고정. */
const EMPTY_OPTIONS: SelectOption[] = [];

export default function Select({
  value,
  options = EMPTY_OPTIONS,
  onChange,
  placeholder,
  renderOption,
  renderValue,
  className,
  triggerClassName,
  dropdownClassName,
  disabled,
  variant = "default",
  showCheck = false,
  dropAlign = "active",
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
  preserveFocus = false,
}: SelectProps) {
  const { t } = useLanguage();
  const clearLabel = t("common.clear");
  const bubble = variant === "bubble";
  // 오버레이(모달) 안이면 그 stacking context 로 portal → 전역 z override 없이 모달 위에 뜬다.
  const portalContainer = usePortalContainer();
  // editable + value 비어있으면 mount 시 default editing (= 직접 입력 mode 부터 시작).
  const [editing, setEditing] = useState(() => !!editable && !value);
  /* 사용자가 직접 편집에 들어갔는가(더블클릭·"직접 입력"). 입력칸 포커스는 이때만 준다(#895). 값이 비어 입력칸 모드로 시작한
     것만으로 포커스를 가져가면, 화면을 열자마자 다른 칸에 치던 글자가 이리로 새고, blur 에서 onChange("") 가 불렸다.
     사용자가 건드리기 전에 값이 들어오면 단추 모드로 돌아간다 */
  const [userEditing, setUserEditing] = useState(false);
  if (editing && !userEditing && value) setEditing(false);
  const startEditing = () => { setEditing(true); setUserEditing(true); };
  const stopEditing = () => { setEditing(false); setUserEditing(false); };
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  /* combobox input ↔ 목록 연결용. dropdown 은 portal 이라 id 로만 이을 수 있다. */
  const listboxId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number; tailTop?: number }>({ top: 0, left: 0, width: 0 });
  // 선택 항목을 trigger 에 정렬(native select 처럼) + 뷰포트 밖으로 안 나가게 clamp 한 최종 top / maxHeight
  const [dropTop, setDropTop] = useState<number | null>(null);
  const [dropMaxH, setDropMaxH] = useState<number | undefined>(undefined);
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
      // 오른쪽 말풍선 — trigger 세로 중심에 정렬(항목 수 무관 화살표 중앙) + 꼬리 위치 동적 계산.
      const GAP = 7;
      const HALF = 5.5; // 꼬리 rotated square 절반
      const vh = window.innerHeight;
      const dw = dropdownRef.current?.offsetWidth ?? 220;
      const dh = dropdownRef.current?.offsetHeight ?? 44;
      const cy = rect.top + rect.height / 2;
      let left = rect.right + GAP;
      if (left + dw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - dw - 8);
      let top = cy - dh / 2;
      top = Math.max(8, Math.min(top, vh - dh - 8));
      // 꼬리 tip 이 trigger 중심을 가리키도록 (clamp 보정), 위/아래 모서리 안쪽으로 제한
      const tailTop = Math.max(8, Math.min(cy - top - HALF, dh - 11 - 8));
      setDropPos({ top, left, width: rect.width, tailTop });
    } else {
      setDropPos({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  }, [bubble]);

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

  // dropdown 세로 위치 — 선택 항목 center 를 trigger center 에 맞추고(native select 처럼),
  // 뷰포트 밖으로 안 나가게 clamp. (bubble 은 자체 로직 사용.)
  // 위치/내부 스크롤은 "열릴 때 한 번"만 — 이후 리렌더(예: 목록 스크롤로 인한 부모 setState)에서
  // 다시 active 로 스크롤하면 사용자가 스크롤을 못 하고 계속 되돌아간다.
  const positionedRef = useRef(false);
  useLayoutEffect(() => {
    if (bubble || !visible || !dropdownRef.current || !ref.current) {
      setDropTop(null); setDropMaxH(undefined);
      positionedRef.current = false;
      return;
    }
    if (positionedRef.current) return;
    positionedRef.current = true;
    const dropdown = dropdownRef.current;
    const triggerRect = ref.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const MARGIN = 8;
    const availH = vh - MARGIN * 2;
    const naturalH = dropdown.offsetHeight; // CSS max-height 로 이미 cap 된 값
    const dropH = Math.min(naturalH, availH);
    // 선택 항목이 있으면 그 center 를 trigger center 에 맞춤 (compact 뿐 아니라 모든 variant)
    const activeEl = dropAlign === "below"
      ? null
      : (dropdown.querySelector("[data-active]") as HTMLElement | null);
    // active 항목의 실제 스크롤 컨테이너 — FontPicker 처럼 dropdown 안에 검색창/헤더 + 자체 overflow 영역(.list)이 있을 수 있다.
    let scroller: HTMLElement = dropdown;
    if (activeEl) {
      let s: HTMLElement | null = activeEl.parentElement;
      while (s && s !== dropdown) {
        const oy = getComputedStyle(s).overflowY;
        if (oy === "auto" || oy === "scroll") { scroller = s; break; }
        s = s.parentElement;
      }
    }
    const scrollable = !!activeEl && scroller.scrollHeight > scroller.clientHeight + 1;
    let top: number;
    if (activeEl) {
      // 목록이 길면(스크롤 가능) active 를 스크롤 컨테이너 상단(sticky 그룹 헤더 바로 아래)으로 먼저 스크롤 →
      // 드롭다운이 뷰포트 최상단까지 밀리지 않으면서 active 가 보인다.
      if (scrollable) {
        const label = activeEl.parentElement?.firstElementChild as HTMLElement | null;
        const labelH = label && /grouplabel/i.test(label.className) ? label.offsetHeight : 0;
        const delta = activeEl.getBoundingClientRect().top - (scroller.getBoundingClientRect().top + labelH);
        scroller.scrollTo({ top: scroller.scrollTop + delta });
      }
      // active 중심을 트리거 중심에 맞춤 — active 위의 검색창·헤더 높이는 실측 위치에 이미 반영됨.
      const aRect = activeEl.getBoundingClientRect();
      const dRect = dropdown.getBoundingClientRect();
      const activeCenterInDrop = aRect.top + aRect.height / 2 - dRect.top;
      top = triggerRect.top + triggerRect.height / 2 - activeCenterInDrop;
    } else {
      top = triggerRect.bottom; // active 없음(또는 dropAlign=below) → 트리거 아래로
    }
    top = Math.max(MARGIN, Math.min(top, vh - dropH - MARGIN)); // 위·아래 뷰포트 안으로
    setDropTop(top);
    setDropMaxH(naturalH > availH ? availH : undefined);
  }, [visible, value, options, variant, bubble, dropAlign]);

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

  const filterChanged = useDepsChanged([inputValue, filteredOptions.length]);
  if (filterChanged) setActiveIdx(-1);

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
      <Pressable
        key={opt.value}
        type="button"
        className={`${styles.option} ${isActive ? styles.optionActive : ""} ${isHovered ? styles.optionActive : ""} ${opt.selected ? styles.optionSelected : ""}`}
        data-active={isActive ? "" : undefined}
        onMouseEnter={() => combobox && setActiveIdx(i)}
        onMouseDown={preserveFocus ? (e) => e.preventDefault() : undefined}
        onClick={() => {
          if (combobox) {
            onAdd?.(opt.value);
          } else {
            onChange(opt.value);
          }
          setOpen(false);
        }}
      >
        {showCheck && (<span className={styles.check} style={{ visibility: isActive ? "visible" : "hidden" }}>{"✓"}</span>)}
        {renderOption ? renderOption(opt, isActive) : (
          <span className={styles.optionContent}>
            {opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
            <span className={styles.optionLabel}>{opt.label}</span>
            {opt.trailing && <span className={styles.optionTrailing}>{opt.trailing}</span>}
          </span>
        )}
      </Pressable>
    );
  };

  // 그룹이 있는 옵션은 group 별로 묶어서 헤더와 함께. 없는 옵션은 그냥 flat.
  const hasGroups = filteredOptions.some((o) => o.group);
  const isEmpty = !hasChildren && filteredOptions.length === 0;
  const optionsContent = hasChildren
    ? (typeof children === "function" ? children({ close }) : children)
    : isEmpty
      ? <div className={styles.optionEmpty}>{inputValue.trim() ? fillTemplate(t("common.selectNotInPresets"), { value: inputValue.trim() }) : t("common.selectNoOptions")}</div>
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
        : filteredOptions.map((opt, i) => (
            opt.divider
              ? <Fragment key={opt.value}><div className={styles.optionDivider} aria-hidden />{renderOptionBtn(opt, i)}</Fragment>
              : renderOptionBtn(opt, i)
          ));

  // editable: 프리셋 목록 맨 위에 "직접 입력" 항목 (다른 옵션과 동일 스타일) —
  // 클릭하면 트리거가 입력 모드로 바뀌어 프리셋 밖 값을 타이핑. (트리거 더블클릭으로도 동일.)
  const dropdownContent = editable && !hasChildren ? (
    <>
      <Pressable
        type="button"
        className={styles.option}
        onMouseDown={preserveFocus ? (e) => e.preventDefault() : undefined}
        onClick={() => { setOpen(false); startEditing(); }}
      >
        {showCheck && (<span className={styles.check} style={{ visibility: "hidden" }}>{"✓"}</span>)}
        <span className={styles.optionContent}>
          <span className={styles.optionLabel}>{t("common.selectCustom")}</span>
        </span>
      </Pressable>
      {optionsContent}
    </>
  ) : optionsContent;

  // dropdown 은 trigger 의 width 를 minWidth 로 보장. content 가 더 wide 면 자연 grow.
  // 단 width="full" 일 땐 trigger 가 부모 column 폭에 맞춰져 있으므로 dropdown 도 그 폭을 cap (max-width) 으로 두고
  // 옵션 라벨은 .option 의 ellipsis 로 잘림 처리 → 긴 옵션 라벨 때문에 dropdown 이 무한히 길어지는 현상 방지.
  // trigger 자체 width 는 sizer 기반 (가장 긴 label) 이라 open 전후 변하지 않음.
  const portalStyle: React.CSSProperties = bubble
    ? { top: dropPos.top, left: dropPos.left, minWidth: 160, maxWidth: 280, ["--bubble-tail-top" as string]: `${dropPos.tailTop ?? 24}px` }
    : {
        // 정렬(선택 항목→trigger) + 뷰포트 clamp 한 dropTop 사용, 아직 미측정이면 trigger 아래(dropPos.top)
        top: dropTop ?? dropPos.top,
        left: dropPos.left,
        ...(width === "full" ? { width: dropPos.width, maxWidth: dropPos.width } : { minWidth: dropPos.width }),
        ...(dropMaxH != null ? { maxHeight: dropMaxH } : {}),
      };

  return (
    <div
      className={`${styles.root} ${open ? styles.rootOpen : ""} ${disabled ? styles.rootDisabled : ""} ${width === "full" ? styles.rootFull : ""} ${className ?? ""}`}
      ref={ref}
      /* 열린 dropdown 이 Escape 를 소비한다.
         안 끊으면 document 까지 올라가 바깥 레이어(Modal 등)가 같이 닫힌다 —
         Escape 는 가장 안쪽 열린 레이어 하나만 닫아야 한다.
         portal dropdown 도 React 트리상 이 div 의 자식이라 여기서 함께 잡힌다. */
      onKeyDown={(e) => {
        if (e.key !== "Escape" || e.nativeEvent.isComposing) return;
        if (!open && !editing) return;
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
        stopEditing();
      }}
    >
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
            /* input 의 암묵 role 은 textbox 라 aria-expanded 를 받지 않는다.
               열고 닫는 목록을 가진 입력이므로 role 을 combobox 로 명시하고,
               그 목록(portal 로 빠져 DOM 상 형제가 아닌 dropdown)을 aria-controls 로 잇는다. */
            role="combobox"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {/* 지우개 — input 값 있을 때만. 입력 버퍼 clear + focus */}
          {inputValue && !disabled && (
            <Pressable
              type="button"
              className={styles.comboClear}
              tabIndex={-1}
              aria-label={clearLabel}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onInputChange?.(""); inputRef.current?.focus(); setOpen(true); }}
            >
              <X size={12} strokeWidth={2.5} />
            </Pressable>
          )}
          {/* combobox chevron — button mode 와 시각적 일관성. pointer-events: none 이라 input click 방해 안함 */}
          <ChevronRight className={`${styles.arrow} ${styles.arrowCombobox} ${open ? styles.arrowOpen : ""}`} size={12} strokeWidth={2.5} />
        </>
      ) : editable && editing ? (
        <input
          type="text"
          autoFocus={userEditing}
          defaultValue={value}
          className={`${styles.trigger} ${size === "sm" ? styles.triggerSm : ""}`}
          /* trigger 는 고정 너비를 받지 않고 자기 자연 너비(.root width: max-content)를 쓴다 */
          maxLength={editableInputProps?.maxLength}
          placeholder={editableInputProps?.placeholder ?? placeholder}
          disabled={disabled}
          onBlur={(e) => {
            const raw = e.target.value;
            const v = editableInputProps?.sanitize ? editableInputProps.sanitize(raw) : raw;
            onChange(v);
            stopEditing();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const raw = e.currentTarget.value;
              const v = editableInputProps?.sanitize ? editableInputProps.sanitize(raw) : raw;
              onChange(v);
              stopEditing();
            } else if (e.key === "Escape") {
              stopEditing();
            }
          }}
        />
      ) : (
        <Pressable
          type="button"
          className={`${styles.trigger} ${size === "sm" ? styles.triggerSm : ""} ${triggerClassName ?? ""}`}
          /* trigger 는 고정 너비를 받지 않고 자기 자연 너비(.root width: max-content)를 쓴다 */
          onMouseDown={preserveFocus ? (e) => e.preventDefault() : undefined}
          onClick={() => {
            if (disabled) return;
            if (!editable) { setOpen(!open); return; }
            // 더블클릭 감지 위해 single click 을 250ms 지연. 그 안에 두번째 click 오면 editing 진입.
            if (clickTimerRef.current !== null) {
              window.clearTimeout(clickTimerRef.current);
              clickTimerRef.current = null;
              setOpen(false);
              startEditing();
              return;
            }
            clickTimerRef.current = window.setTimeout(() => {
              clickTimerRef.current = null;
              setOpen((o) => !o);
            }, 250);
          }}
          disabled={disabled}
          title={editable ? t("common.selectCustomHint") : undefined}
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
        </Pressable>
      )}
      {visible && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          className={`${styles.dropdown} ${showCheck ? styles.dropdownChecked : ""} ${bubble ? `${styles.bubble} ${styles.bubbleRight}` : ""} ${animateOpen ? styles.dropdownOpen : styles.dropdownClose} ${dropdownClassName ?? ""}`}
          style={portalStyle}
          onTransitionEnd={handleTransitionEnd}
          // 부모 popover(공통 Popover)의 outside-click 이 이 dropdown 클릭을 "바깥"으로 보고 닫는 것 방지 —
          // dropdown 은 portal 이라 부모 밖에 렌더되므로 mousedown 전파를 여기서 끊는다.
          onMouseDown={(e) => e.stopPropagation()}
          data-lenis-prevent
        >
          {bubble ? <div className={styles.bubbleScroll}>{dropdownContent}</div> : dropdownContent}
        </div>,
        portalContainer ?? document.body,
      )}
    </div>
  );
}
