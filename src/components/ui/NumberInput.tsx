"use client";

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus } from "@/components/icons";
import { showToast } from "@/stores/toastStore";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./NumberInput.module.css";
import SpinButton from "./SpinButton";
import Tooltip from "./Tooltip";

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
  /** 우측 단위 표시 (예: "px", "%") — 옵션, 값 없으면 미표시. 숫자와 같은 크기 + 옅은 색. */
  unit?: ReactNode;
  /** input 폭 px (기본 40) */
  width?: number;
  /** 전체 높이 px (기본 24) */
  height?: number;
  ariaLabel?: string;
  className?: string;
  /** min·max 가 있을 때 값 위치를 하단 게이지 색(낮음/중간/높음)으로 표시 */
  gauge?: boolean;
}


/** 캡슐형 숫자 입력 — 타이핑 중엔 로컬 draft, blur/Enter 에만 확정. 스텝퍼는 즉시 확정. */
export default function NumberInput({
  value, onCommit, min, max, step = 1, emptyValue = 0,
  placeholder, label, unit, width = 40, height = 28,
  ariaLabel, className, gauge = false,
}: NumberInputProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);
  const { language, t } = useLanguage();
  const ko = language === "ko";
  // 경계 toast 스로틀 — hold-repeat(SpinButton) 로 도배되지 않게 1.2초당 1회만
  const boundaryLockRef = useRef(false);

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
    if (next === cur) {
      // 이미 경계값 — 더 못 감. toast 로 알림 (hold-repeat 도배 방지 스로틀)
      if (!boundaryLockRef.current) {
        boundaryLockRef.current = true;
        if (dir > 0 && max != null) showToast(ko ? `최대 ${max}까지 설정할 수 있습니다.` : `Maximum is ${max}.`, "warning");
        else if (dir < 0 && min != null) showToast(ko ? `최소 ${min}까지 설정할 수 있습니다.` : `Minimum is ${min}.`, "warning");
        setTimeout(() => { boundaryLockRef.current = false; }, 1200);
      }
      return;
    }
    setDraft(String(next));
    onCommit(next);
  }, [draft, value, emptyValue, min, max, step, clamp, onCommit, ko]);

  const rootStyle = { "--_w": `${width}px`, "--_h": `${height}px` } as React.CSSProperties;

  // unit 이 ellipsis 로 잘렸는지 감지 → 잘렸을 때만 툴팁으로 전체 값 표시
  const unitTextRef = useRef<HTMLSpanElement>(null);
  const [unitTruncated, setUnitTruncated] = useState(false);
  useEffect(() => {
    const el = unitTextRef.current;
    if (unit == null || !el) { setUnitTruncated(false); return; }
    const check = () => setUnitTruncated(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [unit]);

  // 게이지 — min·max 있을 때 값 위치(0~1)에 따라 숫자 색을 낮음/중간/높음 으로 (바 없이 은은하게)
  const showGauge = gauge && min != null && max != null && max > min;
  const ratio = showGauge ? Math.max(0, Math.min(1, (value - min!) / (max! - min!))) : 0;
  const zoneClass = !showGauge ? "" : ratio < 1 / 3 ? styles.zoneLow : ratio < 2 / 3 ? styles.zoneMid : styles.zoneHigh;

  return (
    <span className={`${styles.root}${focused ? ` ${styles.focused}` : ""}${className ? ` ${className}` : ""}`} style={rootStyle}>
      <SpinButton className={styles.stepBtn} ariaLabel={t("common.decrease")} onStep={() => spin(-1)}><Minus size={12} strokeWidth={2.5} /></SpinButton>
      {label != null && <span className={styles.label}>{label}</span>}
      <input
        type="number"
        inputMode="numeric"
        className={`${styles.input}${zoneClass ? ` ${zoneClass}` : ""}`}
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
      {unit != null && (
        <Tooltip content={unit} disabled={!unitTruncated} placement="top">
          <span className={styles.unit}>
            <span ref={unitTextRef} className={styles.unitText}>{unit}</span>
          </span>
        </Tooltip>
      )}
      <SpinButton className={styles.stepBtn} ariaLabel={t("common.increase")} onStep={() => spin(1)}><Plus size={12} strokeWidth={2.5} /></SpinButton>
    </span>
  );
}
