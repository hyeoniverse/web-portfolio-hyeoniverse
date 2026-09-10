"use client";

import React, { useState, useRef } from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { Eraser } from "@/components/icons";
import styles from "@/components/ui/Input.module.css";
// 단일 줄 input 의 "카운터/지우개를 캡슐 안 flex child 로" 레이아웃은 공통 HighlightInput 과 동일 모듈 재사용
import ei from "@/components/ui/HighlightInput/HighlightInput.module.css";
import Pressable from "@/components/ui/Pressable";

/**
 * EditorTextInput — Slate 에디터 *안*에 두는 격리된 텍스트 입력 프리미티브(에디터 전용 공통 컴포넌트).
 *
 * ── 왜 필요한가 (ui/Input 을 그냥 못 쓰는 이유) ──
 * Slate 는 editable 루트에 네이티브 리스너(mousedown·beforeinput·composition)를 달아두고,
 * 그 DOM 하위의 React 폼 요소에서도 focus/caret/키입력을 가져가려 한다. 그래서 평범한 input(=ui/Input)을
 * 에디터 안에 두면 (특히 한글 조합처럼 여러 키에 걸쳐 focus 가 유지돼야 하는 경우) 입력이 깨진다.
 * 이 컴포넌트가 그 우회(로컬 state 격리 + mousedown 차단 + blur 커밋)의 **단일 출처**다.
 * 에디터 안에 input/textarea 가 필요하면 항상 이걸 쓴다.
 *
 * ── 공통 컴포넌트 파리티 ──
 * 스타일/props 는 ui/Input 과 맞춘다: 같은 `Input.module.css` 를 재사용하고 variant/size/label/
 * inlineLabel/clearable 을 지원한다. 즉 "에디터 안에서 쓰는 ui/Input" 이라고 보면 된다.
 * 차이는 두 가지뿐: (1) Slate 격리 로직 내장, (2) onChange 즉시 커밋이 아니라 blur/Enter 커밋(undo 깔끔).
 *
 * ── 격리 원리 ──
 * 1. contentEditable={false} — Slate 가 이 노드를 편집 대상으로 보지 않게.
 * 2. onMouseDown 에서 nativeEvent.stopImmediatePropagation() — Slate 네이티브 mousedown 이
 *    focus/caret 을 가져가는 것을 차단(React stopPropagation 만으론 네이티브 리스너를 못 막음).
 *    단 preventDefault 는 호출하지 않는다 — 그러면 폼 요소의 네이티브 focus 자체가 막힌다.
 * 3. 로컬 state(draft) — 부모/Slate re-render 와 격리해 타이핑 중 값이 리셋되지 않게.
 * 4. 커밋은 blur/Enter 에서만 — 타이핑 중에는 상위 데이터(Slate 노드)를 건드리지 않는다.
 *
 * void 요소 안이든(권장) 아니든 동작한다. void 가 아니면 부모를 contentEditable={false} 로 감싸 둘 것.
 */
type Variant = "bare" | "capsule" | "underline";
type Size = "xs" | "sm" | "md";

type EditorTextInputProps = {
  /** 현재 커밋된 값. clearOnCommit 모드에선 무시(항상 빈 칸에서 시작). */
  value: string;
  /** blur/Enter 시 변경된 값을 상위로 커밋. */
  onCommit: (next: string) => void;
  placeholder?: string;
  /** input/textarea *요소* 에 적용(타이포 등 콜사이트 오버라이드). */
  className?: string;
  /** wrapper div 에 적용(label/clear/inlineLabel 을 쓸 때만 wrapper 가 생성됨). */
  wrapperClassName?: string;
  /** 시각 스타일. bare=꾸밈 없음(콜사이트 CSS 가 책임, 기본), capsule=디자인시스템 알약, underline=밑줄. */
  variant?: Variant;
  /** 컨트롤 높이/폰트. bare 에는 영향 없음. */
  size?: Size;
  /** 상단 라벨(있으면 wrapper 생성). */
  label?: string;
  /** 좌측 inline 배지(KO/EN 등, 있으면 wrapper 생성). */
  inlineLabel?: string;
  /** 값 있을 때 우측 지우기(Eraser) 버튼. multiline/clearOnCommit 에선 무시. 기본 false. */
  clearable?: boolean;
  /** textarea 로 렌더. Enter=커밋, Shift+Enter=줄바꿈. */
  multiline?: boolean;
  /** "추가" 용 입력 — 커밋 후 비우고 focus 유지(연속 입력). */
  clearOnCommit?: boolean;
  /** Enter 로 커밋할지. 기본 true. */
  commitOnEnter?: boolean;
  /** 초과 시 잘라냄. 초과 콜백(onOverflow)으로 toast 등 알림 가능. */
  maxLength?: number;
  onOverflow?: () => void;
  /** 하단에 글자수 카운터(n / max) 표시 — 공통 Textarea 와 동일. maxLength 필요. */
  showCount?: boolean;
  spellCheck?: boolean;
  autoFocus?: boolean;
  /** 외부에서 input/textarea DOM 에 접근해야 할 때(거의 불필요). */
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
};

function EditorTextInput({
  value, onCommit, placeholder, className, wrapperClassName,
  variant = "bare", size = "md", label, inlineLabel, clearable = true,
  multiline, clearOnCommit, commitOnEnter = true, maxLength, onOverflow, showCount,
  spellCheck = false, autoFocus, inputRef,
}: EditorTextInputProps) {
  const [draft, setDraft] = useState(value);
  const lastOverflowRef = useRef(0); // onOverflow(toast) 스로틀 — 한도에서 연타해도 도배 안 되게
  const localRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const setRef = (n: HTMLInputElement | HTMLTextAreaElement | null) => {
    localRef.current = n;
    if (inputRef) inputRef.current = n;
  };

  // clearOnCommit 모드는 항상 빈 칸 — 외부 value 동기화 안 함.
  const valueChanged = useDepsChanged([value, clearOnCommit]);
  if (valueChanged && !clearOnCommit) setDraft(value);

  const commit = (keepFocus = false) => {
    if (clearOnCommit) {
      const v = draft.trim();
      if (!v) return;
      onCommit(v);
      setDraft("");
      if (keepFocus) setTimeout(() => localRef.current?.focus(), 0);
    } else if (draft !== value) {
      onCommit(draft);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let v = e.target.value;
    if (typeof maxLength === "number" && v.length > maxLength) {
      const now = Date.now();
      if (now - lastOverflowRef.current > 1500) { onOverflow?.(); lastOverflowRef.current = now; }
      v = v.slice(0, maxLength);
    }
    setDraft(v);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // isComposing 가드 — 한글 조합을 확정하는 Enter 가 그대로 커밋 Enter 로도 처리되어
    // 마지막 글자가 중복/조기 추가되는 한국어 웹 고전 버그 차단. (공용 Input 과 동일)
    if (e.key === "Enter" && commitOnEnter && !(multiline && e.shiftKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (clearOnCommit) commit(true);
      else localRef.current?.blur();
    } else if (e.key === "Escape") {
      if (!clearOnCommit) setDraft(value);
      localRef.current?.blur();
    }
  };

  // Slate 네이티브 리스너가 focus/caret 을 가져가는 것 차단 (캡션/poll 검증된 패턴).
  const stopMouse = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  const showClear = clearable && !multiline && !clearOnCommit && !!draft;
  const wantCount = !!showCount && typeof maxLength === "number";
  // label/inlineLabel/지우개(가능)/카운터 가 있을 때만 wrapper 생성 — 없으면 flat(요소만) 렌더로 기존 레이아웃 보존.
  const needsWrapper = !!label || !!inlineLabel || (clearable && !multiline && !clearOnCommit) || wantCount || !!wrapperClassName;

  const clear = () => {
    setDraft("");
    if (value !== "") onCommit("");
    localRef.current?.focus();
  };

  const elementCls = [
    variant !== "bare" ? styles.input : "",
    variant === "underline" ? styles.underline : "",
    size === "sm" ? styles.sm : "",
    size === "xs" ? styles.xs : "",
    multiline ? styles.multiline : "",
    inlineLabel ? styles.hasInlineLabel : "",
    showClear ? styles.hasClear : "",
    className || "",
  ].filter(Boolean).join(" ");

  // className 은 요소별로 다르게(flat/multiline=elementCls, 단일줄 캡슐=ei.input) 붙이므로 common 에서 제외
  const common = {
    value: draft,
    placeholder,
    spellCheck,
    autoFocus,
    // 네이티브 maxLength 는 쓰지 않음 — 붙이면 브라우저가 조용히 차단해 onOverflow(=toast)가 안 뜬다.
    // 대신 onChange 에서 슬라이스로 하드 제한 + onOverflow 로 초과 알림.
    contentEditable: false as const,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseDown: stopMouse,
    onChange,
    onKeyDown,
    onBlur: () => commit(),
  };

  const field = multiline
    ? <textarea ref={setRef as React.Ref<HTMLTextAreaElement>} rows={1} className={elementCls} {...common} />
    : <input ref={setRef as React.Ref<HTMLInputElement>} className={elementCls} {...common} />;

  if (!needsWrapper) return field;

  // 카운터 상태 — 하드 리밋 도달=accent(over) / 근접(80~99%)=warning
  const overLimit = typeof maxLength === "number" && draft.length >= maxLength;
  const nearLimit = typeof maxLength === "number" && draft.length >= maxLength * 0.8 && draft.length < maxLength;

  const wrapperCls = [
    styles.wrapper,
    size === "sm" ? styles.wrapperSm : "",
    size === "xs" ? styles.wrapperXs : "",
    wrapperClassName || "",
  ].filter(Boolean).join(" ");

  // 여러 줄(textarea) — label + [ textarea + 카운터(아래) ]. 공통 Textarea 패턴.
  //   입력 영역을 fieldBody 로 묶어 label 을 위/왼쪽 어디든 배치 가능.
  if (multiline) {
    return (
      <div className={wrapperCls} contentEditable={false}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.fieldBody}>
          {field}
          {wantCount && (
            <div className={styles.bottomRow}>
              <span className={`${styles.counter}${overLimit ? ` ${styles.counterOver}` : nearLimit ? ` ${styles.counterWarn}` : ""}`} aria-live="polite">
                <span>{draft.length}</span>{" / "}{maxLength}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 단일 줄 — label(위) + [ input · 지우개 · 카운터 ] 를 캡슐 border 안 flex child 로(공통 HighlightInput 과 동일).
  return (
    <div className={`${ei.wrapper} ${wrapperClassName ?? ""}`.trim()} contentEditable={false}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${ei.fieldWrap} ${inlineLabel ? ei.hasInlineLabel : ""}`.trim()}>
        {inlineLabel && <span className={ei.inlineLabel}>{inlineLabel}</span>}
        <input ref={setRef as React.Ref<HTMLInputElement>} className={`${ei.input} ${className ?? ""}`.trim()} {...common} />
        {showClear && (
          <Pressable className={ei.clearBtn} aria-label="clear" title="지우기"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); clear(); }}>
            <Eraser size={11} strokeWidth={2} />
          </Pressable>
        )}
        {wantCount && (
          <span className={`${ei.counter} ${overLimit ? ei.counterOver : nearLimit ? ei.counterWarn : ""}`.trim()} aria-live="polite">
            <span>{draft.length}</span>{" / "}{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

export default EditorTextInput;
