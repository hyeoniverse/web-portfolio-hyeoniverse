"use client";

import React, { useState, useEffect, useRef } from "react";

/**
 * EditorTextInput — Slate 에디터 *안*에 두는 격리된 텍스트 입력 프리미티브.
 *
 * ── 왜 필요한가 ──
 * Slate 는 editable 루트에 네이티브 리스너(mousedown·beforeinput·composition)를 달아두고,
 * 그 DOM 하위의 React 폼 요소에서도 focus/caret/키입력을 가져가려 한다. 그래서 인라인 input 을
 * 그냥 두면 (특히 한글 조합처럼 여러 키에 걸쳐 focus 가 유지돼야 하는 경우) 입력이 깨진다.
 * 캡션·poll 등에서 매번 같은 우회(로컬 state 격리 + mousedown 차단 + blur 커밋)를 재구현해 왔는데,
 * 이 컴포넌트가 그 패턴의 **단일 출처**다. 에디터 안에 input/textarea 가 필요하면 항상 이걸 쓴다.
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
export type EditorTextInputProps = {
  /** 현재 커밋된 값. clearOnCommit 모드에선 무시(항상 빈 칸에서 시작). */
  value: string;
  /** blur/Enter 시 변경된 값을 상위로 커밋. */
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  /** textarea 로 렌더. Enter=커밋, Shift+Enter=줄바꿈. */
  multiline?: boolean;
  /** "추가" 용 입력 — 커밋 후 비우고 focus 유지(연속 입력). */
  clearOnCommit?: boolean;
  /** Enter 로 커밋할지. 기본 true. */
  commitOnEnter?: boolean;
  /** 초과 시 잘라냄. 초과 콜백으로 알림 가능. */
  maxLength?: number;
  onOverflow?: () => void;
  spellCheck?: boolean;
  autoFocus?: boolean;
  /** 외부에서 input/textarea DOM 에 접근해야 할 때(거의 불필요). */
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
};

export function EditorTextInput({
  value, onCommit, placeholder, className, multiline,
  clearOnCommit, commitOnEnter = true, maxLength, onOverflow,
  spellCheck = false, autoFocus, inputRef,
}: EditorTextInputProps) {
  const [draft, setDraft] = useState(value);
  const localRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const setRef = (n: HTMLInputElement | HTMLTextAreaElement | null) => {
    localRef.current = n;
    if (inputRef) inputRef.current = n;
  };

  // clearOnCommit 모드는 항상 빈 칸 — 외부 value 동기화 안 함.
  useEffect(() => { if (!clearOnCommit) setDraft(value); }, [value, clearOnCommit]);

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
      onOverflow?.();
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

  const common = {
    className,
    value: draft,
    placeholder,
    spellCheck,
    autoFocus,
    contentEditable: false as const,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseDown: stopMouse,
    onChange,
    onKeyDown,
    onBlur: () => commit(),
  };

  return multiline
    ? <textarea ref={setRef as React.Ref<HTMLTextAreaElement>} rows={1} {...common} />
    : <input ref={setRef as React.Ref<HTMLInputElement>} {...common} />;
}

export default EditorTextInput;
