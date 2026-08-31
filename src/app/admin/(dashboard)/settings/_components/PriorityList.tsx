"use client";

import { useRef, useState } from "react";
import type { SelectOption } from "@/types";
import { ChevronUp, ChevronDown, GripDotsIcon } from "@/components/icons";
import Checkbox from "@/components/ui/Checkbox";
import styles from "./PriorityList.module.css";
import shared from "../Settings.module.css";
import Pressable from "@/components/ui/Pressable";

interface PriorityListProps<T extends string> {
  primary: T;
  priority: T[];
  excluded: T[];
  options: SelectOption<T>[];
  onChange: (next: T[]) => void;
  onExcludedChange: (next: T[]) => void;
}

export function PriorityList<T extends string>({ primary, priority, excluded, options, onChange, onExcludedChange }: PriorityListProps<T>) {
  const nonPrimary = options.filter((o) => o.value !== primary);
  const ordered = priority.length
    ? priority.filter((p) => p !== primary)
    : nonPrimary.map((o) => o.value);

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  // 항목을 from → to 로 이동(splice). desktop drop / touch end 공용.
  const reorder = (from: number, to: number) => {
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  /* ── HTML5 drag (desktop) ── */
  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setOverIdx(idx); };
  const handleDrop = (idx: number) => {
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    reorder(from, idx);
    dragIdx.current = null;
    setOverIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setOverIdx(null); };

  /* ── Touch drag (mobile) ── */
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    dragIdx.current = idx;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIdx.current === null || !listRef.current) return;
    const y = e.touches[0].clientY;
    const items = listRef.current.querySelectorAll<HTMLElement>(`.${styles.priorityItem}`);
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setOverIdx(i);
        return;
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragIdx.current !== null && overIdx !== null && dragIdx.current !== overIdx) {
      reorder(dragIdx.current, overIdx);
    }
    dragIdx.current = null;
    setOverIdx(null);
  };

  return (
    <div className={styles.priorityList} ref={listRef}>
      {ordered.map((val, idx) => {
        const label = options.find((o) => o.value === val)?.label ?? val;
        const isEnabled = !excluded.includes(val);
        return (
          <div key={val} className={styles.priorityRow}>
            <Checkbox
              shape="square"
              checked={isEnabled}
              onChange={(checked) => {
                onExcludedChange(
                  checked
                    ? excluded.filter((e) => e !== val)
                    : [...excluded, val]
                );
              }}
            />
            {/* 드래그 핸들 — priorityItem 바깥, checkbox 와 item 사이. drag 핸들러도 여기로 이동 */}
            <span
              className={styles.priorityGrip}
              data-draggable
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <GripDotsIcon />
            </span>
            <div
              className={`${styles.priorityItem}${overIdx === idx ? ` ${styles.priorityItemOver}` : ""}`}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
            >
              <span className={styles.priorityBadge}>{idx + 1}</span>
              <span className={`${styles.priorityLabel} ${isEnabled ? "" : styles.priorityLabelDisabled}`}>{label}</span>
              <div className={styles.priorityBtns}>
                <Pressable
                  className={shared.priorityBtn}
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label="Move up"
                ><ChevronUp size={12} strokeWidth={2.5} /></Pressable>
                <Pressable
                  className={shared.priorityBtn}
                  disabled={idx === ordered.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label="Move down"
                ><ChevronDown size={12} strokeWidth={2.5} /></Pressable>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
