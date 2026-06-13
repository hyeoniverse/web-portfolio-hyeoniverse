"use client";

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./NumberInput.module.css";

interface NumberInputProps {
  /** 현재 값 (제어). 0/빈 값 허용 — emptyValue 로 처리 */
  value: number;
  /** blur / Enter / 스텝퍼 클릭 시 호출 — 확정값 전달 */
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** value 가 이 값(기본 0)이면 input 을 빈칸으로 표시 */
  emptyValue?: number;
  placeholder?: string;
  /** 좌측 짧은 라벨 (예: "W") */
  label?: ReactNode;
  /** 우측 단위 (예: "px") */
  suffix?: ReactNode;
  /** 상하 스텝퍼 노출 (기본 true) */
  stepper?: boolean;
  /** input 폭 px (기본 40) */
  width?: number;
  /** 전체 높이 px (기본 24) */
  height?: number;
  ariaLabel?: string;
  className?: string;
}

const UpArrow = () => <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 0L8 5H0z" fill="currentColor" /></svg>;
const DownArrow = () => <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 5L0 0h8z" fill="currentColor" /></svg>;

/** 캡슐형 숫자 입력 — 타이핑 중엔 로컬 draft, blur/Enter 에만 확정. 스텝퍼는 즉시 확정. */
export default function NumberInput({
  value, onCommit, min, max, step = 1, emptyValue = 0,
  placeholder, label, suffix, stepper = true, width = 40, height = 28,
  ariaLabel, className,
}: NumberInputProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);

  const clamp = useCallback((n: number) => {
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  }, [min, max]);

  // 외부 value 변경 동기화 — 편집 중이 아닐 때만
  useEffect(() => {
    if (!focusedRef.current) setDraft(value !== emptyValue ? String(value) : "");
  }, [value, emptyValue]);

  const commit = useCallback(() => {
    focusedRef.current = false;
    setFocused(false);
    const parsed = parseInt(draft, 10);
    const next = isNaN(parsed) ? value : clamp(parsed);
    onCommit(next);
  }, [draft, value, clamp, onCommit]);

  const spin = useCallback((dir: 1 | -1) => {
    const base = parseInt(draft, 10);
    const cur = isNaN(base) ? (value !== emptyValue ? value : (min ?? 0)) : base;
    const next = clamp(cur + dir * step);
    setDraft(String(next));
    onCommit(next);
  }, [draft, value, emptyValue, min, step, clamp, onCommit]);

  const rootStyle = { "--_w": `${width}px`, "--_h": `${height}px` } as React.CSSProperties;

  return (
    <span className={`${styles.root}${focused ? ` ${styles.focused}` : ""}${className ? ` ${className}` : ""}`} style={rootStyle}>
      {label != null && <span className={styles.label}>{label}</span>}
      <input
        type="number"
        inputMode="numeric"
        className={styles.input}
        value={draft}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => { focusedRef.current = true; setFocused(true); }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === "ArrowUp") { e.preventDefault(); spin(1); }
          else if (e.key === "ArrowDown") { e.preventDefault(); spin(-1); }
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
      {suffix != null && <span className={styles.suffix}>{suffix}</span>}
      {stepper && (
        <span className={styles.stepper}>
          <button type="button" className={styles.stepBtn} tabIndex={-1} aria-label="증가"
            onMouseDown={(e) => e.preventDefault()} onClick={() => spin(1)}><UpArrow /></button>
          <button type="button" className={styles.stepBtn} tabIndex={-1} aria-label="감소"
            onMouseDown={(e) => e.preventDefault()} onClick={() => spin(-1)}><DownArrow /></button>
        </span>
      )}
    </span>
  );
}
