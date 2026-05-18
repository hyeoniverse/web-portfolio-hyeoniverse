"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import styles from "./AdminTable.module.css";

interface Props {
  value: string | number;
  min?: number;
  max?: number;
  onSave: (newValue: number) => void | Promise<void>;
}

/** 행 번호 셀 인라인 편집 — 클릭 시 input, Enter/blur 저장, Esc 취소. */
export default function EditableRowNumber({ value, min = 1, max, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = useCallback(async () => {
    const n = parseInt(draft, 10);
    setEditing(false);
    if (Number.isNaN(n) || String(n) === String(value)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, max != null ? Math.min(n, max) : n);
    await onSave(clamped);
  }, [draft, value, min, max, onSave]);

  const cancel = useCallback(() => {
    setDraft(String(value));
    setEditing(false);
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    else if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        className={styles.rowNumInput}
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={styles.rowNumText}
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } }}
      title="클릭해서 위치 직접 입력"
    >
      {value}
    </span>
  );
}
