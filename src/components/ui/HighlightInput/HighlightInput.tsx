"use client";

import {
  useRef,
  useLayoutEffect,
  useCallback,
  useId,
  type FormEvent,
  type CompositionEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  type FocusEvent,
} from "react";
import { Eraser } from "lucide-react";
import { showToast } from "@/stores/toastStore";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./HighlightInput.module.css";

/** maxLength 하드컷 발생 시 built-in toast 문구 (onOverflow 미제공 시) */
const LIMIT_TOAST = { ko: "글자수 제한에 도달했습니다.", en: "Character limit reached." };

interface HighlightInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** input 좌측 내부 배지 (KO/EN 등) */
  inlineLabel?: string;
  /** Soft 글자수 권장 한도 — 초과 글자에 inline <mark> highlight + 우측 counter (n/max). 미지정 시 highlight/counter 없음. */
  maxHint?: number;
  /** Hard 글자수 상한 — 입력/붙여넣기 시 이 길이로 잘라 onChange 에 전달 (근본 차단). maxHint 와 별개. */
  maxLength?: number;
  /** 시각 variant — capsule(기본) / underline. Input 위임 시 pass-through. */
  variant?: "capsule" | "underline";
  /** 크기 — xs / sm / md(기본). Input 위임 시 pass-through. */
  size?: "xs" | "sm" | "md";
  /** clear 버튼 표시 — value 있을 때 우측. 기본 true */
  clearable?: boolean;
  className?: string;
  disabled?: boolean;
  onFocus?: (e: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: FocusEvent<HTMLDivElement>) => void;
  /** 마운트 시 자동 포커스 (contentEditable 라 native autoFocus 없음 → ref + effect) */
  autoFocus?: boolean;
  /** Enter (single-line 이라 기본 차단) 시 호출 — 예: 저장 트리거 */
  onEnter?: () => void;
  /** maxLength 로 초과분이 처음 잘릴 때 1회 호출 — 소비자 override. 미제공 + maxLength 있으면 built-in toast. */
  onOverflow?: () => void;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function buildHtml(value: string, maxHint: number | undefined, overClass: string): string {
  if (maxHint == null || value.length <= maxHint) return escapeHtml(value);
  const before = escapeHtml(value.slice(0, maxHint));
  const after = escapeHtml(value.slice(maxHint));
  return `${before}<mark class="${overClass}">${after}</mark>`;
}

/** root element 안 caret 의 텍스트 offset */
function getCaretOffset(root: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

/** root element 안 텍스트 offset 위치에 caret 배치 */
function setCaretOffset(root: HTMLElement, offset: number): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  let remaining = offset;
  while ((node = walker.nextNode())) {
    const len = node.textContent?.length ?? 0;
    if (remaining <= len) {
      range.setStart(node, remaining);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= len;
  }
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * 단일행 contentEditable input — 초과 글자 inline <mark> highlight 가능.
 * Input(native) 의 single-line 동작 모방: Enter 차단, paste 시 줄바꿈 제거, capsule 스타일.
 */
export default function HighlightInput({
  value,
  onChange,
  placeholder,
  inlineLabel,
  maxHint,
  maxLength,
  variant = "capsule",
  size = "md",
  clearable = true,
  className,
  disabled,
  onFocus,
  onBlur,
  autoFocus,
  onEnter,
  onOverflow,
}: HighlightInputProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const { language } = useLanguage();
  /* built-in toast throttle — 연속 입력/paste 도배 방지 (ref 타임스탬프) */
  const lastToastRef = useRef(0);

  /* DOM 동기화 — value / maxHint 변경 시 innerHTML 재구성 + caret 보존 (composition 중엔 skip) */
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (isComposingRef.current) return;
    const newHtml = buildHtml(value, maxHint, styles.over);
    if (root.innerHTML === newHtml) return;
    const caret = getCaretOffset(root);
    root.innerHTML = newHtml;
    if (caret != null) setCaretOffset(root, Math.min(caret, value.length));
  }, [value, maxHint]);

  /* 마운트 시 자동 포커스 — DOM-sync effect 뒤에 실행되어 caret 을 값 끝으로 (1회만) */
  useLayoutEffect(() => {
    if (autoFocus && ref.current) {
      // preventScroll — 모달 열릴 때 포커스가 페이지를 스크롤시키지 않도록
      ref.current.focus({ preventScroll: true });
      setCaretOffset(ref.current, ref.current.textContent?.length ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* maxLength 초과분 잘라내고, DOM 이 이미 그린 초과분도 즉시 제거 (capped 값이 기존 value 와
     같으면 value effect 가 안 돌아 DOM 이 초과 상태로 남는 것 방지). caret 은 끝으로. */
  const capAndSync = useCallback(
    (root: HTMLDivElement, raw: string): string => {
      const text = raw.replace(/[\r\n]+/g, "");
      if (maxLength == null || text.length <= maxLength) return text;
      const capped = text.slice(0, maxLength);
      root.innerHTML = buildHtml(capped, maxHint, styles.over);
      setCaretOffset(root, capped.length);
      return capped;
    },
    [maxLength, maxHint],
  );

  /* 이번 입력이 maxLength 를 처음 넘겨 잘렸으면(직전 value 는 아직 한도 미만) 알림.
     onOverflow 제공 시 그걸 호출(소비자 override), 없으면 throttle 된 built-in toast. */
  const notifyOverflow = useCallback((raw: string) => {
    if (maxLength == null) return;
    const len = raw.replace(/[\r\n]+/g, "").length;
    if (len <= maxLength || value.length >= maxLength) return;
    if (onOverflow) { onOverflow(); return; }
    const now = Date.now();
    if (now - lastToastRef.current < 1500) return;
    lastToastRef.current = now;
    showToast(LIMIT_TOAST[language], "info", 3000);
  }, [onOverflow, maxLength, value, language]);

  const handleInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      if (isComposingRef.current) return;
      /* 단일 행 — 어떤 줄바꿈도 제거 (paste 든 자동삽입이든) + maxLength hard cap */
      const raw = e.currentTarget.textContent ?? "";
      const text = capAndSync(e.currentTarget, raw);
      notifyOverflow(raw);
      onChange(text);
    },
    [onChange, capAndSync, notifyOverflow],
  );

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLDivElement>) => {
      isComposingRef.current = false;
      const raw = e.currentTarget.textContent ?? "";
      const text = capAndSync(e.currentTarget, raw);
      notifyOverflow(raw);
      onChange(text);
    },
    [onChange, capAndSync, notifyOverflow],
  );

  /* Enter — single-line 이라 차단, onEnter 있으면 (조합 중이 아닐 때) 호출 */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!e.nativeEvent.isComposing) onEnter?.();
    }
  }, [onEnter]);

  /* paste — 줄바꿈 제거 후 plain text 삽입 */
  const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " ");
    document.execCommand("insertText", false, text);
  }, []);

  const isEmpty = value.length === 0;
  const showClear = clearable && !isEmpty && !disabled;
  const hasCounter = maxHint != null;
  const over = hasCounter && value.length > maxHint;
  /* 정확히 maxHint 일 때 warn 안 걸림 — < maxHint 까지만 warn (80% 도달 ~ maxHint 직전). */
  const warn = hasCounter && value.length >= maxHint * 0.8 && value.length < maxHint;

  /* badge / input / clear / counter 모두 .fieldWrap 의 flex children — 각자 자기 공간 차지.
     input 만 flex:1 로 남은 공간 grow + truncate. padding 트릭 불필요. */
  const wrapClasses = [
    styles.fieldWrap,
    size === "sm" ? styles.fieldWrapSm : "",
    size === "xs" ? styles.fieldWrapXs : "",
    variant === "underline" ? styles.fieldWrapUnderline : "",
    inlineLabel ? styles.hasInlineLabel : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <div className={wrapClasses}>
        {inlineLabel && <span className={styles.inlineLabel}>{inlineLabel}</span>}
        <div
          ref={ref}
          id={id}
          role="textbox"
          aria-label={placeholder ?? undefined}
          aria-disabled={disabled || undefined}
          contentEditable={disabled ? false : "plaintext-only"}
          suppressContentEditableWarning
          spellCheck
          className={styles.input}
          data-placeholder={placeholder}
          onInput={handleInput}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {showClear && (
          <button
            type="button"
            className={styles.clearBtn}
            data-cursor="big"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            aria-label="clear"
            title="지우기"
          >
            <Eraser size={11} strokeWidth={2} />
          </button>
        )}
        {hasCounter && (
          <span
            className={`${styles.counter} ${over ? styles.counterOver : warn ? styles.counterWarn : ""}`}
            aria-live="polite"
          >
            <span>{value.length}</span>
            {" / "}{maxHint}
          </span>
        )}
      </div>
    </div>
  );
}
