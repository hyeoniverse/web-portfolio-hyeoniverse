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
import styles from "./EditableInput.module.css";

interface EditableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** input 좌측 내부 배지 (KO/EN 등) */
  inlineLabel?: string;
  /** Soft 글자수 권장 한도 — 초과 글자에 inline <mark> highlight + 우측 counter (n/max). 미지정 시 highlight/counter 없음. */
  maxHint?: number;
  /** clear 버튼 표시 — value 있을 때 우측. 기본 true */
  clearable?: boolean;
  className?: string;
  disabled?: boolean;
  onFocus?: (e: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: FocusEvent<HTMLDivElement>) => void;
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
export default function EditableInput({
  value,
  onChange,
  placeholder,
  inlineLabel,
  maxHint,
  clearable = true,
  className,
  disabled,
  onFocus,
  onBlur,
}: EditableInputProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

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

  const handleInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      if (isComposingRef.current) return;
      /* 단일 행 — 어떤 줄바꿈도 제거 (paste 든 자동삽입이든) */
      const text = (e.currentTarget.textContent ?? "").replace(/[\r\n]+/g, "");
      onChange(text);
    },
    [onChange],
  );

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLDivElement>) => {
      isComposingRef.current = false;
      const text = (e.currentTarget.textContent ?? "").replace(/[\r\n]+/g, "");
      onChange(text);
    },
    [onChange],
  );

  /* Enter 차단 — single-line */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") e.preventDefault();
  }, []);

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
          data-empty={isEmpty || undefined}
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
