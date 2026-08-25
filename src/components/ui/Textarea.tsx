"use client";

import {
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  useId,
  type TextareaHTMLAttributes,
  type FormEvent,
  type CompositionEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Eraser } from "@/components/icons";
import { showToast } from "@/stores/toastStore";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./Textarea.module.css";

type Variant = "capsule" | "underline";
type Size = "sm" | "md";

/** maxLength 하드컷 발생 시 built-in toast 문구 (onOverflow 미제공 시) */
const LIMIT_TOAST = { ko: "글자수 제한에 도달했습니다.", en: "Character limit reached." };

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
  /** maxLength 로 초과분이 처음 잘릴 때 호출 — 소비자 override. 미제공 + maxLength 있으면 built-in toast.
   *  (EditableTextarea 모드에서만 동작 — PlainTextarea 는 native maxLength 하드컷) */
  onOverflow?: () => void;
  /** Tab 키로 2칸 공백 들여쓰기 (opt-in). 기본 false — Tab=다음 포커스(a11y) 유지.
   *  EditableTextarea 모드에서만 동작 (댓글 작성란 등 코드/마크다운 입력용). */
  tabIndent?: boolean;
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
  /* maxHint / onOverflow / tabIndent 는 PlainTextarea 분기에서 사용 안 함 — DOM 으로 새지 않도록 destructure 로 제거
     (React unknown attr warning 회피). maxLength 는 ...rest 로 native textarea 에 그대로 전달(하드컷 유지). */
  maxHint: _maxHint,
  onOverflow: _onOverflow,
  tabIndent: _tabIndent,
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
        {/* 지우개 — 글자수 카운터가 있는 쪽과 같은 자리(우하단)·같은 chip 을 쓴다.
            예전에는 이쪽만 우상단에 맨몸으로 떠 있어서, 같은 컴포넌트인데 maxLength 유무로
            버튼 위치와 크기가 달라 보였다. 카운터가 없으니 chip 은 값이 있을 때만 그린다. */}
        {!!value && !rest.disabled && !rest.readOnly && (
          <div className={styles.bottomRow}>
            <button
              type="button"
              className={styles.clearBtn}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange("")}
              aria-label="clear"
              tabIndex={-1}
              title="지우기"
            >
              <Eraser size={11} strokeWidth={2} />
            </button>
          </div>
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

/** root element 안 caret 의 텍스트 offset (innerText 기준 — 줄바꿈 \n 도 카운트).
   value 를 innerText 로 읽으므로 offset 도 innerText 좌표여야 함. Range.toString() 은 <br>/<div>
   줄바꿈을 세지 않아 어긋나므로, caret 위치에 sentinel 을 잠깐 넣고 innerText 에서 그 index 를 읽는다.
   (직후 effect 가 innerHTML 을 재구성하므로 DOM 임시 변형은 안전) */
function getCaretOffset(root: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const SENTINEL = ""; // PUA — 실제 입력에 안 나오는 마커
  const marker = document.createTextNode(SENTINEL);
  try {
    const r = range.cloneRange();
    r.collapse(true);
    r.insertNode(marker);
    const idx = root.innerText.indexOf(SENTINEL);
    return idx < 0 ? null : idx;
  } catch {
    return null;
  } finally {
    marker.remove();
    root.normalize(); // insertNode 로 쪼개진 text 노드 병합 복원
  }
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
  maxLength,
  placeholder,
  disabled,
  onFocus,
  onBlur,
  inlineLabel,
  onOverflow,
  tabIndent,
}: EditableProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const ref = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  /* placeholder 표시용 — ref 는 리렌더를 안 일으켜 렌더에 못 쓴다.
     조합 중엔 handleInput 이 early return 해서 value 가 "" 로 남는데, 조합 중인 글자는
     이미 DOM 에 들어가 있다. placeholder(::before)가 첫 인라인 콘텐츠라 그 뒤에 글자가 붙어 보임
     → 조합이 시작되면 즉시 placeholder 를 감춘다. */
  const [composing, setComposing] = useState(false);
  const { language } = useLanguage();
  /* built-in toast throttle — 연속 입력/paste 도배 방지 (ref 타임스탬프) */
  const lastToastRef = useRef(0);

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

  /* maxLength 초과분 잘라내고, DOM 이 이미 그린 초과분도 즉시 제거 (capped 값이 기존 value 와
     같으면 value effect 가 안 돌아 DOM 이 초과 상태로 남는 것 방지). caret 은 끝으로.
     멀티라인 — 줄바꿈은 보존 (HighlightInput 의 \r\n 제거 로직 미이식). */
  const capAndSync = useCallback(
    (root: HTMLDivElement, raw: string): string => {
      if (maxLength == null || raw.length <= maxLength) return raw;
      const capped = raw.slice(0, maxLength);
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
    if (raw.length <= maxLength || value.length >= maxLength) return;
    if (onOverflow) { onOverflow(); return; }
    const now = Date.now();
    if (now - lastToastRef.current < 1500) return;
    lastToastRef.current = now;
    showToast(LIMIT_TOAST[language], "info", 3000);
  }, [onOverflow, maxLength, value, language]);

  // 값 읽기는 innerText — 브라우저가 Enter 를 <br>/<div> 로 넣어도 시각적 줄바꿈이 \n 으로 보존됨
  // (textContent 는 block 경계 줄바꿈을 잃어 저장값에 \n 이 안 남았음). caret offset 도 innerText 기준.
  const handleInput = useCallback(
    (e: FormEvent<HTMLDivElement>) => {
      if (isComposingRef.current) return; // composition 끝나면 onCompositionEnd 에서 처리
      const raw = e.currentTarget.innerText ?? "";
      const text = capAndSync(e.currentTarget, raw);
      notifyOverflow(raw);
      onChange(text);
    },
    [onChange, capAndSync, notifyOverflow],
  );

  const handleCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLDivElement>) => {
      isComposingRef.current = false;
      setComposing(false);
      const raw = e.currentTarget.innerText ?? "";
      const text = capAndSync(e.currentTarget, raw);
      notifyOverflow(raw);
      onChange(text);
    },
    [onChange, capAndSync, notifyOverflow],
  );

  // Tab 들여쓰기 (opt-in) — 2칸 공백 삽입. Shift+Tab 은 기본(포커스 뒤로) 유지.
  // execCommand("insertText") 로 native undo 스택·input 이벤트(→ handleInput 동기화) 보존.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!tabIndent) return;
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Tab" && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        document.execCommand("insertText", false, "  ");
      }
    },
    [tabIndent],
  );

  // 조합 중이면 DOM 에 글자가 있으므로 비어있지 않다 (value 는 아직 안 올라옴)
  const isEmpty = value.length === 0 && !composing;

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
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; setComposing(true); }}
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
        {/* 지우개 + 카운터 — textarea 안쪽 우하단 오버레이 */}
        <div className={styles.bottomRow}>
          {/* 지우개 — 빈 값이면 visibility 로만 숨겨 공간을 유지(카운터 위치 고정, 움찔 방지) */}
          {!disabled && (
            <button
              type="button"
              className={styles.clearBtn}
              data-hidden={isEmpty || undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange("")}
              aria-label="clear"
              aria-hidden={isEmpty || undefined}
              tabIndex={-1}
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
    </div>
  );
}
