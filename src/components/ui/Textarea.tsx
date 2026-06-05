"use client";

import {
  useRef,
  useLayoutEffect,
  useCallback,
  useId,
  type TextareaHTMLAttributes,
  type FormEvent,
  type CompositionEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Eraser } from "lucide-react";
import styles from "./Textarea.module.css";

type Variant = "capsule" | "underline";
type Size = "sm" | "md";

/** 정형화된 글자수 권장 한도 preset — 숫자 대신 의미 기반 이름 사용 가능 */
export type MaxHintPreset = "short" | "basic" | "long";
const MAX_HINT_PRESETS: Record<MaxHintPreset, number> = {
  short: 200,   // 한 줄 요약 / 헤드라인
  basic: 500,   // 설명 / 짧은 댓글
  long: 2000,   // 긴 본문 / 자세한 댓글
};

function resolveMaxHint(v: number | MaxHintPreset | undefined): number | undefined {
  if (v == null) return undefined;
  return typeof v === "string" ? MAX_HINT_PRESETS[v] : v;
}

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "size"> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** textarea 자체 className override */
  textareaClassName?: string;
  /** Soft 글자수 권장 한도 — 카운터 표시 + 80% 부터 warning, 100% 초과 시 over.
   *  숫자 (예: 400) 또는 preset ("short" / "basic" / "long") 으로 지정.
   *  설정되면 contenteditable 모드로 전환 (초과 글자에 inline highlight). 미설정이면 plain textarea. */
  maxHint?: number | MaxHintPreset;
  /** input 좌측 안에 absolute 로 표시되는 짧은 배지 (KO/EN 등). Input 공통 패턴과 일치 */
  inlineLabel?: string;
}

/* ── Mode selector ── maxHint 가 있으면 contenteditable 모드 (inline highlight)
   ── 없으면 plain textarea 모드 (기존 동작 그대로) */
export default function Textarea(props: TextareaProps) {
  const resolved = resolveMaxHint(props.maxHint);
  if (resolved != null) {
    return <EditableTextarea {...props} maxHint={resolved} />;
  }
  return <PlainTextarea {...props} />;
}

/* ============================================================
 * Plain textarea — maxHint 미설정. native textarea + 커스텀 resize 오버레이.
 * ============================================================ */
function PlainTextarea({
  label,
  value,
  onChange,
  variant = "capsule",
  size = "md",
  className,
  textareaClassName,
  id,
  rows = 3,
  inlineLabel,
  /* maxHint 는 PlainTextarea 분기에서 사용 안 함 — DOM 으로 새지 않도록 destructure 로 제거 (React unknown attr warning 회피) */
  maxHint: _maxHint,
  ...rest
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputCls = [
    styles.textarea,
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    /* inlineLabel 은 textarea 바깥 (좌측 flex row) — textarea 자체엔 추가 padding 불필요 */
    textareaClassName,
  ].filter(Boolean).join(" ");

  /* native resize 핸들 위 투명 overlay — EditableTextarea 와 동일 패턴 (커스텀 커서 + JS 드래그).
     PlainTextarea 도 admin/settings 등에서 sm 사이즈로 자주 쓰여 일관성 위해 동일 overlay 적용. */
  const handleResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = ta.offsetHeight;
    const onMove = (ev: PointerEvent) => {
      if (!textareaRef.current) return;
      const dy = ev.clientY - startY;
      const next = Math.max(60, Math.min(window.innerHeight * 0.7, startHeight + dy));
      textareaRef.current.style.height = `${next}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, []);

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={`${styles.editableWrap} ${inlineLabel ? styles.editableWrapWithBadge : ""}`}>
        {inlineLabel && <span className={styles.inlineLabel}>{inlineLabel}</span>}
        <textarea
          ref={textareaRef}
          id={id}
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          data-lenis-prevent
          {...rest}
        />
        {!rest.disabled && !rest.readOnly && (
          <div
            className={styles.resizeOverlay}
            data-cursor="resizeV"
            onPointerDown={handleResizePointerDown}
            aria-hidden
          />
        )}
        {!!value && !rest.disabled && !rest.readOnly && (
          <button
            type="button"
            className={styles.clearBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            aria-label="clear"
            title="지우기"
          >
            <Eraser size={11} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Editable textarea — contenteditable="plaintext-only" + inline <mark> highlight
 * - native per-character styling (textarea 한계 회피)
 * - mirror overlay 불필요 — wrap/scroll sync issue 없음
 * - IME composition / paste / undo / placeholder 모두 native
 * ============================================================ */

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function buildHtml(value: string, maxHint: number, overClass: string): string {
  if (value.length <= maxHint) return escapeHtml(value);
  const before = escapeHtml(value.slice(0, maxHint));
  const after = escapeHtml(value.slice(maxHint));
  return `${before}<mark class="${overClass}">${after}</mark>`;
}

/** root element 안 caret 의 텍스트 offset (count of characters) */
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
  // fallback: 끝
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

interface EditableProps extends TextareaProps {
  maxHint: number;
}

function EditableTextarea({
  label,
  value,
  onChange,
  variant = "capsule",
  size = "md",
  className,
  textareaClassName,
  id: idProp,
  // rows 는 editable 모드에선 사용 안 함 — min-height 는 CSS 가 담당 (.editable / page-level override)
  rows: _rows,
  maxHint,
  placeholder,
  disabled,
  onFocus,
  onBlur,
  inlineLabel,
}: EditableProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const ref = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  const inputCls = [
    styles.textarea,
    styles.editable,
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    /* inlineLabel 은 textarea 바깥 (좌측 flex row) — textarea 자체엔 추가 padding 불필요 */
    textareaClassName,
  ].filter(Boolean).join(" ");

  // DOM 동기화 — value / maxHint 변경 시 innerHTML 재구성 + caret 보존
  // composition 중에는 skip (한글 조합 깨짐 방지)
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
      if (isComposingRef.current) return; // composition 끝나면 onCompositionEnd 에서 처리
      const text = e.currentTarget.textContent ?? "";
      onChange(text);
    },
    [onChange],
  );

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLDivElement>) => {
      isComposingRef.current = false;
      const text = e.currentTarget.textContent ?? "";
      onChange(text);
    },
    [onChange],
  );

  const isEmpty = value.length === 0;

  // Resize overlay — native grip 위에서 cursor + drag 가로채기
  const handleResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = ref.current.offsetHeight;
    const onMove = (ev: PointerEvent) => {
      if (!ref.current) return;
      const dy = ev.clientY - startY;
      const next = Math.max(60, Math.min(window.innerHeight * 0.7, startHeight + dy));
      ref.current.style.height = `${next}px`;
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, []);

  return (
    <div className={`${styles.wrapper} ${size === "sm" ? styles.wrapperSm : ""} ${className ?? ""}`}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <div className={`${styles.editableWrap} ${inlineLabel ? styles.editableWrapWithBadge : ""}`}>
        {inlineLabel && <span className={styles.inlineLabel}>{inlineLabel}</span>}
        <div
          ref={ref}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={label ?? placeholder ?? undefined}
          aria-disabled={disabled || undefined}
          // plaintext-only — paste 자동 plain text + Enter 자연스러운 \n + 마크업 입력 차단
          // Firefox 119+, 모든 Chromium/WebKit 지원
          contentEditable={disabled ? false : "plaintext-only"}
          suppressContentEditableWarning
          spellCheck
          className={inputCls}
          data-placeholder={placeholder}
          data-empty={isEmpty || undefined}
          data-lenis-prevent
          onInput={handleInput}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={handleCompositionEnd}
          onFocus={onFocus as React.FocusEventHandler<HTMLDivElement> | undefined}
          onBlur={onBlur as React.FocusEventHandler<HTMLDivElement> | undefined}
        />
        {!disabled && (
          <div
            className={styles.resizeOverlay}
            data-cursor="resizeV"
            onPointerDown={handleResizePointerDown}
            aria-hidden
          />
        )}
      </div>
      <div className={styles.bottomRow}>
        {!isEmpty && !disabled && (
          <button
            type="button"
            className={styles.clearBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            aria-label="clear"
            title="지우기"
          >
            <Eraser size={11} strokeWidth={2} />
          </button>
        )}
        <span
          className={[
            styles.counter,
            value.length > maxHint ? styles.counterOver : "",
            value.length >= maxHint * 0.8 && value.length < maxHint ? styles.counterWarn : "",
          ].filter(Boolean).join(" ")}
          aria-live="polite"
        >
          <span>{value.length}</span>
          {" / "}{maxHint}
        </span>
      </div>
    </div>
  );
}
